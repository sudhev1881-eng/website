"use client";

import { motion } from "framer-motion";
import type { PublicProfile } from "@/lib/api";
import { useSafeMotion } from "@/lib/motion";
import { SectionHeading } from "./shared";

/** Quieter secondary details — lower visual weight than core recruiter sections. */
export function SecondaryDetails({ profile }: { profile: PublicProfile }) {
  const motionSafe = useSafeMotion();
  const languages = profile.languages ?? [];
  const interests = profile.interests ?? [];
  const volunteer = profile.volunteer ?? [];

  if (languages.length === 0 && interests.length === 0 && volunteer.length === 0) {
    return null;
  }

  return (
    <motion.section
      aria-labelledby="secondary-heading"
      className="opacity-80"
      variants={motionSafe.fadeIn}
    >
      <SectionHeading
        id="secondary-heading"
        title="Additional"
        description="Languages, interests, and volunteer work."
        className="mb-4"
      />
      <div className="space-y-5 text-sm text-muted-foreground">
        {languages.length > 0 ? (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              Languages
            </h3>
            <p className="mt-1.5">
              {languages
                .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
                .join(" · ")}
            </p>
          </div>
        ) : null}
        {interests.length > 0 ? (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              Interests
            </h3>
            <p className="mt-1.5">{interests.join(" · ")}</p>
          </div>
        ) : null}
        {volunteer.length > 0 ? (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              Volunteer
            </h3>
            <ul className="mt-1.5 space-y-2">
              {volunteer.map((v, i) => (
                <li key={`${v.organization}-${i}`}>
                  <span className="text-foreground/80">
                    {[v.role, v.organization].filter(Boolean).join(" · ")}
                  </span>
                  {v.period ? <span className="text-muted-foreground"> · {v.period}</span> : null}
                  {v.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed">{v.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}
