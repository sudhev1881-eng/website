"use client";

import * as React from "react";
import {
  Award,
  Briefcase,
  CheckCircle2,
  Circle,
  FileText,
  FolderOpen,
  GraduationCap,
  Link2,
  Nfc,
  Sparkles,
  Target,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/charts/SimpleBarChart";
import { useStudentData } from "@/providers/student-data-provider";
import type { StudentDashboardData } from "@/lib/api";

type ReadinessItem = {
  id: string;
  title: string;
  description: string;
  complete: boolean;
  weight: number;
  priority: "High" | "Medium" | "Low";
  icon: React.ComponentType<{ className?: string }>;
  evidence: string;
  nextStep: string;
};

function hasText(value: string | number | null | undefined): boolean {
  return String(value ?? "").trim().length > 0;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildReadinessItems(data: StudentDashboardData): ReadinessItem[] {
  const { profile, resume, projects, skills, certificates, experience, nfcCard } = data;
  const profileFields = [
    profile.name,
    profile.title,
    profile.university,
    profile.major,
    profile.graduationYear,
    profile.location,
    profile.bio,
  ];
  const completedProfileFields = profileFields.filter(hasText).length;
  const socialLinks = [profile.linkedin, profile.github, profile.portfolio].filter(hasText);
  const skillCategories = new Set(skills.map((skill) => skill.category).filter(hasText));
  const featuredProjects = projects.filter((project) => project.featured).length;

  return [
    {
      id: "profile",
      title: "Complete profile basics",
      description: "Recruiters can quickly understand your school, role target, location, and story.",
      complete: completedProfileFields >= profileFields.length,
      weight: 20,
      priority: "High",
      icon: GraduationCap,
      evidence: `${completedProfileFields}/${profileFields.length} essentials filled`,
      nextStep: "Add title, major, graduation year, location, and a concise bio.",
    },
    {
      id: "resume",
      title: "Publish an active resume",
      description: "A current resume gives recruiters a downloadable source of truth.",
      complete: Boolean(resume),
      weight: 20,
      priority: "High",
      icon: FileText,
      evidence: resume ? `Version ${resume.version} uploaded` : "No active resume",
      nextStep: "Upload and confirm your latest PDF or DOCX resume.",
    },
    {
      id: "projects",
      title: "Showcase featured projects",
      description: "Project proof helps recruiters connect your skills to real outcomes.",
      complete: projects.length >= 2 && featuredProjects >= 1,
      weight: 15,
      priority: "High",
      icon: FolderOpen,
      evidence: `${pluralize(projects.length, "project")} - ${featuredProjects} featured`,
      nextStep: "Add at least two projects and mark the strongest one as featured.",
    },
    {
      id: "skills",
      title: "Build a balanced skills matrix",
      description: "A focused skill mix makes talent search matches and profile scans stronger.",
      complete: skills.length >= 5 && skillCategories.size >= 2,
      weight: 15,
      priority: "Medium",
      icon: Sparkles,
      evidence: `${pluralize(skills.length, "skill")} across ${pluralize(skillCategories.size, "category", "categories")}`,
      nextStep: "Add at least five skills across multiple categories.",
    },
    {
      id: "experience",
      title: "Add experience or leadership",
      description: "Internships, research, work, or leadership roles add context to your projects.",
      complete: experience.length > 0,
      weight: 10,
      priority: "Medium",
      icon: Briefcase,
      evidence: pluralize(experience.length, "experience item"),
      nextStep: "Add internships, research roles, campus jobs, or leadership experience.",
    },
    {
      id: "links",
      title: "Connect public links",
      description: "Verified destinations make it easier for recruiters to review your work.",
      complete: socialLinks.length >= 2,
      weight: 10,
      priority: "Medium",
      icon: Link2,
      evidence: `${socialLinks.length}/3 links added`,
      nextStep: "Add LinkedIn plus GitHub or a portfolio website.",
    },
    {
      id: "nfc",
      title: "Activate NFC sharing",
      description: "An active StudentLink card makes career fair follow-up measurable.",
      complete: nfcCard?.status === "active",
      weight: 5,
      priority: "Low",
      icon: Nfc,
      evidence: nfcCard ? `${nfcCard.cardNumber} is ${nfcCard.status}` : "No card linked",
      nextStep: "Ask an administrator to link or activate your NFC card.",
    },
    {
      id: "certificates",
      title: "Add credentials",
      description: "Certificates give recruiters quick validation for specialized skills.",
      complete: certificates.length > 0,
      weight: 5,
      priority: "Low",
      icon: Award,
      evidence: pluralize(certificates.length, "credential"),
      nextStep: "Add relevant certificates, awards, or course credentials.",
    },
  ];
}

function readinessTone(score: number) {
  if (score >= 85) return { label: "Recruiter-ready", variant: "success" as const };
  if (score >= 65) return { label: "Almost ready", variant: "primary" as const };
  if (score >= 40) return { label: "Needs polish", variant: "warning" as const };
  return { label: "Getting started", variant: "secondary" as const };
}

export function StudentReadiness() {
  const { data } = useStudentData();
  if (!data) return null;

  const items = buildReadinessItems(data);
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const completedWeight = items.reduce((sum, item) => sum + (item.complete ? item.weight : 0), 0);
  const score = Math.round((completedWeight / totalWeight) * 100);
  const completedItems = items.filter((item) => item.complete);
  const nextItems = items.filter((item) => !item.complete).slice(0, 3);
  const tone = readinessTone(score);

  return (
    <div>
      <PageHeader
        title="Career Readiness"
        description="Track the profile signals that help recruiters understand, trust, and follow up with you."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Readiness score
                </CardTitle>
                <CardDescription>
                  Weighted across profile content, resume, proof of work, and shareability.
                </CardDescription>
              </div>
              <Badge variant={tone.variant}>{tone.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold tracking-tight text-foreground">{score}</span>
              <span className="pb-2 text-sm font-medium text-muted-foreground">/ 100</span>
            </div>
            <ProgressBar value={score} className="h-3" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-2xl font-bold">{completedItems.length}</p>
                <p className="text-xs text-muted-foreground">signals complete</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-2xl font-bold">{data.projects.filter((project) => project.featured).length}</p>
                <p className="text-xs text-muted-foreground">featured projects</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-2xl font-bold">{data.stats.recruiterContacts}</p>
                <p className="text-xs text-muted-foreground">recruiter contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Next best moves</CardTitle>
            <CardDescription>Focus on the highest-impact gaps first.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextItems.length > 0 ? (
              nextItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant={item.priority === "High" ? "warning" : "outline"}>{item.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.nextStep}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                <p className="font-medium text-success">All readiness signals are complete.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep your resume, projects, and links current as your experience grows.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  {item.complete ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={item.complete ? "success" : "outline"}>
                  {item.complete ? "Complete" : `${item.weight} point gap`}
                </Badge>
                <p className="text-sm text-muted-foreground">{item.evidence}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
