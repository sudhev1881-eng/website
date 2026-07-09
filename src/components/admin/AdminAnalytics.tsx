"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleBarChart, ProgressBar } from "@/components/charts/SimpleBarChart";
import { Users, Nfc } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { api, type AdminAnalytics } from "@/lib/api";

export function AdminAnalytics() {
  const [stats, setStats] = React.useState<Record<string, number> | null>(null);
  const [analytics, setAnalytics] = React.useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([api.admin.stats(), api.admin.analytics()])
      .then(([s, a]) => {
        setStats(s);
        setAnalytics(a);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats || !analytics) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Platform-wide engagement and growth metrics."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Total Students" value={stats.totalStudents.toLocaleString()} change={stats.studentsChange} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active NFC Cards" value={stats.activeCards.toLocaleString()} change={stats.cardsChange} icon={<Nfc className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle>Monthly Signups</CardTitle></CardHeader>
          <CardContent>
            {analytics.signupsByMonth.length > 0 ? (
              <SimpleBarChart data={analytics.signupsByMonth.map((d) => ({ label: d.month, value: d.count }))} />
            ) : (
              <p className="text-sm text-muted-foreground">No signup data yet.</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle>Monthly NFC Taps</CardTitle></CardHeader>
          <CardContent>
            {analytics.tapsByMonth.length > 0 ? (
              <SimpleBarChart data={analytics.tapsByMonth.map((d) => ({ label: d.month, value: d.count }))} primaryColor="bg-accent" />
            ) : (
              <p className="text-sm text-muted-foreground">No tap data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader><CardTitle>University Performance</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {analytics.topUniversities.length > 0 ? (
            analytics.topUniversities.map((uni) => (
              <div key={uni.name}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{uni.name}</span>
                  <span className="text-muted-foreground">{uni.taps.toLocaleString()} taps</span>
                </div>
                <ProgressBar value={uni.taps} max={analytics.maxTaps} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No university data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
