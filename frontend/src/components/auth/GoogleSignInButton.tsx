"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  disabled?: boolean;
}

export function GoogleSignInButton({ disabled }: GoogleSignInButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="space-y-2 rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-left text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Supabase Auth not configured</p>
        <p>
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
        </p>
      </div>
    );
  }

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
      // Browser navigates away; keep loading state if redirect is slow
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled || loading}
      loading={loading}
      onClick={handleGoogle}
    >
      Continue with Google
    </Button>
  );
}
