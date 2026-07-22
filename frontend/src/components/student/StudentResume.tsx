"use client";

import * as React from "react";
import {
  FileText,
  Download,
  Sparkles,
  Briefcase,
  GraduationCap,
  Award,
  FolderKanban,
  ChevronDown,
  Check,
  Pencil,
  Trash2,
  Plus,
  X,
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
  type ResumeAiStatus,
  type ResumeStatusDetail,
  type ResumeValidationFlag,
  type ResumeSectionDecision,
  type ResumeVersion,
} from "@/lib/api";
import { useResumeStatus } from "@/hooks/useResumeStatus";

function processingBadgeVariant(
  status: string | undefined,
): "default" | "primary" | "success" | "error" | "warning" {
  switch (status) {
    case "completed":
    case "confirmed":
      return "success";
    case "awaiting_confirmation":
      return "warning";
    case "failed":
    case "rejected":
      return "error";
    case "skipped":
      return "warning";
    case "pending":
    case "processing":
    case "extracting":
    case "enhancing":
    case "validating":
    case "embedding":
      return "primary";
    default:
      return "default";
  }
}

function processingLabel(status: string | undefined, autoApply?: boolean): string {
  switch (status) {
    case "pending":
    case "uploaded":
      return "Queued";
    case "processing":
    case "extracting":
      return "Extracting…";
    case "enhancing":
      return "Analyzing…";
    case "validating":
      return "Validating…";
    case "awaiting_confirmation":
      return autoApply === false ? "Review required" : "Ready to apply";
    case "embedding":
      return "Updating profile…";
    case "completed":
    case "confirmed":
      return "Profile updated";
    case "failed":
      return "Processing failed";
    case "skipped":
      return "Saved only";
    case "rejected":
      return "Discarded";
    default:
      return "Not processed";
  }
}

const PIPELINE_STAGES = [
  "uploaded",
  "extracting",
  "enhancing",
  "validating",
  "awaiting_confirmation",
] as const;

const AUTO_PIPELINE_STAGES = [
  "uploaded",
  "extracting",
  "enhancing",
  "validating",
  "embedding",
  "confirmed",
] as const;

function stageIndex(
  status: string | undefined,
  stage: string | null | undefined,
  stages: readonly string[],
): number {
  const key = stage || status || "";
  const idx = stages.indexOf(key);
  if (idx >= 0) return idx;
  if (status === "pending") return 0;
  if (status === "processing") return 1;
  if (status === "confirmed" || status === "completed") return stages.length;
  if (status === "embedding") {
    const emb = stages.indexOf("embedding");
    return emb >= 0 ? emb : stages.length - 1;
  }
  return -1;
}

function PipelineProgress({
  status,
  stage,
  autoApply,
}: {
  status?: string;
  stage?: string | null;
  autoApply?: boolean;
}) {
  const stages = autoApply ? AUTO_PIPELINE_STAGES : PIPELINE_STAGES;
  const current = stageIndex(status, stage, stages);
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {stages.map((s, i) => {
        const done =
          current > i ||
          status === "awaiting_confirmation" ||
          status === "confirmed" ||
          status === "completed";
        const active = current === i;
        return (
          <li
            key={s}
            className={`rounded-lg border px-2 py-1 ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : done
                  ? "border-border bg-surface text-foreground"
                  : "border-border text-muted-foreground"
            }`}
          >
            {s === "confirmed" ? "profile updated" : s.replace(/_/g, " ")}
          </li>
        );
      })}
    </ol>
  );
}

function AiProviderHint({ status }: { status: ResumeAiStatus | null }) {
  if (!status) return null;
  const connected = status.ollamaReachable && status.activeProvider === "ollama";
  return (
    <p className="text-xs text-muted-foreground">
      {connected
        ? `Enhanced AI on (${status.chatModel ?? "chat"})`
        : status.fellBackToHeuristic || status.activeProvider === "heuristic"
          ? "Using built-in resume parsing"
          : "Checking resume parsing…"}
    </p>
  );
}

