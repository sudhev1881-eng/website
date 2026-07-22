/**
 * Pure ProfileBuilder helpers — map accepted enhanced resume sections
 * into public-profile table shapes (no DB I/O).
 */
import type { IntelligentResumeData, SectionDecisions } from "./types.js";

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const scaled = n > 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

/** Public-facing AI enrichment derived from confirmed resume enhanced_data. */
export interface PublicAiPayload {
  summary: string | null;
  title: string | null;
  generated: boolean;
  insights: Array<{ id: string; title: string; detail: string; confidence: number }>;
  skillInsights: Array<{
    category: string;
    strength: string;
    detail: string;
    confidence: number;
  }>;
  score: number | null;
  scores: {
    overall: number | null;
    technical: number | null;
    experience: number | null;
    projects: number | null;
  };
}

export function buildPublicAiFromResume(
  data: IntelligentResumeData | null | undefined,
): { aiGenerated: boolean; ai: PublicAiPayload | null } {
  if (!data) return { aiGenerated: false, ai: null };

  const generated =
    data.aiProvider === "ollama" ||
    data.parser === "ollama" ||
    data.parser === "enhanced" ||
    data.parser === "heuristic+llm";

  const overall = clampPct(data.confidence?.overall ?? 0);
  const technical = clampPct(data.confidence?.skills ?? overall);
  const experience = clampPct(data.confidence?.experience ?? overall);
  const education = clampPct(data.confidence?.education ?? overall);
  const projectsScore = clampPct(
    (technical * 0.4 + experience * 0.3 + education * 0.3) || overall,
  );

  const insights: PublicAiPayload["insights"] = [];
  for (const [i, domain] of (data.domains ?? []).slice(0, 4).entries()) {
    const label = domain.trim();
    if (!label) continue;
    insights.push({
      id: `domain-${i}`,
      title: `${label} focus`,
      detail: `Resume content aligns with ${label}.`,
      confidence: overall || 70,
    });
  }
  for (const [i, c] of (data.classifications ?? []).slice(0, 2).entries()) {
    const label = c.trim();
    if (!label) continue;
    insights.push({
      id: `class-${i}`,
      title: label,
      detail: `Classified as ${label} from resume signals.`,
      confidence: Math.max(60, overall - 5),
    });
  }

  const byCategory = new Map<string, Array<{ name: string; frequency: number }>>();
  for (const skill of data.skills?.all ?? []) {
    const cat = (skill.category || "Other").trim() || "Other";
    const list = byCategory.get(cat) ?? [];
    list.push({ name: skill.name, frequency: skill.frequency ?? 1 });
    byCategory.set(cat, list);
  }
  const skillInsights = [...byCategory.entries()]
    .map(([category, skills]) => {
      const sorted = [...skills].sort((a, b) => b.frequency - a.frequency);
      const top = sorted.slice(0, 3).map((s) => s.name).join(", ");
      const strength =
        sorted.length >= 5 ? "Broad coverage" : sorted.length >= 3 ? "Strong proficiency" : "Solid foundation";
      return {
        category,
        strength,
        detail: top
          ? `Most active in ${category.toLowerCase()} — ${top}.`
          : `Consistent signal in ${category}.`,
        confidence: clampPct(60 + sorted.length * 5 + technical * 0.15),
      };
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);

  const summary = data.summary?.trim() || data.objective?.trim() || null;
  const title = data.personal?.title?.trim() || null;

  // Always return a payload when we have enhanced resume data so the UI can
  // label AI vs heuristic and surface domains / confidence.
  return {
    aiGenerated: generated,
    ai: {
      summary,
      title,
      generated,
      insights: insights.slice(0, 4),
      skillInsights,
      score: overall || null,
      scores: {
        overall: overall || null,
        technical: technical || null,
        experience: experience || null,
        projects: projectsScore || null,
      },
    },
  };
}

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
  experience: IntelligentResumeData["experience"] | null | undefined,
  decision?: { acceptedIndexes?: number[] | "all" },
): ProfileExperienceRow[] {
  const list = Array.isArray(experience) ? experience : [];
  return selectedIndexes(list.length, decision)
    .map((i) => list[i])
    .filter(Boolean)
    .map((exp) => ({
      role: (exp.title || "Role").slice(0, 255),
      company: (exp.company || "Company").slice(0, 255),
      period: [exp.startDate, exp.endDate].filter(Boolean).join(" – ").slice(0, 100) || "N/A",
      description: ((Array.isArray(exp.bullets) ? exp.bullets.join("\n") : "") || exp.raw || "").slice(
        0,
        5000,
      ),
    }));
}

