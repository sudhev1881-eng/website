"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentLinkLogo } from "@/components/brand/StudentLinkLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { ApiError, api } from "@/lib/api";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { NameClaimDialog } from "@/components/auth/NameClaimDialog";
import { friendlyAuthError } from "@/lib/auth-messages";
import { UniversitySelect } from "@/components/ui/university-select";

export function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, applySession } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [authTab, setAuthTab] = React.useState("login");
  const [registerUniversity, setRegisterUniversity] = React.useState("");
  const claimFromUrl = searchParams.get("claim") === "1";
  const [claimDismissed, setClaimDismissed] = React.useState(false);
  const [claimEmail, setClaimEmail] = React.useState("");
  const claimOpen = claimFromUrl && !claimDismissed;

  React.useEffect(() => {
    if (!claimFromUrl) return;
    let cancelled = false;
    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setClaimEmail(data.session?.user?.email ?? "");
        }
      } catch {
        /* ignore — dialog still works without email label */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [claimFromUrl]);

  const handleClaim = async (firstName: string, lastName: string) => {
    setSubmitting(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        toast.error("Session expired. Sign in with Google again.");
        router.replace("/login");
        return;
      }

      const res = await api.auth.supabaseClaim(
        { firstName, lastName },
        accessToken,
      );
      if (!res.token || !res.user) {
        throw new Error("Claim incomplete");
      }
      applySession(res.token, res.user);
      setClaimDismissed(true);
      toast.success(`Welcome, ${res.matchedName ?? "student"}!`);
      router.replace("/student");
    } catch (err) {
      toast.error(
        friendlyAuthError(
          err instanceof ApiError ? err.message : "Name did not match our records",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    setSubmitting(true);
    try {
      const res = await login(email, password);
      toast.success("Welcome back!");
      router.replace(res.user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!registerUniversity) {
      toast.error("Please select your university");
      return;
    }
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const res = await register({
        name: form.get("name") as string,
        email: form.get("email") as string,
        password: form.get("password") as string,
        university: registerUniversity,
      });
      toast.success(
        res.message ||
          "Registration submitted. Wait for an admin to approve your account.",
      );
      setAuthTab("login");
      setRegisterUniversity("");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Registration failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-1/2 bg-gradient-to-br from-primary via-secondary to-accent p-12 lg:flex lg:flex-col lg:justify-between">
        <StudentLinkLogo />
        <div>
          <h2 className="text-3xl font-bold text-white">
            Build your digital identity
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            NFC-powered student profiles that connect you with recruiters.
          </p>
          <ul className="mt-8 space-y-3 text-white/90">
            {[
              "Digital profile & portfolio",
              "NFC card integration",
              "Real-time analytics",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} StudentLink
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-background px-4 py-12 text-foreground lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <Link href="/">
            <StudentLinkLogo />
          </Link>
        </div>

        <div className="w-full max-w-md">
          <Card className="border-border bg-background shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-foreground">
                Welcome to StudentLink
              </CardTitle>
              <CardDescription>
                Sign in with Google (students) or email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={authTab} onValueChange={setAuthTab}>
                <TabsList className="mb-6 w-full">
                  <TabsTrigger value="login" className="flex-1">
                    Log In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex-1">
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <div className="space-y-4">
                    <GoogleSignInButton disabled={submitting} />
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          or email
                        </span>
                      </div>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <Input
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="you@university.edu"
                        autoComplete="email"
                        required
                      />
                      <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        loading={submitting}
                      >
                        Sign In
                      </Button>
                    </form>
                  </div>
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Students: Google → enter name in CAPS to claim your NFC
                    profile.
                  </p>
                </TabsContent>

                <TabsContent value="register" className="mt-0">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <p className="rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs text-muted-foreground">
                      After you register, an admin must approve your account before you can sign in.
                    </p>
                    <Input
                      label="Full Name"
                      name="name"
                      placeholder="Alex Morgan"
                      required
                    />
                    <Input
                      label="Email"
                      name="email"
                      type="email"
                      placeholder="you@university.edu"
                      required
                    />
                    <UniversitySelect
                      value={registerUniversity}
                      onValueChange={setRegisterUniversity}
                      required
                    />
                    <Input
                      label="Password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      loading={submitting}
                      disabled={!registerUniversity}
                    >
                      Request Access
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Admin? Use email login, then open{" "}
                  <Link
                    href="/admin"
                    className="font-medium text-primary hover:underline"
                  >
                    Admin Dashboard
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <NameClaimDialog
          open={claimOpen}
          email={claimEmail}
          onSubmit={handleClaim}
          onCancel={() => {
            setClaimDismissed(true);
            router.replace("/login");
          }}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
