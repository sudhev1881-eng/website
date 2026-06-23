export type WorkflowTopic =
  | "discover"
  | "plan"
  | "design"
  | "build"
  | "review"
  | "ship"
  | "tools";

export const processHeadline =
  "Sudhev is a frontend developer who plans carefully and ships with intent";

export const processSubheadline =
  "From discovery to deployment — here's how I turn ideas into production-ready interfaces.";

export const workflowNodes: {
  id: WorkflowTopic;
  label: string;
  angle: number;
}[] = [
  { id: "discover", label: "Discover", angle: -90 },
  { id: "plan", label: "Plan", angle: -30 },
  { id: "design", label: "Design", angle: 30 },
  { id: "build", label: "Build", angle: 90 },
  { id: "review", label: "Review", angle: 150 },
  { id: "ship", label: "Ship", angle: 210 },
];

export const promptChips = [
  "How do you plan a new project?",
  "What's your design process?",
  "How do you build & ship?",
  "What tools do you use?",
];

export const chatTabs = ["Home", "Process", "Projects", "Notes"] as const;

export type ChatTab = (typeof chatTabs)[number];

export const chatTabConfig: Record<
  ChatTab,
  {
    intro: string;
    prompts: string[];
    placeholder: string;
    highlights?: { label: string; detail: string; ask?: string }[];
  }
> = {
  Home: {
    intro:
      "Hey — I'm Sudhev, a Computer Engineering student at NJIT. I build web apps, data systems, and performance-focused software. Ask about my background, what I'm looking for, or jump to another tab.",
    prompts: [
      "What do you build?",
      "Tell me about your background",
      "Are you open to opportunities?",
    ],
    placeholder: "Ask about Sudhev…",
    highlights: [
      { label: "NJIT", detail: "BS Computer Engineering", ask: "Tell me about your background" },
      { label: "Stack", detail: "JS · Python · C++", ask: "What do you build?" },
      { label: "Focus", detail: "Web · data · performance", ask: "What do you build?" },
    ],
  },
  Process: {
    intro:
      "This is how I work — discover, plan, design, build, review, and ship. Ask about any step in the loop or pick a prompt below.",
    prompts: promptChips,
    placeholder: "Ask about my workflow…",
  },
  Projects: {
    intro:
      "Four project tracks: Python & SQL systems, web builds, research, and AI tools. Ask about a track or a specific project.",
    prompts: [
      "What web projects have you built?",
      "Tell me about your Python work",
      "Any research or AI projects?",
      "Where can I see your code?",
    ],
    placeholder: "Ask about a project…",
  },
  Notes: {
    intro:
      "Quick notes — principles I work by, how to reach me, and what I'm optimizing for right now.",
    prompts: [
      "What principles guide your work?",
      "How can I contact you?",
      "What are you learning now?",
      "What kind of roles interest you?",
    ],
    placeholder: "Ask for a quick note…",
    highlights: [
      { label: "Email", detail: "sudhev1881@gmail.com", ask: "How can I contact you?" },
      { label: "GitHub", detail: "sudhev1881-eng", ask: "Where can I see your code?" },
      { label: "Open to", detail: "Internships & collabs", ask: "Are you open to opportunities?" },
    ],
  },
};

