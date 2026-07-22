"use client";

import * as React from "react";
import { FileText, Download, History, Sparkles } from "lucide-react";
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
import { useResumeStatus } from "@/hooks/useResumeStatus";

function processingBadgeVariant(
  status: string | undefined,
): "default" | "primary" | "success" | "error" | "warning" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    case "skipped":
      return "warning";
    case "pending":
    case "processing":
      return "primary";
    default:
      return "default";
  }
}

function processingLabel(status: string | undefined): string {
  switch (status) {
    case "pending":
      return "Queued";
    case "processing":
      return "Extracting skills…";
    case "completed":
      return "Skills extracted";
    case "failed":
      return "Extraction failed";
    case "skipped":
      return "Saved only";
    default:
      return "Not processed";
  }
}

export function StudentResume() {
  const { data, refresh } = useStudentData();
  const [history, setHistory] = React.useState<ResumeVersion[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [activeResumeId, setActiveResumeId] = React.useState<string | null>(null);

  const loadHistory = React.useCallback(() => {
    setHistoryLoading(true);
    api.students
      .resumeHistory()
      .then((rows) => {
        setHistory(rows);
        const active = rows.find((r) => r.active) ?? rows[0];
        if (active) setActiveResumeId(active.id);
      })
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  React.useEffect(() => {
    if (data?.resume) loadHistory();
  }, [data?.resume, loadHistory]);

  const { status: resumeStatus, isProcessing } = useResumeStatus(activeResumeId, {
    enabled: Boolean(activeResumeId),
  });

  React.useEffect(() => {
    if (resumeStatus?.processingStatus === "completed") {
      void refresh();
      loadHistory();
    }
  }, [resumeStatus?.processingStatus, refresh, loadHistory]);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await api.students.uploadResume(file);
      if (uploaded.id) setActiveResumeId(uploaded.id);
      await refresh();
      loadHistory();
      if (uploaded.processingStatus === "skipped") {
        toast.success(
          uploaded.errorMessage ??
            "Resume uploaded (legacy .doc is saved only — use PDF or DOCX for skill extraction)",
        );
      } else if (uploaded.processingStatus === "pending") {
        toast.success("Resume uploaded — extracting skills…");
      } else {
        toast.success("Resume uploaded");
      }
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

  const processingStatus =
    resumeStatus?.processingStatus ??
    history.find((h) => h.id === activeResumeId)?.processingStatus;

  const extractedSkills = resumeStatus?.extractedSkills ?? [];
  const profileSkills = resumeStatus?.skills ?? data?.skills ?? [];

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
                helperText="PDF or DOCX for skill extraction · legacy .doc saved only · max 10MB"
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
              <div className="flex flex-col items-end gap-1">
                <Badge variant="success">Active</Badge>
                {processingStatus ? (
                  <Badge variant={processingBadgeVariant(processingStatus)}>
                    {isProcessing ? (
                      <span className="inline-flex items-center gap-1">
                        <Spinner size="sm" />
                        {processingLabel(processingStatus)}
                      </span>
                    ) : (
                      processingLabel(processingStatus)
                    )}
                  </Badge>
                ) : null}
              </div>
            </div>
            {resumeStatus?.errorMessage ? (
              <p className="text-sm text-muted-foreground">{resumeStatus.errorMessage}</p>
            ) : null}
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
                helperText="PDF or DOCX for skill extraction · legacy .doc saved only · max 10MB"
                onUpload={handleUpload}
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Extracted Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isProcessing ? (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                <Spinner />
                Parsing your resume and matching skills…
              </div>
            ) : extractedSkills.length > 0 || profileSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(extractedSkills.length > 0
                  ? extractedSkills.map((s) => s.name)
                  : profileSkills.map((s) => s.name)
                ).map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Upload a PDF or DOCX resume to automatically detect skills. Legacy .doc files are
                saved but not parsed.
              </p>
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
                        <p className="text-xs text-muted-foreground">
                          v{v.version} · {v.uploadedAt}
                          {typeof v.skillsCount === "number" ? ` · ${v.skillsCount} skills` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.processingStatus ? (
                        <Badge variant={processingBadgeVariant(v.processingStatus)}>
                          {processingLabel(v.processingStatus)}
                        </Badge>
                      ) : null}
                      {v.active ? (
                        <Badge variant="primary">Current</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(v.downloadUrl)}>
                          Download
                        </Button>
                      )}
                    </div>
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
