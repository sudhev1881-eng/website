"use client";

import * as React from "react";
import {
  Users,
  Nfc,
  Building2,
  HardDrive,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleBarChart } from "@/components/charts/SimpleBarChart";
import { Spinner } from "@/components/ui/spinner";
import { api, type AdminAnalytics } from "@/lib/api";

export function AdminOverview() {
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
        title="Admin Dashboard"
        description="Platform overview and key metrics."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={stats.totalStudents.toLocaleString()} change={stats.studentsChange} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active NFC Cards" value={stats.activeCards.toLocaleString()} change={stats.cardsChange} icon={<Nfc className="h-5 w-5" />} />
        <StatCard label="Universities" value={stats.totalUniversities} change={stats.universitiesChange} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Storage Used" value={`${stats.storageUsed}%`} icon={<HardDrive className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Student Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.signupsByMonth.length > 0 ? (
              <SimpleBarChart
                data={analytics.signupsByMonth.map((d) => ({
                  label: d.month,
                  value: d.count,
                }))}
                primaryColor="bg-primary"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No signup data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>NFC Taps</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.tapsByMonth.length > 0 ? (
              <SimpleBarChart
                data={analytics.tapsByMonth.map((d) => ({
                  label: d.month,
                  value: d.count,
                }))}
                primaryColor="bg-secondary"
              />
            ) : (
              <p className="text-sm text-muted-foreground">No tap data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle>Top Universities by NFC Taps</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topUniversities.length > 0 ? (
            <div className="space-y-4">
              {analytics.topUniversities.map((uni, i) => (
                <div key={uni.name} className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{uni.name}</p>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(uni.taps / analytics.maxTaps) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {uni.taps.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No university data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
