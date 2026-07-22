import { getEnv } from "../config/env.js";
import { logger } from "../config/logger.js";
import { getSkillCategory } from "../data/skill-dictionary.js";
import { parseSkillsFromText, type ParsedSkill } from "./skill-parser.service.js";

/** Structured resume extraction stored in extracted_resume_content.structured_data */
export interface StructuredResumeData {
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
  experience: Array<{
    title: string | null;
    company: string | null;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    bullets: string[];
    raw: string;
  }>;
  education: Array<{
    school: string | null;
    degree: string | null;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
    gpa: string | null;
    raw: string;
  }>;
  skills: Array<{ name: string; category: string; frequency: number; confidence?: number }>;
  certifications: Array<{ name: string; issuer?: string | null; date?: string | null }>;
  projects: Array<{
    name: string | null;
    description: string | null;
    technologies: string[];
    url?: string | null;
  }>;
  languages: string[];
  sections: Record<string, string>;
  confidence: {
    overall: number;
    contact: number;
    experience: number;
    education: number;
    skills: number;
  };
  parser: "heuristic" | "heuristic+llm";
  rawSkillsFound?: string[];
}

export interface StructuredParseResult {
  structuredData: StructuredResumeData;
  /** Skills with confidence for upserting into the skills table. */
  skills: ParsedSkill[];
  extractionConfidence: number;
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3}[\s.-]?\d{3,4}(?:[\s.-]?\d{3,4})?\b/g;
const LINKEDIN_URL_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[A-Za-z0-9_-]+\/?/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/gi;
const URL_RE = /https?:\/\/[^\s)>\]]+/gi;

const MONTH =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const DATE_TOKEN = `(?:${MONTH}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4})`;
const DATE_RANGE_RE = new RegExp(
  `\\b(${DATE_TOKEN})\\s*(?:[-–—]|\\bto\\b)\\s*(${DATE_TOKEN}|Present|Current|Now)\\b`,
  "i",
);
const GPA_RE = /\bGPA\s*[:\-]?\s*([0-4](?:\.\d{1,2})?(?:\s*\/\s*[0-4](?:\.\d{1,2})?)?)/i;
const DEGREE_RE =
  /\b((?:Bachelor|Master|Doctor|Associate|B\.?S\.?|B\.?A\.?|B\.?E\.?|B\.?Tech|M\.?S\.?|M\.?A\.?|M\.?Eng|M\.?B\.?A\.?|Ph\.?D\.?|A\.?A\.?|A\.?S\.?)[^,\n]{0,80})/i;
const SCHOOL_RE =
  /\b([A-Z][^,\n]{2,80}?(?:University|College|Institute|School|Academy|Polytechnic)[^,\n]{0,40})/;
