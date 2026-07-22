"use client";

import * as React from "react";
import {
  Download,
  Mail,
  Link2,
  Code2,
  Globe,
  MapPin,
  GraduationCap,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { api, fileUrl, type PublicProfile } from "@/lib/api";
import { useSafeMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { resolveAvailability, resolveTitle } from "./derive";

interface PublicProfileHeroProps {
  profile: PublicProfile;
  slug: string;
  title?: string;
}

function ProfilePhoto({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = React.useState(false);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!src || failed) {
    return (
      <div
        className="flex h-36 w-36 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-surface to-primary/5 text-3xl font-semibold tracking-tight text-primary sm:h-44 sm:w-44 sm:text-4xl"
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="relative h-36 w-36 overflow-hidden rounded-2xl bg-surface shadow-[0_0_0_1px_rgba(15,23,42,0.06)] sm:h-44 sm:w-44">
      {/* eslint-disable-next-line @next/next/no-img-element -- API host may be outside next/image remotePatterns */}
      <img
        src={src}
        alt={`Portrait of ${name}`}
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function PublicProfileHero({ profile, slug, title }: PublicProfileHeroProps) {
  const motionSafe = useSafeMotion();
  const displayTitle = title ?? resolveTitle(profile);
  const availability = resolveAvailability(profile);
  const avatarSrc = fileUrl(profile.avatar);

  const handleResumeDownload = async () => {
    try {
      const { downloadUrl } = await api.profiles.resumeDownload(slug);
      const url = fileUrl(downloadUrl);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("Resume not available");
    } catch {
      toast.error("Resume download failed");
    }
  };

  const contactHref = profile.linkedin || profile.portfolio || profile.github || undefined;

  return (
    <motion.section
      aria-labelledby="profile-name"
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface/60 p-6 sm:p-8"
      variants={motionSafe.fadeIn}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 0% 0%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, color-mix(in srgb, var(--color-primary) 6%, transparent), transparent 50%)",
        }}
      />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <ProfilePhoto name={profile.name} src={avatarSrc} />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            StudentLink Profile
          </p>
          <h1
            id="profile-name"
            className="mt-2 font-[family-name:var(--font-profile-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
          >
            {profile.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-primary sm:text-xl">{displayTitle}</p>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {profile.location ? (
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{profile.location}</span>
              </li>
            ) : null}
            {profile.university ? (
              <li className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{profile.university}</span>
              </li>
            ) : null}
            {profile.graduationYear ? (
              <li className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Class of {profile.graduationYear}</span>
              </li>
            ) : null}
          </ul>

          {(availability.length > 0 || profile.visaStatus) && (
            <div className="mt-4 flex flex-wrap gap-2" aria-label="Availability">
              {availability.map((item) => (
                <Badge key={item.key} variant="success" className="rounded-md px-2.5 py-1">
                  {item.label}
                </Badge>
              ))}
              {profile.visaStatus ? (
                <Badge variant="outline" className="rounded-md px-2.5 py-1">
                  Visa: {profile.visaStatus}
                </Badge>
              ) : null}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              size="lg"
              className="sm:min-w-[11rem]"
              onClick={handleResumeDownload}
              disabled={!profile.resume}
              aria-label="Download resume"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Resume
            </Button>
            {contactHref ? (
              <Button
                size="lg"
                variant="outline"
                href={contactHref}
                aria-label="Contact via LinkedIn or portfolio"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Contact
              </Button>
            ) : null}
            {profile.linkedin ? (
              <Button size="lg" variant="ghost" href={profile.linkedin} aria-label="LinkedIn profile">
                <Link2 className="h-4 w-4" aria-hidden="true" />
                LinkedIn
              </Button>
            ) : null}
            {profile.github ? (
              <Button size="lg" variant="ghost" href={profile.github} aria-label="GitHub profile">
                <Code2 className="h-4 w-4" aria-hidden="true" />
                GitHub
              </Button>
            ) : null}
            {profile.portfolio ? (
              <Button size="lg" variant="ghost" href={profile.portfolio} aria-label="Portfolio website">
                <Globe className="h-4 w-4" aria-hidden="true" />
                Portfolio
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

export function PublicProfileCover({ coverImage }: { coverImage: string | null }) {
  const src = fileUrl(coverImage);
  return (
    <div
      className={cn(
        "relative h-28 w-full overflow-hidden sm:h-36",
        !src && "bg-[linear-gradient(135deg,#0b1220_0%,#1e293b_45%,#2563eb_160%)]",
      )}
      aria-hidden="true"
    >
      {src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-background" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.35),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(148,163,184,0.15),transparent_40%)]" />
      )}
    </div>
  );
}
