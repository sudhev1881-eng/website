export type ProjectItem = {
  title: string;
  year?: string;
  technologies: string[];
  summary: string;
  link?: string;
  video?: string;
};

export type ProjectCategory = {
  slug: string;
  number: string;
  chapter: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  projects: ProjectItem[];
};

export const projectsSection = {
  title: "Project tracks",
  subtitle:
    "Four areas of my work. Open each track to explore the projects inside, and add more later by editing this file.",
  githubCta: "See all projects on GitHub",
  githubUrl: "https://github.com/sudhev1881-eng",
};

export const projectCategories: ProjectCategory[] = [
  {
    slug: "python-sql",
    number: "01",
    chapter: "Project I",
    title: "Python & SQL",
    subtitle: "Business systems and structured data workflows",
    description:
      "Projects centered on Python application logic, SQL-backed systems, and structured business data workflows.",
    image: "/images/project1.png",
    projects: [
      {
        title: "Bank Management System",
        year: "2024",
        technologies: ["Python", "SQL", "PostgreSQL"],
        summary:
          "A banking management system covering account records, transaction flows, balance updates, and reporting using Python with relational database design.",
      },
      {
        title: "Car Showroom System",
        year: "2024",
        technologies: ["Python", "SQL", "Excel", "Access"],
        summary:
          "A car showroom management system built around structured records and Excel-based data collection for vehicles, customers, and daily business operations.",
      },
    ],
  },
  {
    slug: "web-dev",
    number: "02",
    chapter: "Project II",
    title: "Web development",
    subtitle: "Real client-facing websites and product experiences",
    description:
      "A collection of websites built for personal branding, products, and service businesses with a focus on clarity, responsiveness, and polished UI.",
    image: "/images/project2.png",
    projects: [
      {
        title: "Match Tornado Website",
        year: "2024",
        technologies: ["HTML", "CSS", "JavaScript"],
        summary:
          "A branded website for Match Tornado with custom sections, strong messaging, and responsive layouts tailored to the product.",
        video: "/videos/match-tornado.mp4",
      },
      {
        title: "MHeadset Website",
        year: "2024",
        technologies: ["React", "CSS", "JavaScript"],
        summary:
          "A product-focused website for MHeadset with emphasis on presentation, usability, and strong visual hierarchy.",
        video: "/videos/mheadset.mp4",
      },
      {
        title: "Credit Card Website",
        year: "2024",
        technologies: ["Next.js", "TypeScript", "Tailwind CSS"],
        summary:
          "A modern finance-focused website designed around trust, clarity, and conversion for a credit card product experience.",
        video: "/videos/credit-card.mp4",
      },
      {
        title: "HP OmniBook Product Page",
        year: "2025",
        technologies: ["Next.js", "React", "Tailwind CSS"],
        summary:
          "A laptop product design page for HP OmniBook — hero visuals, spec highlights, and a polished scroll experience built for a premium hardware launch.",
        video: "/videos/hp-omnibook.mp4",
      },
      {
        title: "Saloon Website",
        year: "2024",
        technologies: ["React", "Tailwind CSS"],
        summary:
          "A service website for a saloon with sections for offerings, booking flow, and mobile-friendly presentation.",
        video: "/videos/saloon.mp4",
      },
    ],
  },
  {
    slug: "research",
    number: "03",
    chapter: "Project III",
    title: "Research",
    subtitle: "Data collection, tracking, and evidence-driven analysis",
    description:
      "Research work focused on digital tracking, data collection behavior, and documenting how platforms gather and use user information.",
    image: "/images/project3.png",
    projects: [
      {
        title: "Data Collection Management Research",
        year: "2024",
        technologies: ["Research", "Browser Analysis", "Data Evidence"],
        summary:
          "A research project showing how platforms such as Meta track user data, supported by collected evidence, behavioral analysis, and documented proof.",
      },
    ],
  },
  {
    slug: "ai-dev",
    number: "04",
    chapter: "Project IV",
    title: "Dev with AI",
    subtitle: "Local AI tools and workflow-oriented products",
    description:
      "AI-powered products built around useful workflows, including local LLM tools with Ollama and apps that adapt to real user needs.",
    image: "/images/project4.png",
    projects: [
      {
        title: "AI Paraphraser",
        year: "2025",
        technologies: ["Python", "LLM", "Prompt Engineering"],
        summary:
          "A style-aware writing tool that learns a user's tone and rewrites text so it matches that person's natural writing style.",
      },
      {
        title: "PDF Simplifier",
        year: "2025",
        technologies: ["Python", "Ollama", "Local AI"],
        summary:
          "A locally running document simplifier that reads PDFs on the user's computer and rewrites them into clearer, easier language.",
      },
      {
        title: "Gym Tracker AI",
        year: "2025",
        technologies: ["Ollama", "Local AI", "Fitness Tracking"],
        summary:
          "A gym-tracking application with calorie tracking, workout logging, and muscle-group guidance, powered by local Ollama models.",
      },
    ],
  },
];

export function getProjectCategoryBySlug(
  slug: string,
): ProjectCategory | undefined {
  return projectCategories.find((p) => p.slug === slug);
}

export function getAllProjectCategorySlugs(): string[] {
  return projectCategories.map((p) => p.slug);
}
