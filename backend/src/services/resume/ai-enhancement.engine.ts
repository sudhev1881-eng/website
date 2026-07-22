import { logger } from "../../config/logger.js";
import {
  buildClassifyMessages,
  buildResumeEnhanceMessages,
  buildResumeExtractMessages,
  buildSkillInferMessages,
  resolveResumeAiBundle,
  sanitizeResumeText,
  type LLMProvider,
  type ResumeAiProviderName,
} from "../ai/index.js";
import { SectionOptimizer } from "./section-optimizer.js";
import {
  emptyIntelligentResumeData,
  type IntelligentResumeData,
} from "./types.js";
import { coerceToIntelligentResumeData } from "./schema-mapper.js";

export interface EnhancementResult {
  data: IntelligentResumeData;
  enhanced: boolean;
  provider: ResumeAiProviderName;
  skippedReason?: "unavailable" | "empty" | "llm_failed" | "heuristic_only";
}

const MAX_CHARS = 14_000;

/**
 * AiEnhancementEngine — Ollama (via AI factory) polish + extract enrichment.
 * NEVER invents employers, dates, credentials, or skills not in source.
 * Falls back to heuristic data when Ollama is down or RESUME_AI_PROVIDER=heuristic.
 */
export class AiEnhancementEngine {
  constructor(private readonly optimizer = new SectionOptimizer()) {}

  async enhance(
    rawExtracted: IntelligentResumeData,
    rawText: string,
  ): Promise<EnhancementResult> {
    const optimized = this.optimizer.optimizeForAts(rawExtracted);
    const cleaned = sanitizeResumeText(rawText, MAX_CHARS);

    if (!cleaned.trim()) {
      return {
        data: { ...optimized, parser: "heuristic", aiProvider: "heuristic" },
        enhanced: false,
        provider: "heuristic",
        skippedReason: "empty",
      };
    }

    const { bundle, fellBackToHeuristic } = await resolveResumeAiBundle();
    if (bundle.provider === "heuristic" || fellBackToHeuristic) {
      return {
        data: { ...optimized, parser: "heuristic", aiProvider: "heuristic" },
        enhanced: false,
        provider: "heuristic",
        skippedReason: fellBackToHeuristic ? "unavailable" : "heuristic_only",
      };
    }

    try {
      const enriched = await this.runOllamaIntelligence(bundle.llm, optimized, cleaned);
      return {
        data: enriched,
        enhanced: true,
        provider: "ollama",
      };
    } catch (err) {
      logger.warn("Ollama resume enhancement failed; using heuristic data", {
        message: err instanceof Error ? err.message : String(err),
      });
      return {
        data: { ...optimized, parser: "heuristic", aiProvider: "heuristic" },
        enhanced: false,
        provider: "heuristic",
        skippedReason: "llm_failed",
      };
    }
  }