function ExtractedSection({
  title,
  icon,
  defaultOpen = true,
  children,
  empty,
  actions,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  empty?: boolean;
  actions?: React.ReactNode;
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
        {actions ? <span onClick={(e) => e.preventDefault()}>{actions}</span> : null}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-3 text-sm">{children}</div>
    </details>
  );
}

function SectionActions({
  sectionKey,
  decision,
  onAction,
  busy,
}: {
  sectionKey: string;
  decision?: ResumeSectionDecision;
  onAction: (action: "accept" | "reject" | "delete") => void;
  busy: boolean;
}) {
  const accepted = decision?.accepted && !decision?.deleted;
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        variant={accepted ? "primary" : "outline"}
        disabled={busy}
        onClick={() => onAction("accept")}
        title={`Accept ${sectionKey}`}
      >
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={!accepted && !decision?.deleted ? "outline" : "ghost"}
        disabled={busy}
        onClick={() => onAction("reject")}
        title="Skip section"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => onAction("delete")}
        title="Delete section"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function DraftReviewPanel({
  draft,
  onUpdated,
}: {
  draft: ResumeStatusDetail;
  onUpdated: (next: ResumeStatusDetail) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [editingCert, setEditingCert] = React.useState<number | null>(null);
  const [certForm, setCertForm] = React.useState({
    issuer: "",
    issueDate: "",
    credentialId: "",
    credentialUrl: "",
  });
  const [customTitle, setCustomTitle] = React.useState("");
  const [customItems, setCustomItems] = React.useState("");

  const data = draft.structuredData;
  const decisions = draft.sectionDecisions ?? {};
  const flags = draft.validationFlags ?? [];
  const needsCertInput = flags.filter((f) => f.needsUserInput && f.section === "certifications");

  const patch = async (body: Parameters<typeof api.students.patchResumeDraft>[1]) => {
    setBusy(true);
    try {
      const result = await api.students.patchResumeDraft(draft.id, body);
      onUpdated({
        ...draft,
        structuredData: result.structuredData,
        sectionDecisions: result.sectionDecisions,
        validationFlags: result.validationFlags,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update draft");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await api.students.confirmResumeDraft(draft.id);
      toast.success("Resume confirmed — profile updated");
      onUpdated({ ...draft, processingStatus: "confirmed", isDraft: false, active: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Confirm failed";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await api.students.rejectResumeDraft(draft.id);
      toast.success("Draft discarded — previous resume kept");
      onUpdated({ ...draft, processingStatus: "rejected" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        Draft is ready but has no extracted sections. You can still confirm to replace the file, or
        discard.
      </p>
    );
  }

  const certs = data.certifications ?? [];

  return (
    <div className="space-y-4">
      <PipelineProgress status={draft.processingStatus} stage={draft.processingStage} />

      {flags.length > 0 ? (
        <ul className="space-y-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
          {flags.map((f: ResumeValidationFlag, i) => (
            <li key={`${f.code}-${i}`} className="text-muted-foreground">
              {f.needsUserInput ? (
                <span className="font-medium text-foreground">Action needed: </span>
              ) : null}
              {f.message}
            </li>
          ))}
        </ul>
      ) : null}

      {data.summary != null ? (
        <ExtractedSection
          title="Summary"
          icon={<Sparkles className="h-4 w-4" />}
          actions={
            <SectionActions
              sectionKey="summary"
              decision={decisions.summary}
              busy={busy}
              onAction={(action) => void patch({ sectionKey: "summary", action })}
            />
          }
        >
          <p className="whitespace-pre-wrap text-foreground">{data.summary || "—"}</p>
        </ExtractedSection>
      ) : null}

      <ExtractedSection
        title={`Experience (${data.experience?.length ?? 0})`}
        icon={<Briefcase className="h-4 w-4" />}
        empty={!data.experience?.length}
        actions={
          <SectionActions
            sectionKey="experience"
            decision={decisions.experience}
            busy={busy}
            onAction={(action) => void patch({ sectionKey: "experience", action })}
          />
        }
      >
        <ul className="space-y-2">
          {(data.experience ?? []).map((e, i) => (
            <li key={i} className="font-medium">
              {e.title || "Role"}
              {e.company ? ` · ${e.company}` : ""}
            </li>
          ))}
        </ul>
      </ExtractedSection>

      <ExtractedSection
        title={`Education (${data.education?.length ?? 0})`}
        icon={<GraduationCap className="h-4 w-4" />}
        empty={!data.education?.length}
        actions={
          <SectionActions
            sectionKey="education"
            decision={decisions.education}
            busy={busy}
            onAction={(action) => void patch({ sectionKey: "education", action })}
          />
        }
      >
        <ul className="space-y-2">
          {(data.education ?? []).map((e, i) => (
            <li key={i}>{e.school || e.degree || "Education"}</li>
          ))}
        </ul>
      </ExtractedSection>

      <ExtractedSection
        title={`Skills (${data.skills?.length ?? 0})`}
        icon={<Sparkles className="h-4 w-4" />}
        empty={!data.skills?.length}
        actions={
          <SectionActions
            sectionKey="skills"
            decision={decisions.skills}
            busy={busy}
            onAction={(action) => void patch({ sectionKey: "skills", action })}
          />
        }
      >
        <div className="flex flex-wrap gap-2">
          {(data.skills ?? []).map((s) => (
            <Badge key={s.name} variant="secondary">
              {s.name}
            </Badge>
          ))}
        </div>
      </ExtractedSection>

      <ExtractedSection
        title={`Certifications (${certs.length})`}
        icon={<Award className="h-4 w-4" />}
        empty={certs.length === 0}
        actions={
          <SectionActions
            sectionKey="certifications"
            decision={decisions.certifications}
            busy={busy}
            onAction={(action) => void patch({ sectionKey: "certifications", action })}
          />
        }
      >
        <ul className="space-y-3">
          {certs.map((c, i) => (
            <li key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.issuer, c.issueDate || c.date, c.credentialId].filter(Boolean).join(" · ") ||
                      "Missing issuer / dates / credential"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setEditingCert(i);
                    setCertForm({
                      issuer: c.issuer ?? "",
                      issueDate: c.issueDate || c.date || "",
                      credentialId: c.credentialId ?? "",
                      credentialUrl: c.credentialUrl ?? "",
                    });
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
              {editingCert === i ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Issuer"
                    value={certForm.issuer}
                    onChange={(e) => setCertForm((f) => ({ ...f, issuer: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Issue date"
                    value={certForm.issueDate}
                    onChange={(e) => setCertForm((f) => ({ ...f, issueDate: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Credential ID"
                    value={certForm.credentialId}
                    onChange={(e) => setCertForm((f) => ({ ...f, credentialId: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Credential URL"
                    value={certForm.credentialUrl}
                    onChange={(e) => setCertForm((f) => ({ ...f, credentialUrl: e.target.value }))}
                  />
                  <div className="flex gap-2 sm:col-span-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void patch({
                          sectionKey: "certifications",
                          action: "edit",
                          index: i,
                          data: certForm,
                        }).then(() => setEditingCert(null))
                      }
                    >
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCert(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {needsCertInput.length > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Complete issuer, issue date, and credential before confirming — or reject the
            certifications section.
          </p>
        ) : null}
      </ExtractedSection>

      <ExtractedSection
        title={`Projects (${data.projects?.length ?? 0})`}
        icon={<FolderKanban className="h-4 w-4" />}
        empty={!data.projects?.length}
        defaultOpen={false}
        actions={
          <SectionActions
            sectionKey="projects"
            decision={decisions.projects}
            busy={busy}
            onAction={(action) => void patch({ sectionKey: "projects", action })}
          />
        }
      >
        <ul className="space-y-2">
          {(data.projects ?? []).map((p, i) => (
            <li key={i}>{p.name || "Project"}</li>
          ))}
        </ul>
      </ExtractedSection>

      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <p className="mb-2 text-sm font-medium">Add custom section</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Title"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
          />
          <input
            className="flex-[2] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Items (comma-separated)"
            value={customItems}
            onChange={(e) => setCustomItems(e.target.value)}
          />
          <Button
            type="button"
            disabled={busy || !customTitle.trim()}
            onClick={() =>
              void patch({
                sectionKey: "customSections",
                action: "add_custom",
                customTitle,
                customItems: customItems
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }).then(() => {
                setCustomTitle("");
                setCustomItems("");
              })
            }
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        {(data.customSections ?? []).length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm">
            {data.customSections!.map((s) => (
              <li key={s.id}>
                <span className="font-medium">{s.title}</span>
                {s.items?.length ? `: ${s.items.join(", ")}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void confirm()}>
          {busy ? <Spinner size="sm" /> : null}
          Confirm & replace resume
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void reject()}>
          Discard draft
        </Button>
      </div>
    </div>
  );
}

export function StudentResume() {
  const { data, refresh } = useStudentData();
  const [history, setHistory] = React.useState<ResumeVersion[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [draftId, setDraftId] = React.useState<string | null>(null);
  const [draftDetail, setDraftDetail] = React.useState<ResumeStatusDetail | null>(null);
  const [aiStatus, setAiStatus] = React.useState<ResumeAiStatus | null>(null);
  const [autoAppliedBanner, setAutoAppliedBanner] = React.useState(false);

  const requireConfirmation = aiStatus?.requireConfirmation ?? false;

  const loadResumes = React.useCallback(() => {
    api.students
      .resumeHistory()
      .then((rows) => {
        setHistory(rows);
        const draft = rows.find((r) => r.isDraft);
        setDraftId(draft?.id ?? null);
      })
      .catch(console.error);
  }, []);

  React.useEffect(() => {
    loadResumes();
    api.students
      .resumeAiStatus()
      .then(setAiStatus)
      .catch(() => setAiStatus(null));
  }, [data?.resume, loadResumes]);

  const {
    status: draftStatus,
    isProcessing,
    awaitsConfirmation,
    refresh: refreshDraftStatus,
  } = useResumeStatus(draftId, { enabled: Boolean(draftId) });

  React.useEffect(() => {
    if (draftStatus) setDraftDetail(draftStatus);
  }, [draftStatus]);

  React.useEffect(() => {
    if (draftStatus?.processingStatus === "confirmed" || draftStatus?.processingStatus === "completed") {
      if (!requireConfirmation) {
        setAutoAppliedBanner(true);
        toast.success("Profile updated from your resume");
      }
      setDraftId(null);
      setDraftDetail(null);
      void refresh();
      loadResumes();
      api.students.resumeAiStatus().then(setAiStatus).catch(() => undefined);
    } else if (draftStatus?.processingStatus === "rejected") {
      setDraftId(null);
      setDraftDetail(null);
      void refresh();
      loadResumes();
    }
  }, [draftStatus?.processingStatus, refresh, loadResumes, requireConfirmation]);

  const handleUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    setAutoAppliedBanner(false);
    try {
      const uploaded = await api.students.uploadResume(file);
      if (uploaded.id) setDraftId(uploaded.id);
      await refresh();
      loadResumes();
      const status = await api.students.resumeAiStatus().catch(() => null);
      if (status) setAiStatus(status);
      toast.success(
        status?.requireConfirmation
          ? "Resume uploaded — processing draft for your review…"
          : "Resume uploaded — updating your profile…",
      );
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

  const active = history.find((h) => h.active && !h.isDraft);
  const studentResume = data?.resume;
  const uploadHelper = "PDF or DOCX recommended · legacy .doc saved without AI parse · max 10MB";

  const showDraftReview =
    requireConfirmation &&
    draftDetail &&
    (awaitsConfirmation || draftDetail.processingStatus === "awaiting_confirmation") &&
    draftDetail.processingStatus !== "rejected";

  if (!studentResume && !draftId) {
    return (
      <div>
        <PageHeader
          title="Resume"
          description={
            requireConfirmation
              ? "Upload one resume. Review extracted sections before they update your profile."
              : "Upload one resume. We extract sections and fill your public profile automatically."
          }
        />
        <Card className="shadow-card">
          <CardContent className="space-y-3 p-6">
            <AiProviderHint status={aiStatus} />
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
          description={
            requireConfirmation
              ? "Upload a PDF or DOCX to extract and confirm your profile."
              : "Upload a PDF or DOCX — your profile sections fill in automatically."
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Resume"
        description={
          requireConfirmation
            ? "One active resume per profile. New uploads stay as drafts until you confirm."
            : "One active resume per profile. New uploads are analyzed and applied automatically."
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {studentResume ? (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Active resume</CardTitle>
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
              </div>
              {autoAppliedBanner ? (
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                  Profile updated — experience, projects, skills, and related sections were filled from
                  this resume.
                </div>
              ) : null}
              <AiProviderHint status={aiStatus} />
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Active resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {requireConfirmation
                  ? "No confirmed resume yet. Confirm your draft to publish one."
                  : "No active resume yet. Upload a PDF or DOCX to populate your profile."}
              </p>
              <AiProviderHint status={aiStatus} />
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{requireConfirmation ? "Upload new draft" : "Upload resume"}</CardTitle>
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
                helperText={
                  draftId
                    ? requireConfirmation
                      ? "Uploading replaces your current draft only — active resume stays until you confirm."
                      : "Uploading replaces the in-progress resume and will update your profile when done."
                    : uploadHelper
                }
                onUpload={handleUpload}
              />
            )}
          </CardContent>
        </Card>

        {draftId ? (
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {requireConfirmation ? "Draft review" : "Resume intelligence"}
                {draftDetail?.processingStatus ? (
                  <Badge variant={processingBadgeVariant(draftDetail.processingStatus)}>
                    {isProcessing ? (
                      <span className="inline-flex items-center gap-1">
                        <Spinner size="sm" />
                        {processingLabel(draftDetail.processingStatus, requireConfirmation)}
                      </span>
                    ) : (
                      processingLabel(draftDetail.processingStatus, requireConfirmation)
                    )}
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiProviderHint status={aiStatus} />
              {isProcessing ||
              (!requireConfirmation &&
                draftDetail &&
                !awaitsConfirmation &&
                draftDetail.processingStatus !== "failed") ? (
                <>
                  <PipelineProgress
                    status={draftDetail?.processingStatus}
                    stage={draftDetail?.processingStage}
                    autoApply={!requireConfirmation}
                  />
                  <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
                    {isProcessing ? <Spinner /> : null}
                    {isProcessing
                      ? "Extracting and applying sections to your profile…"
                      : "Waiting for status…"}
                  </div>
                </>
              ) : (showDraftReview ||
                  (!requireConfirmation &&
                    awaitsConfirmation &&
                    draftDetail?.processingStatus === "awaiting_confirmation")) &&
                draftDetail ? (
                <>
                  {!requireConfirmation ? (
                    <p className="text-sm text-muted-foreground">
                      We need a quick review before finishing. Confirm sections below to update your
                      profile — common for scanned PDFs with little readable text.
                    </p>
                  ) : null}
                  <DraftReviewPanel
                    draft={draftDetail}
                    onUpdated={(next) => {
                      if (
                        next.processingStatus === "confirmed" ||
                        next.processingStatus === "rejected"
                      ) {
                        setDraftId(null);
                        setDraftDetail(null);
                        void refresh();
                        loadResumes();
                        return;
                      }
                      setDraftDetail(next);
                      void refreshDraftStatus();
                    }}
                  />
                </>
              ) : draftDetail?.errorMessage ? (
                <p className="text-sm text-muted-foreground">{draftDetail.errorMessage}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for draft status…</p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {studentResume && !draftId && active ? (
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Profile from resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {requireConfirmation
                  ? "Upload a new PDF or DOCX to extract sections, review them, and replace this resume. Only accepted fields update your profile on confirm."
                  : "Upload a new PDF or DOCX to replace this resume and refresh profile sections automatically."}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
