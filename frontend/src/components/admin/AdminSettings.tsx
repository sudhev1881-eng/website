"use client";

import * as React from "react";
import { Usb, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { api, type NfcReaderStatus } from "@/lib/api";

export function AdminSettings() {
  const [readerStatus, setReaderStatus] = React.useState<NfcReaderStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = React.useState(true);

  const refreshReaderStatus = React.useCallback(() => {
    setLoadingStatus(true);
    api.nfc
      .status()
      .then(setReaderStatus)
      .catch(() =>
        setReaderStatus({
          connected: false,
          readerName: null,
          mode: "stub",
          message: "Could not reach NFC status endpoint",
        }),
      )
      .finally(() => setLoadingStatus(false));
  }, []);

  React.useEffect(() => {
    refreshReaderStatus();
  }, [refreshReaderStatus]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Platform configuration and admin preferences."
        actions={<Button onClick={() => toast.success("Settings saved")}>Save Changes</Button>}
      />

      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Usb className="h-5 w-5" />
              NFC Reader (Server USB)
            </CardTitle>
            <CardDescription>
              Live status from the API on the Ubuntu server. The reader must be plugged into the server, not your browser machine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStatus ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : readerStatus ? (
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={readerStatus.connected ? "success" : "warning"}>
                    {readerStatus.mode === "stub" ? "Stub mode" : readerStatus.connected ? "Connected" : "Disconnected"}
                  </Badge>
                  {readerStatus.readerName ? (
                    <span className="text-sm font-medium">{readerStatus.readerName}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{readerStatus.message}</p>
                {readerStatus.mode === "stub" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Set <code>NFC_READER_ENABLED=true</code> in <code>server/.env</code> and restart the API after installing pcscd.
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button variant="outline" size="sm" onClick={refreshReaderStatus}>
              <RefreshCw className="h-4 w-4" />
              Refresh Reader Status
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Platform</CardTitle>
            <CardDescription>General platform settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <Input label="Platform Name" defaultValue="StudentLink" />
            <Input label="Support Email" defaultValue="support@studentlink.app" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Default Plan</label>
              <Select defaultValue="student">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student (Free)</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>NFC Cards</CardTitle>
            <CardDescription>Card issuance and management settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <Input label="Card Prefix" defaultValue="SL" />
            <Input label="Max Cards per Student" type="number" defaultValue="2" />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Storage Limits</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <Input label="Resume Max Size (MB)" type="number" defaultValue="10" />
            <Input label="Image Max Size (MB)" type="number" defaultValue="5" />
            <Input label="Total Storage (GB)" type="number" defaultValue="100" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
