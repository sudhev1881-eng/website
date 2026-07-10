"use client";

import * as React from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { toast } from "@/components/ui/toast";

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void | Promise<void>;
  disabled?: boolean;
}

export function GoogleSignInButton({ onCredential, disabled }: GoogleSignInButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-left text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Google Sign-In not configured</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Add your Client ID to <code>.env.local</code>:{" "}
            <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID=….apps.googleusercontent.com</code>
          </li>
          <li>
            Add the same ID to <code>server/.env</code>: <code>GOOGLE_CLIENT_ID=…</code>
          </li>
          <li>Restart <code>npm run dev</code> and <code>cd server && npm run dev</code></li>
        </ol>
        <p>
          In Google Cloud → Credentials → your OAuth client → Authorized JavaScript origins:{" "}
          <code>http://localhost:3000</code>
        </p>
      </div>
    );
  }

  const handleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      toast.error("Google sign-in did not return a credential");
      return;
    }
    await onCredential(response.credential);
  };

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : ""}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => toast.error("Google sign-in failed")}
        theme="outline"
        size="large"
        width="100%"
        text="continue_with"
        shape="rectangular"
      />
    </div>
  );
}