const ADDRESS_RE =
  /\b([A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?|[A-Za-z .'-]+,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\b)/;

/** Normalized section keys → header aliases (fuzzy / substring match on a line). */
const SECTION_ALIASES: Record<string, string[]> = {
  experience: [
    "experience",
    "work experience",
    "work history",
    "employment",
    "professional experience",
    "relevant experience",
  ],
  education: ["education", "academic background", "academics"],
  skills: [
    "skills",
    "technical skills",
    "technologies",
    "tech stack",
    "tools",
    "competencies",
    "proficiencies",
  ],
  projects: ["projects", "personal projects", "selected projects", "key projects"],
  certifications: [
    "certifications",
    "certificates",
    "licenses",
    "licenses & certifications",
    "licenses and certifications",
  ],
  summary: ["summary", "professional summary", "profile", "objective", "about me", "about"],
  contact: ["contact", "contact information", "contact info"],
  languages: ["languages", "language skills"],
};

const MAX_LLM_CHARS = 12_000;

/**
 * Full structured resume parse.
 * Heuristics always run (free). Optional OpenAI refinement when OPENAI_API_KEY is set.
 *
 * Note: scanned/image-only PDFs still need OCR — out of scope here; we only parse extractable text.
 */
export async function parseResumeStructured(rawText: string): Promise<StructuredParseResult> {
  const heuristic = parseResumeHeuristic(rawText);

  const apiKey = safeOpenAiKey();
  if (!apiKey || !rawText.trim()) {
    return heuristic;
  }

  try {
    const refined = await refineWithLlm(heuristic.structuredData, rawText, apiKey);
    if (!refined) return heuristic;

    const skills = mergeSkillsForUpsert(refined.skills, heuristic.skills);
    return {
      structuredData: refined,
      skills,
      extractionConfidence: refined.confidence.overall,
    };
  } catch (err) {
    logger.warn("Resume LLM refinement failed; keeping heuristic result", {
      message: err instanceof Error ? err.message : String(err),
    });
    return heuristic;
  }
}

/** Sync heuristic-only parse (also used by tests). */
export function parseResumeHeuristic(rawText: string): StructuredParseResult {
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) {
    return emptyResult();
  }

  const sections = splitIntoSections(text);
  const skillParse = parseSkillsFromText(text);
  const contact = extractContact(text, sections);
  const summary = extractSummary(sections);
  const experience = extractExperience(sections.experience ?? "");
  const education = extractEducation(sections.education ?? "");
  const certifications = extractCertifications(sections.certifications ?? "");
  const projects = extractProjects(sections.projects ?? "", skillParse.skills);
  const languages = extractLanguages(sections.languages ?? "");

  const skills = skillParse.skills.map((s) => ({
    name: s.name,
    category: s.category,
    frequency: s.mentionCount,
    confidence: s.confidence,
  }));

  const confidence = computeConfidence({
    contact,
    experience,
    education,
    skills,
    summary,
    certifications,
    projects,
  });

  const structuredData: StructuredResumeData = {
    contact,
    summary,
    experience,
    education,
    skills,
    certifications,
    projects,
    languages,
    sections: { ...sections },
    confidence,
    parser: "heuristic",
    rawSkillsFound: skillParse.skills.map((s) => s.name),
  };

  return {
    structuredData,
    skills: skillParse.skills,
    extractionConfidence: confidence.overall,
  };
}

function emptyResult(): StructuredParseResult {
  const structuredData: StructuredResumeData = {
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
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    languages: [],
    sections: {},
    confidence: { overall: 0, contact: 0, experience: 0, education: 0, skills: 0 },
    parser: "heuristic",
    rawSkillsFound: [],
  };
  return { structuredData, skills: [], extractionConfidence: 0 };
}

function splitIntoSections(text: string): Record<string, string> {
  const lines = text.split("\n");
  const sections: Record<string, string> = {};
  let currentKey = "preamble";
  const buckets: Record<string, string[]> = { preamble: [] };

  for (const line of lines) {
    const key = matchSectionHeader(line);
    if (key) {
      currentKey = key;
      if (!buckets[currentKey]) buckets[currentKey] = [];
      continue;
    }
    if (!buckets[currentKey]) buckets[currentKey] = [];
    buckets[currentKey].push(line);
  }

  for (const [key, bodyLines] of Object.entries(buckets)) {
    const body = bodyLines.join("\n").trim();
    if (body) sections[key] = body;
  }
  return sections;
}

function matchSectionHeader(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return null;
  // Headers are short; often ALL CAPS or Title Case, optional trailing colon.
  const cleaned = trimmed.replace(/[:|•\-–—]+$/g, "").trim().toLowerCase();
  if (!cleaned || cleaned.length > 45) return null;

  // Require header-like shape: few words, no sentence punctuation mid-line.
  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount > 6) return null;
  if (/[.!?].+\w/.test(trimmed)) return null;

  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    for (const alias of aliases) {
      if (cleaned === alias || cleaned.startsWith(alias + " ") || cleaned.endsWith(" " + alias)) {
        return key;
      }
      // Fuzzy: allow minor typos via simple distance on short headers
      if (cleaned.length <= 24 && alias.length <= 24 && editDistance(cleaned, alias) <= 1) {
        return key;
      }
    }
  }
  return null;
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 99;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function extractContact(
  fullText: string,
  sections: Record<string, string>,
): StructuredResumeData["contact"] {
  const contactBlob = [sections.preamble ?? "", sections.contact ?? "", fullText.slice(0, 800)].join(
    "\n",
  );

  const emails = unique(matchAll(contactBlob, EMAIL_RE).map((e) => e.toLowerCase()));
  const phones = unique(
    matchAll(contactBlob, PHONE_RE)
      .map((p) => p.trim())
      .filter((p) => digitCount(p) >= 10 && digitCount(p) <= 15)
      .filter((p) => !/^\d{4}$/.test(p)),
  );

  let linkedin: string | null = null;
  const linkedinUrl = contactBlob.match(LINKEDIN_URL_RE);
  if (linkedinUrl) {
    linkedin = normalizeUrl(linkedinUrl[0], "https://www.linkedin.com");
  }

  let github: string | null = null;
  const gh = contactBlob.match(GITHUB_RE);
  if (gh) {
    github = normalizeUrl(gh[0], "https://github.com");
  }

  const urls = matchAll(contactBlob, URL_RE).filter(
    (u) => !/linkedin\.com/i.test(u) && !/github\.com/i.test(u),
  );
  const website = urls[0] ? urls[0].replace(/[.,;]+$/, "") : null;

  let address: string | null = null;
  const addr = contactBlob.match(ADDRESS_RE);
  if (addr) address = addr[1].trim();

  const name = detectName(sections.preamble ?? fullText.split("\n").slice(0, 5).join("\n"));

  return { emails, phones, linkedin, github, website, address, name };
}

function detectName(preamble: string): string | null {
  const lines = preamble
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 4)) {
    if (/\S+@\S+\.\S+/.test(line) || URL_RE.test(line)) continue;
    URL_RE.lastIndex = 0;
    if (digitCount(line) >= 10) continue;
    if (matchSectionHeader(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;
    if (line.length > 60) continue;
    if (!/^[A-Za-z][A-Za-z .'-]+$/.test(line)) continue;
    return line;
  }
  return null;
}

function extractSummary(sections: Record<string, string>): string | null {
  const raw = sections.summary?.trim();
  if (!raw) return null;
  return raw.slice(0, 2000);
}

function extractExperience(sectionText: string): StructuredResumeData["experience"] {
  if (!sectionText.trim()) return [];

  const blocks = splitJobBlocks(sectionText);
  return blocks.map((raw) => parseExperienceBlock(raw)).filter((e) => e.raw.trim().length > 0);
}

function splitJobBlocks(sectionText: string): string[] {
  const lines = sectionText.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.length) {
        blocks.push(current.join("\n"));
        current = [];
      }
      continue;
    }
    // New block when a date range appears and we already have content
    if (current.length > 0 && DATE_RANGE_RE.test(trimmed) && current.length >= 2) {
      // Date may be on same line as title — keep in current; start new only on blank-separated
      current.push(line);
      continue;
    }
    current.push(line);
  }
  if (current.length) blocks.push(current.join("\n"));

  // If only one big block, try splitting on date-range lines
  if (blocks.length <= 1) {
    const byDate: string[] = [];
    let buf: string[] = [];
    for (const line of sectionText.split("\n")) {
      if (DATE_RANGE_RE.test(line) && buf.length > 0) {
        byDate.push(buf.join("\n"));
        buf = [line];
      } else {
        buf.push(line);
      }
    }
    if (buf.length) byDate.push(buf.join("\n"));
    if (byDate.length > 1) return byDate.map((b) => b.trim()).filter(Boolean);
  }

  return blocks.map((b) => b.trim()).filter(Boolean);
}

