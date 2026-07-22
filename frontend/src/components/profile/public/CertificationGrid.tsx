"use client";

import { motion } from "framer-motion";
import { Award, ExternalLink } from "lucide-react";
import type { PublicProfile } from "@/lib/api";
import { useSafeMotion } from "@/lib/motion";
import { SectionHeading } from "./shared";

type Cert = PublicProfile["certificates"][number];

export function CertificationGrid({ certificates }: { certificates: Cert[] }) {
  const motionSafe = useSafeMotion();
  if (certificates.length === 0) return null;

  return (
    <motion.section aria-labelledby="certs-heading" variants={motionSafe.fadeIn}>
      <SectionHeading
        id="certs-heading"
        title="Certifications"
        description="Credentials and issuing organizations."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {certificates.map((cert) => (
          <li
            key={cert.id}
            className="flex gap-3 rounded-2xl border border-border/70 bg-surface/40 p-4 transition-colors hover:border-primary/25"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Award className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground">{cert.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {cert.issuer}
                {cert.date ? ` · ${cert.date}` : ""}
              </p>
              {cert.url && cert.url !== "#" ? (
                <a
                  href={cert.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View credential
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
