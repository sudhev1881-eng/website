"use client";

import * as React from "react";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startRegistration,
} from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { Fingerprint, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { api, ApiError, type WebAuthnCredentialInfo } from "@/lib/api";

export function WindowsHelloSettings() {
  const [credentials, setCredentials] = React.useState<WebAuthnCredentialInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [enrolling, setEnrolling] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [supported, setSupported] = React.useState<boolean | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    api.auth.webauthn
      .credentials()
      .then(setCredentials)
      .catch(() => setCredentials([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

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

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const options = (await api.auth.webauthn.registerOptions()) as unknown as PublicKeyCredentialCreationOptionsJSON;
      const attestation = await startRegistration({ optionsJSON: options });
      const created = await api.auth.webauthn.registerVerify(
        attestation,
        "Windows Hello",
      );
      setCredentials((prev) => [created, ...prev]);
      toast.success("Windows Hello enabled for this device");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to enable Windows Hello";
      if (!/abort|cancel/i.test(message)) {
        toast.error(message);
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await api.auth.webauthn.removeCredential(id);
      setCredentials((prev) => prev.filter((c) => c.id !== id));
      toast.success("Passkey removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove passkey");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Windows Hello
        </CardTitle>
        <CardDescription>
          Sign in with face, fingerprint, or PIN on this device. Enable after you already have an
          approved account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supported === false ? (
          <p className="text-sm text-muted-foreground">
            This browser or device doesn&apos;t support platform passkeys. Use Chrome or Edge on
            Windows with Windows Hello set up.
          </p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No passkeys enrolled yet.</p>
        ) : (
          <ul className="space-y-2">
            {credentials.map((cred) => (
              <li
                key={cred.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{cred.label}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(cred.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{cred.deviceType}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={removingId === cred.id}
                    onClick={() => handleRemove(cred.id)}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4 text-error" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button
          onClick={handleEnroll}
          disabled={enrolling || supported === false}
          loading={enrolling}
        >
          {credentials.length ? "Add this device" : "Enable Windows Hello"}
        </Button>
      </CardContent>
    </Card>
  );
}
