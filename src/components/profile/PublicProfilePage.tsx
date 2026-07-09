"use client";

import * as React from "react";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { Spinner } from "@/components/ui/spinner";
import { api, type PublicProfile } from "@/lib/api";

export function PublicProfilePage({
  slug,
  source,
}: {
  slug: string;
  source?: string;
}) {
  const [profile, setProfile] = React.useState<PublicProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    api.profiles
      .get(slug, source === "nfc" ? { src: "nfc" } : undefined)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, source]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="text-muted-foreground">This student profile does not exist or is not public.</p>
      </div>
    );
  }

  return <PublicProfileView profile={profile} slug={slug} />;
}
