"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nfc, CheckCircle2, XCircle, Loader2, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useSafeMotion } from "@/lib/motion";
import { friendlyErrorTitle } from "@/lib/nfc";
import { useNFCWriter } from "@/hooks/useNFCWriter";
import { api } from "@/lib/api";
import { NFCStatusIndicator } from "./NFCStatusIndicator";
import { NFCVerificationDialog } from "./NFCVerificationDialog";

interface NFCWriterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    name: string;
    /** Public username / slug for `/u/{slug}` */
    username: string;
    cardNumber?: string | null;
  };
  /** Called after DB mark-programmed succeeds */
  onProgrammed?: () => void;
}

/**
 * Admin modal: write the student's profile URL to a physical NFC tag via Web NFC
 * (Android Chrome), verify read-back, then persist programmed status on the API.
 */
export function NFCWriterModal({
  open,
  onOpenChange,
  student,
  onProgrammed,
}: NFCWriterModalProps) {
  const motionSafe = useSafeMotion();
  const {
    status,
    supported,
    supportMessage,
    profileUrl,
    result,
    error,
    startWrite,
    cancel,
    reset,
  } = useNFCWriter({ username: student.username });

  const [persisting, setPersisting] = React.useState(false);
  const [verifyOpen, setVerifyOpen] = React.useState(false);
  const [persistError, setPersistError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      reset();
      setPersistError(null);
      setVerifyOpen(false);
    } else {
      cancel();
    }
    // Only react to open/close — reset/cancel are stable enough for this flow
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-gated reset
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      cancel();
    }
    onOpenChange(next);
  };

  const persistProgrammed = async (writeResult: NonNullable<typeof result>) => {
    setPersisting(true);
    setPersistError(null);
    try {
      await api.nfc.markProgrammed({
        studentId: student.id,
        studentSlug: student.username,
        urlWritten: writeResult.urlWritten,
        cardUid: writeResult.serialNumber,
        cardNumber: student.cardNumber ?? undefined,
        verified: writeResult.verified,
      });
      toast.success("NFC card programmed and saved");
      onProgrammed?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save programmed status";
      setPersistError(message);
      toast.error(message);
    } finally {
      setPersisting(false);
    }
  };

  const handleWrite = async () => {
    const writeResult = await startWrite();
    if (writeResult?.verified) {
      setVerifyOpen(true);
      await persistProgrammed(writeResult);
    } else if (writeResult === null && status !== "cancelled") {
      // error state already set on hook
    }
  };

  const busy =
    status === "scanning" ||
    status === "writing" ||
    status === "verifying" ||
    persisting;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Nfc className="h-5 w-5 text-primary" />
              Write NFC Card
            </DialogTitle>
            <DialogDescription>
              Write <strong>{student.name}</strong>&apos;s profile URL to an NTAG card
              using this phone&apos;s NFC (Android Chrome).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <NFCStatusIndicator status={status} />

            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={motionSafe.reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={motionSafe.reduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.28 }}
                className="min-h-[140px]"
              >
                {status === "unsupported" && (
                  <div className="space-y-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-4 text-center">
                    <Smartphone className="mx-auto h-10 w-10 text-warning" />
                    <p className="text-sm font-medium text-foreground">
                      Web NFC unavailable on this device
                    </p>
                    <p className="text-xs text-muted-foreground">{supportMessage}</p>
                    <p className="text-xs text-muted-foreground">
                      Open this admin page in <strong>Android Chrome</strong>, enable NFC
                      in system settings, and use HTTPS.
                    </p>
                  </div>
                )}

                {status === "ready" && (
                  <div className="space-y-3 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                      <motion.div
                        animate={
                          motionSafe.reduced
                            ? undefined
                            : { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }
                        }
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Nfc className="h-10 w-10 text-primary" />
                      </motion.div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ready to scan. Tap Write Card, then hold a blank NTAG213/215/216
                      against the back of your phone until writing finishes.
                    </p>
                    {profileUrl ? (
                      <p className="break-all font-mono text-xs text-muted-foreground">
                        {profileUrl}
                      </p>
                    ) : null}
                  </div>
                )}

                {(status === "scanning" ||
                  status === "writing" ||
                  status === "verifying") && (
                  <div className="flex flex-col items-center gap-4 py-4 text-center">
                    <Spinner size="lg" className="text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      {status === "scanning"
                        ? "Hold card near phone"
                        : status === "writing"
                          ? "Writing..."
                          : "Verifying..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Keep the card still until verification completes.
                    </p>
                  </div>
                )}

                {status === "success" && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <CheckCircle2 className="h-12 w-12 text-success" />
                    <p className="font-semibold text-foreground">Card written successfully</p>
                    {result?.urlWritten ? (
                      <p className="break-all text-xs text-muted-foreground">
                        {result.urlWritten}
                      </p>
                    ) : null}
                    {persistError ? (
                      <p className="text-xs text-error">
                        Tag is correct, but saving failed: {persistError}
                      </p>
                    ) : null}
                  </div>
                )}

                {status === "failed" && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <XCircle className="h-12 w-12 text-error" />
                    <p className="font-semibold text-foreground">
                      {error ? friendlyErrorTitle(error.code) : "Failed"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {error?.message ?? "Could not write the NFC card."}
                    </p>
                  </div>
                )}

                {status === "cancelled" && (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <XCircle className="h-10 w-10 text-muted-foreground" />
                    <p className="font-semibold text-foreground">Cancelled</p>
                    <p className="text-sm text-muted-foreground">
                      NFC writing was cancelled. You can try again when ready.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {status === "ready" && supported && (
              <>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleWrite}>
                  <Nfc className="h-4 w-4" />
                  Write Card
                </Button>
              </>
            )}

            {busy && (
              <>
                <Button variant="outline" onClick={cancel}>
                  Cancel
                </Button>
                <Button disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </Button>
              </>
            )}

            {(status === "unsupported" ||
              status === "success" ||
              status === "failed" ||
              status === "cancelled") && (
              <>
                {(status === "failed" || status === "cancelled") && supported ? (
                  <Button variant="outline" onClick={reset}>
                    Try again
                  </Button>
                ) : null}
                <Button onClick={() => handleOpenChange(false)}>Close</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NFCVerificationDialog
        open={verifyOpen && Boolean(result)}
        onOpenChange={setVerifyOpen}
        verified={Boolean(result?.verified)}
        expectedUrl={result?.urlWritten ?? profileUrl}
        readUrl={result?.urlRead ?? null}
        serialNumber={result?.serialNumber}
        errorMessage={error?.message}
      />
    </>
  );
}
