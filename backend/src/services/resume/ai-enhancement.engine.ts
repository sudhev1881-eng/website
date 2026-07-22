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
 * Falls back to heuristic (built-in) parsing when Ollama is down, extract fails,
 * returns empty/bad JSON, or enrichment is weaker than the rule-based parse.
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
      const run = await this.runOllamaIntelligence(bundle.llm, optimized, cleaned);
      if (!run.contributed || isWeakerThanHeuristic(run.data, optimized)) {
        logger.warn("Ollama produced no usable enrichment; using built-in parsing", {
          extractOk: run.extractOk,
          contributed: run.contributed,
          weaker: isWeakerThanHeuristic(run.data, optimized),
        });
        return {
          data: { ...optimized, parser: "heuristic", aiProvider: "heuristic" },
          enhanced: false,
          provider: "heuristic",
          skippedReason: "llm_failed",
        };
      }
      return {
        data: run.data,
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
  ): Promise<{ data: IntelligentResumeData; contributed: boolean; extractOk: boolean }> {
    let merged = source;
    let extractOk = false;
    let contributed = false;

    // 1) Structured extract (merge onto heuristic — never wipe with hollow LLM)
    try {
      const extract = await llm.chat(buildResumeExtractMessages(cleanedText), {
        json: true,
        temperature: 0,
        timeoutMs: 90_000,
      });
      const parsed = safeParseJson(extract.content);
      if (parsed && llmExtractHasSignal(parsed)) {
        const next = mergeExtractOntoHeuristic(source, parsed);
        extractOk = true;
        if (resumeContentScore(next) >= resumeContentScore(source)) {
          merged = next;
          contributed = true;
        } else {
          // Bad/sparse extract — keep heuristic base, do not treat as success
          logger.warn("Ollama extract was weaker than heuristic; keeping built-in parse");
        }
      } else if (parsed) {
        logger.warn("Ollama extract returned empty/hollow JSON; keeping heuristic base");
      }
    } catch (err) {
      logger.warn("Ollama extract step failed; continuing with heuristic base", {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // 2) Skill inference from projects/experience
    try {
      const beforeSkills = merged.skills.all.length;
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
        if (merged.skills.all.length > beforeSkills) contributed = true;
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
        const domains = uniqueStrings(classJson.domains ?? []).slice(0, 8);
        const classifications = uniqueStrings(classJson.classifications ?? []).slice(0, 8);
        if (domains.length || classifications.length) {
          merged = {
            ...merged,
            domains: domains.length ? domains : merged.domains,
            classifications: classifications.length ? classifications : merged.classifications,
          };
          contributed = true;
        }
      }
    } catch (err) {
      logger.warn("Ollama classify step failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // 4) Wording polish (no invent)
    try {
      const before = resumeContentScore(merged);
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
        const next = mergeEnhancementNoInvent(merged, polished);
        if (
          next.summary !== merged.summary ||
          next.objective !== merged.objective ||
          JSON.stringify(next.experience) !== JSON.stringify(merged.experience) ||
          JSON.stringify(next.projects) !== JSON.stringify(merged.projects)
        ) {
          merged = next;
          contributed = true;
        } else if (resumeContentScore(next) >= before) {
          merged = next;
        }
      }
    } catch (err) {
      logger.warn("Ollama enhance step failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }

    if (!contributed) {
      return {
        data: { ...source, parser: "heuristic", aiProvider: "heuristic" },
        contributed: false,
        extractOk,
      };
    }

    return {
      data: {
        ...merged,
        parser: extractOk ? "ollama" : "heuristic+llm",
        aiProvider: "ollama",
      },
      contributed: true,
      extractOk,
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

/** True when LLM extract JSON has at least one useful field. */
export function llmExtractHasSignal(llmRaw: unknown): boolean {
  if (!llmRaw || typeof llmRaw !== "object") return false;
  const obj = llmRaw as Record<string, unknown>;
  if (typeof obj.summary === "string" && obj.summary.trim()) return true;
  if (typeof obj.objective === "string" && obj.objective.trim()) return true;
  if (Array.isArray(obj.experience) && obj.experience.length > 0) return true;
  if (Array.isArray(obj.education) && obj.education.length > 0) return true;
  if (Array.isArray(obj.projects) && obj.projects.length > 0) return true;
  if (Array.isArray(obj.skills) && obj.skills.length > 0) return true;
  if (obj.skills && typeof obj.skills === "object") {
    const s = obj.skills as { all?: unknown[]; technical?: unknown[] };
    if ((s.all?.length ?? 0) > 0 || (s.technical?.length ?? 0) > 0) return true;
  }
  const coerced = coerceToIntelligentResumeData(llmRaw);
  if (!coerced) return false;
  return resumeContentScore(coerced) > 0;
}

/** Rough richness score for comparing heuristic vs LLM structured output. */
export function resumeContentScore(d: IntelligentResumeData): number {
  const str = (v: string | null | undefined) => (v && v.trim() ? 1 : 0);
  const len = <T>(arr: T[] | null | undefined) => (Array.isArray(arr) ? arr.length : 0);
  const experience = Array.isArray(d.experience) ? d.experience : [];
  const education = Array.isArray(d.education) ? d.education : [];
  const projects = Array.isArray(d.projects) ? d.projects : [];
  const skillsAll = Array.isArray(d.skills?.all) ? d.skills.all : [];
  return (
    str(d.summary) * 2 +
    str(d.objective) +
    str(d.personal?.name) +
    len(d.contact?.emails) +
    len(d.contact?.phones) +
    experience.filter((e) => e.title || e.company || e.startDate).length * 3 +
    education.filter((e) => e.school || e.degree || e.raw).length * 2 +
    projects.filter((p) => p.name || p.description).length * 2 +
    Math.min(skillsAll.length, 20) +
    len(d.certifications) +
    len(d.languages) +
    len(d.achievements)
  );
}

/** Prefer built-in parse when AI output is clearly thinner. */
export function isWeakerThanHeuristic(
  candidate: IntelligentResumeData,
  heuristic: IntelligentResumeData,
): boolean {
  const h = resumeContentScore(heuristic);
  if (h === 0) return false;
  return resumeContentScore(candidate) < h * 0.75;
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

  /** Prefer LLM only when it has at least as many items as heuristic (avoids sparse overwrite). */
  const preferRicherArr = <T>(llm: T[] | null | undefined, heur: T[] | null | undefined): T[] => {
    const a = Array.isArray(llm) ? llm : [];
    const b = Array.isArray(heur) ? heur : [];
    if (!a.length) return b;
    if (!b.length) return a;
    return a.length >= b.length ? a : b;
  };
  const preferStr = (a: string | null | undefined, b: string | null | undefined) =>
    a && a.trim() ? a : b ?? null;

  const links = preferRicherArr(
    social.length ? social : coerced.links,
    heuristic.links?.length ? heuristic.links : heuristic.socialLinks,
  );

  const skillsTechnical = preferRicherArr(coerced.skills?.technical, heuristic.skills?.technical);
  const skillsSoft = preferRicherArr(coerced.skills?.soft, heuristic.skills?.soft);
  const coercedAll = Array.isArray(coerced.skills?.all) ? coerced.skills.all : [];
  const heuristicAll = Array.isArray(heuristic.skills?.all) ? heuristic.skills.all : [];
  const skillsAll =
    coercedAll.length >= heuristicAll.length && coercedAll.length > 0
      ? coercedAll
      : [...skillsTechnical, ...skillsSoft].length
        ? [...skillsTechnical, ...skillsSoft]
        : heuristicAll;

  return {
    ...heuristic,
    personal: {
      name: preferStr(coerced.personal.name, heuristic.personal.name),
      title: preferStr(coerced.personal.title, heuristic.personal.title),
    },
    contact: {
      ...heuristic.contact,
      emails: preferRicherArr(coerced.contact?.emails, heuristic.contact?.emails),
      phones: preferRicherArr(coerced.contact?.phones, heuristic.contact?.phones),
      linkedin: preferStr(coerced.contact?.linkedin, heuristic.contact?.linkedin),
      github: preferStr(coerced.contact?.github, heuristic.contact?.github),
      website: preferStr(coerced.contact?.website, heuristic.contact?.website),
      address: preferStr(coerced.contact?.address, heuristic.contact?.address),
      name: preferStr(coerced.contact?.name, heuristic.contact?.name),
    },
    summary: preferStr(coerced.summary, heuristic.summary),
    objective: preferStr(coerced.objective, heuristic.objective),
    education: preferRicherArr(coerced.education, heuristic.education),
    experience: preferRicherExperience(coerced.experience, heuristic.experience),
    projects: preferRicherArr(coerced.projects, heuristic.projects),
    skills: { technical: skillsTechnical, soft: skillsSoft, all: skillsAll },
    languages: preferRicherArr(coerced.languages, heuristic.languages),
    certifications: preferRicherArr(coerced.certifications, heuristic.certifications),
    awards: preferRicherArr(coerced.awards, heuristic.awards),
    achievements: preferRicherArr(coerced.achievements, heuristic.achievements),
    volunteer: preferRicherArr(coerced.volunteer, heuristic.volunteer),
    leadership: preferRicherArr(coerced.leadership, heuristic.leadership),
    publications: preferRicherArr(coerced.publications, heuristic.publications),
    interests: preferRicherArr(coerced.interests, heuristic.interests),
    links,
    socialLinks: links,
    domains: preferRicherArr(coerced.domains, heuristic.domains),
    classifications: preferRicherArr(coerced.classifications, heuristic.classifications),
    portfolio: preferStr(coerced.portfolio, heuristic.portfolio) ?? preferStr(coerced.contact?.website, heuristic.portfolio),
    github: preferStr(coerced.github, heuristic.github) ?? preferStr(coerced.contact?.github, heuristic.github),
    linkedin: preferStr(coerced.linkedin, heuristic.linkedin) ?? preferStr(coerced.contact?.linkedin, heuristic.linkedin),
  };
}

function preferRicherExperience(
  llm: IntelligentResumeData["experience"],
  heuristic: IntelligentResumeData["experience"],
): IntelligentResumeData["experience"] {
  if (!Array.isArray(llm) || llm.length === 0) return heuristic;
  const substantive = (jobs: IntelligentResumeData["experience"]) =>
    jobs.filter((e) => e.title || e.company || e.startDate).length;
  const llmN = substantive(llm);
  const heurN = substantive(heuristic);
  if (llmN === 0 && heurN > 0) return heuristic;
  if (heurN > llmN) return heuristic;
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
