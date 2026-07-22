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

/**
 * Thin heuristic provider — no remote LLM.
 * chat() throws so callers fall back to local parsers;
 * embed() returns empty vectors (pipeline marks skipped).
 */
export class HeuristicProvider implements LLMProvider, EmbeddingProvider {
  readonly name = "heuristic" as const;

  async chat(_messages: ChatMessage[], _options?: ChatCompletionOptions): Promise<ChatCompletionResult> {
    throw new Error("Heuristic provider has no LLM chat — use local resume parser");
  }

  async embed(texts: string[], _options?: EmbeddingOptions): Promise<EmbeddingResult> {
    return {
      embeddings: texts.map(() => []),
      model: "none",
      provider: "heuristic",
    };
  }

  async health(): Promise<ProviderHealth> {
    return {
      reachable: true,
      provider: "heuristic",
      chatModel: null,
      embedModel: null,
      baseUrl: null,
    };
  }
}

export const heuristicProvider = new HeuristicProvider();
