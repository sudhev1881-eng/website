"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  Code2,
  Link2,
  Globe,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Briefcase,
  Award,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/charts/SimpleBarChart";
import { toast } from "@/components/ui/toast";
import type { PublicProfile } from "@/lib/api";
import { api, fileUrl } from "@/lib/api";
import { fadeInVariants, staggerContainer } from "@/lib/motion";

interface PublicProfileViewProps {
  profile: PublicProfile;
  slug: string;
}

export function PublicProfileView({ profile, slug }: PublicProfileViewProps) {
  const coverStyle = profile.coverImage
    ? { backgroundImage: `url(${fileUrl(profile.coverImage)})`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;

  const handleResumeDownload = async () => {
    try {
      const { downloadUrl } = await api.profiles.resumeDownload(slug);
      const url = fileUrl(downloadUrl);
      if (url) window.open(url, "_blank");
      else toast.error("Resume not available");
    } catch {
      toast.error("Resume download failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Cover */}
      <div
        className="relative h-36 bg-gradient-to-br from-primary via-secondary to-accent sm:h-48"
        style={coverStyle}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggIGQ9Ik0zMCAwTDYwIDMwTDMwIDYwTDAgMzBaIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')] opacity-50" />
      </div>

      <motion.div
        className="mx-auto max-w-2xl px-4 pb-12 sm:px-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Profile Header */}
        <motion.div variants={fadeInVariants} className="-mt-16 sm:-mt-20">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <Avatar name={profile.name} size="xl" src={fileUrl(profile.avatar)} className="border-4 border-background shadow-card" />
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{profile.name}</h1>
            <p className="mt-1 text-lg text-primary font-medium">{profile.title}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {profile.university} · {profile.major}
            </p>
          </div>

          {/* Primary CTA - Resume Download (prominent for recruiters) */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="w-full sm:flex-1"
              onClick={handleResumeDownload}
              disabled={!profile.resume}
            >
              <Download className="h-5 w-5" />
              Download Resume
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="lg" href={profile.github} aria-label="GitHub">
                <Code2 className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" href={profile.linkedin} aria-label="LinkedIn">
                <Link2 className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" href={profile.portfolio} aria-label="Portfolio">
                <Globe className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* About */}
        <motion.section variants={fadeInVariants} className="mt-10">
          <h2 className="text-lg font-bold">About</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
        </motion.section>

        {/* Experience */}
        {profile.experience.length > 0 ? (
          <motion.section variants={fadeInVariants} className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Briefcase className="h-5 w-5 text-primary" />
              Experience
            </h2>
            <div className="space-y-4">
              {profile.experience.map((exp) => (
                <Card key={exp.id} className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{exp.role}</h3>
                        <p className="text-sm text-primary">{exp.company}</p>
                      </div>
                      <Badge variant="outline">{exp.period}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{exp.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        ) : null}

        {/* Projects */}
        {profile.projects.length > 0 ? (
          <motion.section variants={fadeInVariants} className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <ExternalLink className="h-5 w-5 text-primary" />
              Projects
            </h2>
            <div className="space-y-4">
              {profile.projects.map((project) => (
                <Card key={project.id} hover className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{project.title}</h3>
                      {project.featured ? <Badge variant="primary">Featured</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.tech.map((t) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                    </div>
                    {project.url !== "#" ? (
                      <Button variant="ghost" size="sm" className="mt-3 px-0" href={project.url}>
                        View Project <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        ) : null}

        {/* Skills */}
        {profile.skills.length > 0 ? (
          <motion.section variants={fadeInVariants} className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              Skills
            </h2>
            <Card className="shadow-card">
              <CardContent className="space-y-4 p-4">
                {profile.skills.map((skill) => (
                  <div key={skill.name}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-muted-foreground">{skill.level}%</span>
                    </div>
                    <ProgressBar value={skill.level} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.section>
        ) : null}

        {/* Certificates */}
        {profile.certificates.length > 0 ? (
          <motion.section variants={fadeInVariants} className="mt-10">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Award className="h-5 w-5 text-primary" />
              Certificates
            </h2>
            <div className="space-y-3">
              {profile.certificates.map((cert) => (
                <div key={cert.id} className="flex items-center gap-3 rounded-xl border border-border p-4">
                  <Award className="h-5 w-5 shrink-0 text-warning" />
                  <div>
                    <p className="text-sm font-semibold">{cert.name}</p>
                    <p className="text-xs text-muted-foreground">{cert.issuer} · {cert.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        ) : null}

        {/* Contact */}
        <motion.section variants={fadeInVariants} className="mt-10">
          <h2 className="mb-4 text-lg font-bold">Contact</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="justify-start" href={`mailto:${profile.email}`}>
              <Mail className="h-4 w-4" />
              {profile.email}
            </Button>
            <Button variant="outline" className="justify-start" href={`tel:${profile.phone}`}>
              <Phone className="h-4 w-4" />
              {profile.phone}
            </Button>
          </div>
        </motion.section>

        <motion.footer variants={fadeInVariants} className="mt-12 border-t border-border pt-6 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-primary">
            Powered by <span className="font-semibold">StudentLink</span>
          </Link>
        </motion.footer>
      </motion.div>
    </div>
  );
}
