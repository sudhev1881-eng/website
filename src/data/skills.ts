export type SkillId = "javascript" | "python" | "cpp" | "performance";

export type SkillPreview =
  | {
      type: "code";
      label: string;
      language: string;
      content: string;
    }
  | {
      type: "metrics";
      label: string;
      items: { label: string; value: string }[];
    };

export const skillsSection = {
  eyebrow: "Skills",
  title: "Languages, systems, and performance — integrated end to end",
  subtitle:
    "Strong in JavaScript, Python, and C++. Comfortable connecting them across the stack and pushing performance with caching, bundling, SQL tuning, and local AI with Ollama.",
};

export const skillNodes: {
  id: SkillId;
  label: string;
  angle: number;
}[] = [
  { id: "javascript", label: "JavaScript", angle: -90 },
  { id: "python", label: "Python", angle: 0 },
  { id: "cpp", label: "C++", angle: 180 },
  { id: "performance", label: "Performance", angle: 90 },
];

export const skillPromptChips = [
  "How do you use JavaScript for web apps?",
  "What have you built with Python + SQL?",
  "When do you reach for C++?",
  "How do you boost performance?",
];

export const skillPreviews: Record<SkillId, SkillPreview> = {
  javascript: {
    type: "code",
    label: "JavaScript / Web apps",
    language: "tsx",
    content: `// Next.js — lazy-loaded section + optimized image
import dynamic from "next/dynamic";

const Projects = dynamic(() => import("./Projects"), {
  loading: () => <Skeleton />,
});

export default function Page() {
  return (
  <main>
    <Hero />
    <Projects />  {/* code-split bundle */}
  </main>
  );
}`,
  },
  python: {
    type: "code",
    label: "Python / Data & backends",
    language: "python",
    content: `# Bank + showroom workflows — SQL + Excel ingestion
def import_showroom_sheet(path: str) -> list[Vehicle]:
    rows = pd.read_excel(path)
    return [
        Vehicle(
            vin=row["vin"],
            model=row["model"],
            price=row["price"],
        )
        for _, row in rows.iterrows()
    ]

# Persist to PostgreSQL with typed queries`,
  },
  cpp: {
    type: "code",
    label: "C++ / Performance-critical logic",
    language: "cpp",
    content: `// Tight loops & memory-aware structures
struct SensorSample {
  double value;
  uint64_t timestamp;
};

std::vector<SensorSample> buffer;
buffer.reserve(1024);  // avoid realloc hot path

for (const auto& s : incoming) {
  buffer.push_back(s);
  if (buffer.size() > 1024) process_batch(buffer);
}`,
  },
  performance: {
    type: "metrics",
    label: "Performance / Integration",
    items: [
      { label: "Next.js code-splitting", value: "Smaller initial bundle" },
      { label: "Image lazy loading", value: "Faster LCP" },
      { label: "SQL indexes + queries", value: "Quicker data reads" },
      { label: "Python API + JS frontend", value: "Full-stack flow" },
      { label: "Ollama (local AI)", value: "Offline, low-latency tools" },
      { label: "Lighthouse targets", value: "90+ performance score" },
    ],
  },
};

export const skillDetails: Record<
  SkillId,
  {
    title: string;
    summary: string;
    projects: string[];
    integrations: string[];
  }
