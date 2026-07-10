"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth-token";
import { Spinner } from "@/components/ui/spinner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finish() {
      try {
        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session?.access_token) {
          setError("Sign-in session expired. Try again.");
          return;
        }

        const res = await api.auth.supabaseSync(data.session.access_token);
        setToken(res.token);

        if (res.needsClaim) {
          router.replace("/login?claim=1");
          return;
        }

        router.replace(res.user.role === "admin" ? "/admin" : "/student");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    void finish();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}
