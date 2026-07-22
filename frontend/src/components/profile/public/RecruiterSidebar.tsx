"use client";

import { Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { api, fileUrl, type PublicProfile } from "@/lib/api";
import {
  formatRelativeUpdated,
  resolveAvailability,
  topSkills,
  type ProfileScores,
} from "./derive";
import { cn } from "@/lib/utils";

interface RecruiterSidebarProps {
  profile: PublicProfile;
  slug: string;
  scores: ProfileScores;
  className?: string;
}

export function RecruiterSidebar({ profile, slug, scores, className }: RecruiterSidebarProps) {
  const skills = topSkills(profile, 5);
  const availability = resolveAvailability(profile);
  const updated = formatRelativeUpdated(profile.updatedAt);
  const contactHref = profile.linkedin || profile.portfolio || profile.github || undefined;

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

  return (
    <aside
      className={cn(
        "rounded-2xl border border-border/70 bg-background/90 p-5 shadow-card backdrop-blur-md",
        "lg:sticky lg:top-6",
        className,
      )}
      aria-label="Recruiter quick view"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Quick View
      </p>

      <div className="mt-4">
        <div className="flex items-end justify-between gap-2">
          <span className="text-sm text-muted-foreground">Profile score</span>
          <span className="font-[family-name:var(--font-profile-display)] text-3xl font-semibold tracking-tight text-foreground">
            {scores.overall}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${scores.overall}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {scores.source === "ai" ? "AI score" : "Heuristic score"} · tech {scores.technical} · exp{" "}
          {scores.experience} · projects {scores.projects}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={handleResumeDownload} disabled={!profile.resume} className="w-full">
          <Download className="h-4 w-4" aria-hidden="true" />
          Download Resume
        </Button>
        {contactHref ? (
          <Button variant="outline" href={contactHref} className="w-full">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Contact
          </Button>
        ) : null}
      </div>

      {skills.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top skills
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <li key={skill}>
                <Badge variant="outline" className="rounded-md font-normal">
                  {skill}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {availability.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Availability
          </h3>
          <ul className="mt-2 space-y-1.5">
            {availability.map((item) => (
              <li key={item.key} className="text-sm text-foreground">
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Projects</dt>
          <dd className="mt-1 text-lg font-semibold">{profile.projects.length}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Skills</dt>
          <dd className="mt-1 text-lg font-semibold">{profile.skills.length}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Certs</dt>
          <dd className="mt-1 text-lg font-semibold">{profile.certificates.length}</dd>
        </div>
      </dl>

      {updated ? (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">{updated}</p>
      ) : null}
    </aside>
  );
}
