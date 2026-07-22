/**
 * Free offline skill dictionary for resume parsing.
 * Matching is case-insensitive; aliases expand coverage without LLM calls.
 */

export type SkillCategory =
  | "Programming Languages"
  | "Web Frontend"
  | "Web Backend"
  | "Mobile"
  | "Databases"
  | "Cloud & DevOps"
  | "Data & AI"
  | "Tools & Platforms"
  | "Soft Skills"
  | "Design"
  | "Security"
  | "Testing"
  | "General";

export interface SkillDefinition {
  name: string;
  category: SkillCategory;
  /** Alternate spellings / abbreviations that map to `name`. */
  aliases?: string[];
}

export const SKILL_DICTIONARY: SkillDefinition[] = [
  // Programming Languages
  { name: "JavaScript", category: "Programming Languages", aliases: ["js", "ecmascript", "es6", "es2015"] },
  { name: "TypeScript", category: "Programming Languages", aliases: ["ts"] },
  { name: "Python", category: "Programming Languages", aliases: ["py"] },
  { name: "Java", category: "Programming Languages" },
  { name: "C", category: "Programming Languages" },
  { name: "C++", category: "Programming Languages", aliases: ["cpp", "c plus plus"] },
  { name: "C#", category: "Programming Languages", aliases: ["csharp", "c sharp"] },
  { name: "Go", category: "Programming Languages", aliases: ["golang"] },
  { name: "Rust", category: "Programming Languages" },
  { name: "Ruby", category: "Programming Languages" },
  { name: "PHP", category: "Programming Languages" },
  { name: "Swift", category: "Programming Languages" },
  { name: "Kotlin", category: "Programming Languages" },
  { name: "Scala", category: "Programming Languages" },
  { name: "R", category: "Programming Languages" },
  { name: "MATLAB", category: "Programming Languages" },
  { name: "Dart", category: "Programming Languages" },
  { name: "Elixir", category: "Programming Languages" },
  { name: "Haskell", category: "Programming Languages" },
  { name: "Perl", category: "Programming Languages" },
  { name: "Lua", category: "Programming Languages" },
  { name: "Shell", category: "Programming Languages", aliases: ["bash", "zsh", "shell scripting"] },
  { name: "SQL", category: "Programming Languages" },

  // Web Frontend
  { name: "HTML", category: "Web Frontend", aliases: ["html5"] },
  { name: "CSS", category: "Web Frontend", aliases: ["css3"] },
  { name: "React", category: "Web Frontend", aliases: ["reactjs", "react.js"] },
  { name: "Next.js", category: "Web Frontend", aliases: ["nextjs", "next"] },
  { name: "Vue.js", category: "Web Frontend", aliases: ["vue", "vuejs"] },
  { name: "Nuxt", category: "Web Frontend", aliases: ["nuxtjs", "nuxt.js"] },
  { name: "Angular", category: "Web Frontend", aliases: ["angularjs"] },
  { name: "Svelte", category: "Web Frontend", aliases: ["sveltekit"] },
  { name: "Tailwind CSS", category: "Web Frontend", aliases: ["tailwind", "tailwindcss"] },
  { name: "Bootstrap", category: "Web Frontend" },
  { name: "Sass", category: "Web Frontend", aliases: ["scss"] },
  { name: "Less", category: "Web Frontend" },
  { name: "jQuery", category: "Web Frontend" },
  { name: "Redux", category: "Web Frontend", aliases: ["redux toolkit", "rtk"] },
  { name: "Zustand", category: "Web Frontend" },
  { name: "Webpack", category: "Web Frontend" },
  { name: "Vite", category: "Web Frontend" },
  { name: "GraphQL", category: "Web Frontend", aliases: ["apollo", "relay"] },
  { name: "WebSockets", category: "Web Frontend", aliases: ["websocket", "socket.io", "socketio"] },
  { name: "Accessibility", category: "Web Frontend", aliases: ["a11y", "wcag"] },
  { name: "Responsive Design", category: "Web Frontend" },

  // Web Backend
  { name: "Node.js", category: "Web Backend", aliases: ["nodejs", "node"] },
  { name: "Express", category: "Web Backend", aliases: ["expressjs", "express.js"] },
  { name: "NestJS", category: "Web Backend", aliases: ["nest.js", "nest"] },
  { name: "Fastify", category: "Web Backend" },
  { name: "Django", category: "Web Backend" },
  { name: "Flask", category: "Web Backend" },
  { name: "FastAPI", category: "Web Backend" },
  { name: "Spring Boot", category: "Web Backend", aliases: ["spring", "springboot"] },
  { name: "ASP.NET", category: "Web Backend", aliases: ["aspnet", "asp.net core", ".net", "dotnet"] },
  { name: "Ruby on Rails", category: "Web Backend", aliases: ["rails", "ror"] },
  { name: "Laravel", category: "Web Backend" },
  { name: "REST APIs", category: "Web Backend", aliases: ["rest", "restful", "rest api"] },
  { name: "gRPC", category: "Web Backend" },
  { name: "Microservices", category: "Web Backend" },
  { name: "Serverless", category: "Web Backend" },

  // Mobile
  { name: "React Native", category: "Mobile" },
  { name: "Flutter", category: "Mobile" },
  { name: "Android", category: "Mobile", aliases: ["android studio"] },
  { name: "iOS", category: "Mobile", aliases: ["iphone", "ipad"] },
  { name: "Xamarin", category: "Mobile" },
  { name: "Ionic", category: "Mobile" },

  // Databases
  { name: "PostgreSQL", category: "Databases", aliases: ["postgres", "psql"] },
  { name: "MySQL", category: "Databases" },
  { name: "MariaDB", category: "Databases" },
  { name: "MongoDB", category: "Databases", aliases: ["mongo"] },
  { name: "Redis", category: "Databases" },
  { name: "SQLite", category: "Databases" },
  { name: "Oracle", category: "Databases", aliases: ["oracle db"] },
  { name: "Microsoft SQL Server", category: "Databases", aliases: ["mssql", "sql server"] },
  { name: "DynamoDB", category: "Databases" },
  { name: "Cassandra", category: "Databases" },
  { name: "Elasticsearch", category: "Databases", aliases: ["elastic search", "elk"] },
  { name: "Firebase", category: "Databases", aliases: ["firestore", "realtime database"] },
  { name: "Supabase", category: "Databases" },
  { name: "Prisma", category: "Databases" },
  { name: "Sequelize", category: "Databases" },
  { name: "TypeORM", category: "Databases" },
  { name: "Mongoose", category: "Databases" },

  // Cloud & DevOps
  { name: "AWS", category: "Cloud & DevOps", aliases: ["amazon web services", "ec2", "s3", "lambda"] },
  { name: "Google Cloud", category: "Cloud & DevOps", aliases: ["gcp", "google cloud platform"] },
  { name: "Microsoft Azure", category: "Cloud & DevOps", aliases: ["azure"] },
  { name: "Docker", category: "Cloud & DevOps" },
  { name: "Kubernetes", category: "Cloud & DevOps", aliases: ["k8s"] },
  { name: "Terraform", category: "Cloud & DevOps" },
  { name: "Ansible", category: "Cloud & DevOps" },
  { name: "CI/CD", category: "Cloud & DevOps", aliases: ["continuous integration", "continuous delivery", "cicd"] },
  { name: "GitHub Actions", category: "Cloud & DevOps" },
  { name: "GitLab CI", category: "Cloud & DevOps" },
  { name: "Jenkins", category: "Cloud & DevOps" },
  { name: "Linux", category: "Cloud & DevOps", aliases: ["ubuntu", "centos", "debian"] },
  { name: "Nginx", category: "Cloud & DevOps" },
  { name: "Apache", category: "Cloud & DevOps", aliases: ["apache httpd"] },
  { name: "Vercel", category: "Cloud & DevOps" },
  { name: "Netlify", category: "Cloud & DevOps" },
  { name: "Heroku", category: "Cloud & DevOps" },
  { name: "Render", category: "Cloud & DevOps" },
  { name: "DigitalOcean", category: "Cloud & DevOps" },
  { name: "Prometheus", category: "Cloud & DevOps" },
  { name: "Grafana", category: "Cloud & DevOps" },

  // Data & AI
  { name: "Machine Learning", category: "Data & AI", aliases: ["ml"] },
  { name: "Deep Learning", category: "Data & AI" },
  { name: "TensorFlow", category: "Data & AI" },
  { name: "PyTorch", category: "Data & AI" },
  { name: "scikit-learn", category: "Data & AI", aliases: ["sklearn", "scikit learn"] },
  { name: "Pandas", category: "Data & AI" },
  { name: "NumPy", category: "Data & AI", aliases: ["numpy"] },
  { name: "Data Analysis", category: "Data & AI", aliases: ["data analytics"] },
  { name: "Data Visualization", category: "Data & AI", aliases: ["dataviz"] },
  { name: "Tableau", category: "Data & AI" },
  { name: "Power BI", category: "Data & AI", aliases: ["powerbi"] },
  { name: "Apache Spark", category: "Data & AI", aliases: ["spark"] },
  { name: "Hadoop", category: "Data & AI" },
  { name: "NLP", category: "Data & AI", aliases: ["natural language processing"] },
  { name: "Computer Vision", category: "Data & AI", aliases: ["opencv"] },
  { name: "LLMs", category: "Data & AI", aliases: ["large language models", "chatgpt", "openai"] },
  { name: "LangChain", category: "Data & AI" },

  // Tools & Platforms
  { name: "Git", category: "Tools & Platforms", aliases: ["github", "gitlab", "bitbucket", "version control"] },
  { name: "Jira", category: "Tools & Platforms" },
  { name: "Confluence", category: "Tools & Platforms" },
  { name: "Slack", category: "Tools & Platforms" },
  { name: "Notion", category: "Tools & Platforms" },
  { name: "VS Code", category: "Tools & Platforms", aliases: ["visual studio code", "vscode"] },
  { name: "IntelliJ IDEA", category: "Tools & Platforms", aliases: ["intellij"] },
  { name: "Postman", category: "Tools & Platforms" },
  { name: "Figma", category: "Design" },
  { name: "Adobe XD", category: "Design" },
  { name: "Photoshop", category: "Design", aliases: ["adobe photoshop"] },
  { name: "Illustrator", category: "Design", aliases: ["adobe illustrator"] },
  { name: "UI/UX Design", category: "Design", aliases: ["ui design", "ux design", "user experience", "user interface"] },
  { name: "Wireframing", category: "Design" },
  { name: "Prototyping", category: "Design" },

  // Security
  { name: "Cybersecurity", category: "Security", aliases: ["infoSec", "information security"] },
  { name: "OWASP", category: "Security" },
  { name: "Penetration Testing", category: "Security", aliases: ["pentesting", "pen testing"] },
  { name: "OAuth", category: "Security", aliases: ["oauth2", "oauth 2.0"] },
  { name: "JWT", category: "Security", aliases: ["json web tokens"] },
  { name: "SSL/TLS", category: "Security", aliases: ["tls", "ssl", "https"] },
  { name: "Encryption", category: "Security" },
  { name: "Network Security", category: "Security" },

  // Testing
  { name: "Unit Testing", category: "Testing" },
  { name: "Integration Testing", category: "Testing" },
  { name: "Jest", category: "Testing" },
  { name: "Vitest", category: "Testing" },
  { name: "Cypress", category: "Testing" },
  { name: "Playwright", category: "Testing" },
  { name: "Selenium", category: "Testing" },
  { name: "PyTest", category: "Testing", aliases: ["pytest"] },
  { name: "JUnit", category: "Testing" },
  { name: "TDD", category: "Testing", aliases: ["test driven development"] },

  // Soft Skills
  { name: "Leadership", category: "Soft Skills" },
  { name: "Communication", category: "Soft Skills" },
  { name: "Teamwork", category: "Soft Skills", aliases: ["collaboration", "team collaboration"] },
  { name: "Problem Solving", category: "Soft Skills" },
  { name: "Critical Thinking", category: "Soft Skills" },
  { name: "Project Management", category: "Soft Skills" },
  { name: "Agile", category: "Soft Skills", aliases: ["scrum", "kanban"] },
  { name: "Time Management", category: "Soft Skills" },
  { name: "Public Speaking", category: "Soft Skills" },
  { name: "Mentoring", category: "Soft Skills", aliases: ["coaching"] },
  { name: "Customer Service", category: "Soft Skills" },
  { name: "Conflict Resolution", category: "Soft Skills" },

  // General / domain
  { name: "Excel", category: "General", aliases: ["microsoft excel", "spreadsheets"] },
  { name: "Microsoft Office", category: "General", aliases: ["ms office", "word", "powerpoint"] },
  { name: "Research", category: "General" },
  { name: "Technical Writing", category: "General" },
  { name: "Blockchain", category: "General", aliases: ["web3", "ethereum", "solidity"] },
  { name: "AR/VR", category: "General", aliases: ["augmented reality", "virtual reality", "unity"] },
  { name: "IoT", category: "General", aliases: ["internet of things"] },
  { name: "Embedded Systems", category: "General" },
  { name: "SAP", category: "General" },
  { name: "Salesforce", category: "General" },
];

