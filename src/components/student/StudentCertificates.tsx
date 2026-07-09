"use client";

import * as React from "react";
import { Award, Plus, ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export function StudentCertificates() {
  const { data, refresh } = useStudentData();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", issuer: "", date: "", url: "" });

  if (!data) return null;
  const studentCertificates = data.certificates;

  const handleCreate = async () => {
    if (!form.name.trim() || !form.issuer.trim()) return;
    setSubmitting(true);
    try {
      await api.students.createCertificate({
        name: form.name.trim(),
        issuer: form.issuer.trim(),
        date: form.date,
        url: form.url,
      });
      setOpen(false);
      setForm({ name: "", issuer: "", date: "", url: "" });
      toast.success("Certificate added");
      await refresh();
    } catch {
      toast.error("Failed to add certificate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.students.deleteCertificate(id);
      toast.success("Certificate removed");
      await refresh();
    } catch {
      toast.error("Failed to delete certificate");
    }
  };

  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Display your certifications and credentials."
        actions={
          <Button onClick={() => setOpen(true)}>
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
          action={{ label: "Add Certificate", onClick: () => setOpen(true) }}
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
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{cert.name}</h3>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(cert.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{cert.issuer}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Issued {cert.date}</p>
                  {cert.url ? (
                    <Button variant="ghost" size="sm" className="mt-3 px-0" href={cert.url}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Verify
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Issuer" value={form.issuer} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} />
            <Input label="Date" placeholder="2024-08" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="Verify URL" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name.trim()}>Add Certificate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
