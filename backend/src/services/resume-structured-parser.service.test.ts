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

  it("keeps heuristic experience when LLM returns hollow experience entries", () => {
    const base = parseResumeHeuristic(SAMPLE_RESUME);
    const merged = mergeLlmIntoHeuristic(base.structuredData, {
      experience: [{ title: null, company: null, location: null, startDate: null, endDate: null, bullets: [], raw: "" }],
    });
    assert.ok(merged.experience.length >= 1);
    assert.ok(merged.experience.some((e) => e.title || e.company));
  });

  it("extracts experience from Employment History with mm/yyyy dates and @ company", () => {
    const text = `
Alex Rivera
alex@example.com

EMPLOYMENT HISTORY
Software Engineer @ TechCo
01/2020 - 12/2022
Built REST APIs and dashboards.

Junior Developer @ StartupIO
2018–2019
Implemented React features.

EDUCATION
MIT
`;
    const { structuredData } = parseResumeHeuristic(text);
    assert.ok(structuredData.sections.experience, "expected experience section");
    assert.ok(structuredData.experience.length >= 2);
    const tech = structuredData.experience.find(
      (e) =>
        (e.company ?? "").toLowerCase().includes("techco") ||
        (e.title ?? "").toLowerCase().includes("software"),
    );
    assert.ok(tech);
    assert.equal(tech!.startDate, "01/2020");
    assert.equal(tech!.endDate, "12/2022");
  });

  it("extracts experience when Work Experience header shares the first job line", () => {
    const text = `
Jordan Lee
jordan@example.com
WORK EXPERIENCE Software Engineer | Acme Corp | NYC
Jan. 2020 to Present
• Shipped product features

SKILLS
Python, SQL
`;
    const { structuredData } = parseResumeHeuristic(text);
    assert.ok(structuredData.experience.length >= 1);
    const job = structuredData.experience[0];
    assert.ok(
      (job.title ?? "").toLowerCase().includes("software") ||
        (job.company ?? "").toLowerCase().includes("acme"),
    );
    assert.equal(job.endDate, "Present");
  });

  it("extracts multiple jobs from collapsed PDF text with Professional Experience", () => {
    // Realistic: zero newlines, company-first layout, en-dashes, Word bullet glyphs.
    const text =
      "LORETTA EXAMPLE, MBA [PHONE] | [EMAIL] LinkedIn.com/in/example " +
      "Strategic HR Executive summary text goes here. " +
      "PROFESSIONAL EXPERIENCE DONOVAN CORPORATION | Chicago, IL | $200M communications provider " +
      "2008 – Present Director – US & International Human Resources Recruited to direct HR for US operations. " +
      " HR Organization Leadership: Directed 4 HR professionals. " +
      " International HR Launch: Created HR organization in Brazil. " +
      "UNDERWRITERS LABORATORIES | Indianapolis, IN | Product testing laboratory " +
      "2005 – 2007 Director – Human Resources Transformed HR into a strategic partner. " +
      "GRAYSON INDUSTRIES | Indianapolis, IN | Enterprise learning company " +
      "2003 – 2005 Manager – Human Resources Joined new management team. " +
      "EDUCATION & PROFESSIONAL CREDENTIALS MBA Degree – Keller Graduate School of Management – 2008 " +
      "SKILLS Leadership, Coaching, HRIS";

    const { structuredData } = parseResumeHeuristic(text);
    assert.ok(
      structuredData.experience.length >= 3,
      `expected >=3 jobs, got ${structuredData.experience.length}: ${JSON.stringify(
        structuredData.experience.map((e) => ({
          title: e.title,
          company: e.company,
          start: e.startDate,
          end: e.endDate,
        })),
      )}`,
    );

    const donovan = structuredData.experience.find((e) =>
      (e.company ?? "").toUpperCase().includes("DONOVAN"),
    );
    assert.ok(donovan, "expected Donovan Corporation job");
    assert.equal(donovan!.startDate, "2008");
    assert.equal(donovan!.endDate, "Present");
    assert.ok(
      (donovan!.title ?? "").toLowerCase().includes("director") ||
        (donovan!.title ?? "").toLowerCase().includes("human resources"),
    );
    assert.ok(donovan!.bullets.length >= 1);

    const ul = structuredData.experience.find((e) =>
      (e.company ?? "").toUpperCase().includes("UNDERWRITERS"),
    );
    assert.ok(ul);
    assert.equal(ul!.startDate, "2005");
    assert.equal(ul!.endDate, "2007");
  });

  it("parses Present/Current end dates and Work History headers", () => {
    const text = `
Sam Example
Work History
Analyst — BigBank
06/2019 - Current
Analyzed financial data.
`;
    const { structuredData } = parseResumeHeuristic(text);
    assert.ok(structuredData.experience.length >= 1);
    const job = structuredData.experience[0];
    assert.ok((job.title ?? "").toLowerCase().includes("analyst") || (job.company ?? "").toLowerCase().includes("bigbank"));
    assert.equal(job.endDate, "Present");
  });
});
