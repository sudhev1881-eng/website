"use client";

import { FolderOpen, ExternalLink, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { studentProjects } from "@/data/mock-student";

export function StudentProjects() {
  return (
    <div>
      <PageHeader
        title="Projects"
        description="Showcase your best work to recruiters."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        }
      />

      {studentProjects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-6 w-6" />}
          title="No projects yet"
          description="Add your first project to showcase your skills and experience to recruiters."
          action={{ label: "Add Project" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studentProjects.map((project) => (
            <Card key={project.id} hover className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.title}</CardTitle>
                  {project.featured ? <Badge variant="primary">Featured</Badge> : null}
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
                <Button variant="outline" size="sm" href={project.url}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Project
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
