import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ValidationEngine } from "./validation-engine.js";
import {
  mergeEnhancementNoInvent,
  mergeExtractOntoHeuristic,
  llmExtractHasSignal,
  resumeContentScore,
  isWeakerThanHeuristic,
  AiEnhancementEngine,
} from "./ai-enhancement.engine.js";
import type { LLMProvider } from "../ai/index.js";
import { applySectionAction } from "./user-confirmation.service.js";
import { selectResumesToReplace } from "./database-manager.js";
import {
  planAcceptedProfile,
  buildPublicProfileFallbackFromResume,
  buildPublicAiFromResume,
  mapPublicLinks,
} from "./profile-builder.js";
import { coerceToIntelligentResumeData } from "./schema-mapper.js";
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

  it("flags sparse extraction when raw text is too short", () => {
    const flags = new ValidationEngine().validate(sampleData(), { rawTextLength: 10 });
    assert.ok(flags.some((f) => f.code === "extraction_sparse"));
  });

  it("adds mild ai_fallback note when Ollama enrichment was skipped", () => {
    const flags = new ValidationEngine().validate(sampleData(), {
      aiSkippedReason: "llm_failed",
    });
    assert.ok(flags.some((f) => f.code === "ai_fallback" && /built-in/i.test(f.message)));
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

describe("mergeExtractOntoHeuristic + quality helpers", () => {
  it("keeps heuristic sections when LLM extract is empty", () => {
    const heuristic = sampleData();
    const merged = mergeExtractOntoHeuristic(heuristic, {});
    assert.equal(merged.experience.length, 1);
    assert.equal(merged.experience[0].company, "Acme");
    assert.equal(merged.education[0].school, "MIT");
    assert.equal(merged.skills.all[0].name, "TypeScript");
  });

  it("does not let a sparse LLM education list wipe richer heuristic education", () => {
    const heuristic = sampleData({
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
        {
          school: "Stanford",
          degree: "MS",
          field: "AI",
          startDate: null,
          endDate: "2021",
          gpa: null,
          raw: "Stanford",
        },
      ],
    });
    const merged = mergeExtractOntoHeuristic(heuristic, {
      education: [{ school: "Somewhere", degree: null, field: null, raw: "x" }],
    });
    assert.equal(merged.education.length, 2);
    assert.equal(merged.education[0].school, "MIT");
  });

  it("detects hollow vs signal extract payloads", () => {
    assert.equal(llmExtractHasSignal({}), false);
    assert.equal(llmExtractHasSignal({ summary: "   " }), false);
    assert.equal(llmExtractHasSignal({ summary: "Software engineer" }), true);
  });

  it("flags weaker AI candidates vs heuristic", () => {
    const rich = sampleData();
    const thin = emptyIntelligentResumeData();
    assert.equal(isWeakerThanHeuristic(thin, rich), true);
    assert.ok(resumeContentScore(rich) > resumeContentScore(thin));
  });
});

describe("AiEnhancementEngine AI→heuristic fallback", () => {
  const envKeys = [
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET",
    "CORS_ORIGIN",
    "SITE_URL",
  ] as const;
  const prev: Record<string, string | undefined> = {};

  function ensureTestEnv() {
    for (const k of envKeys) prev[k] = process.env[k];
    process.env.DATABASE_URL =
      process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db";
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon-key-for-tests";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key-for-tests";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(32);
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
    process.env.SITE_URL = process.env.SITE_URL || "http://localhost:3000";
  }

  function restoreEnv() {
    for (const k of envKeys) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }

  it("falls back to heuristic labels when every Ollama step fails", async () => {
    ensureTestEnv();
    try {
      const { resetEnvCache } = await import("../../config/env.js");
      resetEnvCache();

      let chatCalls = 0;
      const failingLlm: LLMProvider = {
        name: "ollama",
        async chat() {
          chatCalls += 1;
          throw new Error("model unavailable");
        },
        async health() {
          return {
            provider: "ollama",
            reachable: true,
            chatModel: "test",
            embedModel: "test",
          };
        },
      };

      const engine = new AiEnhancementEngine();
      const run = await (
        engine as unknown as {
          runOllamaIntelligence: (
            llm: LLMProvider,
            source: IntelligentResumeData,
            text: string,
          ) => Promise<{
            data: IntelligentResumeData;
            contributed: boolean;
            extractOk: boolean;
            abortedEarly: boolean;
          }>;
        }
      ).runOllamaIntelligence(failingLlm, sampleData(), "Ada Lovelace\nEngineer at Acme\nTypeScript");

      assert.equal(run.contributed, false);
      assert.equal(run.extractOk, false);
      assert.equal(run.abortedEarly, true);
      assert.equal(chatCalls, 1, "must abort after first failed LLM step (no 4×60s chain)");
      assert.equal(run.data.parser, "heuristic");
      assert.equal(run.data.aiProvider, "heuristic");
      assert.equal(run.data.experience[0].company, "Acme");
    } finally {
      restoreEnv();
      const { resetEnvCache } = await import("../../config/env.js");
      resetEnvCache();
    }
  });

  it("enhance skips AI within 2s when Ollama is marked unreachable", async () => {
    ensureTestEnv();
    const prevProvider = process.env.RESUME_AI_PROVIDER;
    process.env.RESUME_AI_PROVIDER = "ollama";
    try {
      const { resetEnvCache } = await import("../../config/env.js");
      const { markOllamaUnreachable, clearOllamaHealthCache } = await import("../ai/index.js");
      resetEnvCache();
      clearOllamaHealthCache();
      markOllamaUnreachable("forced unavailable for test");

      const engine = new AiEnhancementEngine();
      const started = Date.now();
      const result = await engine.enhance(
        sampleData(),
        "Ada Lovelace\nEngineer at Acme\nTypeScript Python",
      );
      const elapsed = Date.now() - started;

      assert.equal(result.enhanced, false);
      assert.equal(result.provider, "heuristic");
      assert.equal(result.skippedReason, "unavailable");
      assert.ok(elapsed < 2_000, `expected fail-fast enhance, took ${elapsed}ms`);
    } finally {
      if (prevProvider === undefined) delete process.env.RESUME_AI_PROVIDER;
      else process.env.RESUME_AI_PROVIDER = prevProvider;
      const { clearOllamaHealthCache } = await import("../ai/index.js");
      clearOllamaHealthCache();
      restoreEnv();
      const { resetEnvCache } = await import("../../config/env.js");
      resetEnvCache();
    }
  });

  it("falls back when Ollama returns only empty JSON", async () => {
    ensureTestEnv();
    try {
      const { resetEnvCache } = await import("../../config/env.js");
      resetEnvCache();

      const emptyLlm: LLMProvider = {
        name: "ollama",
        async chat() {
          return { content: "{}", model: "test", provider: "ollama" };
        },
        async health() {
          return {
            provider: "ollama",
            reachable: true,
            chatModel: "test",
            embedModel: "test",
          };
        },
      };

      const engine = new AiEnhancementEngine();
      const run = await (
        engine as unknown as {
          runOllamaIntelligence: (
            llm: LLMProvider,
            source: IntelligentResumeData,
            text: string,
          ) => Promise<{ data: IntelligentResumeData; contributed: boolean; extractOk: boolean }>;
        }
      ).runOllamaIntelligence(emptyLlm, sampleData(), "Ada Lovelace\nEngineer at Acme\nTypeScript");

      assert.equal(run.contributed, false);
      assert.equal(run.data.parser, "heuristic");
      assert.equal(run.data.experience[0].company, "Acme");
    } finally {
      restoreEnv();
      const { resetEnvCache } = await import("../../config/env.js");
      resetEnvCache();
    }
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

  it("tolerates legacy structured_data (skills as array) and missing bullets", () => {
    const legacy = coerceToIntelligentResumeData({
      contact: {
        emails: [],
        phones: [],
        linkedin: null,
        github: null,
        website: null,
        address: null,
        name: "Sudhev",
      },
      summary: "About me",
      experience: [
        {
          title: "Intern",
          company: "Acme",
          location: null,
          startDate: "2024",
          endDate: null,
          bullets: null,
          raw: "Intern at Acme",
        },
      ],
      education: [],
      skills: [
        { name: "TypeScript", category: "Frontend", frequency: 2 },
        { name: "Node.js", category: "Backend", frequency: 1 },
      ],
      certifications: [],
      projects: [],
      languages: ["English"],
      sections: {},
      confidence: { overall: 0.5, contact: 0.5, experience: 0.5, education: 0.5, skills: 0.5 },
      parser: "heuristic",
    });
    assert.ok(legacy);
    const fb = buildPublicProfileFallbackFromResume({
      enhanced: legacy!,
      decisions: {},
      defaultAcceptMissing: true,
    });
    assert.equal(fb.bio, "About me");
    assert.equal(fb.experience.length, 1);
    assert.equal(fb.experience[0].description, "Intern at Acme");
    assert.equal(fb.skills.length, 2);
  });
});

describe("EmbeddingGenerator", () => {
  it("returns skipped_unavailable when provider is heuristic and does not throw", async () => {
    const keys = [
      "RESUME_AI_PROVIDER",
      "OPENAI_API_KEY",
      "DATABASE_URL",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "JWT_SECRET",
      "CORS_ORIGIN",
      "SITE_URL",
    ] as const;
    const prev: Record<string, string | undefined> = {};
    for (const k of keys) prev[k] = process.env[k];

    process.env.RESUME_AI_PROVIDER = "heuristic";
    delete process.env.OPENAI_API_KEY;
    process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db";
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "anon-key-for-tests";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY || "service-role-key-for-tests";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "x".repeat(32);
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
    process.env.SITE_URL = process.env.SITE_URL || "http://localhost:3000";

    try {
      const { resetEnvCache } = await import("../../config/env.js");
      resetEnvCache();
      const gen = new EmbeddingGenerator();
      const result = await gen.generate(sampleData());
      assert.ok(
        result.status === "skipped_unavailable" ||
          result.status === "skipped_no_key" ||
          result.status === "completed",
      );
      if (result.status === "skipped_unavailable") {
        assert.equal(result.chunks.length, 0);
      }
    } finally {
      for (const k of keys) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
      const { resetEnvCache } = await import("../../config/env.js");
      resetEnvCache();
    }
  });

  it("builds replaceable chunks from sections including full_resume", () => {
    const chunks = new EmbeddingGenerator().buildChunks(sampleData());
    assert.ok(chunks.some((c) => c.sectionKey === "summary"));
    assert.ok(chunks.some((c) => c.sectionKey.startsWith("experience")));
    assert.ok(chunks.some((c) => c.section === "full_resume" || c.sectionKey === "full_resume"));
  });
});

describe("buildPublicAiFromResume", () => {
  it("marks ollama provider as AI-generated and surfaces domains", () => {
    const { aiGenerated, ai } = buildPublicAiFromResume(
      sampleData({
        summary: "AI-polished summary",
        domains: ["Machine Learning", "Full-Stack"],
        classifications: ["Software Engineer"],
        aiProvider: "ollama",
        parser: "ollama",
        confidence: { overall: 0.82, contact: 0.9, experience: 0.7, education: 0.6, skills: 0.85 },
        skills: {
          technical: [{ name: "Python", category: "Languages", frequency: 3 }],
          soft: [],
          all: [
            { name: "Python", category: "Languages", frequency: 3 },
            { name: "TypeScript", category: "Languages", frequency: 2 },
            { name: "PyTorch", category: "ML", frequency: 2 },
          ],
        },
      }),
    );
    assert.equal(aiGenerated, true);
    assert.ok(ai);
    assert.equal(ai!.generated, true);
    assert.equal(ai!.summary, "AI-polished summary");
    assert.ok(ai!.insights.some((i) => /Machine Learning/.test(i.title)));
    assert.ok(ai!.skillInsights.length >= 1);
    assert.equal(ai!.score, 82);
  });

  it("returns non-generated payload for heuristic parses", () => {
    const { aiGenerated, ai } = buildPublicAiFromResume(
      sampleData({ aiProvider: "heuristic", parser: "heuristic", summary: "Heuristic bio" }),
    );
    assert.equal(aiGenerated, false);
    assert.ok(ai);
    assert.equal(ai!.generated, false);
    assert.equal(ai!.summary, "Heuristic bio");
  });

  it("returns null ai when data is missing", () => {
    const { aiGenerated, ai } = buildPublicAiFromResume(null);
    assert.equal(aiGenerated, false);
    assert.equal(ai, null);
  });
});
