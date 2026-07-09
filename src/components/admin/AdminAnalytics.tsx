"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleBarChart, ProgressBar } from "@/components/charts/SimpleBarChart";
import { Users, Nfc } from "lucide-react";
import { adminStats, adminAnalytics } from "@/data/mock-admin";

export function AdminAnalytics() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Platform-wide engagement and growth metrics."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Students" value={adminStats.totalStudents.toLocaleString()} change={adminStats.studentsChange} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active NFC Cards" value={adminStats.activeCards.toLocaleString()} change={adminStats.cardsChange} icon={<Nfc className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle>Monthly Signups</CardTitle></CardHeader>
          <CardContent>
            <SimpleBarChart data={adminAnalytics.signupsByMonth.map((d) => ({ label: d.month, value: d.count }))} />
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle>Monthly NFC Taps</CardTitle></CardHeader>
          <CardContent>
            <SimpleBarChart data={adminAnalytics.tapsByMonth.map((d) => ({ label: d.month, value: d.count }))} primaryColor="bg-accent" />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader><CardTitle>University Performance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {adminAnalytics.topUniversities.map((uni) => (
            <div key={uni.name}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">{uni.name}</span>
                <span className="text-muted-foreground">{uni.taps.toLocaleString()} taps</span>
              </div>
              <ProgressBar value={uni.taps} max={12400} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
