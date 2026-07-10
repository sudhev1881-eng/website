"use client";

import * as React from "react";
import { Nfc, CheckCircle2, XCircle, Loader2, Usb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { api, type NfcProgramResult, type NfcReaderStatus } from "@/lib/api";

type ProgramStep = "ready" | "waiting" | "writing" | "verifying" | "success" | "error";

interface ProgramNfcCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    name: string;
    slug: string;
    cardNumber?: string | null;
  };
}

export function ProgramNfcCardDialog({
  open,
  onOpenChange,
  student,
}: ProgramNfcCardDialogProps) {
  const [step, setStep] = React.useState<ProgramStep>("ready");
  const [result, setResult] = React.useState<NfcProgramResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [readerStatus, setReaderStatus] = React.useState<NfcReaderStatus | null>(null);

  const resetState = () => {
    setStep("ready");
    setResult(null);
    setErrorMessage(null);
    setReaderStatus(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetState();
    onOpenChange(nextOpen);
  };

  React.useEffect(() => {
    if (!open) return;
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
      );
  }, [open]);

  const handleProgram = async () => {
    setStep(readerStatus?.mode === "hardware" ? "waiting" : "writing");
    setErrorMessage(null);

    try {
      setStep("verifying");
      const response = await api.nfc.program({
        studentId: student.id,
        studentSlug: student.slug,
        cardNumber: student.cardNumber ?? undefined,
      });

      if (response.success && response.verified) {
        setResult(response);
        setStep("success");
      } else {
        setErrorMessage(response.message ?? "Card write could not be verified.");
        setStep("error");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to register NFC profile URL.",
      );
      setStep("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Nfc className="h-5 w-5 text-primary" />
            Program NFC Card
          </DialogTitle>
          <DialogDescription>
            Register the profile URL for <strong>{student.name}</strong>. Use the URL on physical NFC tags or QR codes.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {readerStatus ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
              <Usb className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={readerStatus.connected ? "success" : "primary"}>
                    {readerStatus.mode === "cloud" ? "Cloud mode" : readerStatus.mode === "stub" ? "Stub mode" : readerStatus.connected ? "Reader connected" : "No reader"}
                  </Badge>
                  {readerStatus.readerName ? (
                    <span className="truncate text-xs text-muted-foreground">{readerStatus.readerName}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{readerStatus.message}</p>
              </div>
            </div>
          ) : null}

          {step === "ready" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Nfc className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                The USB NFC reader is attached to the Ubuntu server, not your
                browser. Click below to start — the server will write the
                profile URL and verify the card.
              </p>
              {student.cardNumber ? (
                <p className="font-mono text-sm text-foreground">
                  Card: {student.cardNumber}
                </p>
              ) : null}
            </div>
          )}

          {(step === "waiting" || step === "writing" || step === "verifying") && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <Spinner size="lg" />
              <p className="text-sm font-medium text-foreground">
                {step === "waiting"
                  ? "Waiting for card on server reader..."
                  : step === "writing"
                    ? "Writing profile URL to card via server..."
                    : "Verifying write on server..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {readerStatus?.mode === "hardware"
                  ? "Place the NTAG card on the reader and hold until complete"
                  : "Do not remove the card from the reader"}
              </p>
            </div>
          )}

          {step === "success" && result && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <p className="font-semibold text-foreground">Card programmed successfully</p>
              {result.urlWritten ? (
                <p className="break-all text-sm text-muted-foreground">
                  {result.urlWritten}
                </p>
              ) : null}
              {result.cardUid ? (
                <p className="font-mono text-xs text-muted-foreground">
                  UID: {result.cardUid}
                </p>
              ) : null}
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <XCircle className="h-12 w-12 text-error" />
              <p className="font-semibold text-foreground">Programming failed</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "ready" && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleProgram}>
                <Nfc className="h-4 w-4" />
                Program Card
              </Button>
            </>
          )}
          {(step === "waiting" || step === "writing" || step === "verifying") && (
            <Button disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Please wait...
            </Button>
          )}
          {(step === "success" || step === "error") && (
            <Button onClick={() => handleOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
