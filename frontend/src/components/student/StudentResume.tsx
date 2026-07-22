"use client";

import * as React from "react";
import {
  FileText,
  Download,
  History,
  Sparkles,
  Briefcase,
  GraduationCap,
  Mail,
  Award,
  FolderKanban,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload } from "@/components/ui/upload";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useStudentData } from "@/providers/student-data-provider";
import {
  api,
  fileUrl,
  type ExtractedResumeStructuredData,
  type ResumeVersion,
} from "@/lib/api";
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
      return "Extracting profile…";
    case "completed":
      return "Profile extracted";
    case "failed":
      return "Extraction failed";
    case "skipped":
      return "Saved only";
    default:
      return "Not processed";
  }
}

function ExtractedSection({
  title,
  icon,
  defaultOpen = true,
  children,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;
  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-border bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <span className="text-primary">{icon}</span>
        <span className="flex-1">{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-3 text-sm">{children}</div>
    </details>
  );
}

function StructuredExtractionView({ data }: { data: ExtractedResumeStructuredData }) {
  const contact = data.contact;
  const experience = data.experience ?? [];
  const education = data.education ?? [];
  const skills = data.skills ?? [];
  const certifications = data.certifications ?? [];
  const projects = data.projects ?? [];
  const hasContact =
    contact &&
    (contact.name ||
      contact.emails?.length ||
      contact.phones?.length ||
      contact.linkedin ||
      contact.github ||
      contact.website ||
      contact.address);

  return (
    <div className="space-y-3">
      {data.summary ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/70">
            Summary
          </p>
          <p className="whitespace-pre-wrap text-foreground">{data.summary}</p>
        </div>
      ) : null}

      <ExtractedSection
        title="Contact"
        icon={<Mail className="h-4 w-4" />}
        empty={!hasContact}
      >
        <dl className="grid gap-2 sm:grid-cols-2">
          {contact?.name ? (
            <>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{contact.name}</dd>
            </>
          ) : null}
          {contact?.emails?.length ? (
            <>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">{contact.emails.join(", ")}</dd>
            </>
          ) : null}
          {contact?.phones?.length ? (
            <>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{contact.phones.join(", ")}</dd>
            </>
          ) : null}
          {contact?.linkedin ? (
            <>
              <dt className="text-muted-foreground">LinkedIn</dt>
              <dd className="break-all">
                <a
                  href={contact.linkedin.startsWith("http") ? contact.linkedin : `https://${contact.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {contact.linkedin}
                </a>
              </dd>
            </>
          ) : null}
          {contact?.github ? (
            <>
              <dt className="text-muted-foreground">GitHub</dt>
              <dd className="break-all">
                <a
                  href={contact.github.startsWith("http") ? contact.github : `https://${contact.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {contact.github}
                </a>
              </dd>
            </>
          ) : null}
          {contact?.website ? (
            <>
              <dt className="text-muted-foreground">Website</dt>
              <dd className="break-all">
                <a
                  href={contact.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {contact.website}
                </a>
              </dd>
            </>
          ) : null}
          {contact?.address ? (
            <>
              <dt className="text-muted-foreground">Address</dt>
              <dd>{contact.address}</dd>
            </>
          ) : null}
        </dl>
      </ExtractedSection>

      <ExtractedSection
        title={`Experience (${experience.length})`}
        icon={<Briefcase className="h-4 w-4" />}
        empty={experience.length === 0}
      >
        <ul className="space-y-4">
          {experience.map((job, i) => (
            <li key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <p className="font-medium text-foreground">
                {[job.title, job.company].filter(Boolean).join(" · ") || "Role"}
              </p>
              <p className="text-xs text-muted-foreground">
                {[job.location, [job.startDate, job.endDate].filter(Boolean).join(" – ")]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {job.bullets?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground">
                  {job.bullets.slice(0, 6).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </ExtractedSection>

      <ExtractedSection
        title={`Education (${education.length})`}
        icon={<GraduationCap className="h-4 w-4" />}
        empty={education.length === 0}
      >
        <ul className="space-y-3">
          {education.map((edu, i) => (
            <li key={i}>
              <p className="font-medium text-foreground">
                {edu.school || edu.degree || "Education"}
              </p>
              <p className="text-muted-foreground">
                {[edu.degree, edu.field].filter(Boolean).join(" in ")}
                {edu.gpa ? ` · GPA ${edu.gpa}` : ""}
              </p>
              {(edu.startDate || edu.endDate) && (
                <p className="text-xs text-muted-foreground">
                  {[edu.startDate, edu.endDate].filter(Boolean).join(" – ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </ExtractedSection>

      <ExtractedSection
        title={`Skills (${skills.length})`}
        icon={<Sparkles className="h-4 w-4" />}
        empty={skills.length === 0}
      >
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <Badge key={s.name} variant="secondary">
              {s.name}
            </Badge>
          ))}
        </div>
      </ExtractedSection>

      <ExtractedSection
        title={`Certifications (${certifications.length})`}
        icon={<Award className="h-4 w-4" />}
        empty={certifications.length === 0}
        defaultOpen={false}
      >
        <ul className="space-y-2">
          {certifications.map((c, i) => (
            <li key={i}>
              <span className="font-medium">{c.name}</span>
              {(c.issuer || c.date) && (
                <span className="text-muted-foreground">
                  {" "}
                  · {[c.issuer, c.date].filter(Boolean).join(" · ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      </ExtractedSection>

      <ExtractedSection
        title={`Projects (${projects.length})`}
        icon={<FolderKanban className="h-4 w-4" />}
        empty={projects.length === 0}
        defaultOpen={false}
      >
        <ul className="space-y-3">
          {projects.map((p, i) => (
            <li key={i}>
              <p className="font-medium text-foreground">{p.name || "Project"}</p>
              {p.description ? (
                <p className="text-muted-foreground">{p.description}</p>
              ) : null}
              {p.technologies?.length ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.technologies.map((t) => (
                    <Badge key={t} variant="default">
                      {t}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-primary hover:underline"
                >
                  {p.url}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </ExtractedSection>

      {data.parser || data.confidence?.overall != null ? (
        <p className="text-xs text-muted-foreground">
          {data.parser === "heuristic+llm" ? "Parsed with AI assist" : "Parsed offline"}
          {data.confidence?.overall != null
            ? ` · confidence ${Math.round(data.confidence.overall * 100)}%`
            : ""}
        </p>
      ) : null}
    </div>
  );
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
            "Resume uploaded (legacy .doc is saved only — use PDF or DOCX for profile extraction)",
        );
      } else if (uploaded.processingStatus === "pending") {
        toast.success("Resume uploaded — extracting profile sections…");
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

  const structured = resumeStatus?.structuredData;
  const extractedSkills = resumeStatus?.extractedSkills ?? [];
  const profileSkills = resumeStatus?.skills ?? data?.skills ?? [];
  const hasStructured =
    structured &&
    (Boolean(structured.summary) ||
      (structured.experience?.length ?? 0) > 0 ||
      (structured.education?.length ?? 0) > 0 ||
      (structured.skills?.length ?? 0) > 0 ||
      (structured.certifications?.length ?? 0) > 0 ||
      (structured.projects?.length ?? 0) > 0 ||
      Boolean(structured.contact?.emails?.length) ||
      Boolean(structured.contact?.name));

  const uploadHelper =
    "PDF or DOCX for full profile extraction · legacy .doc saved only · max 10MB";

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
                helperText={uploadHelper}
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
                helperText={uploadHelper}
                onUpload={handleUpload}
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Extracted Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isProcessing ? (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                <Spinner />
                Parsing contact, experience, education, skills, and more…
              </div>
            ) : hasStructured && structured ? (
              <StructuredExtractionView data={structured} />
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
                Upload a PDF or DOCX resume to extract contact, experience, education, skills,
                certifications, and projects. Legacy .doc files are saved but not parsed.
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
