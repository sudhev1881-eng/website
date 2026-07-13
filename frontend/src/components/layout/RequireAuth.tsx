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

/**
 * Gate protected pages. Relies on AuthProvider for the single /me fetch —
 * no second recovery round-trip (that was doubling login latency).
 */
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || (role && user.role !== role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