function parseExperienceBlock(raw: string): StructuredResumeData["experience"][number] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let startDate: string | null = null;
  let endDate: string | null = null;
  let dateLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(DATE_RANGE_RE);
    if (m) {
      startDate = cleanDate(m[1]);
      endDate = cleanDate(m[2]);
      dateLineIdx = i;
      break;
    }
  }

  const headerLines = lines.filter((_, i) => i !== dateLineIdx).slice(0, 3);
  let title: string | null = null;
  let company: string | null = null;
  let location: string | null = null;

  if (headerLines.length >= 1) {
    const first = headerLines[0].replace(DATE_RANGE_RE, "").replace(/\s*[|•·]\s*/g, " | ").trim();
    const parts = first.split(/\s*\|\s*|\s+[-–—]\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      title = parts[0] || null;
      company = parts[1] || null;
      location = parts[2] || null;
    } else {
      title = first || null;
      if (headerLines[1]) {
        const second = headerLines[1].replace(DATE_RANGE_RE, "").trim();
        const locMatch = second.match(/\b([A-Za-z .'-]+,\s*[A-Z]{2})\b/);
        if (locMatch && second.length < 60) {
          location = locMatch[1];
          company = second.replace(locMatch[0], "").replace(/[|•,-]+$/, "").trim() || second;
        } else {
          company = second;
        }
      }
    }
  }

  // If date was on same line as title/company
  if (dateLineIdx >= 0) {
    const withoutDate = lines[dateLineIdx].replace(DATE_RANGE_RE, "").replace(/[|•·\-–—]+/g, " ").trim();
    if (withoutDate && !title) title = withoutDate;
    else if (withoutDate && !company && withoutDate !== title) company = withoutDate;
  }

  const bullets = lines
    .filter((l) => /^[•\-\*▪◦●]/.test(l) || /^[A-Z].{20,}/.test(l))
    .map((l) => l.replace(/^[•\-\*▪◦●]\s*/, "").trim())
    .filter((l) => l.length > 5 && l !== title && l !== company)
    .slice(0, 12);

  return {
    title,
    company,
    location,
    startDate,
    endDate,
    bullets: bullets.length ? bullets : lines.slice(2).filter((l) => l.length > 15).slice(0, 8),
    raw,
  };
}

function extractEducation(sectionText: string): StructuredResumeData["education"] {
  if (!sectionText.trim()) return [];

  const blocks = sectionText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const source = blocks.length > 1 ? blocks : [sectionText.trim()];

  return source
    .map((raw) => {
      const schoolMatch = raw.match(SCHOOL_RE);
      const degreeMatch = raw.match(DEGREE_RE);
      const gpaMatch = raw.match(GPA_RE);
      const dateMatch = raw.match(DATE_RANGE_RE);
      let field: string | null = null;
      if (degreeMatch) {
        const after = degreeMatch[1];
        const inField = after.match(/\bin\s+([^,\n]+)/i);
        if (inField) field = inField[1].trim();
      }

      return {
        school: schoolMatch ? schoolMatch[1].trim() : null,
        degree: degreeMatch ? degreeMatch[1].replace(/\bin\s+.*/i, "").trim() : null,
        field,
        startDate: dateMatch ? cleanDate(dateMatch[1]) : null,
        endDate: dateMatch ? cleanDate(dateMatch[2]) : null,
        gpa: gpaMatch ? gpaMatch[1].trim() : null,
        raw,
      };
    })
    .filter((e) => e.school || e.degree || e.raw.length > 10);
}

function extractCertifications(
  sectionText: string,
): StructuredResumeData["certifications"] {
  if (!sectionText.trim()) return [];
  const lines = sectionText
    .split("\n")
    .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
    .filter((l) => l.length > 2);

  return lines.slice(0, 20).map((line) => {
    const dateMatch = line.match(
      /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}|\d{4})\b/i,
    );
    const parts = line.split(/\s+[-–—|]\s+/);
    return {
      name: (parts[0] ?? line).replace(dateMatch?.[0] ?? "", "").trim() || line,
      issuer: parts[1]?.replace(dateMatch?.[0] ?? "", "").trim() || null,
      date: dateMatch ? dateMatch[1] : null,
    };
  });
}

