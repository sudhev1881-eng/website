import { PublicProfilePage } from "@/components/profile/PublicProfilePage";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string }>;
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { slug } = await params;
  const { src } = await searchParams;
  return <PublicProfilePage slug={slug} source={src} />;
}
