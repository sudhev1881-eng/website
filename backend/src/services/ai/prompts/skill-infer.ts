import { DATA_ONLY_SYSTEM_PREFIX, wrapUntrustedResumeData } from "../sanitize.js";
import type { ChatMessage } from "../types.js";

/** Infer technical/soft skills from project + experience descriptions without inventing unrelated skills. */
export function buildSkillInferMessages(
  projectsAndExperience: unknown,
  rawText: string,
): ChatMessage[] {
  const system = `${DATA_ONLY_SYSTEM_PREFIX}

Infer skills that are clearly evidenced by project/experience descriptions.
Return ONLY JSON:
{
  "technical": [{"name": "", "category": "", "confidence": 0.0}],
  "soft": [{"name": "", "category": "", "confidence": 0.0}]
}
Rules:
- Only skills explicitly mentioned or strongly implied by tools/libraries/frameworks named in the text.
- confidence 0–1. Prefer fewer high-confidence skills over speculative lists.
- Do not invent certifications or years of experience.`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `Projects/experience JSON:\n${JSON.stringify(projectsAndExperience)}\n\n${wrapUntrustedResumeData(rawText)}`,
    },
  ];
}
