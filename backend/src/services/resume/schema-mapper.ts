import { randomUUID } from "node:crypto";
import type { StructuredResumeData } from "../resume-structured-parser.service.js";
import {
  emptyIntelligentResumeData,
  type IntelligentResumeData,
  type RichCertification,
} from "./types.js";

const SOFT_SKILL_HINTS = new Set(
  [
    "leadership",
    "communication",
    "teamwork",
    "collaboration",
    "problem solving",
    "problem-solving",
    "time management",
    "adaptability",
    "creativity",
    "critical thinking",
    "organization",
    "mentoring",
    "presentation",
    "negotiation",
    "conflict resolution",
  ].map((s) => s.toLowerCase()),
);

/**
 * Expand legacy StructuredResumeData into the richer intelligent schema.
 * Does not invent facts — only reshapes and enriches from section text when present.
 */
export function toIntelligentResumeData(
  structured: StructuredResumeData,
  extras?: {
    certifications?: RichCertification[];
    awards?: IntelligentResumeData["awards"];
    achievements?: string[];
    volunteer?: IntelligentResumeData["volunteer"];
    leadership?: IntelligentResumeData["leadership"];
    publications?: IntelligentResumeData["publications"];
    research?: IntelligentResumeData["research"];
    patents?: IntelligentResumeData["patents"];
    clubs?: IntelligentResumeData["clubs"];
    extracurricular?: string[];
    interests?: string[];
    objective?: string | null;
    customSections?: IntelligentResumeData["customSections"];
  },
): IntelligentResumeData {
  const base = emptyIntelligentResumeData();
  const skillsAll = structured.skills ?? [];
  const technical: IntelligentResumeData["skills"]["technical"] = [];
  const soft: IntelligentResumeData["skills"]["soft"] = [];

  for (const s of skillsAll) {
    const key = s.name.trim().toLowerCase();
    if (SOFT_SKILL_HINTS.has(key) || s.category?.toLowerCase() === "soft") {
      soft.push(s);
    } else {
      technical.push(s);
    }
  }

  const languages = (structured.languages ?? []).map((name) =>
    typeof name === "string"
      ? { name, proficiency: null as string | null }
      : { name: String((name as { name?: string }).name ?? ""), proficiency: null },
  );

  const certs: RichCertification[] =
    extras?.certifications ??
    (structured.certifications ?? []).map((c) => ({
      name: c.name,
      issuer: c.issuer ?? null,
      issueDate: c.date ?? null,
      expiryDate: null,
      credentialId: null,
      credentialUrl: null,
    }));

  return {
    ...base,
    personal: {
      name: structured.contact?.name ?? null,
      title: null,
    },
    contact: { ...structured.contact },
    summary: structured.summary,
    objective: extras?.objective ?? null,
    education: structured.education ?? [],
    experience: structured.experience ?? [],
    projects: structured.projects ?? [],
    skills: { technical, soft, all: skillsAll },
    languages,
    certifications: certs,
    awards: extras?.awards ?? [],
    achievements: extras?.achievements ?? [],
    volunteer: extras?.volunteer ?? [],
    leadership: extras?.leadership ?? [],
    publications: extras?.publications ?? [],
    research: extras?.research ?? [],
    patents: extras?.patents ?? [],
    clubs: extras?.clubs ?? [],
    extracurricular: extras?.extracurricular ?? [],
    interests: extras?.interests ?? [],
    references: [],
    links: [],
    socialLinks: [],
    portfolio: structured.contact?.website ?? null,
    github: structured.contact?.github ?? null,
    linkedin: structured.contact?.linkedin ?? null,
    domains: [],
    classifications: [],
    customSections: extras?.customSections ?? [],
    sections: structured.sections ?? {},
    confidence: structured.confidence,
    parser: structured.parser === "heuristic+llm" ? "heuristic+llm" : "heuristic",
    aiProvider: "heuristic",
    rawSkillsFound: structured.rawSkillsFound,
  };
}

