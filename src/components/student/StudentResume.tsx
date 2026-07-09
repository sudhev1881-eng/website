"use client";

import { FileText, Download, History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload } from "@/components/ui/upload";
import { toast } from "@/components/ui/toast";
import { studentResume } from "@/data/mock-student";

export function StudentResume() {
  return (
    <div>
      <PageHeader
        title="Resume Manager"
        description="Upload and manage your resume versions."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Current Resume</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{studentResume.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {studentResume.fileSize} · Version {studentResume.version} · Uploaded{" "}
                  {studentResume.uploadedAt}
                </p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => toast.success("Resume download started")}>
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" onClick={() => toast.info("Preview opened")}>
                Preview
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Upload New Version</CardTitle>
          </CardHeader>
          <CardContent>
            <Upload
              label="Upload resume"
              accept=".pdf,.doc,.docx"
              helperText="PDF recommended, max 10MB"
              onUpload={() => toast.success("New resume version uploaded")}
            />
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { version: 3, date: "2025-01-15", name: studentResume.fileName, active: true },
                { version: 2, date: "2024-11-20", name: "Alex_Morgan_Resume_v2.pdf", active: false },
                { version: 1, date: "2024-08-15", name: "Alex_Morgan_Resume_v1.pdf", active: false },
              ].map((v) => (
                <div
                  key={v.version}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-xs text-muted-foreground">v{v.version} · {v.date}</p>
                    </div>
                  </div>
                  {v.active ? (
                    <Badge variant="primary">Current</Badge>
                  ) : (
                    <Button variant="ghost" size="sm">Restore</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