  private async runOllamaIntelligence(
    llm: LLMProvider,
    source: IntelligentResumeData,
    cleanedText: string,
  ): Promise<IntelligentResumeData> {
    // 1) Structured extract (merge onto heuristic — never wipe with hollow LLM)
    let merged = source;
    try {
      const extract = await llm.chat(buildResumeExtractMessages(cleanedText), {
        json: true,
        temperature: 0,
        timeoutMs: 90_000,
      });
      const parsed = safeParseJson(extract.content);
      if (parsed) {
        merged = mergeExtractOntoHeuristic(source, parsed);
      }
    } catch (err) {
      logger.warn("Ollama extract step failed; continuing with heuristic base", {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // 2) Skill inference from projects/experience
    try {
      const skillRes = await llm.chat(
        buildSkillInferMessages(
          {
            projects: merged.projects.slice(0, 12),
            experience: merged.experience.slice(0, 10).map((e) => ({
              title: e.title,
              company: e.company,
              bullets: e.bullets,
            })),
          },
          cleanedText,
        ),
        { json: true, temperature: 0, timeoutMs: 60_000 },
      );
      const skillJson = safeParseJson(skillRes.content) as {
        technical?: Array<{ name?: string; category?: string; confidence?: number }>;
        soft?: Array<{ name?: string; category?: string; confidence?: number }>;
      } | null;
      if (skillJson) {
        merged = mergeInferredSkills(merged, skillJson);
      }
    } catch (err) {
      logger.warn("Ollama skill-infer step failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // 3) Domain classification
    try {
      const classRes = await llm.chat(
        buildClassifyMessages(
          {
            summary: merged.summary,
            skills: merged.skills.all.slice(0, 30).map((s) => s.name),
            projects: merged.projects.slice(0, 8).map((p) => p.name),
            experience: merged.experience.slice(0, 6).map((e) => e.title),
          },
          cleanedText,
        ),
        { json: true, temperature: 0, timeoutMs: 45_000 },
      );
      const classJson = safeParseJson(classRes.content) as {
        domains?: string[];
        classifications?: string[];
      } | null;
      if (classJson) {
        merged = {
          ...merged,
          domains: uniqueStrings(classJson.domains ?? merged.domains).slice(0, 8),
          classifications: uniqueStrings(classJson.classifications ?? merged.classifications).slice(
            0,
            8,
          ),
        };
      }
    } catch (err) {
      logger.warn("Ollama classify step failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // 4) Wording polish (no invent)
    try {
      const polishRes = await llm.chat(
        buildResumeEnhanceMessages(
          {
            summary: merged.summary,
            objective: merged.objective,
            experience: merged.experience.map((e) => ({
              title: e.title,
              company: e.company,
              bullets: e.bullets,
            })),
            projects: merged.projects.map((p) => ({
              name: p.name,
              description: p.description,
            })),
            achievements: merged.achievements,
          },
          cleanedText,
        ),
        { json: true, temperature: 0.2, timeoutMs: 60_000 },
      );
      const polished = safeParseJson(polishRes.content) as Partial<IntelligentResumeData> | null;
      if (polished) {
        merged = mergeEnhancementNoInvent(merged, polished);
      }
    } catch (err) {
      logger.warn("Ollama enhance step failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      ...merged,
      parser: "ollama",
      aiProvider: "ollama",
    };
  }
}

function safeParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function uniqueStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Merge Ollama extract onto heuristic without wiping richer heuristic sections. */
export function mergeExtractOntoHeuristic(
  heuristic: IntelligentResumeData,
  llmRaw: unknown,
): IntelligentResumeData {
  const coerced = coerceToIntelligentResumeData(llmRaw) ?? emptyIntelligentResumeData();
  const social =
    Array.isArray((llmRaw as { socialLinks?: unknown }).socialLinks)
      ? ((llmRaw as { socialLinks: Array<{ label?: string; url?: string }> }).socialLinks
          .filter((l) => l?.url)
          .map((l) => ({ label: String(l.label ?? "Link"), url: String(l.url) })) as IntelligentResumeData["socialLinks"])
      : [];

  const preferArr = <T>(a: T[], b: T[]): T[] => (a.length > 0 ? a : b);
  const preferStr = (a: string | null | undefined, b: string | null | undefined) =>
    a && a.trim() ? a : b ?? null;

  const links = preferArr(
    social.length ? social : coerced.links,
    heuristic.links.length ? heuristic.links : heuristic.socialLinks,
  );

  const skillsTechnical = preferArr(coerced.skills.technical, heuristic.skills.technical);
  const skillsSoft = preferArr(coerced.skills.soft, heuristic.skills.soft);
  const skillsAll =
    coerced.skills.all.length > 0
      ? coerced.skills.all
      : [...skillsTechnical, ...skillsSoft].length
        ? [...skillsTechnical, ...skillsSoft]
        : heuristic.skills.all;

  return {
    ...heuristic,
    personal: {
      name: preferStr(coerced.personal.name, heuristic.personal.name),
      title: preferStr(coerced.personal.title, heuristic.personal.title),
    },
    contact: {
      ...heuristic.contact,
      emails: preferArr(coerced.contact.emails, heuristic.contact.emails),
      phones: preferArr(coerced.contact.phones, heuristic.contact.phones),
      linkedin: preferStr(coerced.contact.linkedin, heuristic.contact.linkedin),
      github: preferStr(coerced.contact.github, heuristic.contact.github),
      website: preferStr(coerced.contact.website, heuristic.contact.website),
      address: preferStr(coerced.contact.address, heuristic.contact.address),
      name: preferStr(coerced.contact.name, heuristic.contact.name),
    },
    summary: preferStr(coerced.summary, heuristic.summary),
    objective: preferStr(coerced.objective, heuristic.objective),
    education: preferArr(coerced.education, heuristic.education),
    experience: preferRicherExperience(coerced.experience, heuristic.experience),
    projects: preferArr(coerced.projects, heuristic.projects),
    skills: { technical: skillsTechnical, soft: skillsSoft, all: skillsAll },
    languages: preferArr(coerced.languages, heuristic.languages),
    certifications: preferArr(coerced.certifications, heuristic.certifications),
    awards: preferArr(coerced.awards, heuristic.awards),
    achievements: preferArr(coerced.achievements, heuristic.achievements),
    volunteer: preferArr(coerced.volunteer, heuristic.volunteer),
    leadership: preferArr(coerced.leadership, heuristic.leadership),
    publications: preferArr(coerced.publications, heuristic.publications),
    interests: preferArr(coerced.interests, heuristic.interests),
    links,
    socialLinks: links,
    domains: preferArr(coerced.domains, heuristic.domains),
    classifications: preferArr(coerced.classifications, heuristic.classifications),
    portfolio: preferStr(coerced.portfolio, heuristic.portfolio) ?? preferStr(coerced.contact.website, heuristic.portfolio),
    github: preferStr(coerced.github, heuristic.github) ?? preferStr(coerced.contact.github, heuristic.github),
    linkedin: preferStr(coerced.linkedin, heuristic.linkedin) ?? preferStr(coerced.contact.linkedin, heuristic.linkedin),
  };
}

function preferRicherExperience(
  llm: IntelligentResumeData["experience"],
  heuristic: IntelligentResumeData["experience"],
): IntelligentResumeData["experience"] {
  if (!Array.isArray(llm) || llm.length === 0) return heuristic;
  const substantive = (jobs: IntelligentResumeData["experience"]) =>
    jobs.filter((e) => e.title || e.company || e.startDate).length;
  if (substantive(llm) === 0 && substantive(heuristic) > 0) return heuristic;
  return llm;
}

function mergeInferredSkills(
  data: IntelligentResumeData,
  inferred: {
    technical?: Array<{ name?: string; category?: string; confidence?: number }>;
    soft?: Array<{ name?: string; category?: string; confidence?: number }>;
  },
): IntelligentResumeData {
  const byName = new Map<string, IntelligentResumeData["skills"]["all"][number]>();
  for (const s of data.skills.all) {
    byName.set(s.name.toLowerCase(), { ...s });
  }
  const add = (
    list: Array<{ name?: string; category?: string; confidence?: number }> | undefined,
    soft: boolean,
  ) => {
    for (const s of list ?? []) {
      if (!s?.name?.trim()) continue;
      const key = s.name.trim().toLowerCase();
      const prev = byName.get(key);
      if (prev) {
        prev.confidence = Math.max(prev.confidence ?? 0, s.confidence ?? 0.7);
        if (s.category) prev.category = s.category;
      } else {
        byName.set(key, {
          name: s.name.trim(),
          category: s.category || (soft ? "Soft" : "Technical"),
          frequency: 1,
          confidence: s.confidence ?? 0.7,
        });
      }
    }
  };
  add(inferred.technical, false);
  add(inferred.soft, true);

  const all = [...byName.values()];
  const softNames = new Set(
    (inferred.soft ?? []).map((s) => s.name?.trim().toLowerCase()).filter(Boolean) as string[],
  );
  const technical = all.filter((s) => !softNames.has(s.name.toLowerCase()) || s.category !== "Soft");
  const soft = all.filter((s) => softNames.has(s.name.toLowerCase()) || s.category === "Soft");

  return {
    ...data,
    skills: {
      technical: technical.length ? technical : data.skills.technical,
      soft: soft.length ? soft : data.skills.soft,
      all,
    },
  };
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
    contact: source.contact,
    personal: source.personal,
    education: source.education,
    skills: source.skills,
    certifications: source.certifications,
    languages: source.languages,
    parser: source.parser === "ollama" ? "ollama" : "enhanced",
  };
}

export const aiEnhancementEngine = new AiEnhancementEngine();
