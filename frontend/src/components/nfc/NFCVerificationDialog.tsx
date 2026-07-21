"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface NFCVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verified: boolean;
  expectedUrl: string | null;
  readUrl: string | null;
  serialNumber?: string | null;
  errorMessage?: string | null;
}

/**
 * Post-write verification summary. Shown after a successful or failed read-back
 * so admins can confirm the tag URL before closing the writer flow.
 */
export function NFCVerificationDialog({
  open,
  onOpenChange,
  verified,
  expectedUrl,
  readUrl,
  serialNumber,
  errorMessage,
}: NFCVerificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {verified ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-error" />
            )}
            {verified ? "NFC write verified" : "Verification failed"}
          </DialogTitle>
          <DialogDescription>
            {verified
              ? "The tag was read back and matches the student profile URL."
              : errorMessage ??
                "The URL on the tag does not match what was written. Try again with a blank NTAG card."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {expectedUrl ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Expected</p>
              <p className="break-all font-mono text-xs text-foreground">{expectedUrl}</p>
            </div>
          ) : null}
          {readUrl ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Read from tag</p>
              <p className="break-all font-mono text-xs text-foreground">{readUrl}</p>
            </div>
          ) : null}
          {serialNumber ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tag UID</p>
              <p className="font-mono text-xs text-foreground">{serialNumber}</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
