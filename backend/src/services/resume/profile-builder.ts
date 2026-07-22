/**
 * Pure ProfileBuilder helpers — map accepted enhanced resume sections
 * into public-profile table shapes (no DB I/O).
 */
import type { IntelligentResumeData, SectionDecisions } from "./types.js";

export function isSectionAccepted(decisions: SectionDecisions, key: string): boolean {
  const d = decisions[key];
  return d?.accepted === true && d?.deleted !== true;
}

function selectedIndexes(
  length: number,
  decision?: { acceptedIndexes?: number[] | "all" },
): number[] {
  if (decision?.acceptedIndexes === "all" || decision?.acceptedIndexes == null) {
    return Array.from({ length }, (_, i) => i);
  }
  return decision.acceptedIndexes.filter((i) => i >= 0 && i < length);
}

export interface ProfileExperienceRow {
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface ProfileProjectRow {
  title: string;
  description: string;
  tech: string[];
  url: string;
  featured: boolean;
}

export interface ProfileSkillRow {
  name: string;
  level: number;
  category: string;
}

export interface ProfileCertificateRow {
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface ProfileEducationHint {
  university: string | null;
  major: string | null;
}

export interface ProfilePublicLinks {
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  location: string | null;
}

export interface AcceptedProfilePlan {
  bio: string | null;
  title: string | null;
  education: ProfileEducationHint | null;
  experience: ProfileExperienceRow[];
  projects: ProfileProjectRow[];
  skills: ProfileSkillRow[];
  certificates: ProfileCertificateRow[];
  /** Professional links only — never email/phone */
  links: ProfilePublicLinks;
  applySkills: boolean;
  applyExperience: boolean;
  applyProjects: boolean;
  applyCertificates: boolean;
  applyBio: boolean;
  applyTitle: boolean;
  applyEducation: boolean;
  applyLinks: boolean;
}

function skillLevel(confidence?: number, frequency?: number): number {
  const c = confidence ?? Math.min(1, 0.5 + (frequency ?? 1) * 0.05);
  return Math.max(20, Math.min(100, Math.round(c * 100)));
}

export function mapExperienceRows(
  experience: IntelligentResumeData["experience"],
  decision?: { acceptedIndexes?: number[] | "all" },
): ProfileExperienceRow[] {
  return selectedIndexes(experience.length, decision)
    .map((i) => experience[i])
    .filter(Boolean)
    .map((exp) => ({
      role: (exp.title || "Role").slice(0, 255),
      company: (exp.company || "Company").slice(0, 255),
      period: [exp.startDate, exp.endDate].filter(Boolean).join(" – ").slice(0, 100) || "N/A",
      description: (exp.bullets.join("\n") || exp.raw || "").slice(0, 5000),
    }));
}

export function mapProjectRows(
  projects: IntelligentResumeData["projects"],
  decision?: { acceptedIndexes?: number[] | "all" },
): ProfileProjectRow[] {
  return selectedIndexes(projects.length, decision)
    .map((i) => projects[i])
    .filter((p) => p && (p.name?.trim() || p.description?.trim()))
    .map((p) => ({
      title: (p.name || "Project").slice(0, 255),
      description: (p.description || "").slice(0, 5000),
      tech: (p.technologies ?? []).map((t) => t.slice(0, 100)).filter(Boolean),
      url: (p.url ?? "").slice(0, 500),
      featured: false,
    }));
}

export function mapSkillRows(
  skills: IntelligentResumeData["skills"],
): ProfileSkillRow[] {
  const list =
    skills.all.length > 0 ? skills.all : [...skills.technical, ...skills.soft];
  const seen = new Set<string>();
  const rows: ProfileSkillRow[] = [];
  for (const skill of list) {
    const key = skill.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      name: skill.name.slice(0, 100),
      level: skillLevel(skill.confidence, skill.frequency),
      category: skill.category || "General",
    });
  }
  return rows;
}

export function mapCertificateRows(
  certifications: IntelligentResumeData["certifications"],
  decision?: { acceptedIndexes?: number[] | "all" },
): ProfileCertificateRow[] {
  return selectedIndexes(certifications.length, decision)
    .map((i) => certifications[i])
    .filter((c) => c && c.name && c.issuer && c.issueDate)
    .map((c) => ({
      name: c.name.slice(0, 255),
      issuer: (c.issuer ?? "Unknown").slice(0, 255),
      date: (c.issueDate ?? "").slice(0, 20),
      url: (c.credentialUrl ?? "").slice(0, 500),
    }));
}

