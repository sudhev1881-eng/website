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
    portfolio: structured.contact?.website ?? null,
    github: structured.contact?.github ?? null,
    linkedin: structured.contact?.linkedin ?? null,
    customSections: extras?.customSections ?? [],
    sections: structured.sections ?? {},
    confidence: structured.confidence,
    parser: structured.parser === "heuristic+llm" ? "heuristic+llm" : "heuristic",
    rawSkillsFound: structured.rawSkillsFound,
  };
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
    portfolio: data.portfolio,
    github: data.github,
    linkedin: data.linkedin,
    customSections: data.customSections,
    personal: data.personal,
    sections: data.sections,
    confidence: data.confidence,
    parser: data.parser,
    rawSkillsFound: data.rawSkillsFound,
  };
}

export function newCustomSectionId(): string {
  return randomUUID();
}
