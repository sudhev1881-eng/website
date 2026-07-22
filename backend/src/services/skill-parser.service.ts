import {
  getSearchPhrases,
  getSkillCategory,
  type SkillCategory,
} from "../data/skill-dictionary.js";

export interface ParsedSkill {
  name: string;
  category: SkillCategory;
  /** 0–1 confidence from match quality / section proximity. */
  confidence: number;
  mentionCount: number;
}

export interface SkillParseResult {
  skills: ParsedSkill[];
  /** Overall extraction quality heuristic 0–1. */
  extractionConfidence: number;
  structuredData: {
    skills: ParsedSkill[];
    skillCount: number;
    textLength: number;
  };
}

const SKILLS_SECTION =
  /\b(skills?|technical skills?|technologies|tech stack|tools?|competenc(?:y|ies)|proficienc(?:y|ies))\b/i;

/**
 * Dictionary-based skill extraction from resume plain text (no paid APIs).
 */
export function parseSkillsFromText(rawText: string): SkillParseResult {
  const text = rawText.replace(/\s+/g, " ").trim();
  if (!text) {
    return {
      skills: [],
      extractionConfidence: 0,
      structuredData: { skills: [], skillCount: 0, textLength: 0 },
    };
  }

  const lower = text.toLowerCase();
  const phrases = getSearchPhrases();
  const hits = new Map<string, { count: number; bestConfidence: number }>();

  // Mark consumed spans so shorter aliases don't double-count inside longer matches.
  const consumed = new Array<boolean>(lower.length).fill(false);

  for (const { phrase, canonical } of phrases) {
    if (phrase.length < 2) continue;

    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(phrase, from);
      if (idx === -1) break;

      const end = idx + phrase.length;
      const before = idx === 0 ? " " : lower[idx - 1];
      const after = end >= lower.length ? " " : lower[end];
      // Allow punctuation (.,;:) as boundaries so "Next.js." still matches.
      const boundaryOk = !/[a-z0-9+#]/i.test(before) && !/[a-z0-9+#]/i.test(after);

      let overlap = false;
      for (let i = idx; i < end; i++) {
        if (consumed[i]) {
          overlap = true;
          break;
        }
      }

      if (boundaryOk && !overlap) {
        for (let i = idx; i < end; i++) consumed[i] = true;

        const nearSkillsHeading = isNearSkillsSection(lower, idx);
        const confidence = nearSkillsHeading ? 0.95 : phrase.length >= 6 ? 0.8 : 0.65;
        const prev = hits.get(canonical);
        if (prev) {
          prev.count += 1;
          prev.bestConfidence = Math.max(prev.bestConfidence, confidence);
        } else {
          hits.set(canonical, { count: 1, bestConfidence: confidence });
        }
      }

      from = idx + 1;
    }
  }

  const skills: ParsedSkill[] = [...hits.entries()]
    .map(([name, { count, bestConfidence }]) => ({
      name,
      category: getSkillCategory(name),
      confidence: Math.min(1, bestConfidence + Math.min(0.05, (count - 1) * 0.02)),
      mentionCount: count,
    }))
    .sort((a, b) => b.confidence - a.confidence || a.name.localeCompare(b.name));

  const avg =
    skills.length === 0
      ? 0
      : skills.reduce((sum, s) => sum + s.confidence, 0) / skills.length;
  const lengthBonus = Math.min(0.15, text.length / 20_000);
  const extractionConfidence = Math.min(1, avg * 0.85 + lengthBonus + (skills.length > 0 ? 0.1 : 0));

  return {
    skills,
    extractionConfidence,
    structuredData: {
      skills,
      skillCount: skills.length,
      textLength: text.length,
    },
  };
}

function isNearSkillsSection(lower: string, index: number): boolean {
  const windowStart = Math.max(0, index - 280);
  const snippet = lower.slice(windowStart, index + 40);
  return SKILLS_SECTION.test(snippet);
}