const byCanonicalLower = new Map<string, SkillDefinition>();
const aliasToCanonical = new Map<string, string>();

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

for (const skill of SKILL_DICTIONARY) {
  const key = normalizeKey(skill.name);
  if (!byCanonicalLower.has(key)) {
    byCanonicalLower.set(key, skill);
  }
  aliasToCanonical.set(key, skill.name);
  for (const alias of skill.aliases ?? []) {
    aliasToCanonical.set(normalizeKey(alias), skill.name);
  }
}

export function getAllSkills(): string[] {
  return [...byCanonicalLower.values()].map((s) => s.name);
}

export function getSkillCategory(skillName: string): SkillCategory {
  const canonical = resolveSkillName(skillName);
  if (!canonical) return "General";
  return byCanonicalLower.get(normalizeKey(canonical))?.category ?? "General";
}

/** Resolve a raw token to a canonical skill name, or null if unknown. */
export function resolveSkillName(raw: string): string | null {
  return aliasToCanonical.get(normalizeKey(raw)) ?? null;
}

export function getSkillDefinition(skillName: string): SkillDefinition | null {
  const canonical = resolveSkillName(skillName);
  if (!canonical) return null;
  return byCanonicalLower.get(normalizeKey(canonical)) ?? null;
}

/** All searchable phrases (canonical + aliases), longest first for greedy matching. */
export function getSearchPhrases(): Array<{ phrase: string; canonical: string }> {
  const phrases: Array<{ phrase: string; canonical: string }> = [];
  for (const [phrase, canonical] of aliasToCanonical) {
    phrases.push({ phrase, canonical });
  }
  phrases.sort((a, b) => b.phrase.length - a.phrase.length);
  return phrases;
}
