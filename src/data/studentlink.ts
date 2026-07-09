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
    { label: "Pricing", href: "#pricing" },
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

export const pricingPlans = [
  {
    name: "Student",
    price: "Free",
    period: "",
    description: "Everything you need to get started",
    features: [
      "Digital profile & portfolio",
      "Resume upload & sharing",
      "Basic analytics",
      "QR code sharing",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For serious job seekers",
    features: [
      "Everything in Student",
      "NFC card (1 included)",
      "Advanced analytics",
      "Custom profile URL",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "University",
    price: "Custom",
    period: "",
    description: "For career services teams",
    features: [
      "Unlimited student accounts",
      "Admin dashboard",
      "Bulk NFC card management",
      "University-wide analytics",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
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
      "Yes! The Student plan is completely free and includes a digital profile, resume sharing, and basic analytics. NFC cards are available with the Pro plan.",
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

export const testimonials = [
  {
    quote:
      "I landed three interviews after one career fair. Recruiters loved tapping my card instead of collecting paper resumes.",
    author: "Sarah Chen",
    role: "Computer Science, Stanford '25",
    avatar: "SC",
  },
  {
    quote:
      "StudentLink transformed how our students present themselves. The admin dashboard makes managing 1,200+ profiles effortless.",
    author: "Dr. James Wright",
    role: "Director of Career Services, MIT",
    avatar: "JW",
  },
  {
    quote:
      "The profile loads in under a second on mobile. Perfect for recruiters who want quick access to skills and GitHub links.",
    author: "Marcus Rivera",
    role: "Tech Recruiter, Stripe",
    avatar: "MR",
  },
];