function extractProjects(
  sectionText: string,
  knownSkills: ParsedSkill[],
): StructuredResumeData["projects"] {
  if (!sectionText.trim()) return [];
  const blocks = sectionText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const source = blocks.length > 0 ? blocks : [sectionText.trim()];
  const skillNames = knownSkills.map((s) => s.name.toLowerCase());

  return source.slice(0, 15).map((raw) => {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    const first = lines[0] ?? null;
    const url = raw.match(URL_RE)?.[0] ?? null;
    const name = first?.replace(URL_RE, "").replace(/^[•\-\*]\s*/, "").trim() || null;
    const description = lines.slice(1).join(" ").slice(0, 500) || null;
    const lower = raw.toLowerCase();
    const technologies = skillNames.filter((s) => lower.includes(s)).slice(0, 12);
    return { name, description, technologies, url };
  });
}

function extractLanguages(sectionText: string): string[] {
  if (!sectionText.trim()) return [];
  return sectionText
    .split(/[,;\n|•\-]+/)
    .map((s) => s.replace(/\([^)]*\)/g, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 40)
    .slice(0, 20);
}

function computeConfidence(parts: {
  contact: StructuredResumeData["contact"];
  experience: StructuredResumeData["experience"];
  education: StructuredResumeData["education"];
  skills: StructuredResumeData["skills"];
  summary: string | null;
  certifications: StructuredResumeData["certifications"];
  projects: StructuredResumeData["projects"];
}): StructuredResumeData["confidence"] {
  const c = parts.contact;
  let contactScore = 0;
  if (c.emails.length) contactScore += 0.35;
  if (c.phones.length) contactScore += 0.25;
  if (c.linkedin) contactScore += 0.2;
  if (c.github || c.website) contactScore += 0.1;
  if (c.address) contactScore += 0.05;
  if (c.name) contactScore += 0.05;
  contactScore = Math.min(1, contactScore);

  const experienceScore =
    parts.experience.length === 0
      ? 0
      : Math.min(
          1,
          0.3 +
            parts.experience.filter((e) => e.title || e.company).length * 0.2 +
            parts.experience.filter((e) => e.startDate).length * 0.15,
        );

  const educationScore =
    parts.education.length === 0
      ? 0
      : Math.min(
          1,
          0.35 +
            parts.education.filter((e) => e.school).length * 0.3 +
            parts.education.filter((e) => e.degree).length * 0.2,
        );

  const skillsScore =
    parts.skills.length === 0
      ? 0
      : Math.min(1, 0.4 + Math.min(0.6, parts.skills.length * 0.05));

  const bonus =
    (parts.summary ? 0.05 : 0) +
    (parts.certifications.length ? 0.03 : 0) +
    (parts.projects.length ? 0.03 : 0);

  const overall = Math.min(
    1,
    contactScore * 0.2 +
      experienceScore * 0.3 +
      educationScore * 0.2 +
      skillsScore * 0.25 +
      bonus,
  );

  return {
    overall: round2(overall),
    contact: round2(contactScore),
    experience: round2(experienceScore),
    education: round2(educationScore),
    skills: round2(skillsScore),
  };
}

