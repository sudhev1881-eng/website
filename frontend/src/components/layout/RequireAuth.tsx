"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getToken } from "@/lib/auth-token";
import { Spinner } from "@/components/ui/spinner";

interface RequireAuthProps {
  children: React.ReactNode;
  role?: "student" | "admin";
}

export function RequireAuth({ children, role }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const token = getToken();
    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (role && user.role !== role) {
      router.replace(user.role === "admin" ? "/admin" : "/student");
    }
  }, [loading, user, role, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || (role && user.role !== role)) return null;

  return <>{children}</>;
}
