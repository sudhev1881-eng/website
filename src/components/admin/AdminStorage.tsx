"use client";

import type { ReactNode } from "react";
import * as React from "react";
import { HardDrive, FileText, Image as ImageIcon, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/charts/SimpleBarChart";
import { Spinner } from "@/components/ui/spinner";
import { api, type AdminStorageData } from "@/lib/api";

const typeIcons: Record<string, ReactNode> = {
  Resumes: <FileText className="h-4 w-4" />,
  "Profile Images": <ImageIcon className="h-4 w-4" />,
  "Cover Images": <ImageIcon className="h-4 w-4" />,
  "Project Assets": <FolderOpen className="h-4 w-4" />,
};

export function AdminStorage() {
  const [storage, setStorage] = React.useState<AdminStorageData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.admin
      .storage()
      .then(setStorage)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !storage) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

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
                <p className="text-2xl font-bold">{storage.used} GB</p>
                <p className="text-sm text-muted-foreground">of {storage.total} GB</p>
              </div>
              <ProgressBar value={storage.used} max={storage.total} className="mt-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                {(storage.total - storage.used).toFixed(1)} GB remaining
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
          {storage.breakdown.length > 0 ? (
            storage.breakdown.map((item) => (
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
                  <ProgressBar value={item.size} max={storage.total} className="mt-2" color="bg-secondary" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
