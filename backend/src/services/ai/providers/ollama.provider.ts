import { getEnv } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import type {
  ChatCompletionOptions,
  ChatCompletionResult,
  ChatMessage,
  EmbeddingOptions,
  EmbeddingResult,
  EmbeddingProvider,
  LLMProvider,
  ProviderHealth,
} from "../types.js";

function baseUrl(): string {
  return getEnv().OLLAMA_BASE_URL.replace(/\/$/, "");
}

function chatModel(): string {
  return getEnv().OLLAMA_CHAT_MODEL;
}

function embedModel(): string {
  return getEnv().OLLAMA_EMBED_MODEL;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

function extractJsonContent(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

const HEALTH_CACHE_OK_MS = 30_000;
/** Cache unreachable results longer so Render free hosts don't re-probe every request. */
const HEALTH_CACHE_FAIL_MS = 5 * 60_000;
let healthCache: { at: number; value: ProviderHealth } | null = null;

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
}

/**
 * On hosted platforms (e.g. Render), a default localhost Ollama URL can never work.
 * Skip the TCP probe so resume AI status / enhance stay fast in heuristic mode.
 */
function shouldSkipLocalOllamaProbe(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!isLoopbackHost(parsed.hostname)) return false;
  } catch {
    return false;
  }
  return (
    Boolean(process.env.RENDER) ||
    process.env.NODE_ENV === "production" ||
    process.env.OLLAMA_SKIP_LOCALHOST === "true"
  );
}

/**
 * Ollama chat + embeddings over HTTP.
 * Model names come only from env (OLLAMA_CHAT_MODEL / OLLAMA_EMBED_MODEL).
 */
export class OllamaProvider implements LLMProvider, EmbeddingProvider {
  readonly name = "ollama" as const;

  async chat(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const model = options?.model?.trim() || chatModel();
    const timeoutMs = options?.timeoutMs ?? getEnv().OLLAMA_TIMEOUT_MS;
    const url = `${baseUrl()}/api/chat`;

    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          format: options?.json === false ? undefined : "json",
          options: {
            temperature: options?.temperature ?? 0.1,
          },
        }),
      },
      timeoutMs,
      options?.signal,
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama chat HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      message?: { content?: string };
      response?: string;
    };
    const content = data.message?.content ?? data.response ?? "";
    if (!content.trim()) {
      throw new Error("Ollama chat returned empty content");
    }

    return {
      content: options?.json === false ? content : extractJsonContent(content),
      model,
      provider: "ollama",
    };
  }

  async embed(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult> {
    const model = options?.model?.trim() || embedModel();
    const timeoutMs = options?.timeoutMs ?? getEnv().OLLAMA_TIMEOUT_MS;
    const embeddings: number[][] = [];

    // Ollama typically embeds one prompt at a time; batch sequentially for reliability.
    for (const text of texts) {
      const vector = await this.embedOne(text, model, timeoutMs, options?.signal);
      embeddings.push(vector);
    }

    return { embeddings, model, provider: "ollama" };
  }

  private async embedOne(
    text: string,
    model: string,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<number[]> {
    const root = baseUrl();

    // Prefer /api/embed (newer); fall back to /api/embeddings
    const modern = await fetchWithTimeout(
      `${root}/api/embed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input: text }),
      },
      timeoutMs,
      signal,
    ).catch(() => null);

    if (modern?.ok) {
      const body = (await modern.json()) as {
        embeddings?: number[][];
        embedding?: number[];
      };
      if (Array.isArray(body.embeddings?.[0])) return body.embeddings[0];
      if (Array.isArray(body.embedding)) return body.embedding;
    }

    const legacy = await fetchWithTimeout(
      `${root}/api/embeddings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt: text }),
      },
      timeoutMs,
      signal,
    );

    if (!legacy.ok) {
      const errBody = await legacy.text().catch(() => "");
      throw new Error(`Ollama embed HTTP ${legacy.status}: ${errBody.slice(0, 200)}`);
    }

    const body = (await legacy.json()) as { embedding?: number[] };
    if (!Array.isArray(body.embedding) || body.embedding.length === 0) {
      throw new Error("Ollama embed returned empty vector");
    }
    return body.embedding;
  }

  async health(): Promise<ProviderHealth> {
    const cached = healthCache;
    if (cached) {
      const ttl = cached.value.reachable ? HEALTH_CACHE_OK_MS : HEALTH_CACHE_FAIL_MS;
      if (Date.now() - cached.at < ttl) return cached.value;
    }
    const started = Date.now();
    const root = baseUrl();

    if (shouldSkipLocalOllamaProbe(root)) {
      const value: ProviderHealth = {
        reachable: false,
        provider: "ollama",
        chatModel: chatModel(),
        embedModel: embedModel(),
        baseUrl: root,
        error: "localhost Ollama skipped on hosted runtime",
        latencyMs: 0,
      };
      healthCache = { at: Date.now(), value };
      return value;
    }

    try {
      const res = await fetchWithTimeout(`${root}/api/tags`, { method: "GET" }, 2_500);
      const value: ProviderHealth = !res.ok
        ? {
            reachable: false,
            provider: "ollama",
            chatModel: chatModel(),
            embedModel: embedModel(),
            baseUrl: root,
            error: `HTTP ${res.status}`,
            latencyMs: Date.now() - started,
          }
        : {
            reachable: true,
            provider: "ollama",
            chatModel: chatModel(),
            embedModel: embedModel(),
            baseUrl: root,
            latencyMs: Date.now() - started,
          };
      healthCache = { at: Date.now(), value };
      return value;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.debug("Ollama health check failed", { message });
      const value: ProviderHealth = {
        reachable: false,
        provider: "ollama",
        chatModel: chatModel(),
        embedModel: embedModel(),
        baseUrl: root,
        error: message,
        latencyMs: Date.now() - started,
      };
      healthCache = { at: Date.now(), value };
      return value;
    }
  }
}

export const ollamaProvider = new OllamaProvider();
