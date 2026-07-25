import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { StudentDashboardData } from "./api.js";
import { deriveProfileCompleteness } from "./profile-completeness.js";

type DashboardDataOverrides = Omit<
  Partial<StudentDashboardData>,
  "profile" | "stats" | "analytics"
> & {
  profile?: Partial<StudentDashboardData["profile"]>;
  stats?: Partial<StudentDashboardData["stats"]>;
  analytics?: Partial<StudentDashboardData["analytics"]>;
};

function makeDashboardData(
  overrides: DashboardDataOverrides = {},
): StudentDashboardData {
  const data: StudentDashboardData = {
    profile: {
      id: "student-1",
      name: "Alex Morgan",
      email: "alex@example.com",
      username: "alex-morgan",
      university: "State University",
      major: "Computer Science",
      graduationYear: 2027,
      bio: "",
      avatar: null,
      coverImage: null,
      location: "",
      github: "",
      linkedin: "",
      portfolio: "",
      phone: "",
      title: "",
    },
    stats: {
      profileViews: 0,
      profileViewsChange: 0,
      nfcTaps: 0,
      nfcTapsChange: 0,
      resumeDownloads: 0,
      resumeDownloadsChange: 0,
      recruiterContacts: 0,
      recruiterContactsChange: 0,
    },
    projects: [],
    skills: [],
    certificates: [],
    experience: [],
    resume: null,
    nfcCard: null,
    analytics: {
      viewsByDay: [],
      topReferrers: [],
    },
  };

  return {
    ...data,
    ...overrides,
    profile: {
      ...data.profile,
      ...overrides.profile,
    },
    stats: {
      ...data.stats,
      ...overrides.stats,
    },
    analytics: {
      ...data.analytics,
      ...overrides.analytics,
    },
  };
}

describe("deriveProfileCompleteness", () => {
  it("returns zero progress when profile-building fields are empty", () => {
    const result = deriveProfileCompleteness(makeDashboardData());

    assert.equal(result.percent, 0);
    assert.equal(result.completedCount, 0);
    assert.equal(result.totalCount, 8);
    assert.equal(result.items.every((item) => !item.done), true);
  });

  it("returns full progress when all checklist items are present", () => {
    const result = deriveProfileCompleteness(
      makeDashboardData({
        profile: {
          title: "Frontend Engineer",
          bio: "I build accessible web applications for student teams.",
          avatar: "/uploads/avatar.png",
          linkedin: "https://linkedin.com/in/alex",
        },
        resume: {
          fileName: "resume.pdf",
          fileSize: "120 KB",
          uploadedAt: "2026-07-25T00:00:00.000Z",
          version: 1,
          downloadUrl: "/uploads/resume.pdf",
        },
        projects: [
          {
            id: "project-1",
            title: "Student Portal",
            description: "A web app for student profiles.",
            tech: ["Next.js"],
            url: "https://example.com",
            image: null,
            featured: true,
          },
        ],
        skills: [
          { id: "skill-1", name: "React", level: 90, category: "Frontend" },
          { id: "skill-2", name: "TypeScript", level: 85, category: "Frontend" },
          { id: "skill-3", name: "Node.js", level: 75, category: "Backend" },
        ],
        experience: [
          {
            id: "exp-1",
            role: "Software Intern",
            company: "Acme",
            period: "Summer 2026",
            description: "Built dashboard features.",
          },
        ],
      }),
    );

    assert.equal(result.percent, 100);
    assert.equal(result.completedCount, result.totalCount);
    assert.equal(result.items.every((item) => item.done), true);
  });

  it("requires at least three skills for the skills checklist item", () => {
    const data = makeDashboardData({
      skills: [
        { id: "skill-1", name: "React", level: 90, category: "Frontend" },
        { id: "skill-2", name: "TypeScript", level: 85, category: "Frontend" },
      ],
    });

    const twoSkills = deriveProfileCompleteness(data);
    assert.equal(twoSkills.items.find((item) => item.id === "skills")?.done, false);

    const threeSkills = deriveProfileCompleteness({
      ...data,
      skills: [
        ...data.skills,
        { id: "skill-3", name: "Node.js", level: 75, category: "Backend" },
      ],
    });
    assert.equal(threeSkills.items.find((item) => item.id === "skills")?.done, true);
  });
});
