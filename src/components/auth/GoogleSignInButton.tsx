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
      <p className="rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-center text-xs text-muted-foreground">
        Google Sign-In: set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in <code>.env.local</code>
      </p>
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
