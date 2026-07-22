"use client";

import * as React from "react";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, type PublicProfile } from "@/lib/api";
import {
  SetupError,
  LoadError,
  DB_SETUP_STEPS,
  shouldShowLocalDbSetup,
} from "@/components/layout/SetupError";

export function PublicProfilePage({
  slug,
  source,
}: {
  slug: string;
  source?: string;
}) {
  const [profile, setProfile] = React.useState<PublicProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<{ message: string; status: number | null } | null>(
    null,
  );

  React.useEffect(() => {
    api.profiles
      .get(slug, source === "nfc" ? { src: "nfc" } : undefined)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else if (err instanceof TypeError) {
          // Browser network / CORS / wrong API host → "Failed to fetch"
          setError({ message: err.message || "Failed to reach API", status: null });
        } else {
          setError({
            message: err instanceof Error ? err.message : "Failed to load profile",
            status: null,
          });
        }
      })
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
    const isNotFound = error.status === 404;
    const showDbSetup = shouldShowLocalDbSetup(error.status);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        {isNotFound ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Profile not found</h1>
            <p className="mt-2 text-muted-foreground">
              This student profile does not exist or is not public.
            </p>
          </div>
        ) : showDbSetup ? (
          <SetupError title="Profile could not load" steps={DB_SETUP_STEPS} />
        ) : (
          <LoadError
            title="Profile could not load"
            message="Something went wrong loading this profile. Please try again in a moment."
            detail={error.message}
          />
        )}
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return <PublicProfileView profile={profile} slug={slug} />;
}
