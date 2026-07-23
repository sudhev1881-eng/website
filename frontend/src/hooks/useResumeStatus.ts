"use client";

import * as React from "react";
import { api, type ResumeStatusDetail } from "@/lib/api";

const TERMINAL = new Set([
  "completed",
  "confirmed",
  "failed",
  "skipped",
  "none",
  "rejected",
  "awaiting_confirmation",
]);

const PROCESSING = new Set([
  "pending",
  "processing",
  "extracting",
  "enhancing",
  "validating",
  "embedding",
]);

/** Stop polling after this long so the UI never spins forever on a stuck job. */
const DEFAULT_MAX_POLL_MS = 90_000;

/**
 * Poll resume processing status until terminal (or max duration).
 * No react-query in this project — uses useEffect + setInterval.
 */
export function useResumeStatus(
  resumeId: string | null | undefined,
  options?: { enabled?: boolean; intervalMs?: number; maxPollMs?: number },
) {
  const enabled = options?.enabled !== false && Boolean(resumeId);
  const intervalMs = options?.intervalMs ?? 2000;
  const maxPollMs = options?.maxPollMs ?? DEFAULT_MAX_POLL_MS;

  const [status, setStatus] = React.useState<ResumeStatusDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stalled, setStalled] = React.useState(false);

  const fetchOnce = React.useCallback(async () => {
    if (!resumeId) return null;
    const detail = await api.students.resumeStatus(resumeId);
    setStatus(detail);
    setError(null);
    return detail;
  }, [resumeId]);

  React.useEffect(() => {
    if (!enabled || !resumeId) {
      setStatus(null);
      setStalled(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const startedAt = Date.now();
    setStalled(false);

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const tick = async () => {
      try {
        setLoading(true);
        const detail = await fetchOnce();
        if (cancelled || !detail) return;
        if (TERMINAL.has(detail.processingStatus)) {
          stop();
          return;
        }
        if (Date.now() - startedAt >= maxPollMs) {
          stop();
          setStalled(true);
          setError(
            "Resume is taking longer than expected. Refresh in a moment, or try uploading again.",
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load resume status");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void tick();
    timer = setInterval(() => void tick(), intervalMs);

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, resumeId, intervalMs, maxPollMs, fetchOnce]);

  const isProcessing = status ? PROCESSING.has(status.processingStatus) : false;
  const awaitsConfirmation = status?.processingStatus === "awaiting_confirmation";
  const isConfirmed =
    status?.processingStatus === "confirmed" || status?.processingStatus === "completed";

  return {
    status,
    loading,
    error,
    stalled,
    isProcessing: isProcessing && !stalled,
    awaitsConfirmation,
    isConfirmed,
    refresh: fetchOnce,
  };
}
