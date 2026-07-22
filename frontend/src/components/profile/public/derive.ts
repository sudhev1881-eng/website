import type {
  PublicProfile,
  PublicProfileAi,
  PublicProfileAvailability,
  PublicProfileEducation,
} from "@/lib/api";

export interface DerivedHighlight {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export interface SkillCategoryGroup {
  category: string;
  skills: Array<{ name: string; level: number }>;
  avgLevel: number;
}

export interface SkillInsight {
  category: string;
  strength: string;
  detail: string;
  confidence: number;
  source: "ai" | "heuristic";
}

export interface RecruiterInsight {
  id: string;
  title: string;
  detail: string;
  confidence: number;
  source: "ai" | "heuristic";
}

export interface TechCloudItem {
  name: string;
  count: number;
  weight: number;
}

export interface ProfileScores {
  overall: number;
  technical: number;
  experience: number;
  projects: number;
  source: "ai" | "heuristic";
}

export const RECRUITER_KEYWORDS = [
  "leadership",
  "intern",
  "internship",
  "full-stack",
  "fullstack",
  "frontend",
  "backend",
  "react",
  "typescript",
  "python",
  "machine learning",
  "ml",
  "ai",
  "research",
  "aws",
  "cloud",
  "distributed",
  "scalable",
  "open source",
  "hackathon",
  "published",
  "production",
  "api",
  "system design",
  "mentor",
  "shipped",
] as const;

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function isAiGenerated(profile: PublicProfile): boolean {
  return Boolean(profile.aiGenerated || profile.ai?.generated);
}

export function resolveSummary(profile: PublicProfile): string {
  return (profile.ai?.summary?.trim() || profile.bio?.trim() || "").trim();
}

export function resolveTitle(profile: PublicProfile): string {
  const aiTitle = profile.ai?.title?.trim();
  if (aiTitle) return aiTitle;

  const existing = profile.title?.trim();
  if (existing && existing.toLowerCase() !== "student") return existing;

  const topSkill = [...(profile.skills ?? [])].sort((a, b) => b.level - a.level)[0];
  const major = profile.major?.trim();
  if (major && topSkill) return `${major} · ${topSkill.name}`;
  if (major) return major;
  if (topSkill) return topSkill.name;
  if (profile.university?.trim()) return `Student at ${profile.university}`;
  return "Student";
}

export function resolveAvailability(
  profile: PublicProfile,
): Array<{ key: keyof PublicProfileAvailability; label: string }> {
  const a = profile.availability;
  if (!a) return [];
  const out: Array<{ key: keyof PublicProfileAvailability; label: string }> = [];
  if (a.internship) out.push({ key: "internship", label: "Open to Internship" });
  if (a.fullTime) out.push({ key: "fullTime", label: "Open to Full-Time" });
  if (a.research) out.push({ key: "research", label: "Open to Research" });
  return out;
}

export function resolveEducation(profile: PublicProfile): PublicProfileEducation[] {
  if (profile.education?.length) return profile.education;
  if (profile.university || profile.major) {
    return [
      {
        id: "derived-edu",
        school: profile.university || "University",
        field: profile.major || null,
        endDate: profile.graduationYear ? String(profile.graduationYear) : null,
        gpa: profile.gpa ?? null,
      },
    ];
  }
  return [];
}

export function detectLeadership(profile: PublicProfile): boolean {
  const blob = [
    profile.bio,
    ...profile.experience.map((e) => `${e.role} ${e.description}`),
    ...(profile.volunteer ?? []).map((v) => `${v.role} ${v.description}`),
  ]
    .join(" ")
    .toLowerCase();
  return /\b(lead|leader|leadership|president|captain|founder|co-founder|mentor)\b/.test(blob);
}

export function detectHackathon(profile: PublicProfile): boolean {
  const blob = [
    profile.bio,
    ...profile.projects.map((p) => `${p.title} ${p.description}`),
    ...profile.experience.map((e) => `${e.role} ${e.description}`),
  ]
    .join(" ")
    .toLowerCase();
  return /\bhackathon\b/.test(blob);
}

export function deriveHighlights(profile: PublicProfile): DerivedHighlight[] {
  const highlights: DerivedHighlight[] = [];
  const gpa = profile.gpa?.trim();
  if (gpa) {
    highlights.push({ id: "gpa", label: "GPA", value: gpa, hint: "Academic" });
  }
  if (profile.certificates.length > 0) {
    highlights.push({
      id: "certs",
      label: "Certifications",
      value: String(profile.certificates.length),
      hint: "Verified",
    });
  }
  if (profile.projects.length > 0) {
    highlights.push({
      id: "projects",
      label: "Projects",
      value: String(profile.projects.length),
      hint: "Shipped",
    });
  }
  const techCount = new Set([
    ...profile.skills.map((s) => s.name.toLowerCase()),
    ...profile.projects.flatMap((p) => p.tech.map((t) => t.toLowerCase())),
  ]).size;
  if (techCount > 0) {
    highlights.push({
      id: "tech",
      label: "Technologies",
      value: String(techCount),
      hint: "Stack",
    });
  }
  if (detectLeadership(profile)) {
    highlights.push({
      id: "leadership",
      label: "Leadership",
      value: "Yes",
      hint: "Detected",
    });
  }
  if (detectHackathon(profile)) {
    highlights.push({
      id: "hackathon",
      label: "Hackathons",
      value: "Yes",
      hint: "Builder",
    });
  }
  if (profile.experience.length > 0) {
    highlights.push({
      id: "experience",
      label: "Roles",
      value: String(profile.experience.length),
      hint: "Experience",
    });
  }
  return highlights.slice(0, 6);
}

export function groupSkillsByCategory(profile: PublicProfile): SkillCategoryGroup[] {
  const map = new Map<string, Array<{ name: string; level: number }>>();
  for (const skill of profile.skills) {
    const cat = skill.category?.trim() || "Other";
    const list = map.get(cat) ?? [];
    list.push({ name: skill.name, level: skill.level });
    map.set(cat, list);
  }
  return [...map.entries()]
    .map(([category, skills]) => {
      const sorted = [...skills].sort((a, b) => b.level - a.level);
      const avgLevel = sorted.reduce((s, x) => s + x.level, 0) / Math.max(1, sorted.length);
      return { category, skills: sorted, avgLevel };
    })
    .sort((a, b) => b.avgLevel - a.avgLevel || b.skills.length - a.skills.length);
}

export function deriveSkillInsights(profile: PublicProfile): SkillInsight[] {
  const ai = profile.ai?.skillInsights;
  if (ai?.length) {
    return ai.map((item) => ({
      category: item.category,
      strength: item.strength,
      detail: item.detail || `${item.strength} in ${item.category}`,
      confidence: clamp(item.confidence ?? 72),
      source: "ai" as const,
    }));
  }

  const groups = groupSkillsByCategory(profile).slice(0, 4);
  return groups.map((g) => {
    const top = g.skills.slice(0, 3).map((s) => s.name).join(", ");
    const strength =
      g.avgLevel >= 85 ? "Expert depth" : g.avgLevel >= 70 ? "Strong proficiency" : "Solid foundation";
    return {
      category: g.category,
      strength,
      detail: top
        ? `Most active in ${g.category.toLowerCase()} — ${top}.`
        : `Consistent signal in ${g.category}.`,
      confidence: clamp(45 + g.avgLevel * 0.4 + g.skills.length * 3),
      source: "heuristic" as const,
    };
  });
}

export function deriveTechCloud(profile: PublicProfile): TechCloudItem[] {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();

  const add = (raw: string, n = 1) => {
    const name = raw.trim();
    if (!name) return;
    const key = name.toLowerCase();
    labels.set(key, labels.get(key) ?? name);
    counts.set(key, (counts.get(key) ?? 0) + n);
  };

  for (const skill of profile.skills) {
    add(skill.name, 2 + Math.floor(skill.level / 40));
  }
  for (const project of profile.projects) {
    for (const t of project.tech) add(t, project.featured ? 2 : 1);
  }

  const entries = [...counts.entries()].map(([key, count]) => ({
    name: labels.get(key) ?? key,
    count,
  }));
  const max = Math.max(1, ...entries.map((e) => e.count));
  return entries
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 28)
    .map((e) => ({
      ...e,
      weight: e.count / max,
    }));
}