export function mapEducationHint(
  education: IntelligentResumeData["education"],
): ProfileEducationHint | null {
  const first = education.find((e) => e.school?.trim() || e.degree?.trim() || e.field?.trim());
  if (!first) return null;
  const majorParts = [first.degree, first.field].filter(Boolean);
  return {
    university: first.school?.trim()?.slice(0, 255) || null,
    major: majorParts.length ? majorParts.join(" in ").slice(0, 255) : null,
  };
}

/** Professional links only — never email or phone from resume contact. */
export function mapPublicLinks(data: IntelligentResumeData): ProfilePublicLinks {
  return {
    linkedin: data.linkedin?.trim() || data.contact.linkedin?.trim() || null,
    github: data.github?.trim() || data.contact.github?.trim() || null,
    portfolio: data.portfolio?.trim() || data.contact.website?.trim() || null,
    location: data.contact.address?.trim() || null,
  };
}

/**
 * Build a plan of which enhanced/accepted sections should populate public profile tables.
 */
export function planAcceptedProfile(
  data: IntelligentResumeData,
  decisions: SectionDecisions,
): AcceptedProfilePlan {
  const applySkills = isSectionAccepted(decisions, "skills");
  const applyExperience = isSectionAccepted(decisions, "experience");
  const applyProjects = isSectionAccepted(decisions, "projects");
  const applyCertificates = isSectionAccepted(decisions, "certifications");
  const applyBio = isSectionAccepted(decisions, "summary") && Boolean(data.summary?.trim());
  const applyTitle =
    isSectionAccepted(decisions, "personal") && Boolean(data.personal.title?.trim());
  const applyEducation =
    isSectionAccepted(decisions, "education") && data.education.length > 0;
  const applyLinks =
    isSectionAccepted(decisions, "contact") ||
    isSectionAccepted(decisions, "portfolio") ||
    isSectionAccepted(decisions, "github") ||
    isSectionAccepted(decisions, "linkedin");

  return {
    bio: applyBio ? data.summary!.trim().slice(0, 2000) : null,
    title: applyTitle ? data.personal.title!.trim().slice(0, 255) : null,
    education: applyEducation ? mapEducationHint(data.education) : null,
    experience: applyExperience ? mapExperienceRows(data.experience, decisions.experience) : [],
    projects: applyProjects ? mapProjectRows(data.projects, decisions.projects) : [],
    skills: applySkills ? mapSkillRows(data.skills) : [],
    certificates: applyCertificates
      ? mapCertificateRows(data.certifications, decisions.certifications)
      : [],
    links: applyLinks ? mapPublicLinks(data) : {
      linkedin: null,
      github: null,
      portfolio: null,
      location: null,
    },
    applySkills,
    applyExperience,
    applyProjects,
    applyCertificates,
    applyBio,
    applyTitle,
    applyEducation,
    applyLinks,
  };
}

export interface PublicProfileSectionFallback {
  bio: string | null;
  experience: Array<ProfileExperienceRow & { id: string }>;
  projects: Array<ProfileProjectRow & { id: string }>;
  skills: ProfileSkillRow[];
  certificates: Array<ProfileCertificateRow & { id: string }>;
  university: string | null;
  major: string | null;
  title: string | null;
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
}

/**
 * Fallback for already-confirmed resumes whose profile tables were never filled.
 * Uses enhanced_data (preferred) + section_decisions; never includes email/phone.
 */
export function buildPublicProfileFallbackFromResume(params: {
  enhanced: IntelligentResumeData;
  decisions: SectionDecisions;
  /** When true, treat missing decisions as accepted (legacy confirmed resumes). */
  defaultAcceptMissing?: boolean;
}): PublicProfileSectionFallback {
  const { enhanced, defaultAcceptMissing = true } = params;
  let decisions = { ...params.decisions };

  if (defaultAcceptMissing) {
    const keys = [
      "summary",
      "experience",
      "projects",
      "skills",
      "certifications",
      "education",
      "personal",
      "contact",
      "portfolio",
      "github",
      "linkedin",
    ] as const;
    for (const key of keys) {
      if (decisions[key] == null) {
        decisions[key] = { accepted: true, acceptedIndexes: "all" };
      }
    }
  }

  const plan = planAcceptedProfile(enhanced, decisions);
  return {
    bio: plan.bio,
    experience: plan.experience.map((e, i) => ({ ...e, id: `resume-exp-${i}` })),
    projects: plan.projects.map((p, i) => ({ ...p, id: `resume-proj-${i}` })),
    skills: plan.skills,
    certificates: plan.certificates.map((c, i) => ({ ...c, id: `resume-cert-${i}` })),
    university: plan.education?.university ?? null,
    major: plan.education?.major ?? null,
    title: plan.title,
    github: plan.links.github,
    linkedin: plan.links.linkedin,
    portfolio: plan.links.portfolio,
  };
}
