import {
  skillFallback,
  skillResponses,
  type SkillId,
} from "@/data/skills";

export type SkillMatchResult = {
  skill: SkillId | null;
  reply: string;
  status?: (typeof skillResponses)[number]["status"];
};

export function matchSkillInput(input: string): SkillMatchResult {
  const normalized = input.toLowerCase().trim();
  if (!normalized) {
    return { skill: null, reply: skillFallback };
  }

  for (const entry of skillResponses) {
    if (entry.triggers.some((t) => normalized.includes(t))) {
      return {
        skill: entry.skill,
        reply: entry.reply,
        status: entry.status,
      };
    }
  }

  return { skill: null, reply: skillFallback };
}
