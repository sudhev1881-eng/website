"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
} from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

interface WindowsHelloButtonProps {
  disabled?: boolean;
}

export function WindowsHelloButton({ disabled }: WindowsHelloButtonProps) {
  const router = useRouter();
  const { applySession } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [supported, setSupported] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!browserSupportsWebAuthn()) {
          if (!cancelled) setSupported(false);
          return;
        }
        const platform = await platformAuthenticatorIsAvailable();
        if (!cancelled) setSupported(platform);
      } catch {
        if (!cancelled) setSupported(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (supported === false) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-xs text-muted-foreground">
        Windows Hello isn&apos;t available in this browser. Use Chrome or Edge on
        Windows with Hello set up, or enable it later in Settings after signing in.
      </p>
    );
  }

  const handleHello = async () => {
    setLoading(true);
    try {
      const options = (await api.auth.webauthn.loginOptions()) as unknown as PublicKeyCredentialRequestOptionsJSON;
      const assertion = await startAuthentication({ optionsJSON: options });
      const res = await api.auth.webauthn.loginVerify(assertion);
      applySession(res.token, res.user);
      toast.success("Welcome back!");
      router.replace(res.user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Windows Hello sign-in failed";
      if (!/abort|cancel/i.test(message)) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled || loading || supported === null}
      loading={loading}
      onClick={handleHello}
    >
      <Fingerprint className="h-4 w-4" />
      Windows Hello
    </Button>
  );
}
