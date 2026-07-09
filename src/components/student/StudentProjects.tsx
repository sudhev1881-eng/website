"use client";

import * as React from "react";
import { FolderOpen, ExternalLink, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useStudentData } from "@/providers/student-data-provider";
import { api } from "@/lib/api";

export function StudentProjects() {
  const { data, refresh } = useStudentData();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", description: "", tech: "", url: "", featured: false });

  if (!data) return null;
  const studentProjects = data.projects;

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await api.students.createProject({
        title: form.title.trim(),
        description: form.description,
        tech: form.tech.split(",").map((t) => t.trim()).filter(Boolean),
        url: form.url,
        featured: form.featured,
      });
      setOpen(false);
      setForm({ title: "", description: "", tech: "", url: "", featured: false });
      toast.success("Project added");
      await refresh();
    } catch {
      toast.error("Failed to add project");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.students.deleteProject(id);
      toast.success("Project removed");
      await refresh();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Showcase your best work to recruiters."
        actions={
          <Button onClick={() => setOpen(true)}>
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
          action={{ label: "Add Project", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studentProjects.map((project) => (
            <Card key={project.id} hover className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    {project.featured ? <Badge variant="primary">Featured</Badge> : null}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(project.id)} aria-label="Delete project">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
                {project.url ? (
                  <Button variant="outline" size="sm" href={project.url}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Project
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>Showcase a project on your public profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Tech stack" placeholder="React, Node.js" value={form.tech} onChange={(e) => setForm((f) => ({ ...f, tech: e.target.value }))} />
            <Input label="URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.title.trim()}>
              {submitting ? "Adding…" : "Add Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
