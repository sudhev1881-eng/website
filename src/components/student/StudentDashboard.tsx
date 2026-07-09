"use client";

import * as React from "react";
import {
  LayoutDashboard,
  User,
  FileText,
  FolderOpen,
  Sparkles,
  Award,
  BarChart3,
  Nfc,
  Settings,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StudentLinkLogo } from "@/components/brand/StudentLinkLogo";
import { currentStudent } from "@/data/mock-student";
import { StudentOverview } from "./StudentOverview";
import { StudentProfile } from "./StudentProfile";
import { StudentResume } from "./StudentResume";
import { StudentProjects } from "./StudentProjects";
import { StudentSkills } from "./StudentSkills";
import { StudentCertificates } from "./StudentCertificates";
import { StudentAnalytics } from "./StudentAnalytics";
import { StudentNfc } from "./StudentNfc";
import { StudentSettings } from "./StudentSettings";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "profile", label: "My Profile", icon: User },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "skills", label: "Skills", icon: Sparkles },
  { id: "certificates", label: "Certificates", icon: Award },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "nfc", label: "NFC Card", icon: Nfc },
  { id: "settings", label: "Settings", icon: Settings },
];

const modules: Record<string, React.ReactNode> = {
  overview: <StudentOverview />,
  profile: <StudentProfile />,
  resume: <StudentResume />,
  projects: <StudentProjects />,
  skills: <StudentSkills />,
  certificates: <StudentCertificates />,
  analytics: <StudentAnalytics />,
  nfc: <StudentNfc />,
  settings: <StudentSettings />,
};

interface StudentDashboardProps {
  initialSection?: string;
}

export function StudentDashboard({ initialSection = "overview" }: StudentDashboardProps) {
  const [activeId, setActiveId] = React.useState(initialSection);

  return (
    <DashboardShell
      brand={<StudentLinkLogo />}
      navItems={navItems}
      activeId={activeId}
      onNavigate={setActiveId}
      user={{ name: currentStudent.name, role: "Student" }}
    >
      {modules[activeId] ?? modules.overview}
    </DashboardShell>
  );
}
