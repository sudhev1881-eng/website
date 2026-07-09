import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { getPublicProfile, getAllProfileUsernames } from "@/data/mock-profile";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllProfileUsernames().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = getPublicProfile(slug);
  if (!profile) return { title: "Profile Not Found" };

  return {
    title: `${profile.name} — ${profile.title} | StudentLink`,
    description: profile.bio,
    openGraph: {
      title: `${profile.name} — ${profile.title}`,
      description: profile.bio,
      type: "profile",
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  const profile = getPublicProfile(slug);

  if (!profile) notFound();

  return <PublicProfileView profile={profile} />;
}
