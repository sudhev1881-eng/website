"use client";

import * as React from "react";
import type { PublicProfile } from "@/lib/api";
import {
  deriveHighlights,
  deriveRecruiterInsights,
  deriveScores,
  deriveSkillInsights,
  deriveTechCloud,
  groupSkillsByCategory,
  resolveEducation,
  resolveTitle,
} from "./derive";

export function usePublicProfileDerived(profile: PublicProfile) {
  return React.useMemo(() => {
    const title = resolveTitle(profile);
    const highlights = deriveHighlights(profile);
    const skillGroups = groupSkillsByCategory(profile);
    const skillInsights = deriveSkillInsights(profile);
    const techCloud = deriveTechCloud(profile);
    const scores = deriveScores(profile);
    const insights = deriveRecruiterInsights(profile);
    const education = resolveEducation(profile);
    return {
      title,
      highlights,
      skillGroups,
      skillInsights,
      techCloud,
      scores,
      insights,
      education,
    };
  }, [profile]);
}
