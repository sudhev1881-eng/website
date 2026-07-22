import { DATA_ONLY_SYSTEM_PREFIX, wrapUntrustedResumeData } from "../sanitize.js";
import type { ChatMessage } from "../types.js";

const DOMAIN_HINTS = [
  "AI",
  "Machine Learning",
  "Cybersecurity",
  "Web Development",
  "Mobile",
  "Cloud",
  "Data Science",
  "DevOps",
  "Embedded",
  "FinTech",
  "Healthcare",
  "Product Management",
  "UI/UX",
  "Networking",
  "Game Development",
];

/** Classify career/technical domains from resume evidence. */
export function buildClassifyMessages(summaryParts: unknown, rawText: string): ChatMessage[] {
  const system = `${DATA_ONLY_SYSTEM_PREFIX}

Classify the candidate into 1–5 domains based only on resume evidence.
Suggested labels (you may use close variants): ${DOMAIN_HINTS.join(", ")}.
Return ONLY JSON:
{"domains": ["..."], "classifications": ["..."], "rationale": "one short sentence"}
Do not invent experience to justify a domain.`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `Summary of structured signals:\n${JSON.stringify(summaryParts)}\n\n${wrapUntrustedResumeData(rawText)}`,
    },
  ];
}
