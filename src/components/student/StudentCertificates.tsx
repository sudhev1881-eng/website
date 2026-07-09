"use client";

import { Award, Plus, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { studentCertificates } from "@/data/mock-student";

export function StudentCertificates() {
  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Display your certifications and credentials."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Add Certificate
          </Button>
        }
      />

      {studentCertificates.length === 0 ? (
        <EmptyState
          icon={<Award className="h-6 w-6" />}
          title="No certificates yet"
          description="Add certifications to strengthen your profile and stand out to recruiters."
          action={{ label: "Add Certificate" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {studentCertificates.map((cert) => (
            <Card key={cert.id} hover className="shadow-card">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                  <Award className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground">{cert.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{cert.issuer}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Issued {cert.date}</p>
                  <Button variant="ghost" size="sm" className="mt-3 px-0" href={cert.url}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Verify
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
