export const currentStudent = {
  id: "stu_001",
  name: "Alex Morgan",
  email: "alex.morgan@stanford.edu",
  username: "alex-morgan",
  university: "Stanford University",
  major: "Computer Science",
  graduationYear: 2025,
  bio: "Full-stack developer passionate about building products that make a difference. Experienced in React, Node.js, and machine learning.",
  avatar: null as string | null,
  coverImage: null as string | null,
  location: "Palo Alto, CA",
  github: "https://github.com/alexmorgan",
  linkedin: "https://linkedin.com/in/alexmorgan",
  portfolio: "https://alexmorgan.dev",
  phone: "+1 (650) 555-0142",
};

export const studentStats = {
  profileViews: 342,
  profileViewsChange: 12.5,
  nfcTaps: 89,
  nfcTapsChange: 8.2,
  resumeDownloads: 47,
  resumeDownloadsChange: 15.3,
  recruiterContacts: 12,
  recruiterContactsChange: -2.1,
};

export const studentProjects = [
  {
    id: "proj_1",
    title: "Campus Events Platform",
    description: "Full-stack event management system serving 5,000+ students",
    tech: ["React", "Node.js", "PostgreSQL"],
    url: "https://github.com/alexmorgan/campus-events",
    image: null,
    featured: true,
  },
  {
    id: "proj_2",
    title: "ML Study Assistant",
    description: "AI-powered study tool using GPT-4 for personalized learning",
    tech: ["Python", "FastAPI", "OpenAI"],
    url: "https://github.com/alexmorgan/ml-study",
    image: null,
    featured: true,
  },
  {
    id: "proj_3",
    title: "Real-time Chat App",
    description: "WebSocket-based messaging with end-to-end encryption",
    tech: ["TypeScript", "Socket.io", "Redis"],
    url: "https://github.com/alexmorgan/chat-app",
    image: null,
    featured: false,
  },
];

export const studentSkills = [
  { name: "React", level: 90, category: "Frontend" },
  { name: "TypeScript", level: 85, category: "Frontend" },
  { name: "Node.js", level: 80, category: "Backend" },
  { name: "Python", level: 75, category: "Backend" },
  { name: "PostgreSQL", level: 70, category: "Database" },
  { name: "AWS", level: 65, category: "Cloud" },
  { name: "Figma", level: 60, category: "Design" },
  { name: "Machine Learning", level: 55, category: "AI/ML" },
];

export const studentCertificates = [
  {
    id: "cert_1",
    name: "AWS Solutions Architect Associate",
    issuer: "Amazon Web Services",
    date: "2024-08",
    url: "#",
  },
  {
    id: "cert_2",
    name: "Google Cloud Professional Developer",
    issuer: "Google",
    date: "2024-03",
    url: "#",
  },
  {
    id: "cert_3",
    name: "Meta Front-End Developer",
    issuer: "Meta",
    date: "2023-11",
    url: "#",
  },
];

export const studentExperience = [
  {
    id: "exp_1",
    role: "Software Engineering Intern",
    company: "Stripe",
    period: "Summer 2024",
    description: "Built payment dashboard features used by 10K+ merchants",
  },
  {
    id: "exp_2",
    role: "Research Assistant",
    company: "Stanford AI Lab",
    period: "2023 – Present",
    description: "Contributing to NLP research on document understanding",
  },
];

export const studentResume = {
  fileName: "Alex_Morgan_Resume_2025.pdf",
  fileSize: "245 KB",
  uploadedAt: "2025-01-15",
  version: 3,
};

export const nfcCard = {
  id: "nfc_001",
  status: "active" as const,
  cardNumber: "SL-2025-0042",
  linkedAt: "2024-09-01",
  totalTaps: 89,
  lastTap: "2025-01-14T10:30:00Z",
  profileUrl: "/u/alex-morgan",
};

export const analyticsData = {
  viewsByDay: [
    { day: "Mon", views: 12, taps: 3 },
    { day: "Tue", views: 18, taps: 5 },
    { day: "Wed", views: 24, taps: 8 },
    { day: "Thu", views: 15, taps: 4 },
    { day: "Fri", views: 32, taps: 12 },
    { day: "Sat", views: 8, taps: 2 },
    { day: "Sun", views: 6, taps: 1 },
  ],
  topReferrers: [
    { source: "NFC Tap", count: 89, percent: 52 },
    { source: "Direct Link", count: 45, percent: 26 },
    { source: "LinkedIn", count: 28, percent: 16 },
    { source: "QR Code", count: 10, percent: 6 },
  ],
};