async function refineWithLlm(
  heuristic: StructuredResumeData,
  rawText: string,
  apiKey: string,
): Promise<StructuredResumeData | null> {
  const model = getEnv().OPENAI_MODEL;
  const truncated = rawText.slice(0, MAX_LLM_CHARS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

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
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You refine resume parsing into strict JSON. Return ONLY JSON matching this shape:
{"contact":{"emails":[],"phones":[],"linkedin":null,"github":null,"website":null,"address":null,"name":null},
"summary":null,
"experience":[{"title":null,"company":null,"location":null,"startDate":null,"endDate":null,"bullets":[],"raw":""}],
"education":[{"school":null,"degree":null,"field":null,"startDate":null,"endDate":null,"gpa":null,"raw":""}],
"skills":[{"name":"","category":"","frequency":1}],
"certifications":[{"name":"","issuer":null,"date":null}],
"projects":[{"name":null,"description":null,"technologies":[],"url":null}],
"languages":[]}
Use null for missing strings. Prefer facts from the resume text. Keep skill names concise.`,
          },
          {
            role: "user",
            content: `Heuristic parse (may be incomplete):\n${JSON.stringify({
              contact: heuristic.contact,
              summary: heuristic.summary,
              experience: heuristic.experience.slice(0, 8),
              education: heuristic.education.slice(0, 6),
              skills: heuristic.skills.slice(0, 40),
              certifications: heuristic.certifications.slice(0, 15),
              projects: heuristic.projects.slice(0, 10),
              languages: heuristic.languages,
            })}\n\nResume text:\n${truncated}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      logger.warn("Resume LLM API non-OK", { status: res.status });
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as Partial<StructuredResumeData>;
    return mergeLlmIntoHeuristic(heuristic, parsed);
  } finally {
    clearTimeout(timer);
  }
}

