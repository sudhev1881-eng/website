import type { IntelligentResumeData } from "./types.js";

/**
 * SectionOptimizer — pulls lesser-known sections from raw section map text.
 * Heuristic only; never invents content not present in section blobs.
 */
export class SectionOptimizer {
  extractExtraSections(sections: Record<string, string>): Partial<{
    awards: IntelligentResumeData["awards"];
    achievements: string[];
    volunteer: IntelligentResumeData["volunteer"];
    leadership: IntelligentResumeData["leadership"];
    publications: IntelligentResumeData["publications"];
    research: IntelligentResumeData["research"];
    patents: IntelligentResumeData["patents"];
    clubs: IntelligentResumeData["clubs"];
    extracurricular: string[];
    interests: string[];
    objective: string | null;
  }> {
    const find = (...keys: string[]) => {
      for (const k of keys) {
        const hit = Object.entries(sections).find(([key]) =>
          key.toLowerCase().includes(k.toLowerCase()),
        );
        if (hit?.[1]?.trim()) return hit[1].trim();
      }
      return "";
    };

    const awardsText = find("award", "honor");
    const volunteerText = find("volunteer", "community");
    const leadershipText = find("leadership");
    const publicationsText = find("publication");
    const researchText = find("research");
    const patentsText = find("patent");
    const clubsText = find("club", "organization", "society");
    const extracurricularText = find("extracurricular", "activities");
    const interestsText = find("interest", "hobby", "hobbies");
    const objectiveText = find("objective");
    const achievementsText = find("achievement", "accomplishment");

    return {
      objective: objectiveText || null,
      awards: this.lines(awardsText).map((raw) => ({
        name: raw,
        issuer: null,
        date: null,
        raw,
      })),
      achievements: this.lines(achievementsText),
      volunteer: this.roleOrgLines(volunteerText),
      leadership: this.roleOrgLines(leadershipText),
      publications: this.lines(publicationsText).map((title) => ({
        title,
        venue: null,
        date: null,
        url: null,
      })),
      research: this.lines(researchText).map((title) => ({ title, description: null })),
      patents: this.lines(patentsText).map((title) => ({ title, number: null, date: null })),
      clubs: this.lines(clubsText).map((name) => ({ name, role: null })),
      extracurricular: this.lines(extracurricularText),
      interests: this.splitList(interestsText),
    };
  }

  /** Light ATS cleanup without inventing content (trim, collapse whitespace). */
  optimizeForAts(data: IntelligentResumeData): IntelligentResumeData {
    const clean = (s: string | null | undefined) =>
      s == null ? s : s.replace(/\s+/g, " ").trim();

    return {
      ...data,
      summary: clean(data.summary) ?? null,
      objective: clean(data.objective) ?? null,
      experience: data.experience.map((e) => ({
        ...e,
        title: clean(e.title) ?? null,
        company: clean(e.company) ?? null,
        bullets: e.bullets.map((b) => clean(b) ?? b).filter(Boolean),
        raw: clean(e.raw) ?? e.raw,
      })),
      education: data.education.map((e) => ({
        ...e,
        school: clean(e.school) ?? null,
        degree: clean(e.degree) ?? null,
        field: clean(e.field) ?? null,
        raw: clean(e.raw) ?? e.raw,
      })),
      projects: data.projects.map((p) => ({
        ...p,
        name: clean(p.name) ?? null,
        description: clean(p.description) ?? null,
      })),
      certifications: data.certifications.map((c) => ({
        ...c,
        name: clean(c.name) ?? c.name,
        issuer: clean(c.issuer) ?? null,
      })),
    };
  }

  private lines(text: string): string[] {
    return text
      .split(/\n|•|·/)
      .map((l) => l.replace(/^[-*]\s*/, "").trim())
      .filter((l) => l.length > 1)
      .slice(0, 40);
  }

  private splitList(text: string): string[] {
    return text
      .split(/[,;|•\n]/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1)
      .slice(0, 40);
  }

  private roleOrgLines(text: string): Array<{
    role: string | null;
    organization: string | null;
    period: string | null;
    description: string | null;
  }> {
    return this.lines(text).map((line) => {
      const parts = line.split(/\s[-–—@]\s|\s\|\s/);
      if (parts.length >= 2) {
        return {
          role: parts[0].trim(),
          organization: parts[1].trim(),
          period: null,
          description: parts.slice(2).join(" — ").trim() || null,
        };
      }
      return { role: line, organization: null, period: null, description: null };
    });
  }
}
