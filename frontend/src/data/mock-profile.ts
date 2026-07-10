import {
  currentStudent,
  studentProjects,
  studentSkills,
  studentCertificates,
  studentExperience,
  studentResume,
} from "./mock-student";

export interface PublicProfile {
  username: string;
  name: string;
  title: string;
  university: string;
  major: string;
  bio: string;
  avatar: string | null;
  coverImage: string | null;
  github: string;
  linkedin: string;
  portfolio: string;
  email: string;
  phone: string;
  resume: typeof studentResume;
  projects: typeof studentProjects;
  skills: typeof studentSkills;
  certificates: typeof studentCertificates;
  experience: typeof studentExperience;
}

export const publicProfiles: Record<string, PublicProfile> = {
  "alex-morgan": {
    username: "alex-morgan",
    name: currentStudent.name,
    title: "Software Engineer",
    university: currentStudent.university,
    major: currentStudent.major,
    bio: currentStudent.bio,
    avatar: currentStudent.avatar,
    coverImage: currentStudent.coverImage,
    github: currentStudent.github,
    linkedin: currentStudent.linkedin,
    portfolio: currentStudent.portfolio,
    email: currentStudent.email,
    phone: currentStudent.phone,
    resume: studentResume,
    projects: studentProjects,
    skills: studentSkills,
    certificates: studentCertificates,
    experience: studentExperience,
  },
  "sarah-chen": {
    username: "sarah-chen",
    name: "Sarah Chen",
    title: "Electrical Engineer",
    university: "MIT",
    major: "Electrical Engineering",
    bio: "Hardware engineer specializing in embedded systems and IoT. Passionate about sustainable technology and open-source hardware.",
    avatar: null,
    coverImage: null,
    github: "https://github.com/sarahchen",
    linkedin: "https://linkedin.com/in/sarahchen",
    portfolio: "https://sarahchen.dev",
    email: "sarah.chen@mit.edu",
    phone: "+1 (617) 555-0198",
    resume: {
      fileName: "Sarah_Chen_Resume.pdf",
      fileSize: "198 KB",
      uploadedAt: "2025-01-10",
      version: 2,
    },
    projects: [
      {
        id: "proj_s1",
        title: "Smart Home Hub",
        description: "IoT central controller with voice integration",
        tech: ["C++", "ESP32", "MQTT"],
        url: "#",
        image: null,
        featured: true,
      },
    ],
    skills: [
      { name: "Embedded C", level: 90, category: "Hardware" },
      { name: "PCB Design", level: 85, category: "Hardware" },
      { name: "Python", level: 80, category: "Software" },
    ],
    certificates: [
      {
        id: "cert_s1",
        name: "CompTIA IoT+",
        issuer: "CompTIA",
        date: "2024-06",
        url: "#",
      },
    ],
    experience: [
      {
        id: "exp_s1",
        role: "Hardware Engineering Intern",
        company: "Tesla",
        period: "Summer 2024",
        description: "Designed sensor modules for next-gen vehicle platforms",
      },
    ],
  },
};

export function getPublicProfile(username: string): PublicProfile | null {
  return publicProfiles[username] ?? null;
}

export function getAllProfileUsernames(): string[] {
  return Object.keys(publicProfiles);
}
