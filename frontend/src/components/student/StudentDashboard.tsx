"use client";

import * as React from "react";
import {
  LayoutDashboard,
  User,
  FileText,
  FolderOpen,
  Sparkles,
  Award,
  Briefcase,
  BarChart3,
  Nfc,
  Settings,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { StudentLinkLogo } from "@/components/brand/StudentLinkLogo";
import { StudentDataProvider } from "@/providers/student-data-provider";
import { useStudentData } from "@/providers/student-data-provider";
import { StudentOverview } from "./StudentOverview";
import { StudentProfile } from "./StudentProfile";
import { StudentResume } from "./StudentResume";
import { StudentProjects } from "./StudentProjects";
import { StudentSkills } from "./StudentSkills";
import { StudentCertificates } from "./StudentCertificates";
import { StudentExperience } from "./StudentExperience";
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
  { id: "experience", label: "Experience", icon: Briefcase },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "nfc", label: "NFC Card", icon: Nfc },
  { id: "settings", label: "Settings", icon: Settings },
];

function StudentDashboardInner() {
  const [activeId, setActiveId] = React.useState("overview");
  const { data } = useStudentData();

  const modules: Record<string, React.ReactNode> = {
    overview: <StudentOverview />,
    profile: <StudentProfile />,
    resume: <StudentResume />,
    projects: <StudentProjects />,
    skills: <StudentSkills />,
    certificates: <StudentCertificates />,
    experience: <StudentExperience />,
    analytics: <StudentAnalytics />,
    nfc: <StudentNfc />,
    settings: <StudentSettings />,
  };

  return (
    <DashboardShell
      brand={<StudentLinkLogo />}
      navItems={navItems}
      activeId={activeId}
      onNavigate={setActiveId}
      user={{ name: data?.profile.name ?? "Student", role: "Student" }}
    >
      {modules[activeId] ?? modules.overview}
    </DashboardShell>
  );
}

export function StudentDashboard() {
  return (
    <RequireAuth role="student">
      <StudentDataProvider>
        <StudentDashboardInner />
      </StudentDataProvider>
    </RequireAuth>
  );
}
