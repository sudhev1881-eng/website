"use client";

import * as React from "react";
import { FileText, Download, History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload } from "@/components/ui/upload";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useStudentData } from "@/providers/student-data-provider";
import { api, fileUrl, type ResumeVersion } from "@/lib/api";

export function StudentResume() {
  const { data, refresh } = useStudentData();
  const [history, setHistory] = React.useState<ResumeVersion[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const loadHistory = React.useCallback(() => {
    setHistoryLoading(true);
    api.students
      .resumeHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  React.useEffect(() => {
    if (data?.resume) loadHistory();
  }, [data?.resume, loadHistory]);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.students.uploadResume(file);
      await refresh();
      loadHistory();
      toast.success("Resume uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (url: string | null) => {
    const resolved = fileUrl(url);
    if (!resolved) {
      toast.error("No file available for download");
      return;
    }
    window.open(resolved, "_blank");
  };

  if (!data?.resume) {
    return (
      <div>
        <PageHeader title="Resume Manager" description="Upload and manage your resume versions." />
        <Card className="shadow-card">
          <CardContent className="p-6">
            {uploading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <Upload
                label="Upload resume"
                accept=".pdf,.doc,.docx"
                helperText="PDF recommended, max 10MB"
                onUpload={handleUpload}
              />
            )}
          </CardContent>
        </Card>
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No resume uploaded"
          description="Upload your first resume to share with recruiters."
        />
      </div>
    );
  }

  const studentResume = data.resume;

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
              <Button onClick={() => handleDownload(studentResume.downloadUrl)}>
                <Download className="h-4 w-4" />
                Download
              </Button>
              {studentResume.downloadUrl ? (
                <Button variant="outline" onClick={() => handleDownload(studentResume.downloadUrl)}>
                  Preview
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Upload New Version</CardTitle>
          </CardHeader>
          <CardContent>
            {uploading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <Upload
                label="Upload resume"
                accept=".pdf,.doc,.docx"
                helperText="PDF recommended, max 10MB"
                onUpload={handleUpload}
              />
            )}
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
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{v.fileName}</p>
                        <p className="text-xs text-muted-foreground">v{v.version} · {v.uploadedAt}</p>
                      </div>
                    </div>
                    {v.active ? (
                      <Badge variant="primary">Current</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(v.downloadUrl)}>
                        Download
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No version history available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
