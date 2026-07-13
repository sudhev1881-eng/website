"use client";

import * as React from "react";
import { Cloud, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { api, type NfcReaderStatus } from "@/lib/api";

export function AdminSettings() {
  const [readerStatus, setReaderStatus] = React.useState<NfcReaderStatus | null>(null);
  const [health, setHealth] = React.useState<string | null>(null);
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
    ])
      .then(([nfc, h]) => {
        setReaderStatus(nfc);
        setHealth(h);
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
            <CardDescription>Backend status on Oracle Cloud.</CardDescription>
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
              <Cloud className="h-5 w-5" />
              NFC (Cloud Mode)
            </CardTitle>
            <CardDescription>
              Profile URLs are registered in the database. Physical NFC tags are programmed externally with the generated URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStatus ? (
              <div className="flex justify-center py-6"><Spinner /></div>
            ) : readerStatus ? (
              <div className="rounded-xl border border-border bg-surface p-4">
                <Badge variant="primary">{readerStatus.mode === "cloud" ? "Cloud mode" : readerStatus.mode}</Badge>
                <p className="mt-2 text-sm text-muted-foreground">{readerStatus.message}</p>
              </div>
            ) : null}
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Environment</CardTitle>
            <CardDescription>Configure via deployment environment variables (Vercel, Oracle, Supabase).</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Frontend: Vercel — <code>NEXT_PUBLIC_*</code> variables</p>
            <p>API: Oracle Cloud Docker — <code>backend/.env</code></p>
            <p>Database &amp; storage: Supabase project dashboard</p>
            <p>See <code>docs/DEPLOYMENT.md</code> for the full checklist.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
