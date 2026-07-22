/**
 * Provider-agnostic AI interfaces for StudentLink.
 * Model names and base URLs come from env — never hardcode vendors in callers.
 */

export type ResumeAiProviderName = "ollama" | "heuristic";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  /** Override env chat model for this call */
  model?: string;
  temperature?: number;
  /** Request JSON object output when the provider supports it */
  json?: boolean;
  /** Abort / timeout in ms */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: ResumeAiProviderName;
}

export interface EmbeddingOptions {
  model?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  provider: ResumeAiProviderName;
}

export interface ProviderHealth {
  reachable: boolean;
  provider: ResumeAiProviderName;
  chatModel: string | null;
  embedModel: string | null;
  baseUrl?: string | null;
  error?: string;
  latencyMs?: number;
}

/** Text generation (chat / instruct). */
export interface LLMProvider {
  readonly name: ResumeAiProviderName;
  chat(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult>;
  health(): Promise<ProviderHealth>;
}

/** Vector embeddings. */
export interface EmbeddingProvider {
  readonly name: ResumeAiProviderName;
  embed(texts: string[], options?: EmbeddingOptions): Promise<EmbeddingResult>;
  health(): Promise<ProviderHealth>;
}

/** Combined resume-intelligence surface used by the pipeline. */
export interface ResumeAiBundle {
  provider: ResumeAiProviderName;
  llm: LLMProvider;
  embeddings: EmbeddingProvider;
}
