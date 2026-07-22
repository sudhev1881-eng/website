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
const DATE_RANGE_SOURCE = `\\b(${DATE_TOKEN})\\s*(?:[-–—]|\\bto\\b)\\s*(${DATE_TOKEN}|Present|Current|Now)\\b`;
const DATE_RANGE_RE = new RegExp(DATE_RANGE_SOURCE, "i");
const GPA_RE = /\bGPA\s*[:\-]?\s*([0-4](?:\.\d{1,2})?(?:\s*\/\s*[0-4](?:\.\d{1,2})?)?)/i;
const DEGREE_RE =
  /\b((?:Bachelor|Master|Doctor|Associate|B\.?S\.?|B\.?A\.?|B\.?E\.?|B\.?Tech|M\.?S\.?|M\.?A\.?|M\.?Eng|M\.?B\.?A\.?|Ph\.?D\.?|A\.?A\.?|A\.?S\.?)[^,\n]{0,80})/i;
const SCHOOL_RE =
  /\b((?:[A-Z][^|\n]{0,60}?\s+)?(?:University|College|Institute|School|Academy|Polytechnic)[^|\n]{2,80})/;
const ADDRESS_RE =
  /\b([A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?|[A-Za-z .'-]+,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\b)/;
/** Company-ish ALL CAPS run used in collapsed executive resumes: `ACME CORP | City, ST | …`. */
const COMPANY_PIPE_RE =
  /\b([A-Z][A-Z0-9][A-Z0-9 &.,'/()-]{1,80})\s*\|\s*([A-Za-z][^|]{0,60})(?:\s*\|\s*([^|]{0,120}))?/g;

/** Normalized section keys → header aliases (fuzzy / substring match on a line). */
const SECTION_ALIASES: Record<string, string[]> = {
  experience: [
    "professional experience",
    "work experience",
    "employment history",
    "work history",
    "relevant experience",
    "career history",
    "employment",
    "experience",
  ],
  education: [
    "education & professional credentials",
    "education and professional credentials",
    "education & credentials",
    "academic background",
    "education",
    "academics",
  ],
  skills: [
    "skills",
    "technical skills",
    "technologies",
    "tech stack",
    "tools",
    "competencies",
    "proficiencies",
    "signature hr qualifications",
    "core competencies",
    "areas of expertise",
  ],
  projects: ["projects", "personal projects", "selected projects", "key projects"],
  certifications: [
    "certifications",
    "certificates",
    "licenses",
    "licenses & certifications",
    "licenses and certifications",
  ],
  summary: [
    "summary",
    "professional summary",
    "profile",
    "objective",
    "about me",
    "about",
  ],
  contact: ["contact", "contact information", "contact info"],
  languages: ["languages", "language skills"],
};

/** Longer aliases first so "professional experience" wins over "experience". */
const SECTION_ALIAS_ENTRIES: Array<{ key: string; alias: string }> = Object.entries(SECTION_ALIASES)
  .flatMap(([key, aliases]) => aliases.map((alias) => ({ key, alias })))
  .sort((a, b) => b.alias.length - a.alias.length);

/**
 * Full structured resume parse.
 * Heuristics always run (free). LLM refinement is handled by the intelligent
 * resume pipeline via Ollama (see services/ai) — this path stays heuristic-only
 * so OPENAI_API_KEY is not required for resume intelligence.
 *
 * Note: scanned/image-only PDFs still need OCR — out of scope here; we only parse extractable text.
 */
export async function parseResumeStructured(rawText: string): Promise<StructuredParseResult> {
  return parseResumeHeuristic(rawText);
}

/** Sync heuristic-only parse (also used by tests). */
export function parseResumeHeuristic(rawText: string): StructuredParseResult {
  const text = normalizeResumeLayout(rawText);
  if (!text) {
    return emptyResult();
  }

  const sections = splitIntoSections(text);
  const skillParse = parseSkillsFromText(text);
  const contact = extractContact(text, sections);
  const summary = extractSummary(sections);
  let experience = extractExperience(sections.experience ?? "");
  if (experience.length === 0) {
    // PDF extractors often collapse newlines; fall back to whole-resume date scan
    // excluding education/skills blobs when those sections were detected.
    experience = extractExperienceFallback(text, sections);
  }
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

/**
 * PDF extractors often emit one giant line. Re-introduce structure so section
 * headers and job date ranges can be found.
 */
function normalizeResumeLayout(rawText: string): string {
  let text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!text) return "";

  // Collapse spaced-out ALL CAPS runs: "H U M A N" → "HUMAN" (keep short tokens)
  text = text.replace(/\b(?:[A-Z]\s){2,}[A-Z]\b/g, (m) => m.replace(/\s+/g, ""));

  // Insert newlines before known section headers mid-line (longest aliases first).
  for (const { alias } of SECTION_ALIAS_ENTRIES) {
    const escaped = escapeRegExp(alias);
    const re = new RegExp(`(?<=\\S)([ \\t]+)(${escaped})(?=\\s*[:|•\\-–—]?\\s|$)`, "gi");
    text = text.replace(re, "\n$2");
  }

  // Company | Location patterns often start a job in executive resumes.
  // Require a real org name (4+ chars) so state codes like "IN |" are not split.
  text = text.replace(
    /(?<=\S)\s+([A-Z][A-Z0-9 &.,'/()-]{3,80}\s*\|\s*[A-Za-z])/g,
    "\n$1",
  );

  // Put each date range on its own line when jammed into a paragraph.
  text = text.replace(
    new RegExp(`(?<=\\S)\\s+(${DATE_RANGE_SOURCE})`, "gi"),
    "\n$1",
  );
  text = text.replace(
    new RegExp(`(${DATE_RANGE_SOURCE})(?=\\s+[A-Z])`, "gi"),
    "$1\n",
  );

  // Bullet glyphs from Word/PDF often lack newlines (space after glyph is common).
  text = text.replace(/\s*[•▪◦●◉○]\s*/g, "\n• ");
  // Only treat ASCII "- "/"* " as bullets at line starts — never mid-line, or we
  // destroy date ranges like "01/2020 - 12/2022".
  text = text.replace(/(^|\n)\s*[-*]\s+(?=\S)/g, "$1• ");

  // Normalize whitespace within lines but keep newlines we inserted.
  text = text
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitIntoSections(text: string): Record<string, string> {
  const lines = text.split("\n");
  const sections: Record<string, string> = {};
  let currentKey = "preamble";
  const buckets: Record<string, string[]> = { preamble: [] };

  for (const line of lines) {
    const peeled = peelSectionHeader(line);
    if (peeled) {
      currentKey = peeled.key;
      if (!buckets[currentKey]) buckets[currentKey] = [];
      if (peeled.rest) buckets[currentKey].push(peeled.rest);
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

/** Pure header line → section key, or null. */
function matchSectionHeader(line: string): string | null {
  const peeled = peelSectionHeader(line);
  return peeled ? peeled.key : null;
}

/**
 * Detect a section header at the start of a line, optionally with content after it
 * (`WORK EXPERIENCE Software Engineer | Acme…`).
 */
function peelSectionHeader(line: string): { key: string; rest: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 200) return null;

  const cleaned = trimmed.replace(/[:|•\-–—]+$/g, "").trim();
  if (!cleaned) return null;

  for (const { key, alias } of SECTION_ALIAS_ENTRIES) {
    const lower = cleaned.toLowerCase();
    if (lower === alias) {
      return { key, rest: "" };
    }
    if (lower.startsWith(alias + " ") || lower.startsWith(alias + ":") || lower.startsWith(alias + "|")) {
      const rest = cleaned.slice(alias.length).replace(/^[\s:|•\-–—]+/, "").trim();
      return { key, rest };
    }
    // Short fuzzy header (typos): "Experiance"
    if (
      !lower.includes(" ") &&
      cleaned.length <= 24 &&
      alias.length <= 24 &&
      editDistance(lower, alias) <= 1
    ) {
      return { key, rest: "" };
    }
  }

  // ALL-CAPS short header not in alias list but containing an alias word
  if (trimmed.length <= 60 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    const lower = trimmed.toLowerCase().replace(/[:|•\-–—]+$/g, "").trim();
    const wordCount = lower.split(/\s+/).length;
    if (wordCount <= 6 && !/[.!?].+\w/.test(trimmed)) {
      for (const { key, alias } of SECTION_ALIAS_ENTRIES) {
        if (lower === alias || lower.endsWith(" " + alias) || lower.startsWith(alias + " ")) {
          return { key, rest: "" };
        }
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

  // Prefer date-anchored extraction (works for newline and collapsed layouts).
  const byDates = extractExperienceByDateAnchors(sectionText);
  if (byDates.length > 0) return byDates;

  const blocks = splitJobBlocks(sectionText);
  return blocks.map((raw) => parseExperienceBlock(raw)).filter((e) => e.raw.trim().length > 0);
}

/** When no Experience section was found, scan the full resume for job-like date ranges. */
function extractExperienceFallback(
  fullText: string,
  sections: Record<string, string>,
): StructuredResumeData["experience"] {
  // Prefer scanning a reconstructed experience window between experience-ish
  // and education/skills headers if present in the raw (possibly still collapsed) text.
  const window = sliceExperienceWindow(fullText);
  const source = window || stripNonExperienceSections(fullText, sections);
  const found = extractExperienceByDateAnchors(source);
  return found.filter((e) => !looksLikeEducationBlock(e.raw));
}

function sliceExperienceWindow(text: string): string | null {
  const lower = text.toLowerCase();
  let start = -1;
  for (const alias of SECTION_ALIASES.experience) {
    const idx = lower.indexOf(alias);
    if (idx >= 0 && (start < 0 || idx < start)) start = idx;
  }
  if (start < 0) return null;

  let end = text.length;
  for (const key of ["education", "skills", "certifications", "projects", "languages"] as const) {
    for (const alias of SECTION_ALIASES[key]) {
      const idx = lower.indexOf(alias, start + 12);
      if (idx >= 0 && idx < end) end = idx;
    }
  }
  return text.slice(start, end).trim() || null;
}

function stripNonExperienceSections(
  fullText: string,
  sections: Record<string, string>,
): string {
  let text = fullText;
  for (const key of ["education", "skills", "certifications", "projects", "languages"]) {
    const body = sections[key];
    if (body && body.length > 40) {
      text = text.replace(body, "\n");
    }
  }
  return text;
}

function looksLikeEducationBlock(raw: string): boolean {
  return /\b(university|college|bachelor|master|gpa|ph\.?d|associate degree|mba degree)\b/i.test(
    raw,
  );
}

/**
 * Split jobs by date-range anchors. Handles:
 * - Title/Company then date then bullets
 * - Company | Location | blurb then date then Title then bullets (executive resumes)
 * - Collapsed single-line PDF text
 */
function extractExperienceByDateAnchors(
  text: string,
): StructuredResumeData["experience"] {
  const matches = [...text.matchAll(new RegExp(DATE_RANGE_SOURCE, "gi"))];
  if (matches.length === 0) return [];

  const jobs: StructuredResumeData["experience"] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const dateStart = m.index ?? 0;
    const dateEnd = dateStart + m[0].length;
    const prevEnd =
      i === 0 ? 0 : (matches[i - 1].index ?? 0) + (matches[i - 1][0]?.length ?? 0);
    const nextStart = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;

    const before = text.slice(prevEnd, dateStart).trim();
    const after = text.slice(dateEnd, nextStart).trim();
    const header = takeJobHeader(before);
    if (!header && !after) continue;

    // Skip date ranges that are clearly academic-only (no job-like header/title).
    const combined = `${header} ${after}`;
    if (looksLikeEducationBlock(combined) && !/[A-Z]{2,}.*\|/.test(header) && !hasJobTitleSignal(after)) {
      continue;
    }

    const parsed = parseJobFromHeaderAndBody(header, after, m[1], m[2]);
    if (!parsed.title && !parsed.company && parsed.bullets.length === 0) continue;
    jobs.push(parsed);
  }

  return jobs;
}

function hasJobTitleSignal(after: string): boolean {
  return /\b(director|manager|engineer|developer|analyst|consultant|associate|specialist|coordinator|officer|lead|intern|president|vp|vice president)\b/i.test(
    after.slice(0, 120),
  );
}

function takeJobHeader(before: string): string {
  if (!before) return "";

  const lines = before
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !isBulletLine(l));

  // Prefer the last Company | Location line (executive / collapsed PDF layout).
  for (let i = lines.length - 1; i >= 0; i--) {
    const left = lines[i].split("|")[0]?.trim() ?? "";
    if (lines[i].includes("|") && looksLikeCompany(left)) {
      return lines[i].slice(0, 400);
    }
  }

  if (lines.length > 0) {
    return lines.slice(-3).join("\n").slice(-400);
  }

  const found = [...before.matchAll(new RegExp(COMPANY_PIPE_RE.source, "g"))];
  if (found.length > 0) {
    return found[found.length - 1][0].trim();
  }
  return before.slice(-300).trim();
}

function parseJobFromHeaderAndBody(
  header: string,
  after: string,
  startRaw: string,
  endRaw: string,
): StructuredResumeData["experience"][number] {
  let title: string | null = null;
  let company: string | null = null;
  let location: string | null = null;

  const headerLines = header
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const primary = headerLines[0] ?? header;

  // Company | Location | blurb  (executive / PDF style)
  const pipeParts = primary
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (pipeParts.length >= 2 && looksLikeCompany(pipeParts[0])) {
    company = cleanCompanyName(pipeParts[0]);
    location = looksLikeLocation(pipeParts[1]) ? pipeParts[1] : null;
  } else {
    const split = splitTitleCompany(primary);
    title = split.title;
    company = split.company ?? (headerLines[1] ? splitTitleCompany(headerLines[1]).title : null);
    location = split.location;
    if (headerLines[1] && !location) {
      const loc = headerLines[1].match(/\b([A-Za-z .'-]+,\s*[A-Z]{2})\b/);
      if (loc) location = loc[1];
      else if (!company) company = headerLines[1];
    }
  }

  // Title often follows the date in company-first layouts.
  const afterLines = after
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!title && afterLines.length > 0) {
    const first = afterLines[0].replace(DATE_RANGE_RE, "").trim();
    // Take a short title-like prefix before a sentence starts.
    title = extractTitleFromAfter(first);
  }

  const bulletLines = afterLines.filter((l) => isBulletLine(l) || l.length > 40);
  let bullets = bulletLines
    .map((l) => l.replace(/^[•▪◦●◉○\-*]\s*/, "").trim())
    .filter((l) => l.length > 8 && l !== title && l !== company)
    .slice(0, 12);

  // If title ate the whole paragraph, trim title and derive bullets from remainder.
  if (title && title.length > 90) {
    const short = extractTitleFromAfter(title);
    const rest = title.slice(short.length).trim();
    title = short;
    if (rest.length > 20) bullets = [rest, ...bullets].slice(0, 12);
  }

  const raw = [header, `${cleanDate(startRaw)} – ${cleanDate(endRaw)}`, after]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2500);

  return {
    title,
    company,
    location,
    startDate: cleanDate(startRaw),
    endDate: cleanDate(endRaw),
    bullets,
    raw,
  };
}

function extractTitleFromAfter(text: string): string {
  const cleaned = text.replace(/^[•▪◦●◉○\-*]\s*/, "").trim();
  // Stop at sentence boundary or bullet remnant after ~8 words if long.
  const sentence = cleaned.match(/^(.{5,90}?)(?=\s+[A-Z][a-z]|\s+[•]|\.\s|$)/);
  if (sentence) {
    const candidate = sentence[1].replace(/\s+/g, " ").trim();
    // Prefer stopping before "Recruited"/"Led"/"Managed" narrative verbs if title has an en-dash role.
    const role = cleaned.match(
      /^((?:[A-Z][A-Za-z0-9/&+.-]*(?:\s+[–—-]\s+)?(?:[A-Za-z0-9/&+.-]+|\s|&|\/){0,60}?))\s+(?=(?:Recruited|Led|Managed|Joined|Hired|Consulted|Transformed|Created|Built|Developed|Partnered|Directed|Oversaw)\b)/,
    );
    if (role) return role[1].replace(/\s+/g, " ").trim().slice(0, 100);
    if (candidate.length >= 5 && candidate.length <= 90) return candidate;
  }
  return cleaned.split(/\s+/).slice(0, 12).join(" ").slice(0, 100);
}

function looksLikeCompany(s: string): boolean {
  if (/^(inc|llc|ltd|corp|co)\b/i.test(s)) return false;
  if (/\b(inc|llc|ltd|corp|corporation|company|laboratories|industries|group|university)\b/i.test(s)) {
    return true;
  }
  // ALL-CAPS multi-word org names
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 4 && s === s.toUpperCase() && /[A-Z]/.test(s)) return true;
  return false;
}

function looksLikeLocation(s: string): boolean {
  return /\b[A-Z]{2}\b/.test(s) || /,\s*[A-Z]{2}\b/.test(s) || /remote/i.test(s);
}

function cleanCompanyName(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function splitTitleCompany(line: string): {
  title: string | null;
  company: string | null;
  location: string | null;
} {
  const cleaned = line.replace(DATE_RANGE_RE, "").trim();
  if (!cleaned) return { title: null, company: null, location: null };

  // Title @ Company | Location
  const atMatch = cleaned.match(/^(.+?)\s+@\s+(.+)$/);
  if (atMatch) {
    const right = atMatch[2];
    const parts = right.split(/\s*\|\s*/).map((p) => p.trim());
    return {
      title: atMatch[1].trim(),
      company: parts[0] || null,
      location: parts[1] || null,
    };
  }

  const parts = cleaned
    .split(/\s*\|\s*|\s+[-–—]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    // If first part looks like company (ALL CAPS), company-first
    if (looksLikeCompany(parts[0]) && !looksLikeCompany(parts[1])) {
      return {
        title: null,
        company: parts[0],
        location: looksLikeLocation(parts[1]) ? parts[1] : parts[2] && looksLikeLocation(parts[2]) ? parts[2] : null,
      };
    }
    return {
      title: parts[0],
      company: parts[1],
      location: parts[2] || null,
    };
  }
  return { title: cleaned, company: null, location: null };
}

function isBulletLine(line: string): boolean {
  return /^[•▪◦●◉○\-*]/.test(line.trim());
}

function splitJobBlocks(sectionText: string): string[] {
  const lines = sectionText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const anchors: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (DATE_RANGE_RE.test(lines[i])) anchors.push(i);
  }

  if (anchors.length === 0) {
    return sectionText
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);
  }

  const blocks: string[] = [];
  for (let a = 0; a < anchors.length; a++) {
    const dateIdx = anchors[a];
    let start = dateIdx;
    let looked = 0;
    for (let i = dateIdx - 1; i >= 0 && looked < 3; i--) {
      if (a > 0 && i <= anchors[a - 1]) break;
      if (isBulletLine(lines[i])) break;
      start = i;
      looked++;
    }

    let nextStart = lines.length;
    if (a + 1 < anchors.length) {
      const nextDate = anchors[a + 1];
      nextStart = nextDate;
      let looked2 = 0;
      for (let i = nextDate - 1; i > dateIdx && looked2 < 3; i--) {
        if (isBulletLine(lines[i])) break;
        nextStart = i;
        looked2++;
      }
    }

    blocks.push(lines.slice(start, nextStart).join("\n"));
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

  const before = lines.slice(0, dateLineIdx >= 0 ? dateLineIdx : lines.length).join("\n");
  const after =
    dateLineIdx >= 0
      ? [
          lines[dateLineIdx].replace(DATE_RANGE_RE, "").trim(),
          ...lines.slice(dateLineIdx + 1),
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  if (startDate) {
    return parseJobFromHeaderAndBody(before, after, startDate, endDate ?? "");
  }

  const split = splitTitleCompany(lines[0] ?? "");
  return {
    title: split.title,
    company: split.company,
    location: split.location,
    startDate: null,
    endDate: null,
    bullets: lines
      .slice(1)
      .filter((l) => isBulletLine(l) || l.length > 20)
      .map((l) => l.replace(/^[•▪◦●◉○\-*]\s*/, "").trim())
      .slice(0, 12),
    raw,
  };
}

function extractEducation(sectionText: string): StructuredResumeData["education"] {
  if (!sectionText.trim()) return [];

  // Keep one logical block when blank lines only separate GPA / honors lines.
  const blocks = sectionText
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const onlyGpaOrShort =
    blocks.length > 1 &&
    blocks.slice(1).every((b) => b.length < 40 || /^GPA\b/i.test(b) || /^honors?\b/i.test(b));
  const source = onlyGpaOrShort || blocks.length <= 1 ? [sectionText.trim()] : blocks;

  const sectionGpa = sectionText.match(GPA_RE)?.[1]?.trim() ?? null;

  const results = source
    .map((raw) => {
      const schoolMatch =
        raw.match(SCHOOL_RE) ??
        raw.match(/\b((?:University|College|Institute|School|Academy|Polytechnic)[^|\n]{0,80})/i);
      // Avoid matching bare initials inside place names (e.g. "Be" in Berkeley via B.E.).
      const degreeMatch = raw.match(
        /\b((?:Bachelor|Master|Doctor|Associate|B\.?S\.?|B\.?A\.?|B\.?Tech|M\.?S\.?|M\.?A\.?|M\.?Eng|M\.?B\.?A\.?|Ph\.?D\.?|A\.?A\.?|A\.?S\.?)(?:\b|\.)[^,\n]{0,80})/i,
      );
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
    .filter((e) => e.school || e.degree || e.gpa || e.raw.length > 10);

  if (sectionGpa) {
    const target = results.find((e) => e.school || e.degree) ?? results[0];
    if (target && !target.gpa) target.gpa = sectionGpa;
  }

  return results.filter((e) => e.school || e.degree || e.startDate || (e.gpa && results.length === 1));
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

  const experience = preferRicherExperience(llm.experience, heuristic.experience);

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

/**
 * Never let an empty or hollow LLM experience array wipe a non-empty heuristic result.
 */
function preferRicherExperience(
  llm: StructuredResumeData["experience"] | undefined,
  heuristic: StructuredResumeData["experience"],
): StructuredResumeData["experience"] {
  if (!Array.isArray(llm) || llm.length === 0) return heuristic;

  const normalized = llm.map((e) => ({
    title: e.title ?? null,
    company: e.company ?? null,
    location: e.location ?? null,
    startDate: e.startDate ?? null,
    endDate: e.endDate ?? null,
    bullets: Array.isArray(e.bullets) ? e.bullets : [],
    raw: e.raw ?? "",
  }));

  const substantive = (jobs: StructuredResumeData["experience"]) =>
    jobs.filter((e) => e.title || e.company || e.startDate).length;

  // Empty / hollow LLM output must not erase heuristic jobs.
  if (substantive(normalized) === 0 && substantive(heuristic) > 0) {
    return heuristic;
  }
  return normalized;
}

function preferNonEmptyArray(a: string[] | undefined, b: string[]): string[] {
  return a && a.length > 0 ? a : b;
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
