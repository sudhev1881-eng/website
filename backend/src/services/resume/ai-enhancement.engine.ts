import { getEnv } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { SectionOptimizer } from "./section-optimizer.js";
import type { IntelligentResumeData } from "./types.js";

export interface EnhancementResult {
  data: IntelligentResumeData;
  enhanced: boolean;
  skippedReason?: "no_key" | "empty" | "llm_failed";
}

const MAX_CHARS = 14_000;

/**
 * AiEnhancementEngine — optional OpenAI polish.
 * NEVER invents employers, dates, credentials, or skills not in source.
 * Without OPENAI_API_KEY: pass-through heuristic data (parser stays heuristic).
 */
export class AiEnhancementEngine {
  constructor(private readonly optimizer = new SectionOptimizer()) {}

  async enhance(
    rawExtracted: IntelligentResumeData,
    rawText: string,
  ): Promise<EnhancementResult> {
    const optimized = this.optimizer.optimizeForAts(rawExtracted);
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return {
        data: { ...optimized, parser: "heuristic" },
        enhanced: false,
        skippedReason: "no_key",
      };
    }

    if (!rawText.trim()) {
      return { data: optimized, enhanced: false, skippedReason: "empty" };
    }

    try {
      const polished = await this.polishWithLlm(optimized, rawText, apiKey);
      if (!polished) {
        return { data: optimized, enhanced: false, skippedReason: "llm_failed" };
      }
      return {
        data: mergeEnhancementNoInvent(optimized, polished),
        enhanced: true,
      };
    } catch (err) {
      logger.warn("AI resume enhancement failed; using heuristic data", {
        message: err instanceof Error ? err.message : String(err),
      });
      return { data: optimized, enhanced: false, skippedReason: "llm_failed" };
    }
  }

  private async polishWithLlm(
    source: IntelligentResumeData,
    rawText: string,
    apiKey: string,
  ): Promise<Partial<IntelligentResumeData> | null> {
    const model = getEnv().OPENAI_MODEL;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You polish resume language for grammar, ATS readability, and clarity.
Return ONLY JSON with optional keys: summary, objective, experience (array of {bullets: string[]}), projects (array of {description: string|null}), achievements (string[]).
HARD RULES:
- NEVER invent employers, job titles, dates, schools, credentials, skills, certifications, or URLs.
- Only rephrase text already present in the source JSON / resume text.
- Keep the same number of experience entries and bullet counts (or fewer if removing empty bullets).
- Do not add new sections or facts.`,
            },
            {
              role: "user",
              content: `Source structured data:\n${JSON.stringify({
                summary: source.summary,
                objective: source.objective,
                experience: source.experience.map((e) => ({
                  title: e.title,
                  company: e.company,
                  bullets: e.bullets,
                })),
                projects: source.projects.map((p) => ({
                  name: p.name,
                  description: p.description,
                })),
                achievements: source.achievements,
              })}\n\nResume text (context only):\n${rawText.slice(0, MAX_CHARS)}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        logger.warn("OpenAI enhancement HTTP error", { status: res.status });
        return null;
      }

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content;
      if (!content) return null;
      return JSON.parse(content) as Partial<IntelligentResumeData>;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Merge polish onto source without inventing entities.
 * Exported for unit tests.
 */
export function mergeEnhancementNoInvent(
  source: IntelligentResumeData,
  polished: Partial<IntelligentResumeData>,
): IntelligentResumeData {
  const summary =
    typeof polished.summary === "string" && polished.summary.trim()
      ? polished.summary.trim()
      : source.summary;

  const objective =
    typeof polished.objective === "string" && polished.objective.trim()
      ? polished.objective.trim()
      : source.objective;

  const experience = source.experience.map((exp, i) => {
    const p = Array.isArray(polished.experience) ? polished.experience[i] : undefined;
    if (!p || !Array.isArray(p.bullets)) return exp;
    // Keep company/title/dates from source; only accept bullet rewrites up to source length
    const bullets = exp.bullets.map((orig, bi) => {
      const next = p.bullets[bi];
      return typeof next === "string" && next.trim() ? next.trim() : orig;
    });
    return { ...exp, bullets };
  });

  const projects = source.projects.map((proj, i) => {
    const p = Array.isArray(polished.projects) ? polished.projects[i] : undefined;
    if (!p || typeof p.description !== "string" || !p.description.trim()) return proj;
    return { ...proj, description: p.description.trim() };
  });

  const achievements =
    Array.isArray(polished.achievements) && polished.achievements.length === source.achievements.length
      ? polished.achievements.map((a, i) =>
          typeof a === "string" && a.trim() ? a.trim() : source.achievements[i],
        )
      : source.achievements;

  return {
    ...source,
    summary,
    objective,
    experience,
    projects,
    achievements,
    // Preserve factual fields from source only
    contact: source.contact,
    personal: source.personal,
    education: source.education,
    skills: source.skills,
    certifications: source.certifications,
    languages: source.languages,
    parser: "enhanced",
  };
}

export const aiEnhancementEngine = new AiEnhancementEngine();
