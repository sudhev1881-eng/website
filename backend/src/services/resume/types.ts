/**
 * Shared types for the intelligent resume pipeline.
 * structured_data JSON schema covers personal/contact through customSections.
 */

export type ResumeProcessingStatus =
  | "none"
  | "pending"
  | "processing"
  | "extracting"
  | "enhancing"
  | "validating"
  | "awaiting_confirmation"
  | "embedding"
  | "completed"
  | "confirmed"
  | "failed"
  | "skipped"
  | "rejected";

export type ResumeProcessingStage =
  | "uploaded"
  | "extracting"
  | "enhancing"
  | "validating"
  | "awaiting_confirmation"
  | "embedding"
  | "confirmed"
  | "rejected"
  | "failed";

export interface RichCertification {
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  raw?: string;
}

export interface CustomSection {
  id: string;
  title: string;
  items: string[];
}

export interface IntelligentResumeData {
  personal: {
    name: string | null;
    title: string | null;
  };
  contact: {
    emails: string[];
    phones: string[];
    linkedin: string | null;
    github: string | null;
    website: string | null;
    address: string | null;
    name: string | null;
  };
  summary: string | null;
  objective: string | null;
  education: Array<{
    school: string | null;
    degree: string | null;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
    gpa: string | null;
    raw: string;
  }>;
  experience: Array<{
    title: string | null;
    company: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    bullets: string[];
    raw: string;
  }>;
  projects: Array<{
    name: string | null;
    description: string | null;
    technologies: string[];
    url?: string | null;
  }>;
  skills: {
    technical: Array<{ name: string; category: string; frequency: number; confidence?: number }>;
    soft: Array<{ name: string; category: string; frequency: number; confidence?: number }>;
    /** Flat list for backward compatibility with existing UI */
    all: Array<{ name: string; category: string; frequency: number; confidence?: number }>;
  };
  languages: Array<{ name: string; proficiency: string | null }>;
  certifications: RichCertification[];
  awards: Array<{ name: string; issuer: string | null; date: string | null; raw?: string }>;
  achievements: string[];
  volunteer: Array<{ role: string | null; organization: string | null; period: string | null; description: string | null }>;
  leadership: Array<{ role: string | null; organization: string | null; period: string | null; description: string | null }>;
  publications: Array<{ title: string; venue: string | null; date: string | null; url: string | null }>;
  research: Array<{ title: string; description: string | null }>;
  patents: Array<{ title: string; number: string | null; date: string | null }>;
  clubs: Array<{ name: string; role: string | null }>;
  extracurricular: string[];
  interests: string[];
  references: Array<{ name: string; contact: string | null; relationship: string | null }>;
  links: Array<{ label: string; url: string }>;
  portfolio: string | null;
  github: string | null;
  linkedin: string | null;
  customSections: CustomSection[];
  sections: Record<string, string>;
  confidence: {
    overall: number;
    contact: number;
    experience: number;
    education: number;
    skills: number;
  };
  parser: "heuristic" | "heuristic+llm" | "enhanced";
  rawSkillsFound?: string[];
}

export interface ValidationFlag {
  code: string;
  section: string;
  message: string;
  severity: "info" | "warning" | "error";
  needsUserInput: boolean;
  itemIndex?: number;
}

export interface SectionDecision {
  accepted: boolean;
  deleted?: boolean;
  /** For list sections: which item indexes to apply; omit = all when accepted */
  acceptedIndexes?: number[] | "all";
}

export type SectionDecisions = Record<string, SectionDecision>;

export interface EmbeddingChunk {
  sectionKey: string;
  text: string;
  embedding: number[];
}

export const DEFAULT_SECTION_KEYS = [
  "personal",
  "contact",
  "summary",
  "objective",
  "education",
  "experience",
  "projects",
  "skills",
  "languages",
  "certifications",
  "awards",
  "achievements",
  "volunteer",
  "leadership",
  "publications",
  "research",
  "patents",
  "clubs",
  "extracurricular",
  "interests",
  "references",
  "links",
  "portfolio",
  "github",
  "linkedin",
  "customSections",
] as const;

export function emptyIntelligentResumeData(): IntelligentResumeData {
  return {
    personal: { name: null, title: null },
    contact: {
      emails: [],
      phones: [],
      linkedin: null,
      github: null,
      website: null,
      address: null,
      name: null,
    },
    summary: null,
    objective: null,
    education: [],
    experience: [],
    projects: [],
    skills: { technical: [], soft: [], all: [] },
    languages: [],
    certifications: [],
    awards: [],
    achievements: [],
    volunteer: [],
    leadership: [],
    publications: [],
    research: [],
    patents: [],
    clubs: [],
    extracurricular: [],
    interests: [],
    references: [],
    links: [],
    portfolio: null,
    github: null,
    linkedin: null,
    customSections: [],
    sections: {},
    confidence: {
      overall: 0,
      contact: 0,
      experience: 0,
      education: 0,
      skills: 0,
    },
    parser: "heuristic",
  };
}

export function defaultSectionDecisions(data: IntelligentResumeData): SectionDecisions {
  const decisions: SectionDecisions = {};
  for (const key of DEFAULT_SECTION_KEYS) {
    const value = data[key as keyof IntelligentResumeData];
    const hasContent = sectionHasContent(key, value);
    decisions[key] = { accepted: hasContent, acceptedIndexes: "all" };
  }
  return decisions;
}

function sectionHasContent(key: string, value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (key === "skills" && value && typeof value === "object") {
    const s = value as IntelligentResumeData["skills"];
    return (s.all?.length ?? 0) > 0 || (s.technical?.length ?? 0) > 0;
  }
  if (key === "personal" && value && typeof value === "object") {
    const p = value as IntelligentResumeData["personal"];
    return Boolean(p.name || p.title);
  }
  if (key === "contact" && value && typeof value === "object") {
    const c = value as IntelligentResumeData["contact"];
    return Boolean(
      c.name ||
        c.emails?.length ||
        c.phones?.length ||
        c.linkedin ||
        c.github ||
        c.website ||
        c.address,
    );
  }
  return false;
}
