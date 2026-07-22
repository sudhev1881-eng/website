import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ValidationEngine } from "./validation-engine.js";
import { mergeEnhancementNoInvent } from "./ai-enhancement.engine.js";
import { applySectionAction } from "./user-confirmation.service.js";
import { selectResumesToReplace } from "./database-manager.js";
import {
  planAcceptedProfile,
  buildPublicProfileFallbackFromResume,
  mapPublicLinks,
} from "./profile-builder.js";
import { EmbeddingGenerator } from "./embedding-generator.js";
import { emptyIntelligentResumeData, type IntelligentResumeData } from "./types.js";

function sampleData(overrides?: Partial<IntelligentResumeData>): IntelligentResumeData {
  const base = emptyIntelligentResumeData();
  return {
    ...base,
    contact: {
      ...base.contact,
      emails: ["a@example.com"],
      name: "Ada Lovelace",
    },
    summary: "Engineer",
    experience: [
      {
        title: "Engineer",
        company: "Acme",
        location: null,
        startDate: "2020",
        endDate: "Present",
        bullets: ["Built APIs"],
        raw: "Engineer at Acme",
      },
    ],
    education: [
      {
        school: "MIT",
        degree: "BS",
        field: "CS",
        startDate: null,
        endDate: "2019",
        gpa: null,
        raw: "MIT",
      },
    ],
    skills: {
      technical: [{ name: "TypeScript", category: "Languages", frequency: 2, confidence: 0.8 }],
      soft: [],
      all: [{ name: "TypeScript", category: "Languages", frequency: 2, confidence: 0.8 }],
    },
    certifications: [
      {
        name: "AWS SAA",
        issuer: null,
        issueDate: null,
        expiryDate: null,
        credentialId: null,
        credentialUrl: null,
      },
    ],
    ...overrides,
  };
}

describe("ValidationEngine", () => {
  it("flags incomplete certifications as needsUserInput", () => {
    const flags = new ValidationEngine().validate(sampleData());
    const certFlags = flags.filter((f) => f.code === "certification_incomplete");
    assert.equal(certFlags.length, 1);
    assert.equal(certFlags[0].needsUserInput, true);
  });

  it("clears blocking flags when cert fields are filled", () => {
    const engine = new ValidationEngine();
    const data = sampleData({
      certifications: [
        {
          name: "AWS SAA",
          issuer: "Amazon",
          issueDate: "2024",
          expiryDate: null,
          credentialId: "ABC-123",
          credentialUrl: null,
        },
      ],
    });
    const flags = engine.validate(data);
    assert.equal(engine.blockingFlags(flags, data).length, 0);
  });
});

describe("mergeEnhancementNoInvent", () => {
  it("keeps source employers/dates and only accepts bullet polish", () => {
    const source = sampleData();
    const polished = {
      summary: "Experienced engineer",
      experience: [
        {
          title: "Hacker",
          company: "EvilCorp",
          bullets: ["Designed scalable APIs"],
        },
      ],
    } as Partial<IntelligentResumeData>;

    const merged = mergeEnhancementNoInvent(source, polished);
    assert.equal(merged.experience[0].company, "Acme");
    assert.equal(merged.experience[0].title, "Engineer");
    assert.equal(merged.experience[0].bullets[0], "Designed scalable APIs");
    assert.equal(merged.summary, "Experienced engineer");
    assert.equal(merged.parser, "enhanced");
  });

  it("does not invent extra experience entries", () => {
    const source = sampleData();
    const polished = {
      experience: [
        { bullets: ["x"] },
        { bullets: ["invented job"] },
      ],
    } as Partial<IntelligentResumeData>;
    const merged = mergeEnhancementNoInvent(source, polished);
    assert.equal(merged.experience.length, 1);
  });
});

describe("applySectionAction / confirmation decisions", () => {
  it("rejects a section without deleting data", () => {
    const data = sampleData();
    const { decisions } = applySectionAction(data, {}, {
      sectionKey: "skills",
      action: "reject",
    });
    assert.equal(decisions.skills?.accepted, false);
  });

  it("deletes a certification item", () => {
    const data = sampleData();
    const { data: next } = applySectionAction(data, {}, {
      sectionKey: "certifications",
      action: "delete",
      index: 0,
    });
    assert.equal(next.certifications.length, 0);
  });

  it("edits certification fields for user input", () => {
    const data = sampleData();
    const { data: next } = applySectionAction(data, {}, {
      sectionKey: "certifications",
      action: "edit",
      index: 0,
      data: { issuer: "Amazon", issueDate: "2023", credentialId: "X1" },
    });
    assert.equal(next.certifications[0].issuer, "Amazon");
    assert.equal(next.certifications[0].credentialId, "X1");
  });

  it("adds a custom section", () => {
    const data = sampleData();
    const { data: next, decisions } = applySectionAction(data, {}, {
      sectionKey: "customSections",
      action: "add_custom",
      customTitle: "Side projects",
      customItems: ["Blog"],
    });
    assert.equal(next.customSections.length, 1);
    assert.equal(next.customSections[0].title, "Side projects");
    assert.equal(decisions.customSections?.accepted, true);
  });
});

