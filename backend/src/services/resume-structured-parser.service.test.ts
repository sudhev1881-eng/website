import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeLlmIntoHeuristic,
  parseResumeHeuristic,
} from "./resume-structured-parser.service.js";

const SAMPLE_RESUME = `
Jane Doe
San Francisco, CA 94105
jane.doe@email.com | (415) 555-0199
linkedin.com/in/janedoe | github.com/janedoe | https://janedoe.dev

SUMMARY
Full-stack engineer with 5 years building web products. Passionate about clean APIs and great UX.

EXPERIENCE
Software Engineer | Acme Corp | San Francisco, CA
Jan 2020 – Present
• Built REST APIs with Express and Next.js
• Led migration to PostgreSQL and Redis caching
• Mentored junior developers using Agile practices

Junior Developer - Beta Labs
2018-2019
Implemented React dashboards and Node.js services.

EDUCATION
University of California, Berkeley
Bachelor of Science in Computer Science
Aug 2014 – May 2018
GPA: 3.7

SKILLS
JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS, Git

PROJECTS
StudentLink Portal
Web app for student profiles. Built with React and Express.
https://example.com/studentlink

CERTIFICATIONS
AWS Certified Developer - Associate - 2022
Google Cloud Professional Cloud Architect | 2021

LANGUAGES
English, Spanish
`;

describe("resume-structured-parser.service", () => {
  it("extracts contact, experience, education, skills, and linkedin from sample resume", () => {
    const { structuredData, skills, extractionConfidence } = parseResumeHeuristic(SAMPLE_RESUME);

    assert.equal(structuredData.parser, "heuristic");
    assert.ok(structuredData.contact.emails.includes("jane.doe@email.com"));
    assert.ok(structuredData.contact.phones.some((p) => p.includes("415")));
    assert.ok(structuredData.contact.linkedin?.includes("linkedin.com/in/janedoe"));
    assert.ok(structuredData.contact.github?.includes("github.com/janedoe"));
    assert.ok(structuredData.contact.website?.includes("janedoe.dev"));
    assert.equal(structuredData.contact.name, "Jane Doe");
    assert.ok(structuredData.contact.address?.includes("San Francisco"));

    assert.ok(structuredData.summary?.toLowerCase().includes("full-stack"));

    assert.ok(structuredData.experience.length >= 1);
    const acme = structuredData.experience.find(
      (e) =>
        (e.company ?? "").toLowerCase().includes("acme") ||
        (e.title ?? "").toLowerCase().includes("software"),
    );
    assert.ok(acme);
    assert.ok(acme!.startDate);
    assert.equal(acme!.endDate, "Present");
    assert.ok(acme!.bullets.length >= 1);

    assert.ok(structuredData.education.length >= 1);
    const edu = structuredData.education[0];
    assert.ok(edu.school?.includes("Berkeley") || edu.raw.includes("Berkeley"));
    assert.ok(edu.degree || edu.raw.toLowerCase().includes("bachelor"));
    assert.ok(edu.gpa?.includes("3.7"));

    const names = skills.map((s) => s.name);
    assert.ok(names.includes("JavaScript"));
    assert.ok(names.includes("TypeScript"));
    assert.ok(names.includes("React"));
    assert.ok(names.includes("PostgreSQL"));

    assert.ok(structuredData.certifications.length >= 1);
    assert.ok(structuredData.projects.length >= 1);
    assert.ok(structuredData.languages.includes("English"));

    assert.ok(structuredData.sections.experience);
    assert.ok(structuredData.sections.education);
    assert.ok(structuredData.confidence.contact > 0.5);
    assert.ok(structuredData.confidence.skills > 0.4);
    assert.ok(extractionConfidence > 0.4);
  });

  it("returns empty result for blank text", () => {
    const result = parseResumeHeuristic("   ");
    assert.equal(result.skills.length, 0);
    assert.equal(result.extractionConfidence, 0);
    assert.equal(result.structuredData.parser, "heuristic");
  });

  it("merges LLM refinement onto heuristic and sets parser flag", () => {
    const base = parseResumeHeuristic(SAMPLE_RESUME);
    const merged = mergeLlmIntoHeuristic(base.structuredData, {
      contact: {
        ...base.structuredData.contact,
        name: "Jane A. Doe",
        phones: ["+1 415-555-0199"],
      },
      experience: [
        {
          title: "Senior Software Engineer",
          company: "Acme Corp",
          location: "San Francisco, CA",
          startDate: "Jan 2020",
          endDate: "Present",
          bullets: ["Built APIs"],
          raw: "Senior Software Engineer | Acme Corp",
        },
      ],
      summary: "Refined summary from LLM.",
    });

    assert.equal(merged.parser, "heuristic+llm");
    assert.equal(merged.contact.name, "Jane A. Doe");
    assert.equal(merged.summary, "Refined summary from LLM.");
    assert.equal(merged.experience[0]?.title, "Senior Software Engineer");
    assert.ok(merged.skills.length >= base.structuredData.skills.length);
    assert.ok(merged.confidence.overall > 0.4);
  });

  it("keeps heuristic experience when LLM returns empty experience array", () => {
    const base = parseResumeHeuristic(SAMPLE_RESUME);
    const merged = mergeLlmIntoHeuristic(base.structuredData, {
      experience: [],
      education: [],
    });
    assert.ok(merged.experience.length > 0);
    assert.ok(merged.education.length > 0);
  });
});
