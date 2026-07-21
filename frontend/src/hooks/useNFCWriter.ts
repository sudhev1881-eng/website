"use client";

/**
 * React state machine for admin Web NFC card programming.
 *
 * Separates UI status from the pure write/verify logic in `lib/nfc/writer`.
 * Always abort in-flight NFC ops when the consumer unmounts or calls `cancel()`.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildNfcProfileUrl,
  getWebNfcSupportMessage,
  isWebNfcSupported,
  isSecureContext,
  NfcError,
  writeAndVerifyNfcUrl,
  type NfcWriterStatus,
  type NfcWriteVerifyResult,
  type NfcErrorCode,
} from "@/lib/nfc";

export interface UseNFCWriterOptions {
  /** Student public username (slug) used in `/u/{slug}?src=nfc`. */
  username: string;
  /** Optional override for SITE_URL (tests). */
  siteUrl?: string;
}

export interface UseNFCWriterResult {
  status: NfcWriterStatus;
  supported: boolean;
  supportMessage: string;
  profileUrl: string | null;
  result: NfcWriteVerifyResult | null;
  error: { code: NfcErrorCode; message: string } | null;
  /** Begin write + verify. Safe to call only from a user gesture on Android Chrome. */
  startWrite: () => Promise<NfcWriteVerifyResult | null>;
  /** Abort in-flight NFC and mark status cancelled. */
  cancel: () => void;
  /** Reset to ready / unsupported without aborting mid-flight (call cancel first if needed). */
  reset: () => void;
}

function initialStatus(): NfcWriterStatus {
  if (typeof window === "undefined") return "idle";
  if (!isSecureContext()) return "unsupported";
  if (!isWebNfcSupported()) return "unsupported";
  return "ready";
}

export function useNFCWriter(options: UseNFCWriterOptions): UseNFCWriterResult {
  const { username, siteUrl } = options;

  const [status, setStatus] = useState<NfcWriterStatus>(initialStatus);
  const [supported, setSupported] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [result, setResult] = useState<NfcWriteVerifyResult | null>(null);
  const [error, setError] = useState<{ code: NfcErrorCode; message: string } | null>(
    null,
  );

  const abortRef = useRef<AbortController | null>(null);

  // Recompute support + URL when username / env changes (client only)
  useEffect(() => {
    const ok = isSecureContext() && isWebNfcSupported();
    setSupported(ok);
    setSupportMessage(getWebNfcSupportMessage());

    try {
      const url = buildNfcProfileUrl(username, { siteUrl });
      setProfileUrl(url);
      setStatus(ok ? "ready" : "unsupported");
    } catch (err) {
      setProfileUrl(null);
      setStatus("failed");
      setError({
        code: "unknown",
        message: err instanceof Error ? err.message : "Could not build profile URL",
      });
    }
  }, [username, siteUrl]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus((prev) =>
      prev === "scanning" || prev === "writing" || prev === "verifying"
        ? "cancelled"
        : prev,
    );
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setResult(null);
    setError(null);
    const ok = isSecureContext() && isWebNfcSupported();
    setSupported(ok);
    setSupportMessage(getWebNfcSupportMessage());
    setStatus(ok ? "ready" : "unsupported");
    try {
      setProfileUrl(buildNfcProfileUrl(username, { siteUrl }));
    } catch {
      setProfileUrl(null);
    }
  }, [username, siteUrl]);

  const startWrite = useCallback(async (): Promise<NfcWriteVerifyResult | null> => {
    setError(null);
    setResult(null);

    if (!isSecureContext() || !isWebNfcSupported()) {
      setStatus("unsupported");
      setError({
        code: "unsupported",
        message: getWebNfcSupportMessage(),
      });
      return null;
    }

    let url: string;
    try {
      url = buildNfcProfileUrl(username, { siteUrl });
      setProfileUrl(url);
    } catch (err) {
      setStatus("failed");
      setError({
        code: "unknown",
        message: err instanceof Error ? err.message : "Invalid profile URL",
      });
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("scanning");

    try {
      const writeResult = await writeAndVerifyNfcUrl(url, {
        signal: controller.signal,
        onPhase: (phase) => {
          if (!controller.signal.aborted) setStatus(phase);
        },
      });

      if (controller.signal.aborted) {
        setStatus("cancelled");
        return null;
      }

      setStatus("verifying");
      // Verification already completed inside writeAndVerifyNfcUrl
      setResult(writeResult);
      setStatus("success");
      return writeResult;
    } catch (err) {
      if (controller.signal.aborted || (err instanceof NfcError && err.code === "aborted")) {
        setStatus("cancelled");
        setError({ code: "aborted", message: "NFC write cancelled." });
        return null;
      }

      const nfcErr =
        err instanceof NfcError
          ? err
          : new NfcError("write_failed", err instanceof Error ? err.message : "Write failed");

      setError({ code: nfcErr.code, message: nfcErr.message });
      setStatus("failed");
      return null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [username, siteUrl]);

  return {
    status,
    supported,
    supportMessage,
    profileUrl,
    result,
    error,
    startWrite,
    cancel,
    reset,
  };
}