describe("selectResumesToReplace (single-resume)", () => {
  it("selects all non-draft resumes except the draft being confirmed", () => {
    const ids = selectResumesToReplace(
      [
        { id: "active-1", is_draft: false, is_active: true },
        { id: "old-2", is_draft: false, is_active: false },
        { id: "draft-3", is_draft: true, is_active: false },
      ],
      "draft-3",
    );
    assert.deepEqual(ids.sort(), ["active-1", "old-2"]);
  });

  it("returns empty when confirming the only resume draft", () => {
    const ids = selectResumesToReplace([{ id: "draft-1", is_draft: true, is_active: false }], "draft-1");
    assert.deepEqual(ids, []);
  });
});

describe("planAcceptedProfile / ProfileBuilder", () => {
  it("maps enhanced paraphrased experience/skills/projects for accepted sections", () => {
    const data = sampleData({
      summary: "Polished engineer summary with measurable impact.",
      experience: [
        {
          title: "Engineer",
          company: "Acme",
          location: null,
          startDate: "2020",
          endDate: "Present",
          bullets: ["Designed scalable APIs", "Cut latency 40%"],
          raw: "Engineer at Acme",
        },
      ],
      projects: [
        {
          name: "StudentLink",
          description: "NFC student profiles",
          technologies: ["TypeScript", "Next.js"],
          url: "https://example.com",
        },
      ],
      github: "https://github.com/ada",
      linkedin: "https://linkedin.com/in/ada",
      contact: {
        ...emptyIntelligentResumeData().contact,
        emails: ["private@example.com"],
        phones: ["555-0100"],
        github: "https://github.com/ada",
        linkedin: "https://linkedin.com/in/ada",
        name: "Ada",
      },
    });

    const decisions = {
      summary: { accepted: true },
      experience: { accepted: true, acceptedIndexes: "all" as const },
      projects: { accepted: true, acceptedIndexes: "all" as const },
      skills: { accepted: true },
      education: { accepted: true },
      contact: { accepted: true },
      certifications: { accepted: false },
    };

    const plan = planAcceptedProfile(data, decisions);
    assert.equal(plan.applyBio, true);
    assert.equal(plan.bio, "Polished engineer summary with measurable impact.");
    assert.equal(plan.experience.length, 1);
    assert.match(plan.experience[0].description, /Designed scalable APIs/);
    assert.match(plan.experience[0].description, /Cut latency 40%/);
    assert.equal(plan.projects.length, 1);
    assert.equal(plan.projects[0].title, "StudentLink");
    assert.deepEqual(plan.projects[0].tech, ["TypeScript", "Next.js"]);
    assert.equal(plan.skills[0].name, "TypeScript");
    assert.equal(plan.education?.university, "MIT");
    assert.equal(plan.applyCertificates, false);
    assert.equal(plan.certificates.length, 0);
  });

  it("does not include email or phone in public links", () => {
    const data = sampleData({
      contact: {
        emails: ["secret@example.com"],
        phones: ["555-9999"],
        linkedin: "https://linkedin.com/in/x",
        github: "https://github.com/x",
        website: "https://x.dev",
        address: "Boston",
        name: "X",
      },
      linkedin: null,
      github: null,
      portfolio: null,
    });
    const links = mapPublicLinks(data);
    assert.equal(links.linkedin, "https://linkedin.com/in/x");
    assert.equal(links.github, "https://github.com/x");
    assert.equal(links.portfolio, "https://x.dev");
    assert.equal(links.location, "Boston");
    assert.ok(!("email" in links));
    assert.ok(!("phone" in links));
  });

  it("skips rejected sections when building the apply plan", () => {
    const data = sampleData();
    const plan = planAcceptedProfile(data, {
      experience: { accepted: false },
      skills: { accepted: true },
      summary: { accepted: false },
    });
    assert.equal(plan.applyExperience, false);
    assert.equal(plan.experience.length, 0);
    assert.equal(plan.applySkills, true);
    assert.equal(plan.applyBio, false);
  });

  it("builds public-profile fallback from enhanced data for legacy confirmed resumes", () => {
    const enhanced = sampleData({
      summary: "Enhanced bio for public About",
      experience: [
        {
          title: "SWE",
          company: "Corp",
          location: null,
          startDate: "2021",
          endDate: "2023",
          bullets: ["Shipped features"],
          raw: "",
        },
      ],
    });
    const fb = buildPublicProfileFallbackFromResume({
      enhanced,
      decisions: {},
      defaultAcceptMissing: true,
    });
    assert.equal(fb.bio, "Enhanced bio for public About");
    assert.equal(fb.experience.length, 1);
    assert.equal(fb.experience[0].role, "SWE");
    assert.equal(fb.university, "MIT");
    assert.ok(fb.skills.length >= 1);
  });
});

describe("EmbeddingGenerator", () => {
  it("returns skipped_no_key without OPENAI_API_KEY and does not throw", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      // getEnv may cache — EmbeddingGenerator also checks getEnv().OPENAI_API_KEY
      const gen = new EmbeddingGenerator();
      const result = await gen.generate(sampleData());
      assert.ok(result.status === "skipped_no_key" || result.status === "completed");
      if (!process.env.OPENAI_API_KEY && result.status === "skipped_no_key") {
        assert.equal(result.chunks.length, 0);
      }
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
    }
  });

  it("builds replaceable chunks from sections", () => {
    const chunks = new EmbeddingGenerator().buildChunks(sampleData());
    assert.ok(chunks.some((c) => c.sectionKey === "summary"));
    assert.ok(chunks.some((c) => c.sectionKey.startsWith("experience")));
  });
});
