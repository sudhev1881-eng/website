"use client";

import * as React from "react";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, type PublicProfile } from "@/lib/api";
import { SetupError, DB_SETUP_STEPS } from "@/components/layout/SetupError";

export function PublicProfilePage({
  slug,
  source,
}: {
  slug: string;
  source?: string;
}) {
  const [profile, setProfile] = React.useState<PublicProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.profiles
      .get(slug, source === "nfc" ? { src: "nfc" } : undefined)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [slug, source]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    const isServerError = error.includes("500") || error.includes("Failed to fetch");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        {isServerError ? (
          <SetupError title="Profile could not load" steps={DB_SETUP_STEPS} />
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Profile not found</h1>
            <p className="mt-2 text-muted-foreground">
              This student profile does not exist or is not public.
            </p>
          </div>
        )}
        {!isServerError ? null : (
          <p className="text-center text-sm text-error">{error}</p>
        )}
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return <PublicProfileView profile={profile} slug={slug} />;
}
