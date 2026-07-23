export type {
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResult,
  EmbeddingOptions,
  EmbeddingResult,
  EmbeddingProvider,
  LLMProvider,
  ProviderHealth,
  ResumeAiBundle,
  ResumeAiProviderName,
} from "./types.js";

export { sanitizeResumeText, wrapUntrustedResumeData, DATA_ONLY_SYSTEM_PREFIX } from "./sanitize.js";
export { buildResumeExtractMessages } from "./prompts/resume-extract.js";
export { buildResumeEnhanceMessages } from "./prompts/resume-enhance.js";
export { buildSkillInferMessages } from "./prompts/skill-infer.js";
export { buildClassifyMessages } from "./prompts/classify.js";
export {
  OllamaProvider,
  ollamaProvider,
  markOllamaUnreachable,
  clearOllamaHealthCache,
  shouldSkipLocalOllamaProbe,
} from "./providers/ollama.provider.js";
export { HeuristicProvider, heuristicProvider } from "./providers/heuristic.provider.js";
export {
  createResumeAiBundle,
  resolveResumeAiBundle,
  getConfiguredResumeAiProvider,
  getResumeAiStatus,
} from "./ai-factory.js";
