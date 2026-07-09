"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { StudentLinkLogo } from "@/components/brand/StudentLinkLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth-provider";
import { ApiError } from "@/lib/api";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { NameClaimDialog } from "@/components/auth/NameClaimDialog";
import { fadeInVariants } from "@/lib/motion";

export function AuthPage() {
  const router = useRouter();
  const { login, register, googleSignIn, googleClaim } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [claimOpen, setClaimOpen] = React.useState(false);
  const [claimToken, setClaimToken] = React.useState<string | null>(null);
  const [claimEmail, setClaimEmail] = React.useState("");

  const handleGoogle = async (credential: string) => {
    setSubmitting(true);
    try {
      const res = await googleSignIn(credential);
      if (res.needsClaim && res.claimToken) {
        setClaimToken(res.claimToken);
        setClaimEmail(res.email ?? "");
        setClaimOpen(true);
        return;
      }
      toast.success("Signed in with Google");
      router.push("/student");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Google sign-in failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaim = async (firstName: string, lastName: string) => {
    if (!claimToken) return;
    setSubmitting(true);
    try {
      const res = await googleClaim({ claimToken, firstName, lastName });
      setClaimOpen(false);
      toast.success(`Welcome, ${res.matchedName ?? "student"}!`);
      router.push("/student");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Name did not match our records");
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
      router.push(res.user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      await register({
        name: form.get("name") as string,
        email: form.get("email") as string,
        password: form.get("password") as string,
        university: form.get("university") as string,
      });
      toast.success("Account created successfully!");
      router.push("/student");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-primary via-secondary to-accent p-12 lg:flex lg:flex-col lg:justify-between">
        <StudentLinkLogo />
        <motion.div initial="hidden" animate="visible" variants={fadeInVariants}>
          <h2 className="text-3xl font-bold text-white">Build your digital identity</h2>
          <p className="mt-4 max-w-md text-white/80">
            Join thousands of students connecting with recruiters through NFC-powered digital profiles.
          </p>
          <div className="mt-8 space-y-4">
            {["Digital profile & portfolio", "NFC card integration", "Real-time analytics"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-white/90">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>
                {item}
              </div>
            ))}
          </div>
        </motion.div>
        <p className="text-sm text-white/60">© {new Date().getFullYear()} StudentLink</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="mb-8 lg:hidden">
          <Link href="/"><StudentLinkLogo /></Link>
        </div>

        <motion.div className="w-full max-w-md" initial="hidden" animate="visible" variants={fadeInVariants}>
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome to StudentLink</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="mb-6 w-full">
                  <TabsTrigger value="login" className="flex-1">Log In</TabsTrigger>
                  <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <div className="space-y-4">
                    <GoogleSignInButton onCredential={handleGoogle} disabled={submitting} />
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">or email</span>
                      </div>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <Input label="Email" name="email" type="email" placeholder="you@university.edu" defaultValue="alex.morgan@stanford.edu" required />
                      <Input label="Password" name="password" type="password" placeholder="••••••••" defaultValue="student123" required />
                      <Button type="submit" className="w-full" loading={submitting}>Sign In</Button>
                    </form>
                  </div>
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    Students: use Google, then enter your name in CAPS to match NFC records.
                    <br />
                    Demo email: alex.morgan@stanford.edu / student123
                  </p>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <Input label="Full Name" name="name" placeholder="Alex Morgan" required />
                    <Input label="Email" name="email" type="email" placeholder="you@university.edu" required />
                    <Input label="University" name="university" placeholder="Stanford University" />
                    <Input label="Password" name="password" type="password" placeholder="••••••••" required />
                    <Button type="submit" className="w-full" loading={submitting}>Create Account</Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Admin?{" "}
                  <Link href="/admin" className="font-medium text-primary hover:underline">Go to Admin Dashboard</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <NameClaimDialog
          open={claimOpen}
          email={claimEmail}
          onSubmit={handleClaim}
          onCancel={() => setClaimOpen(false)}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
