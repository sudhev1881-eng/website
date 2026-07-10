"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  onSuccess?: () => void | Promise<void>;
  disabled?: boolean;
}

export function GoogleSignInButton({ onSuccess, disabled }: GoogleSignInButtonProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-left text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Supabase Auth not configured</p>
        <p>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{" "}
          <code>.env.local</code> (Vercel env in production).
        </p>
      </div>
    );
  }

  const handleGoogle = async () => {
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      });
      if (error) throw error;
      await onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled}
      onClick={handleGoogle}
    >
      Continue with Google
    </Button>
  );
}
