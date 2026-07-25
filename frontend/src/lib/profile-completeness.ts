import type { StudentDashboardData } from "./api";

export type StudentDashboardSectionId =
  | "profile"
  | "resume"
  | "projects"
  | "skills"
  | "experience";

export interface ProfileCompletenessItem {
  id: string;
  label: string;
  description: string;
  sectionId: StudentDashboardSectionId;
  done: boolean;
}

export interface ProfileCompleteness {
  percent: number;
  completedCount: number;
  totalCount: number;
  items: ProfileCompletenessItem[];
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function deriveProfileCompleteness(data: StudentDashboardData): ProfileCompleteness {
  const { profile } = data;
  const items: ProfileCompletenessItem[] = [
    {
      id: "headline",
      label: "Add a profile headline",
      description: "Tell recruiters what role or specialty you are targeting.",
      sectionId: "profile",
      done: hasText(profile.title),
    },
    {
      id: "bio",
      label: "Write a short bio",
      description: "Summarize your background, strengths, and career interests.",
      sectionId: "profile",
      done: hasText(profile.bio),
    },
    {
      id: "avatar",
      label: "Upload a profile photo",
      description: "Make your public profile easier to recognize and remember.",
      sectionId: "profile",
      done: hasText(profile.avatar),
    },
    {
      id: "resume",
      label: "Upload a resume",
      description: "Give recruiters a downloadable version of your experience.",
      sectionId: "resume",
      done: data.resume !== null,
    },
    {
      id: "project",
      label: "Showcase a project",
      description: "Add at least one project with the tools and impact included.",
      sectionId: "projects",
      done: data.projects.length > 0,
    },
    {
      id: "skills",
      label: "List at least three skills",
      description: "Highlight the skills recruiters should match you on.",
      sectionId: "skills",
      done: data.skills.length >= 3,
    },
    {
      id: "experience",
      label: "Add experience",
      description: "Include internships, jobs, research, volunteer, or campus work.",
      sectionId: "experience",
      done: data.experience.length > 0,
    },
    {
      id: "social",
      label: "Connect LinkedIn or GitHub",
      description: "Give recruiters another trusted way to review your work.",
      sectionId: "profile",
      done: hasText(profile.linkedin) || hasText(profile.github),
    },
  ];

  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;

  return {
    percent: Math.round((completedCount / totalCount) * 100),
    completedCount,
    totalCount,
    items,
  };
}