export function deriveScores(profile: PublicProfile): ProfileScores {
  const ai = profile.ai;
  if (ai?.score != null || ai?.scores?.overall != null) {
    return {
      overall: clamp(ai.score ?? ai.scores?.overall ?? 0),
      technical: clamp(ai.scores?.technical ?? ai.score ?? 0),
      experience: clamp(ai.scores?.experience ?? ai.score ?? 0),
      projects: clamp(ai.scores?.projects ?? ai.score ?? 0),
      source: "ai",
    };
  }

  const skillAvg =
    profile.skills.length > 0
      ? profile.skills.reduce((s, x) => s + x.level, 0) / profile.skills.length
      : 40;
  const technical = clamp(skillAvg * 0.85 + Math.min(profile.skills.length, 12) * 1.2);
  const experience = clamp(
    35 +
      profile.experience.length * 14 +
      (detectLeadership(profile) ? 8 : 0) +
      (profile.certificates.length > 0 ? 6 : 0),
  );
  const projects = clamp(
    30 +
      profile.projects.length * 12 +
      profile.projects.filter((p) => p.featured).length * 6 +
      Math.min(
        profile.projects.reduce((s, p) => s + p.tech.length, 0),
        20,
      ),
  );
  const overall = clamp(technical * 0.35 + experience * 0.3 + projects * 0.35);
  return { overall, technical, experience, projects, source: "heuristic" };
}

