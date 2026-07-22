import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SKILL_DICTIONARY,
  getAllSkills,
  getSkillCategory,
  resolveSkillName,
} from "./skill-dictionary.js";

describe("skill-dictionary", () => {
  it("contains at least 150 canonical skills", () => {
    assert.ok(SKILL_DICTIONARY.length >= 150, `got ${SKILL_DICTIONARY.length}`);
    assert.ok(getAllSkills().length >= 150);
  });

  it("resolves aliases to canonical names", () => {
    assert.equal(resolveSkillName("js"), "JavaScript");
    assert.equal(resolveSkillName("TypeScript"), "TypeScript");
    assert.equal(resolveSkillName("reactjs"), "React");
    assert.equal(resolveSkillName("k8s"), "Kubernetes");
    assert.equal(resolveSkillName("unknown-skill-xyz"), null);
  });

  it("returns categories for known skills", () => {
    assert.equal(getSkillCategory("React"), "Web Frontend");
    assert.equal(getSkillCategory("PostgreSQL"), "Databases");
    assert.equal(getSkillCategory("Leadership"), "Soft Skills");
    assert.equal(getSkillCategory("nope"), "General");
  });
});
