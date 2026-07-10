"use client";

import { motion } from "framer-motion";
import {
  Nfc,
  BarChart3,
  FileText,
  GraduationCap,
  Shield,
  FolderOpen,
  ChevronDown,
  ArrowRight,
  Star,
} from "lucide-react";
import { Navbar, Footer } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentLinkLogo } from "@/components/brand/StudentLinkLogo";
import {
  studentLink,
  landingFeatures,
  howItWorks,
  universities,
  faqs,
  testimonials,
} from "@/data/studentlink";
import { fadeInVariants, staggerContainer } from "@/lib/motion";

const featureIcons = {
  nfc: Nfc,
  portfolio: FolderOpen,
  analytics: BarChart3,
  resume: FileText,
  university: GraduationCap,
  admin: Shield,
};

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar
        logo={<StudentLinkLogo />}
        links={[...studentLink.nav]}
        actions={
          <>
            <Button variant="ghost" href="/login">Log in</Button>
            <Button href="/login">{studentLink.cta.primary.label}</Button>
          </>
        }
      />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <motion.div
          className="relative mx-auto max-w-4xl text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeInVariants}>
            <Badge variant="primary" className="mb-6">Now with NFC Digital Cards</Badge>
          </motion.div>
          <motion.h1
            variants={fadeInVariants}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Your digital identity,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              one tap away
            </span>
          </motion.h1>
          <motion.p
            variants={fadeInVariants}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
          >
            {studentLink.description}
          </motion.p>
          <motion.div variants={fadeInVariants} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" href="/login">
              {studentLink.cta.primary.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" href={studentLink.cta.secondary.href}>
              {studentLink.cta.secondary.label}
            </Button>
          </motion.div>
          <motion.div variants={fadeInVariants} className="mt-16">
            <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface/50 p-2 shadow-card">
              <div className="rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-8 sm:p-12">
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "Profile Views", value: "12.4K" },
                    { label: "NFC Taps", value: "3.2K" },
                    { label: "Interviews", value: "847" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-background/80 p-4 text-center backdrop-blur-sm">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
        <div className="mt-12 flex justify-center">
          <ChevronDown className="h-5 w-5 animate-bounce text-muted-foreground" />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border bg-surface/30 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps to stand out at career fairs</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {howItWorks.map((step) => (
              <Card key={step.step} hover className="shadow-card">
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything you need</h2>
            <p className="mt-3 text-muted-foreground">A complete platform for students and universities</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {landingFeatures.map((feature) => {
              const Icon = featureIcons[feature.icon];
              return (
                <Card key={feature.title} hover className="shadow-card">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Universities */}
      <section id="universities" className="border-t border-border bg-surface/30 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Trusted by top universities</h2>
            <p className="mt-3 text-muted-foreground">Partner institutions across the country</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {universities.map((uni) => (
              <div key={uni.name} className="flex items-center gap-4 rounded-2xl border border-border bg-background p-5 shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-sm font-bold text-secondary">
                  {uni.logo}
                </div>
                <div>
                  <p className="font-semibold">{uni.name}</p>
                  <p className="text-sm text-muted-foreground">{uni.students.toLocaleString()} students</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-border bg-surface/30 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Loved by students & recruiters</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.author} className="shadow-card">
                <CardContent className="p-6">
                  <div className="mb-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="mt-12 space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question} className="shadow-card">
                <CardContent className="p-6">
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="border-t border-border px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-br from-primary to-secondary p-10 text-center text-white sm:p-14">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="mt-3 text-white/80">Join thousands of students already using StudentLink</p>
          <Button size="lg" className="mt-8 bg-white text-primary hover:bg-white/90" href="/login">
            Create Your Profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <Footer
        logo={<StudentLinkLogo />}
        description={studentLink.description}
        groups={[
          { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Universities", href: "#universities" }] },
          { title: "Company", links: [{ label: "About", href: "#" }, { label: "Blog", href: "#" }, { label: "Careers", href: "#" }] },
          { title: "Support", links: [{ label: "Help Center", href: "#" }, { label: "Contact", href: "#contact" }, { label: "Privacy", href: "#" }] },
        ]}
        copyright={`© ${new Date().getFullYear()} StudentLink. All rights reserved.`}
      />
    </div>
  );
}
