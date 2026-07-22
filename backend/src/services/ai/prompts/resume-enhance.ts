import { DATA_ONLY_SYSTEM_PREFIX, wrapUntrustedResumeData } from "../sanitize.js";
import type { ChatMessage } from "../types.js";

/** Polish wording only — never invent facts. */
export function buildResumeEnhanceMessages(
  sourceJson: unknown,
  rawText: string,
): ChatMessage[] {
  const system = `${DATA_ONLY_SYSTEM_PREFIX}

You polish resume language for grammar, ATS readability, and clarity.
Return ONLY JSON with optional keys:
summary, objective,
experience (array of {bullets: string[]}),
projects (array of {description: string|null}),
achievements (string[]).

HARD RULES:
- NEVER invent employers, job titles, dates, schools, credentials, skills, certifications, or URLs.
- Only rephrase text already present in the source JSON / resume text.
- Keep the same number of experience entries and bullet counts (or fewer if removing empty bullets).
- Do not add new sections or facts.`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `Source structured data:\n${JSON.stringify(sourceJson)}\n\n${wrapUntrustedResumeData(rawText)}`,
    },
  ];
}
