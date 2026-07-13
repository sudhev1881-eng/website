"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { NameClaimDialog } from "@/components/auth/NameClaimDialog";
import { toast } from "@/components/ui/toast";
import { StudentLinkLogo } from "@/components/brand/StudentLinkLogo";
import {
  PROFILE_NOT_REGISTERED_MESSAGE,
  SUPPORT_EMAIL,
  friendlyAuthError,
} from "@/lib/auth-messages";

type Phase = "loading" | "claim" | "redirecting" | "error";

export default function AuthContinuePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { applySession } = useAuth();
  const ran = useRef(false);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const preset = searchParams.get("error");
    if (preset) {
      setPhase("error");
      setError(friendlyAuthError(preset));
      return;
    }

    async function finish() {
      try {
        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const sessionEmail = data.session?.user?.email ?? "";

        if (sessionError || !token) {
          setPhase("error");
          setError(friendlyAuthError("signin_incomplete"));
          return;
        }

        setEmail(sessionEmail);
        setAccessToken(token);

        const res = await api.auth.supabaseSync(token);

        if (res.needsClaim) {
          setPhase("claim");
          return;
        }

        if (!res.token || !res.user) {
          setPhase("error");
          setError(friendlyAuthError("signin_incomplete"));
          return;
        }

        applySession(res.token, res.user);
        setPhase("redirecting");
        router.replace(res.user.role === "admin" ? "/admin" : "/student");
      } catch (err) {
        setPhase("error");
        setError(
          friendlyAuthError(
            err instanceof Error ? err.message : "Authentication failed",
          ),
        );
      }
    }

    void finish();
  }, [applySession, router, searchParams]);

  const handleClaim = async (firstName: string, lastName: string) => {
    if (!accessToken) {
      toast.error(friendlyAuthError("signin_incomplete"));
      router.replace("/login");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.auth.supabaseClaim(
        { firstName, lastName },
        accessToken,
      );
      if (!res.token || !res.user) {
        throw new Error("Claim incomplete");
      }
      applySession(res.token, res.user);
      toast.success(`Welcome, ${res.matchedName ?? "student"}!`);
      setPhase("redirecting");
      router.replace("/student");
    } catch (err) {
      const raw =
        err instanceof ApiError
          ? err.message
          : "No matching student record found";
      const message = friendlyAuthError(raw);
      toast.error(message);
      if (message === PROFILE_NOT_REGISTERED_MESSAGE) {
        setPhase("error");
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "claim") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="mb-8">
          <StudentLinkLogo />
        </div>
        <NameClaimDialog
          open
          email={email}
          onSubmit={handleClaim}
          onCancel={() => router.replace("/login")}
          submitting={submitting}
        />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <StudentLinkLogo />
        <h1 className="mt-6 text-lg font-semibold text-foreground">
          We couldn&apos;t finish signing you in
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">{error}</p>
        <p className="max-w-md text-xs text-muted-foreground">
          If your school already enrolled you, email{" "}
          <a
            className="font-medium text-primary underline-offset-2 hover:underline"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <Button href="/login" variant="primary">
          Back to login
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground">
        {phase === "redirecting"
          ? "Taking you in…"
          : "Setting up your account…"}
      </p>
      <Link
        href="/login"
        className="mt-4 text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        Cancel
      </Link>
    </div>
  );
}
