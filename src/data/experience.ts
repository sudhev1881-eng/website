export const experienceSection = {
  eyebrow: "Experience",
  title: "Building through work, study, and live production",
  subtitle:
    "My path combines hands-on technical work, formal engineering study, and customer-facing event operations.",
};

export type ExperienceItem = {
  role: string;
  organization: string;
  period: string;
  description: string;
  highlights: string[];
};

export const experienceItems: ExperienceItem[] = [
  {
    role: "Intern",
    organization: "Zoringa",
    period: "2022",
    description:
      "Completed an internship at Zoringa, gaining early industry exposure and practical experience in a professional technical environment.",
    highlights: [
      "First industry exposure",
      "Professional technical workflows",
      "Cross-team collaboration",
    ],
  },
  {
    role: "BS in Computer Engineering Student",
    organization: "New Jersey Institute of Technology (NJIT)",
    period: "Present",
    description:
      "Currently studying full-time at NJIT, pursuing a Bachelor of Science in Computer Engineering with focus on software, systems, and technical problem-solving.",
    highlights: [
      "Software & systems coursework",
      "Engineering problem-solving",
      "Full-time degree track",
    ],
  },
  {
    role: "Special Event Technician",
    organization: "MTSS",
    period: "Present",
    description:
      "Working part-time as a Special Event Technician, supporting live event operations, technical setup, coordination, and smooth on-site execution.",
    highlights: [
      "Live event technical setup",
      "On-site coordination",
      "Customer-facing operations",
    ],
  },
];
