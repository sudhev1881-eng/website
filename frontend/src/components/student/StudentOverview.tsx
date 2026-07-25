"use client";

import {
  Eye,
  Nfc,
  Download,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar, SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { useStudentData } from "@/providers/student-data-provider";
import {
  deriveProfileCompleteness,
  type StudentDashboardSectionId,
} from "@/lib/profile-completeness";

interface StudentOverviewProps {
  onNavigate?: (id: StudentDashboardSectionId) => void;
}

export function StudentOverview({ onNavigate }: StudentOverviewProps) {
  const { data } = useStudentData();
  if (!data) return null;
  const { profile: currentStudent, stats: studentStats, analytics: analyticsData, nfcCard } = data;
  const completeness = deriveProfileCompleteness(data);
  return (
    <div>
      <PageHeader
        title={`Welcome back, ${currentStudent.name.split(" ")[0]}`}
        description="Here's how your profile is performing this week."
        actions={
          <Button href={`/u/${currentStudent.username}`} variant="outline">
            <ExternalLink className="h-4 w-4" />
            View Public Profile
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Profile Views"
          value={studentStats.profileViews}
          change={studentStats.profileViewsChange}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="NFC Taps"
          value={studentStats.nfcTaps}
          change={studentStats.nfcTapsChange}
          icon={<Nfc className="h-5 w-5" />}
        />
        <StatCard
          label="Resume Downloads"
          value={studentStats.resumeDownloads}
          change={studentStats.resumeDownloadsChange}
          icon={<Download className="h-5 w-5" />}
        />
        <StatCard
          label="Recruiter Contacts"
          value={studentStats.recruiterContacts}
          change={studentStats.recruiterContactsChange}
          icon={<MessageSquare className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={analyticsData.viewsByDay.map((d) => ({
                label: d.day,
                value: d.views,
                secondary: d.taps,
              }))}
            />
            <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Views
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-secondary/60" /> NFC Taps
              </span>
            </div>
          </CardContent>
        </Card>

        {nfcCard ? (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>NFC Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-gradient-to-br from-primary to-secondary p-5 text-white">
              <p className="text-xs font-medium opacity-80">StudentLink</p>
              <p className="mt-4 font-mono text-lg font-bold">{nfcCard.cardNumber}</p>
              <p className="mt-2 text-sm opacity-90">{currentStudent.name}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Taps</span>
              <span className="text-sm font-semibold">{nfcCard.totalTaps}</span>
            </div>
            <Button variant="outline" className="w-full" href={`/u/${currentStudent.username}`}>
              Preview Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        ) : (
        <Card className="shadow-card">
          <CardHeader><CardTitle>NFC Card</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No NFC card linked yet. Contact your administrator.</p>
          </CardContent>
        </Card>
        )}
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Profile Completeness</CardTitle>
            <CardDescription>
              Complete these items to make your public profile recruiter-ready.
            </CardDescription>
          </div>
          <Badge variant={completeness.percent === 100 ? "success" : "primary"}>
            {completeness.percent}% complete
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                {completeness.completedCount} of {completeness.totalCount} complete
              </span>
              <span className="text-muted-foreground">
                {completeness.totalCount - completeness.completedCount} remaining
              </span>
            </div>
            <ProgressBar value={completeness.percent} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {completeness.items.map((item) => {
              const Icon = item.done ? CheckCircle2 : Circle;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface/40 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={
                        item.done
                          ? "mt-0.5 h-5 w-5 shrink-0 text-success"
                          : "mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                      }
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  {item.done ? (
                    <Badge variant="success">Done</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={() => onNavigate?.(item.sectionId)}
                    >
                      Review
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" href="/student">
            <Download className="h-5 w-5" />
            <span>Update Resume</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" href="/student">
            <ExternalLink className="h-5 w-5" />
            <span>Add Project</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" href={`/u/${currentStudent.username}`}>
            <Eye className="h-5 w-5" />
            <span>Share Profile</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