> = {
  javascript: {
    title: "JavaScript & modern web",
    summary:
      "Building responsive sites and apps with React and Next.js — portfolio, client sites, and product UIs with clean component architecture.",
    projects: [
      "Match Tornado Website",
      "MHeadset Website",
      "Credit Card Website",
      "HP OmniBook Product Page",
      "Saloon Website",
    ],
    integrations: [
      "React + Next.js App Router",
      "Framer Motion for purposeful animation",
      "Dynamic imports for code-splitting",
      "API routes connecting to Python backends",
    ],
  },
  python: {
    title: "Python & SQL systems",
    summary:
      "Backend logic, data pipelines, and database design — from banking workflows to showroom inventory fed by Excel sheets.",
    projects: ["Bank Management System", "Car Showroom System"],
    integrations: [
      "PostgreSQL / SQL schemas & migrations",
      "Excel → structured data ingestion",
      "REST APIs consumed by JS frontends",
      "Automation scripts for repeatable tasks",
    ],
  },
  cpp: {
    title: "C++ & systems thinking",
    summary:
      "Comfortable with low-level logic when speed and control matter — memory-aware structures, efficient loops, and performance-sensitive modules.",
    projects: ["Systems coursework", "Performance-critical utilities"],
    integrations: [
      "Tight data structures for hot paths",
      "Batch processing over streaming I/O",
      "Bridging native logic with higher-level apps",
      "Profiling before optimizing",
    ],
  },
  performance: {
    title: "Performance & cross-stack integration",
    summary:
      "Boosting speed across the full stack — web bundling, database tuning, language integration, and local AI with Ollama for offline tools.",
    projects: [
      "PDF Simplifier (Ollama)",
      "AI Paraphraser",
      "Gym Tracker AI",
    ],
    integrations: [
      "Next.js lazy loading & image optimization",
      "SQL indexing & query optimization",
      "Python backend ↔ JavaScript frontend",
      "Ollama local LLM — no cloud latency",
      "Lighthouse & real-device testing",
    ],
  },
};

export const skillResponses: {
  skill: SkillId;
  triggers: string[];
  reply: string;
  status?: { agent: string; task: string; state: "running" | "queued" };
}[] = [
  {
    skill: "javascript",
    triggers: [
      "javascript",
      "js",
      "react",
      "next",
      "web",
      "frontend",
      "typescript",
    ],
    reply:
      "JavaScript is my go-to for the web. I build with React and Next.js — component-driven UIs, API integration, and performance patterns like code-splitting and lazy loading. My portfolio, Match Tornado, MHeadset, HP OmniBook, and other client sites all run on this stack.",
    status: {
      agent: "JavaScript",
      task: "Bundling optimized components…",
      state: "running",
    },
  },
  {
    skill: "python",
    triggers: [
      "python",
      "sql",
      "django",
      "flask",
      "excel",
      "database",
      "backend",
      "pandas",
    ],
    reply:
      "Python is where I handle data, automation, and backends. My Bank Management System and Car Showroom System use SQL-backed schemas — the showroom even ingests Excel sheets for vehicle and customer records. I connect Python APIs to JavaScript frontends when a project needs both.",
    status: {
      agent: "Python",
      task: "Running SQL queries…",
      state: "running",
    },
  },
  {
    skill: "cpp",
    triggers: ["c++", "cpp", "native", "memory", "systems", "low-level"],
    reply:
      "I reach for C++ when performance and control matter — tight loops, memory-aware data structures, and batch processing on hot paths. It's about knowing when native speed beats interpreted code, and profiling before optimizing.",
    status: {
      agent: "C++",
      task: "Profiling hot paths…",
      state: "running",
    },
  },
  {
    skill: "performance",
    triggers: [
      "performance",
      "optimize",
      "speed",
      "lighthouse",
      "cache",
      "bundle",
      "ollama",
      "local ai",
      "integrat",
      "boost",
    ],
    reply:
      "Performance is cross-cutting for me: Next.js code-splitting and image lazy loading on the web, SQL indexes for faster reads, Python↔JS integration across the stack, and Ollama for local AI tools (PDF Simplifier, Paraphraser, Gym Tracker) that run offline with low latency. I aim for 90+ Lighthouse scores and test on real devices.",
    status: {
      agent: "Performance",
      task: "Running Lighthouse audit…",
      state: "running",
    },
  },
];

export const skillFallback =
  "Pick a skill chip or ask about JavaScript, Python, C++, or performance — I'll show how I use each and what I've built with them.";

export const skillFeatureColumns = [
  {
    title: "JavaScript for the web",
    description:
      "React, Next.js, and TypeScript for portfolios, client sites, and product UIs — with code-splitting and lazy loading built in.",
  },
  {
    title: "Python & SQL for data",
    description:
      "Banking systems, showroom inventory, Excel ingestion, and REST APIs that feed JavaScript frontends.",
  },
  {
    title: "Performance everywhere",
    description:
      "Bundling, SQL tuning, cross-language integration, and local Ollama AI — faster loads, faster queries, offline tools.",
  },
];