export const chatResponses: {
  triggers: string[];
  topic: WorkflowTopic;
  tabs?: ChatTab[];
  reply: string;
  status?: { agent: string; task: string; state: "running" | "queued" };
}[] = [
  {
    triggers: ["what do you build", "what do you make", "what kind of work"],
    tabs: ["Home"],
    topic: "build",
    reply:
      "I build web interfaces with Next.js and TypeScript, Python + SQL business systems, and smaller AI-assisted tools. I care about clean UX, solid data flow, and shipping things that actually work in production.",
  },
  {
    triggers: ["background", "who are you", "about you", "njit", "student"],
    tabs: ["Home"],
    topic: "discover",
    reply:
      "I'm Sudhev Mathew Abi — a Computer Engineering student at NJIT. I've interned in industry, work part-time in live event tech, and spend most of my free time building projects across web, data, and AI.",
  },
  {
    triggers: ["open", "opportunities", "internship", "hire", "collab", "available"],
    tabs: ["Home", "Notes"],
    topic: "ship",
    reply:
      "Yes — I'm open to internships, collaborations, and meaningful project work. Based in NJ. Best way to reach me: sudhev1881@gmail.com or LinkedIn. Scroll to Contact for everything else.",
  },
  {
    triggers: ["web project", "website", "portfolio", "match tornado", "frontend"],
    tabs: ["Projects"],
    topic: "build",
    reply:
      "Web track highlights: Match Tornado, MHeadset, a credit card site, HP OmniBook product page, and a saloon website — each with its own layout, motion, and stack choices. Expand any track on the Projects section to see videos and details.",
    status: {
      agent: "Projects",
      task: "Loading web track…",
      state: "running",
    },
  },
  {
    triggers: ["python", "sql", "bank", "showroom", "data system"],
    tabs: ["Projects"],
    topic: "plan",
    reply:
      "Python & SQL work includes a bank management system and a car showroom system — both focused on structured records, transactions, and reporting with relational database design.",
    status: {
      agent: "Projects",
      task: "Reviewing Python track…",
      state: "running",
    },
  },
  {
    triggers: ["research", "meta", "data collection", "evidence"],
    tabs: ["Projects"],
    topic: "discover",
    reply:
      "Research track covers meta/data collection work with evidence-driven analysis — documenting sources, tracking findings, and turning raw data into clear conclusions.",
  },
  {
    triggers: ["ai", "ollama", "paraphraser", "pdf", "gym tracker"],
    tabs: ["Projects"],
    topic: "tools",
    reply:
      "AI dev track includes an AI paraphraser, a PDF simplifier powered by Ollama, and a gym tracker — all local-first tools focused on practical workflows, not hype.",
  },
  {
    triggers: ["github", "code", "repo", "see your work"],
    tabs: ["Projects", "Notes"],
    topic: "ship",
    reply:
      "Code lives at github.com/sudhev1881-eng. The site also has expandable project tracks with summaries, tech stacks, and detail pages for web builds.",
  },
  {
    triggers: ["principle", "philosophy", "how you work", "approach"],
    tabs: ["Notes"],
    topic: "plan",
    reply:
      "Plan before code. Design tokens before components. Small PRs. Test on real devices. Ship, measure, iterate. I'd rather deliver something solid than something flashy and fragile.",
  },
  {
    triggers: ["contact", "email", "phone", "linkedin", "instagram", "reach"],
    tabs: ["Notes", "Home"],
    topic: "ship",
    reply:
      "Email: sudhev1881@gmail.com · Phone: (516) 836-5309 · LinkedIn & Instagram linked in the Contact section at the bottom of the page.",
  },
  {
    triggers: ["learning", "learning now", "studying", "focus right now"],
    tabs: ["Notes"],
    topic: "discover",
    reply:
      "Right now: deepening systems thinking at NJIT, sharpening full-stack delivery with Next.js, and exploring local AI workflows with Ollama for practical tooling.",
  },
  {
    triggers: ["role", "job", "intern", "kind of work"],
    tabs: ["Notes", "Home"],
    topic: "plan",
    reply:
      "I'm most interested in frontend engineering, full-stack product work, and internships where I can own features end-to-end — from layout and motion to API integration and deploy.",
  },
  {
    triggers: ["plan", "planning", "approach", "start", "new project"],
    topic: "plan",
    reply:
      "I start by clarifying goals and constraints — who's using it, what success looks like, and what's in scope. Then I break the work into milestones: layout shell, core components, data layer, and polish. I sketch a rough component tree before writing code so nothing surprises me mid-build.",
    status: {
      agent: "Plan",
      task: "Breaking down milestones…",
      state: "running",
    },
  },
  {
    triggers: ["design", "figma", "ui", "ux", "wireframe", "mockup"],
    topic: "design",
    reply:
      "Design comes early. I wireframe key screens in Figma, define spacing and type scale, then map UI states — empty, loading, error, success. I build reusable tokens first so the codebase matches the design system from day one.",
    status: {
      agent: "Design",
      task: "Creating wireframes…",
      state: "running",
    },
  },
  {
    triggers: ["build", "code", "develop", "implement", "react", "next"],
    topic: "build",
    reply:
      "I scaffold with Next.js and TypeScript, build layout and shared components first, then layer in data and interactions. I keep PRs small, use Framer Motion sparingly for meaningful motion, and test on real devices — not just my laptop.",
    status: {
      agent: "Build",
      task: "Scaffolding components…",
      state: "running",
    },
  },
  {
    triggers: ["ship", "deploy", "launch", "release", "production"],
    topic: "ship",
    reply:
      "Before shipping I run Lighthouse, check accessibility with keyboard nav, and verify responsive breakpoints. I deploy to Vercel, monitor for errors, and iterate based on feedback. Shipping isn't the end — it's the start of improvement.",
    status: {
      agent: "Ship",
      task: "Running pre-launch checks…",
      state: "queued",
    },
  },
  {
    triggers: ["review", "test", "qa", "feedback", "iterate"],
    topic: "review",
    reply:
      "Review happens throughout, not just at the end. I do self-review against the brief, get peer feedback on PRs, and test edge cases — slow networks, small screens, reduced motion. Every round makes the product tighter.",
    status: {
      agent: "Review",
      task: "Checking accessibility…",
      state: "running",
    },
  },
  {
    triggers: ["discover", "research", "requirements", "learn", "understand"],
    topic: "discover",
    reply:
      "Discovery means talking to stakeholders, reading existing docs, and mapping user flows. I ask what problem we're solving and what already exists. Good discovery saves weeks of rework later.",
    status: {
      agent: "Discover",
      task: "Mapping user flows…",
      state: "running",
    },
  },
  {
    triggers: ["tool", "tools", "stack", "tech", "typescript", "tailwind"],
    topic: "tools",
    reply:
      "My core stack: Next.js, TypeScript, Tailwind CSS, and Framer Motion. Figma for design, Git for version control, Vercel for deploys. I pick tools that stay out of the way and let me focus on the product.",
  },
];

export const chatFallback =
  "Good question! I usually follow a discover → plan → design → build → review → ship loop. Pick a prompt above or ask about planning, design, building, or shipping — I'll walk you through how I handle each step.";

export const chatTabFallbacks: Record<ChatTab, string> = {
  Home:
    "Try asking what I build, about my background at NJIT, or whether I'm open to opportunities — or pick a prompt below.",
  Process: chatFallback,
  Projects:
    "Ask about web builds, Python/SQL systems, research work, or AI tools — or use a prompt below. You can also scroll to the Projects section for videos and details.",
  Notes:
    "Ask about my principles, contact info, what I'm learning, or what roles interest me — quick answers, no fluff.",
};

export const featureColumns = [
  {
    title: "Plan before code",
    description:
      "I break work into milestones and component trees before writing a line — scope stays clear and surprises stay rare.",
  },
  {
    title: "Design-led UI",
    description:
      "Figma wireframes and design tokens come first. Every screen gets empty, loading, and error states mapped out.",
  },
  {
    title: "Ship & iterate",
    description:
      "Lighthouse, accessibility checks, and real-device testing before deploy. Launch is the start, not the finish.",
  },
];

