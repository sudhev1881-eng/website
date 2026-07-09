"use client";

import type { ReactNode } from "react";
import { HardDrive, FileText, Image as ImageIcon, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/charts/SimpleBarChart";
import { adminStorage } from "@/data/mock-admin";

const typeIcons: Record<string, ReactNode> = {
  Resumes: <FileText className="h-4 w-4" />,
  "Profile Images": <Image className="h-4 w-4" />,
  "Project Assets": <FolderOpen className="h-4 w-4" />,
};

export function AdminStorage() {
  return (
    <div>
      <PageHeader
        title="Storage"
        description="Monitor platform storage usage and breakdown."
      />

      <Card className="mb-6 shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <HardDrive className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-bold">{adminStorage.used} GB</p>
                <p className="text-sm text-muted-foreground">of {adminStorage.total} GB</p>
              </div>
              <ProgressBar value={adminStorage.used} max={adminStorage.total} className="mt-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                {(adminStorage.total - adminStorage.used).toFixed(1)} GB remaining
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Storage Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminStorage.breakdown.map((item) => (
            <div key={item.type} className="flex items-center gap-4 rounded-xl border border-border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-muted-foreground">
                {typeIcons[item.type] ?? <FolderOpen className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.type}</p>
                  <p className="text-sm text-muted-foreground">{item.size} GB</p>
                </div>
                <p className="text-xs text-muted-foreground">{item.count.toLocaleString()} files</p>
                <ProgressBar value={item.size} max={adminStorage.total} className="mt-2" color="bg-secondary" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
