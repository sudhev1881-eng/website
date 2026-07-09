import { PublicProfilePage } from "@/components/profile/PublicProfilePage";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  return <PublicProfilePage slug={slug} />;
}
