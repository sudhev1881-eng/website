"use client";

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
import { adminStats, adminAnalytics } from "@/data/mock-admin";

export function AdminOverview() {
  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Platform overview and key metrics."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={adminStats.totalStudents.toLocaleString()} change={adminStats.studentsChange} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Active NFC Cards" value={adminStats.activeCards.toLocaleString()} change={adminStats.cardsChange} icon={<Nfc className="h-5 w-5" />} />
        <StatCard label="Universities" value={adminStats.totalUniversities} change={adminStats.universitiesChange} icon={<Building2 className="h-5 w-5" />} />
        <StatCard label="Storage Used" value={`${adminStats.storageUsed}%`} icon={<HardDrive className="h-5 w-5" />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Student Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={adminAnalytics.signupsByMonth.map((d) => ({
                label: d.month,
                value: d.count,
              }))}
              primaryColor="bg-primary"
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>NFC Taps</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={adminAnalytics.tapsByMonth.map((d) => ({
                label: d.month,
                value: d.count,
              }))}
              primaryColor="bg-secondary"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle>Top Universities by NFC Taps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminAnalytics.topUniversities.map((uni, i) => (
              <div key={uni.name} className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-sm font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{uni.name}</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(uni.taps / 12400) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {uni.taps.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
