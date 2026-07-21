"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { NFC_STATUS_LABELS, type NfcWriterStatus } from "@/lib/nfc";
import { cn } from "@/lib/utils";
import { CheckCircle2, Nfc, WifiOff, XCircle } from "lucide-react";

const badgeVariant: Record<
  NfcWriterStatus,
  "default" | "primary" | "success" | "error" | "warning" | "outline"
> = {
  idle: "outline",
  unsupported: "warning",
  ready: "primary",
  scanning: "primary",
  writing: "primary",
  verifying: "primary",
  success: "success",
  failed: "error",
  cancelled: "outline",
};

interface NFCStatusIndicatorProps {
  status: NfcWriterStatus;
  className?: string;
  /** Show spinner for in-progress states */
  showSpinner?: boolean;
}

export function NFCStatusIndicator({
  status,
  className,
  showSpinner = true,
}: NFCStatusIndicatorProps) {
  const busy = status === "scanning" || status === "writing" || status === "verifying";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {busy && showSpinner ? (
        <Spinner size="sm" className="text-primary" label={NFC_STATUS_LABELS[status]} />
      ) : status === "success" ? (
        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
      ) : status === "failed" ? (
        <XCircle className="h-4 w-4 text-error" aria-hidden />
      ) : status === "unsupported" ? (
        <WifiOff className="h-4 w-4 text-warning" aria-hidden />
      ) : (
        <Nfc className="h-4 w-4 text-primary" aria-hidden />
      )}
      <Badge variant={badgeVariant[status]}>{NFC_STATUS_LABELS[status]}</Badge>
    </div>
  );
}
