"use client";

import { Nfc, Copy, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { useStudentData } from "@/providers/student-data-provider";

export function StudentNfc() {
  const { data } = useStudentData();
  if (!data) return null;
  const { profile: currentStudent, nfcCard } = data;
  if (!nfcCard) {
    return (
      <div>
        <PageHeader title="NFC Card Management" description="No NFC card linked yet." />
        <EmptyState icon={<Nfc className="h-6 w-6" />} title="No NFC card" description="Contact your administrator to get an NFC card programmed." />
      </div>
    );
  }

  const profileUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/u/${currentStudent.username}`;

  return (
    <div>
      <PageHeader
        title="NFC Card Management"
        description="Manage your NFC card and profile link."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card overflow-hidden">
          <div className="bg-gradient-to-br from-primary via-secondary to-accent p-8 text-white">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium opacity-80">StudentLink</p>
              <Nfc className="h-6 w-6 opacity-80" />
            </div>
            <p className="mt-8 font-mono text-2xl font-bold tracking-wider">
              {nfcCard.cardNumber}
            </p>
            <p className="mt-4 text-lg font-semibold">{currentStudent.name}</p>
            <p className="text-sm opacity-80">{currentStudent.university}</p>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Linked Since</span>
              <span className="text-sm font-medium">{nfcCard.linkedAt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Taps</span>
              <span className="text-sm font-medium">{nfcCard.totalTaps}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Tap</span>
              <span className="text-sm font-medium">Jan 14, 2025</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Profile Link</CardTitle>
              <CardDescription>
                This is the URL recruiters see when they tap your card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                <code className="flex-1 truncate text-sm">{profileUrl}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Copy link"
                  onClick={() => {
                    navigator.clipboard.writeText(profileUrl);
                    toast.success("Link copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full" href={`/u/${currentStudent.username}`}>
                <ExternalLink className="h-4 w-4" />
                Preview Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Card Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                Request Replacement Card
              </Button>
              <Button variant="outline" className="w-full justify-start text-error hover:text-error">
                Deactivate Card
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