export function mapProjectRows(
  projects: IntelligentResumeData["projects"] | null | undefined,
  decision?: { acceptedIndexes?: number[] | "all" },
): ProfileProjectRow[] {
  const list = Array.isArray(projects) ? projects : [];
  return selectedIndexes(list.length, decision)
    .map((i) => list[i])
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
  skills: IntelligentResumeData["skills"] | Array<{ name: string; category?: string; confidence?: number; frequency?: number }> | null | undefined,
): ProfileSkillRow[] {
  let list: Array<{ name: string; category?: string; confidence?: number; frequency?: number }> = [];
  if (Array.isArray(skills)) {
    list = skills;
  } else if (skills && typeof skills === "object") {
    const all = Array.isArray(skills.all) ? skills.all : [];
    const technical = Array.isArray(skills.technical) ? skills.technical : [];
    const soft = Array.isArray(skills.soft) ? skills.soft : [];
    list = all.length > 0 ? all : [...technical, ...soft];
  }
  const seen = new Set<string>();
  const rows: ProfileSkillRow[] = [];
  for (const skill of list) {
    const key = skill.name?.trim().toLowerCase();
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
  certifications: IntelligentResumeData["certifications"] | null | undefined,
  decision?: { acceptedIndexes?: number[] | "all" },
): ProfileCertificateRow[] {
  const list = Array.isArray(certifications) ? certifications : [];
  return selectedIndexes(list.length, decision)
    .map((i) => list[i])
    .filter((c) => c && c.name && c.issuer && c.issueDate)
    .map((c) => ({
      name: c.name.slice(0, 255),
      issuer: (c.issuer ?? "Unknown").slice(0, 255),
      date: (c.issueDate ?? "").slice(0, 20),
      url: (c.credentialUrl ?? "").slice(0, 500),
    }));
}

export function mapEducationHint(
  education: IntelligentResumeData["education"] | null | undefined,
): ProfileEducationHint | null {
  const list = Array.isArray(education) ? education : [];
  const first = list.find((e) => e.school?.trim() || e.degree?.trim() || e.field?.trim());
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
    linkedin: data.linkedin?.trim() || data.contact?.linkedin?.trim() || null,
    github: data.github?.trim() || data.contact?.github?.trim() || null,
    portfolio: data.portfolio?.trim() || data.contact?.website?.trim() || null,
    location: data.contact?.address?.trim() || null,
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
    isSectionAccepted(decisions, "personal") && Boolean(data.personal?.title?.trim());
  const educationList = Array.isArray(data.education) ? data.education : [];
  const applyEducation =
    isSectionAccepted(decisions, "education") && educationList.length > 0;
  const applyLinks =
    isSectionAccepted(decisions, "contact") ||
    isSectionAccepted(decisions, "portfolio") ||
    isSectionAccepted(decisions, "github") ||
    isSectionAccepted(decisions, "linkedin");

  return {
    bio: applyBio ? data.summary!.trim().slice(0, 2000) : null,
    title: applyTitle ? data.personal!.title!.trim().slice(0, 255) : null,
    education: applyEducation ? mapEducationHint(educationList) : null,
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
  location: string | null;
  gpa: string | null;
  education: Array<{
    id: string;
    school: string;
    degree: string | null;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
    gpa: string | null;
  }>;
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
  const educationList = Array.isArray(enhanced.education) ? enhanced.education : [];
  const education =
    plan.applyEducation
      ? educationList
          .filter((e) => e.school?.trim() || e.degree?.trim() || e.field?.trim())
          .map((e, i) => ({
            id: `resume-edu-${i}`,
            school: (e.school || "School").slice(0, 255),
            degree: e.degree?.slice(0, 255) ?? null,
            field: e.field?.slice(0, 255) ?? null,
            startDate: e.startDate ?? null,
            endDate: e.endDate ?? null,
            gpa: e.gpa ?? null,
          }))
      : [];
  const gpa =
    education.map((e) => e.gpa).find((v) => Boolean(v?.trim())) ??
    educationList.map((e) => e.gpa).find((v) => Boolean(v?.trim())) ??
    null;

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
    location: plan.links.location,
    gpa,
    education,
  };
}

/** Secondary public fields from enhanced resume (never email/phone). */
export function buildSecondaryPublicFields(data: IntelligentResumeData | null | undefined): {
  languages: Array<{ name: string; proficiency: string | null }>;
  interests: string[];
  volunteer: Array<{
    role: string | null;
    organization: string | null;
    period: string | null;
    description: string | null;
  }>;
} {
  if (!data) return { languages: [], interests: [], volunteer: [] };
  return {
    languages: (data.languages ?? [])
      .filter((l) => l.name?.trim())
      .map((l) => ({ name: l.name.trim(), proficiency: l.proficiency ?? null }))
      .slice(0, 12),
    interests: (data.interests ?? [])
      .map((i) => i.trim())
      .filter(Boolean)
      .slice(0, 20),
    volunteer: (data.volunteer ?? [])
      .filter((v) => v.role?.trim() || v.organization?.trim())
      .slice(0, 10)
      .map((v) => ({
        role: v.role,
        organization: v.organization,
        period: v.period,
        description: v.description,
      })),
  };
}