/** Exported for unit tests — merges LLM JSON onto heuristic base. */
export function mergeLlmIntoHeuristic(
  heuristic: StructuredResumeData,
  llm: Partial<StructuredResumeData>,
): StructuredResumeData {
  const contact = {
    ...heuristic.contact,
    ...(llm.contact ?? {}),
    emails: preferNonEmptyArray(llm.contact?.emails, heuristic.contact.emails),
    phones: preferNonEmptyArray(llm.contact?.phones, heuristic.contact.phones),
    linkedin: llm.contact?.linkedin ?? heuristic.contact.linkedin,
    github: llm.contact?.github ?? heuristic.contact.github,
    website: llm.contact?.website ?? heuristic.contact.website,
    address: llm.contact?.address ?? heuristic.contact.address,
    name: llm.contact?.name ?? heuristic.contact.name,
  };

  const experience =
    Array.isArray(llm.experience) && llm.experience.length > 0
      ? llm.experience.map((e) => ({
          title: e.title ?? null,
          company: e.company ?? null,
          location: e.location ?? null,
          startDate: e.startDate ?? null,
          endDate: e.endDate ?? null,
          bullets: Array.isArray(e.bullets) ? e.bullets : [],
          raw: e.raw ?? "",
        }))
      : heuristic.experience;

  const education =
    Array.isArray(llm.education) && llm.education.length > 0
      ? llm.education.map((e) => ({
          school: e.school ?? null,
          degree: e.degree ?? null,
          field: e.field ?? null,
          startDate: e.startDate ?? null,
          endDate: e.endDate ?? null,
          gpa: e.gpa ?? null,
          raw: e.raw ?? "",
        }))
      : heuristic.education;

  const skills =
    Array.isArray(llm.skills) && llm.skills.length > 0
      ? mergeSkillLists(heuristic.skills, llm.skills)
      : heuristic.skills;

  const certifications =
    Array.isArray(llm.certifications) && llm.certifications.length > 0
      ? llm.certifications
      : heuristic.certifications;

  const projects =
    Array.isArray(llm.projects) && llm.projects.length > 0 ? llm.projects : heuristic.projects;

  const languages =
    Array.isArray(llm.languages) && llm.languages.length > 0
      ? llm.languages
      : heuristic.languages;

  const summary = llm.summary ?? heuristic.summary;

  const confidence = computeConfidence({
    contact,
    experience,
    education,
    skills,
    summary,
    certifications,
    projects,
  });
  // Slight bump for LLM path when it added substance
  confidence.overall = round2(Math.min(1, confidence.overall + 0.05));

  return {
    ...heuristic,
    contact,
    summary,
    experience,
    education,
    skills,
    certifications,
    projects,
    languages,
    confidence,
    parser: "heuristic+llm",
  };
}

function mergeSkillLists(
  heuristic: StructuredResumeData["skills"],
  llm: StructuredResumeData["skills"],
): StructuredResumeData["skills"] {
  const byName = new Map<string, StructuredResumeData["skills"][number]>();
  for (const s of heuristic) {
    byName.set(s.name.toLowerCase(), { ...s });
  }
  for (const s of llm) {
    if (!s?.name) continue;
    const key = s.name.toLowerCase();
    const prev = byName.get(key);
    if (prev) {
      prev.frequency = Math.max(prev.frequency, s.frequency || 1);
      if (s.category) prev.category = s.category;
    } else {
      byName.set(key, {
        name: s.name,
        category: s.category || getSkillCategory(s.name),
        frequency: s.frequency || 1,
        confidence: s.confidence ?? 0.75,
      });
    }
  }
  return [...byName.values()];
}

function mergeSkillsForUpsert(
  structuredSkills: StructuredResumeData["skills"],
  heuristicSkills: ParsedSkill[],
): ParsedSkill[] {
  const byName = new Map<string, ParsedSkill>();
  for (const s of heuristicSkills) {
    byName.set(s.name.toLowerCase(), { ...s });
  }
  for (const s of structuredSkills) {
    const key = s.name.toLowerCase();
    const prev = byName.get(key);
    if (prev) {
      prev.mentionCount = Math.max(prev.mentionCount, s.frequency || 1);
      prev.confidence = Math.max(prev.confidence, s.confidence ?? 0.75);
    } else {
      byName.set(key, {
        name: s.name,
        category: getSkillCategory(s.name),
        confidence: s.confidence ?? 0.75,
        mentionCount: s.frequency || 1,
      });
    }
  }
  return [...byName.values()];
}

function preferNonEmptyArray(a: string[] | undefined, b: string[]): string[] {
  return a && a.length > 0 ? a : b;
}

function safeOpenAiKey(): string | undefined {
  try {
    return getEnv().OPENAI_API_KEY;
  } catch {
    return undefined;
  }
}

function matchAll(text: string, re: RegExp): string[] {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const r = new RegExp(re.source, flags);
  return [...text.matchAll(r)].map((m) => m[0]);
}

function unique(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function digitCount(s: string): number {
  return (s.match(/\d/g) ?? []).length;
}

function normalizeUrl(raw: string, fallbackOrigin: string): string {
  let u = raw.trim().replace(/[.,;]+$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    return parsed.href.replace(/\/$/, "");
  } catch {
    return `${fallbackOrigin}/${u.replace(/^https?:\/\//, "")}`;
  }
}

function cleanDate(s: string): string {
  const t = s.trim();
  if (/^(present|current|now)$/i.test(t)) return "Present";
  return t;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
