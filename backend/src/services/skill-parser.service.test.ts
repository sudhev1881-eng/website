import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSkillsFromText } from "./skill-parser.service.js";

const SAMPLE_RESUME = `
Jane Doe
Software Engineer

SKILLS
JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS, Git

EXPERIENCE
Built REST APIs with Express and Next.js. Used Redis for caching.
Collaborated with the team using Agile and strong communication skills.
`;

describe("skill-parser.service", () => {
  it("extracts dictionary skills from sample resume text", () => {
    const result = parseSkillsFromText(SAMPLE_RESUME);
    const names = result.skills.map((s) => s.name);

    assert.ok(names.includes("JavaScript"));
    assert.ok(names.includes("TypeScript"));
    assert.ok(names.includes("React"));
    assert.ok(names.includes("Node.js"));
    assert.ok(names.includes("PostgreSQL"));
    assert.ok(names.includes("Docker"));
    assert.ok(names.includes("AWS"));
    assert.ok(names.includes("Git"));
    assert.ok(names.includes("Express"));
    assert.ok(names.includes("Next.js"));
    assert.ok(names.includes("Redis"));
    assert.ok(names.includes("Agile"));
    assert.ok(names.includes("Communication"));

    assert.ok(result.extractionConfidence > 0.5);
    assert.equal(result.structuredData.skillCount, result.skills.length);
  });

  it("returns empty result for blank text", () => {
    const result = parseSkillsFromText("   ");
    assert.deepEqual(result.skills, []);
    assert.equal(result.extractionConfidence, 0);
  });

  it("does not invent skills that are not present", () => {
    const result = parseSkillsFromText("I enjoy hiking and cooking.");
    assert.equal(result.skills.length, 0);
  });
});
