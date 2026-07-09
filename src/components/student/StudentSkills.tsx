"use client";

import * as React from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/charts/SimpleBarChart";
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

export function StudentSkills() {
  const { data, refresh } = useStudentData();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", level: "50", category: "General" });

  if (!data) return null;
  const studentSkills = data.skills;
  const categories = [...new Set(studentSkills.map((s) => s.category))];

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await api.students.createSkill({
        name: form.name.trim(),
        level: Number(form.level) || 50,
        category: form.category || "General",
      });
      setOpen(false);
      setForm({ name: "", level: "50", category: "General" });
      toast.success("Skill added");
      await refresh();
    } catch {
      toast.error("Failed to add skill");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.students.deleteSkill(id);
      toast.success("Skill removed");
      await refresh();
    } catch {
      toast.error("Failed to delete skill");
    }
  };

  return (
    <div>
      <PageHeader
        title="Skills"
        description="Highlight your technical and professional skills."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {categories.map((category) => (
          <Card key={category} className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {studentSkills
                .filter((s) => s.category === category)
                .map((skill) => (
                  <div key={skill.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium">{skill.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{skill.level}%</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(skill.id)} aria-label={`Delete ${skill.name}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <ProgressBar value={skill.level} />
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skill</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input label="Skill name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Level (0–100)" type="number" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} />
            <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name.trim()}>Add Skill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
