import type { RichCertification } from "./types.js";

/**
 * CertificationExtractor — expands cert lines into a rich schema.
 * Missing issuer/dates/credential are left null (ValidationEngine flags them).
 */
export class CertificationExtractor {
  enrich(
    basic: Array<{ name: string; issuer?: string | null; date?: string | null }>,
    sectionText: string,
  ): RichCertification[] {
    if (basic.length > 0) {
      return basic.map((c) => this.parseLine(`${c.name}${c.issuer ? ` — ${c.issuer}` : ""}${c.date ? ` (${c.date})` : ""}`, c));
    }

    const lines = sectionText
      .split(/\n|•|·|;/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    return lines.map((line) => this.parseLine(line));
  }

  parseLine(
    line: string,
    seed?: { name: string; issuer?: string | null; date?: string | null },
  ): RichCertification {
    const dateMatch = line.match(
      /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\b/i,
    );
    const urlMatch = line.match(/https?:\/\/[^\s)]+/i);
    const credentialMatch = line.match(
      /\b(?:credential|cert|id|license)\s*[#:]?\s*([A-Za-z0-9-]{4,})\b/i,
    );

    let issuer: string | null = seed?.issuer ?? null;
    let name = seed?.name ?? line;

    const dashSplit = line.split(/\s[-–—]\s|\s\|\s/);
    if (!seed?.name && dashSplit.length >= 2) {
      name = dashSplit[0].trim();
      issuer = dashSplit[1].replace(/\([^)]*\)/g, "").trim() || null;
    } else if (!issuer) {
      const byMatch = line.match(/\b(?:by|from|issued by)\s+([^,(|]+)/i);
      if (byMatch) issuer = byMatch[1].trim();
    }

    if (seed?.name) name = seed.name;

    return {
      name: name.slice(0, 255) || "Certification",
      issuer: issuer?.slice(0, 255) ?? null,
      issueDate: seed?.date ?? dateMatch?.[1] ?? null,
      expiryDate: null,
      credentialId: credentialMatch?.[1] ?? null,
      credentialUrl: urlMatch?.[0] ?? null,
      raw: line,
    };
  }
}
