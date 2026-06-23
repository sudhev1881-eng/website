import {
  chatFallback,
  chatResponses,
  chatTabFallbacks,
  type ChatTab,
  type WorkflowTopic,
} from "@/data/process";

export type MatchResult = {
  topic: WorkflowTopic | null;
  reply: string;
  status?: (typeof chatResponses)[number]["status"];
};

export function matchChatInput(input: string, tab: ChatTab): MatchResult {
  const normalized = input.toLowerCase().trim();
  const fallback = chatTabFallbacks[tab] ?? chatFallback;

  if (!normalized) {
    return { topic: null, reply: fallback };
  }

  const candidates = chatResponses.filter(
    (entry) => !entry.tabs || entry.tabs.includes(tab)
  );

  for (const entry of candidates) {
    if (entry.triggers.some((t) => normalized.includes(t))) {
      return {
        topic: entry.topic,
        reply: entry.reply,
        status: entry.status,
      };
    }
  }

  return { topic: null, reply: fallback };
}
