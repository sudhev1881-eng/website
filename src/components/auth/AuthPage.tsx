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
import { fadeInVariants } from "@/lib/motion";

export function AuthPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Welcome back!");
    router.push("/student");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Account created successfully!");
    router.push("/student");
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 bg-gradient-to-br from-primary via-secondary to-accent p-12 lg:flex lg:flex-col lg:justify-between">
        <StudentLinkLogo />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInVariants}
        >
          <h2 className="text-3xl font-bold text-white">
            Build your digital identity
          </h2>
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

        <motion.div
          className="w-full max-w-md"
          initial="hidden"
          animate="visible"
          variants={fadeInVariants}
        >
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
                  <form onSubmit={handleLogin} className="space-y-4">
                    <Input label="Email" type="email" placeholder="you@university.edu" required />
                    <Input label="Password" type="password" placeholder="••••••••" required />
                    <Button type="submit" className="w-full">Sign In</Button>
                  </form>
                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    <button type="button" className="text-primary hover:underline">Forgot password?</button>
                  </p>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <Input label="Full Name" placeholder="Alex Morgan" required />
                    <Input label="Email" type="email" placeholder="you@university.edu" required />
                    <Input label="University" placeholder="Stanford University" required />
                    <Input label="Password" type="password" placeholder="••••••••" required />
                    <Button type="submit" className="w-full">Create Account</Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Admin?{" "}
                  <Link href="/admin" className="font-medium text-primary hover:underline">
                    Go to Admin Dashboard
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
