export const studentLink = {
  name: "StudentLink",
  tagline: "Your digital identity, one tap away",
  description:
    "Connect students with recruiters through NFC-powered digital profiles. Build your portfolio, share your resume, and get discovered instantly.",
  metadata: {
    title: "StudentLink — Digital Student Profiles & NFC Cards",
    description:
      "Modern platform for students to showcase skills, projects, and resumes. Recruiters tap NFC cards to view profiles instantly.",
    url: "https://studentlink.app",
  },
  nav: [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Universities", href: "#universities" },
    { label: "FAQ", href: "#faq" },
  ],
  cta: {
    primary: { label: "Get Started", href: "/login" },
    secondary: { label: "View Demo Profile", href: "/u/alex-morgan" },
  },
} as const;

export const landingFeatures = [
  {
    title: "NFC Digital Cards",
    description:
      "Share your profile with a single tap. Recruiters get instant access to your resume, projects, and contact info.",
    icon: "nfc" as const,
  },
  {
    title: "Smart Portfolio",
    description:
      "Showcase projects, skills, and certificates in a polished profile designed to impress hiring managers.",
    icon: "portfolio" as const,
  },
  {
    title: "Analytics Dashboard",
    description:
      "Track profile views, NFC taps, and recruiter engagement with real-time insights.",
    icon: "analytics" as const,
  },
  {
    title: "Resume Manager",
    description:
      "Upload, version, and share your resume. One-click download for recruiters on any device.",
    icon: "resume" as const,
  },
  {
    title: "University Network",
    description:
      "Connect with your university's career services and access exclusive recruiting events.",
    icon: "university" as const,
  },
  {
    title: "Admin Controls",
    description:
      "Universities manage students, NFC card inventory, and analytics from a centralized dashboard.",
    icon: "admin" as const,
  },
];

export const howItWorks = [
  {
    step: 1,
    title: "Create Your Profile",
    description: "Sign up, add your skills, projects, and upload your resume.",
  },
  {
    step: 2,
    title: "Get Your NFC Card",
    description: "Receive a personalized NFC card linked to your digital profile.",
  },
  {
    step: 3,
    title: "Tap & Connect",
    description: "Recruiters tap your card at career fairs and view your full profile instantly.",
  },
];

export const universities = [
  { name: "Stanford University", students: 1240, logo: "SU" },
  { name: "MIT", students: 980, logo: "MIT" },
  { name: "UC Berkeley", students: 1560, logo: "UCB" },
  { name: "Georgia Tech", students: 890, logo: "GT" },
  { name: "University of Michigan", students: 1120, logo: "UM" },
  { name: "Carnegie Mellon", students: 760, logo: "CMU" },
];

export const faqs = [
  {
    question: "How does the NFC card work?",
    answer:
      "Your NFC card contains a link to your StudentLink profile. When a recruiter taps it with their phone, your profile opens instantly in their browser — no app required.",
  },
  {
    question: "Is StudentLink free for students?",
    answer:
      "Yes! StudentLink is free for students through your university. You get a digital profile, resume sharing, analytics, and NFC card integration.",
  },
  {
    question: "Can recruiters download my resume?",
    answer:
      "Absolutely. Your resume is prominently displayed at the top of your public profile with a one-tap download button optimized for mobile devices.",
  },
  {
    question: "Which universities are supported?",
    answer:
      "We partner with universities worldwide. Check with your career services office or sign up individually to get started right away.",
  },
];
