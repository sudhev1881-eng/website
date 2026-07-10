"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleBarChart, ProgressBar } from "@/components/charts/SimpleBarChart";
import { Eye, Nfc, Download } from "lucide-react";
import { useStudentData } from "@/providers/student-data-provider";

export function StudentAnalytics() {
  const { data } = useStudentData();
  if (!data) return null;
  const { stats: studentStats, analytics: analyticsData } = data;
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Track how recruiters engage with your profile."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Views" value={studentStats.profileViews} change={studentStats.profileViewsChange} icon={<Eye className="h-5 w-5" />} />
        <StatCard label="NFC Taps" value={studentStats.nfcTaps} change={studentStats.nfcTapsChange} icon={<Nfc className="h-5 w-5" />} />
        <StatCard label="Downloads" value={studentStats.resumeDownloads} change={studentStats.resumeDownloadsChange} icon={<Download className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Weekly Views & Taps</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={analyticsData.viewsByDay.map((d) => ({
                label: d.day,
                value: d.views,
                secondary: d.taps,
              }))}
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsData.topReferrers.map((ref) => (
              <div key={ref.source}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{ref.source}</span>
                  <span className="text-muted-foreground">{ref.count} ({ref.percent}%)</span>
                </div>
                <ProgressBar value={ref.percent} color="bg-secondary" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