export function deriveRecruiterInsights(profile: PublicProfile): RecruiterInsight[] {
  const aiInsights = profile.ai?.insights;
  if (aiInsights?.length) {
    return aiInsights.map((item, i) => ({
      id: item.id ?? `ai-insight-${i}`,
      title: item.title,
      detail: item.detail,
      confidence: clamp(item.confidence ?? 70),
      source: "ai" as const,
    }));
  }

  const insights: RecruiterInsight[] = [];
  const groups = groupSkillsByCategory(profile);
  if (groups[0]) {
    insights.push({
      id: "strength-domain",
      title: `Strong ${groups[0].category} signal`,
      detail: `Top category by skill depth, with ${groups[0].skills.length} related skills.`,
      confidence: clamp(55 + groups[0].avgLevel * 0.35),
      source: "heuristic",
    });
  }
  if (profile.projects.filter((p) => p.featured).length > 0) {
    insights.push({
      id: "featured-projects",
      title: "Featured project portfolio",
      detail: "Has highlighted projects suitable for technical screening conversations.",
      confidence: 78,
      source: "heuristic",
    });
  } else if (profile.projects.length >= 2) {
    insights.push({
      id: "project-breadth",
      title: "Multi-project builder",
      detail: `${profile.projects.length} projects suggest hands-on delivery experience.`,
      confidence: 68,
      source: "heuristic",
    });
  }
  if (profile.experience.some((e) => /intern/i.test(e.role))) {
    insights.push({
      id: "internship-exp",
      title: "Internship experience",
      detail: "Prior internship roles indicate workplace readiness.",
      confidence: 82,
      source: "heuristic",
    });
  }
  if (detectLeadership(profile)) {
    insights.push({
      id: "leadership",
      title: "Leadership indicators",
      detail: "Bio or roles mention leadership, founding, or mentoring.",
      confidence: 64,
      source: "heuristic",
    });
  }
  if (profile.certificates.length >= 2) {
    insights.push({
      id: "certs",
      title: "Credential density",
      detail: `${profile.certificates.length} certifications support verified skill claims.`,
      confidence: 74,
      source: "heuristic",
    });
  }
  if (insights.length === 0 && resolveSummary(profile)) {
    insights.push({
      id: "summary-present",
      title: "Clear professional narrative",
      detail: "Profile includes a written summary recruiters can scan quickly.",
      confidence: 60,
      source: "heuristic",
    });
  }
  return insights.slice(0, 4);
}

export function topSkills(profile: PublicProfile, limit = 5): string[] {
  return [...profile.skills]
    .sort((a, b) => b.level - a.level)
    .slice(0, limit)
    .map((s) => s.name);
}

export function formatRelativeUpdated(iso?: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 30) return `Updated ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Updated ${months}mo ago`;
  return `Updated ${Math.floor(months / 12)}y ago`;
}

export function highlightKeywords(text: string): Array<{ text: string; highlight: boolean }> {
  if (!text) return [];
  const pattern = new RegExp(
    `\\b(${RECRUITER_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
    "gi",
  );
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index), highlight: false });
    }
    parts.push({ text: match[0], highlight: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), highlight: false });
  return parts.length ? parts : [{ text, highlight: false }];
}

export type { PublicProfileAi };
