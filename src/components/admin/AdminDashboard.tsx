"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  Nfc,
  Building2,
  BarChart3,
  HardDrive,
  Settings,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { StudentLinkLogo } from "@/components/brand/StudentLinkLogo";
import { AdminOverview } from "./AdminOverview";
import { AdminStudents } from "./AdminStudents";
import { AdminNfcCards } from "./AdminNfcCards";
import { AdminUniversities } from "./AdminUniversities";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminStorage } from "./AdminStorage";
import { AdminSettings } from "./AdminSettings";
import { useAuth } from "@/providers/auth-provider";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "nfc-cards", label: "NFC Cards", icon: Nfc },
  { id: "universities", label: "Universities", icon: Building2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "settings", label: "Settings", icon: Settings },
];

const modules: Record<string, React.ReactNode> = {
  dashboard: <AdminOverview />,
  students: <AdminStudents />,
  "nfc-cards": <AdminNfcCards />,
  universities: <AdminUniversities />,
  analytics: <AdminAnalytics />,
  storage: <AdminStorage />,
  settings: <AdminSettings />,
};

function AdminDashboardInner() {
  const [activeId, setActiveId] = React.useState("dashboard");
  const { user } = useAuth();

  return (
    <DashboardShell
      brand={<StudentLinkLogo />}
      navItems={navItems}
      activeId={activeId}
      onNavigate={setActiveId}
      user={{ name: user?.email ?? "Admin", role: "Web Admin" }}
    >
      {modules[activeId] ?? modules.dashboard}
    </DashboardShell>
  );
}

export function AdminDashboard() {
  return (
    <RequireAuth role="admin">
      <AdminDashboardInner />
    </RequireAuth>
  );
}
