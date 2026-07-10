"use client";

import * as React from "react";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { useStudentData } from "@/providers/student-data-provider";
import { api } from "@/lib/api";

export function StudentExperience() {
  const { data, refresh } = useStudentData();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ role: "", company: "", period: "", description: "" });

  if (!data) return null;
  const items = data.experience;

  const handleCreate = async () => {
    if (!form.role.trim() || !form.company.trim()) return;
    setSubmitting(true);
    try {
      await api.students.createExperience({
        role: form.role.trim(),
        company: form.company.trim(),
        period: form.period,
        description: form.description,
      });
      setOpen(false);
      setForm({ role: "", company: "", period: "", description: "" });
      toast.success("Experience added");
      await refresh();
    } catch {
      toast.error("Failed to add experience");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.students.deleteExperience(id);
      toast.success("Experience removed");
      await refresh();
    } catch {
      toast.error("Failed to delete experience");
    }
  };

  return (
    <div>
      <PageHeader
        title="Experience"
        description="Add internships, jobs, and research roles."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Experience
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="No experience yet"
          description="Add work experience and internships to your profile."
          action={{ label: "Add Experience", onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="space-y-4">
          {items.map((exp) => (
            <Card key={exp.id} className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">{exp.role}</h3>
                    <p className="text-sm text-primary">{exp.company}</p>
                    <Badge variant="outline" className="mt-2">{exp.period}</Badge>
                    {exp.description ? (
                      <p className="mt-3 text-sm text-muted-foreground">{exp.description}</p>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Experience</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            <Input label="Company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
            <Input label="Period" placeholder="Summer 2024" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.role.trim()}>Add Experience</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