function isIntelligentSkillsShape(skills: unknown): skills is IntelligentResumeData["skills"] {
  return (
    !!skills &&
    typeof skills === "object" &&
    !Array.isArray(skills) &&
    ("all" in skills || "technical" in skills || "soft" in skills)
  );
}

/**
 * Accept either intelligent schema or legacy StructuredResumeData (skills as array).
 * Returns null when the payload cannot be safely coerced.
 */
export function coerceToIntelligentResumeData(raw: unknown): IntelligentResumeData | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (isIntelligentSkillsShape(obj.skills) || obj.personal || obj.skillsDetail) {
    const base = emptyIntelligentResumeData();
    const skills = isIntelligentSkillsShape(obj.skills)
      ? obj.skills
      : isIntelligentSkillsShape(obj.skillsDetail)
        ? (obj.skillsDetail as IntelligentResumeData["skills"])
        : base.skills;
    const technical = Array.isArray(skills.technical) ? skills.technical : [];
    const soft = Array.isArray(skills.soft) ? skills.soft : [];
    const all = Array.isArray(skills.all) ? skills.all : [...technical, ...soft];
    const contact = {
      ...base.contact,
      ...((obj.contact as IntelligentResumeData["contact"] | undefined) ?? {}),
    };
    const personal = {
      ...base.personal,
      ...((obj.personal as IntelligentResumeData["personal"] | undefined) ?? {}),
    };

    const languages = Array.isArray(obj.languages)
      ? (obj.languages as Array<string | { name: string; proficiency: string | null }>).map((l) =>
          typeof l === "string" ? { name: l, proficiency: null as string | null } : l,
        )
      : [];

    return {
      ...base,
      ...(obj as Partial<IntelligentResumeData>),
      personal,
      contact,
      summary: typeof obj.summary === "string" ? obj.summary : (obj.summary as string | null) ?? null,
      experience: Array.isArray(obj.experience) ? (obj.experience as IntelligentResumeData["experience"]) : [],
      education: Array.isArray(obj.education) ? (obj.education as IntelligentResumeData["education"]) : [],
      projects: Array.isArray(obj.projects) ? (obj.projects as IntelligentResumeData["projects"]) : [],
      skills: { technical, soft, all },
      certifications: Array.isArray(obj.certifications)
        ? (obj.certifications as IntelligentResumeData["certifications"])
        : [],
      languages,
    };
  }

  // Legacy heuristic shape: skills is a flat array
  try {
    return toIntelligentResumeData(raw as StructuredResumeData);
  } catch {
    return null;
  }
}

/** Flatten intelligent data back toward legacy UI shape for API responses. */
export function toLegacyStructuredView(data: IntelligentResumeData): Record<string, unknown> {
  return {
    contact: data.contact,
    summary: data.summary,
    objective: data.objective,
    experience: data.experience,
    education: data.education,
    skills: data.skills.all.length ? data.skills.all : [...data.skills.technical, ...data.skills.soft],
    skillsDetail: data.skills,
    certifications: data.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.issueDate,
      expiryDate: c.expiryDate,
      credentialId: c.credentialId,
      credentialUrl: c.credentialUrl,
    })),
    projects: data.projects,
    languages: data.languages.map((l) => l.name),
    languagesDetail: data.languages,
    awards: data.awards,
    achievements: data.achievements,
    volunteer: data.volunteer,
    leadership: data.leadership,
    publications: data.publications,
    research: data.research,
    patents: data.patents,
    clubs: data.clubs,
    extracurricular: data.extracurricular,
    interests: data.interests,
    references: data.references,
    links: data.links,
    socialLinks: data.socialLinks?.length ? data.socialLinks : data.links,
    portfolio: data.portfolio,
    github: data.github,
    linkedin: data.linkedin,
    domains: data.domains,
    classifications: data.classifications,
    customSections: data.customSections,
    personal: data.personal,
    sections: data.sections,
    confidence: data.confidence,
    parser: data.parser,
    aiProvider: data.aiProvider,
    rawSkillsFound: data.rawSkillsFound,
  };
}

export function newCustomSectionId(): string {
  return randomUUID();
}
