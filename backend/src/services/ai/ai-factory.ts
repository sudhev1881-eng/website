import { getEnv } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { heuristicProvider } from "./providers/heuristic.provider.js";
import { ollamaProvider } from "./providers/ollama.provider.js";
import type { ProviderHealth, ResumeAiBundle, ResumeAiProviderName } from "./types.js";

export function getConfiguredResumeAiProvider(): ResumeAiProviderName {
  const name = getEnv().RESUME_AI_PROVIDER;
  return name === "heuristic" ? "heuristic" : "ollama";
}

/**
 * Pick LLM + embedding providers from env.
 * When RESUME_AI_PROVIDER=ollama but Ollama is down, callers should fall back
 * to heuristic parse — use resolveResumeAiBundle() for a health-aware pick.
 */
export function createResumeAiBundle(force?: ResumeAiProviderName): ResumeAiBundle {
  const provider = force ?? getConfiguredResumeAiProvider();
  if (provider === "heuristic") {
    return { provider: "heuristic", llm: heuristicProvider, embeddings: heuristicProvider };
  }
  return { provider: "ollama", llm: ollamaProvider, embeddings: ollamaProvider };
}

/**
 * Prefer Ollama when configured and reachable; otherwise heuristic.
 */
export async function resolveResumeAiBundle(): Promise<{
  bundle: ResumeAiBundle;
  health: ProviderHealth;
  fellBackToHeuristic: boolean;
}> {
  const configured = getConfiguredResumeAiProvider();
  if (configured === "heuristic") {
    const health = await heuristicProvider.health();
    return {
      bundle: createResumeAiBundle("heuristic"),
      health,
      fellBackToHeuristic: false,
    };
  }

  const health = await ollamaProvider.health();
  if (health.reachable) {
    return {
      bundle: createResumeAiBundle("ollama"),
      health,
      fellBackToHeuristic: false,
    };
  }

  logger.warn("Ollama unreachable — falling back to heuristic resume AI", {
    error: health.error,
    baseUrl: health.baseUrl,
  });
  return {
    bundle: createResumeAiBundle("heuristic"),
    health: {
      ...health,
      provider: "heuristic",
    },
    fellBackToHeuristic: true,
  };
}

export async function getResumeAiStatus(): Promise<{
  configuredProvider: ResumeAiProviderName;
  activeProvider: ResumeAiProviderName;
  ollamaReachable: boolean;
  chatModel: string | null;
  embedModel: string | null;
  baseUrl: string | null;
  requireConfirmation: boolean;
  fellBackToHeuristic: boolean;
  error?: string;
}> {
  const configuredProvider = getConfiguredResumeAiProvider();
  const env = getEnv();
  const { bundle, health, fellBackToHeuristic } = await resolveResumeAiBundle();

  return {
    configuredProvider,
    activeProvider: bundle.provider,
    ollamaReachable: configuredProvider === "ollama" && !fellBackToHeuristic && health.reachable,
    chatModel: env.OLLAMA_CHAT_MODEL,
    embedModel: env.OLLAMA_EMBED_MODEL,
    baseUrl: env.OLLAMA_BASE_URL,
    requireConfirmation: env.RESUME_REQUIRE_CONFIRMATION,
    fellBackToHeuristic,
    error: health.error,
  };
}
