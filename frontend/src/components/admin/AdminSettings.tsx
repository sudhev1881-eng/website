"use client";

import * as React from "react";
import { Cloud, RefreshCw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { api, type NfcReaderStatus, type ResumeAiStatus } from "@/lib/api";

export function AdminSettings() {
  const [readerStatus, setReaderStatus] = React.useState<NfcReaderStatus | null>(null);
  const [health, setHealth] = React.useState<string | null>(null);
  const [aiStatus, setAiStatus] = React.useState<
    (ResumeAiStatus & { modeLabel?: string; ocrEnabled?: boolean }) | null
  >(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);

  const refresh = React.useCallback(() => {
    setLoadingStatus(true);
    Promise.all([
      api.nfc.status().catch(() => ({
        connected: false,
        readerName: null,
        mode: "cloud" as const,
        message: "Could not reach NFC status endpoint",
      })),
      api.health().then((h) => h.status).catch(() => "unreachable"),
      api.admin.aiStatus().catch(() => null),
    ])
      .then(([nfc, h, ai]) => {
        setReaderStatus(nfc);
        setHealth(h);
        setAiStatus(ai);
      })
      .finally(() => setLoadingStatus(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div>
      <PageHeader title="Settings" description="Platform status and cloud configuration." />

      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              API Health
            </CardTitle>
            <CardDescription>Backend status (Render + Supabase).</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStatus ? (
              <Spinner />
            ) : (
              <Badge variant={health === "ok" ? "success" : "warning"}>
                {health === "ok" ? "API healthy" : `API ${health ?? "unknown"}`}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Resume AI (Ollama)
            </CardTitle>
            <CardDescription>
              Local/self-hosted Ollama for extraction and embeddings. If unreachable, the API uses
              free heuristics (no paid OpenAI). See docs/RESUME_AI_OLLAMA.md.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingStatus ? (
              <Spinner />
            ) : aiStatus ? (
              <>
                <Badge variant={aiStatus.ollamaReachable ? "success" : "warning"}>
                  {aiStatus.modeLabel ??
                    (aiStatus.ollamaReachable ? "Ollama connected" : "Heuristic mode")}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Provider: {aiStatus.activeProvider}
                  {aiStatus.fellBackToHeuristic ? " (fell back)" : ""}
                  {aiStatus.chatModel ? ` · chat ${aiStatus.chatModel}` : ""}
                  {aiStatus.embedModel ? ` · embed ${aiStatus.embedModel}` : ""}
                </p>
                {aiStatus.baseUrl && (
                  <p className="truncate text-xs text-muted-foreground">Base: {aiStatus.baseUrl}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  OCR: {aiStatus.ocrEnabled === false ? "disabled" : "enabled"} · Confirmation:{" "}
                  {aiStatus.requireConfirmation ? "required" : "auto-apply"}
                </p>
                {aiStatus.error && <p className="text-xs text-amber-700">{aiStatus.error}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Could not load AI status.</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              NFC (Cloud Mode)
            </CardTitle>
            <CardDescription>
              On Android Chrome, admins can write profile URLs to NTAG cards from Students → Write NFC
              (Web NFC). Tags can also be programmed externally with the same URL, or shared as QR codes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStatus ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : readerStatus ? (
              <div className="rounded-xl border border-border bg-surface p-4">
                <Badge variant="primary">
                  {readerStatus.mode === "cloud" ? "Cloud mode" : readerStatus.mode}
                </Badge>
                <p className="mt-2 text-sm text-muted-foreground">{readerStatus.message}</p>
              </div>
            ) : null}
            <Button variant="outline" onClick={refresh} disabled={loadingStatus}>
              <RefreshCw className="h-4 w-4" />
              Refresh status
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
