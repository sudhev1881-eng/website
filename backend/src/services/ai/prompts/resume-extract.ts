import { DATA_ONLY_SYSTEM_PREFIX, wrapUntrustedResumeData } from "../sanitize.js";
import type { ChatMessage } from "../types.js";

/** Full structured extraction covering IntelligentResumeData sections. */
export function buildResumeExtractMessages(rawText: string): ChatMessage[] {
  const system = `${DATA_ONLY_SYSTEM_PREFIX}

Extract structured resume JSON matching this shape (use null/[] when unknown):
{
  "personal": {"name": null, "title": null},
  "contact": {"emails": [], "phones": [], "linkedin": null, "github": null, "website": null, "address": null, "name": null},
  "summary": null,
  "objective": null,
  "education": [{"school": null, "degree": null, "field": null, "startDate": null, "endDate": null, "gpa": null, "raw": ""}],
  "experience": [{"title": null, "company": null, "location": null, "startDate": null, "endDate": null, "bullets": [], "raw": ""}],
  "projects": [{"name": null, "description": null, "technologies": [], "url": null}],
  "skills": {"technical": [{"name": "", "category": ""}], "soft": [{"name": "", "category": ""}]},
  "languages": [{"name": "", "proficiency": null}],
  "certifications": [{"name": "", "issuer": null, "issueDate": null, "expiryDate": null, "credentialId": null, "credentialUrl": null}],
  "awards": [{"name": "", "issuer": null, "date": null}],
  "achievements": [],
  "volunteer": [{"role": null, "organization": null, "period": null, "description": null}],
  "leadership": [{"role": null, "organization": null, "period": null, "description": null}],
  "publications": [{"title": "", "venue": null, "date": null, "url": null}],
  "interests": [],
  "socialLinks": [{"label": "", "url": ""}],
  "domains": [],
  "classifications": []
}
Only include facts present in the resume. domains/classifications are short labels like "AI", "ML", "Cybersecurity", "Web Development" inferred from evidence — do not invent unsupported domains.`;

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `Extract structured JSON from this resume.\n\n${wrapUntrustedResumeData(rawText)}`,
    },
  ];
}
