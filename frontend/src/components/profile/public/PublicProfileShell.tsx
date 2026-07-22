"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import type { PublicProfile } from "@/lib/api";
import { useSafeMotion } from "@/lib/motion";
import { usePublicProfileDerived } from "./usePublicProfileDerived";
import { PublicProfileCover, PublicProfileHero } from "./PublicProfileHero";
import { AiSummaryCard } from "./AiSummaryCard";
import { HighlightsRow } from "./HighlightsRow";
import { SkillsMatrix } from "./SkillsMatrix";
import { AiSkillInsights } from "./AiSkillInsights";
import { ExperienceTimeline } from "./ExperienceTimeline";
import { CertificationGrid } from "./CertificationGrid";
import { EducationTimeline } from "./EducationTimeline";
import { TechCloud } from "./TechCloud";
import { RecruiterSidebar } from "./RecruiterSidebar";
import { InsightCards } from "./InsightCards";
import { SecondaryDetails } from "./SecondaryDetails";

const ProjectShowcaseLazy = dynamic(
  () => import("./ProjectShowcase").then((m) => m.ProjectShowcase),
  {
    loading: () => (
      <div className="grid gap-5 sm:grid-cols-2" aria-busy="true" aria-label="Loading projects">
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      </div>
    ),
  },
);

interface PublicProfileShellProps {
  profile: PublicProfile;
  slug: string;
}

export function PublicProfileShell({ profile, slug }: PublicProfileShellProps) {
  const motionSafe = useSafeMotion();
  const derived = usePublicProfileDerived(profile);

  return (
    <div className="public-profile min-h-screen bg-background text-foreground">
      <PublicProfileCover coverImage={profile.coverImage} />

      <motion.div
        className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 pb-16 sm:-mt-12 sm:px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={motionSafe.stagger}
      >
        <a
          href="#profile-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:shadow-card"
        >
          Skip to profile content
        </a>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start xl:grid-cols-[minmax(0,1fr)_300px]">
          <div id="profile-main" className="min-w-0 space-y-12 sm:space-y-14">
            <PublicProfileHero profile={profile} slug={slug} title={derived.title} />
            <AiSummaryCard profile={profile} />
            <HighlightsRow highlights={derived.highlights} />
            <SkillsMatrix groups={derived.skillGroups} />
            <AiSkillInsights insights={derived.skillInsights} />
            <ExperienceTimeline experience={profile.experience} />
            {profile.projects.length > 0 ? (
              <ProjectShowcaseLazy projects={profile.projects} />
            ) : null}
            <CertificationGrid certificates={profile.certificates} />
            <EducationTimeline
              education={derived.education}
              graduationYear={profile.graduationYear}
            />
            <TechCloud items={derived.techCloud} />
            <InsightCards insights={derived.insights} />
            <SecondaryDetails profile={profile} />
          </div>

          <div className="hidden lg:block">
            <RecruiterSidebar profile={profile} slug={slug} scores={derived.scores} />
          </div>
        </div>

        {/* Mobile quick actions — compact strip */}
        <div className="mt-10 lg:hidden">
          <RecruiterSidebar profile={profile} slug={slug} scores={derived.scores} />
        </div>

        <motion.footer
          variants={motionSafe.fadeIn}
          className="mt-14 border-t border-border pt-6 text-center"
        >
          <Link href="/" className="text-xs text-muted-foreground transition-colors hover:text-primary">
            Powered by <span className="font-semibold text-foreground/80">StudentLink</span>
          </Link>
        </motion.footer>
      </motion.div>
    </div>
  );
}
