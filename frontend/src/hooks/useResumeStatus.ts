"use client";

import * as React from "react";
import { api, type ResumeStatusDetail } from "@/lib/api";

const TERMINAL = new Set(["completed", "failed", "skipped", "none"]);

/**
 * Poll resume processing status until terminal (or max attempts).
 * No react-query in this project — uses useEffect + setInterval.
 */
export function useResumeStatus(
  resumeId: string | null | undefined,
  options?: { enabled?: boolean; intervalMs?: number },
) {
  const enabled = options?.enabled !== false && Boolean(resumeId);
  const intervalMs = options?.intervalMs ?? 2000;

  const [status, setStatus] = React.useState<ResumeStatusDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      try {
        setLoading(true);
        const detail = await fetchOnce();
        if (cancelled || !detail) return;
        if (TERMINAL.has(detail.processingStatus)) {
          if (timer) clearInterval(timer);
          timer = null;
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
      if (timer) clearInterval(timer);
    };
  }, [enabled, resumeId, intervalMs, fetchOnce]);

  const isProcessing =
    status?.processingStatus === "pending" || status?.processingStatus === "processing";

  return { status, loading, error, isProcessing, refresh: fetchOnce };
}
