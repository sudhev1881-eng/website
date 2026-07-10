"use client";

import * as React from "react";
import { Search, Nfc } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { ProgramNfcCardDialog } from "./ProgramNfcCardDialog";
import { SetupError, DB_SETUP_STEPS } from "@/components/layout/SetupError";
import { api, ApiError, type AdminStudent } from "@/lib/api";

const statusVariant: Record<string, "success" | "warning" | "outline"> = {
  active: "success",
  pending: "warning",
  inactive: "outline",
};

export function AdminStudents() {
  const [students, setStudents] = React.useState<AdminStudent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [programStudent, setProgramStudent] = React.useState<AdminStudent | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", university: "", major: "" });
  const [submitting, setSubmitting] = React.useState(false);

  const loadStudents = React.useCallback(() => {
    setLoading(true);
    setFetchError(null);
    api.admin
      .students()
      .then(setStudents)
      .catch((err) => {
        setFetchError(err instanceof ApiError ? err.message : "Failed to load students");
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleAddStudent = async () => {
    if (!form.name || !form.email || !form.password) return;
    setSubmitting(true);
    try {
      const student = await api.admin.createStudent({
        name: form.name,
        email: form.email,
        password: form.password,
        university: form.university || undefined,
        major: form.major || undefined,
      });
      setStudents((prev) => [...prev, student].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", email: "", password: "", university: "", major: "" });
      setAddOpen(false);
      toast.success("Student created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.university.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="py-8">
        <SetupError title="Could not load students" steps={DB_SETUP_STEPS} />
        <p className="mt-4 text-center text-sm text-error">{fetchError}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description="Search students and program NFC cards via the server USB reader."
        actions={<Button onClick={() => setAddOpen(true)}>Add Student</Button>}
      />

      <Card className="shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">University</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Major</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">NFC Card</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} size="sm" />
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{student.university}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{student.major}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[student.status] ?? "outline"}>{student.status}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">{student.nfcCard ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => setProgramStudent(student)}>
                        <Nfc className="h-4 w-4" />
                        <span className="hidden sm:inline">Program NFC Card</span>
                        <span className="sm:hidden">Program</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {programStudent ? (
        <ProgramNfcCardDialog
          open={Boolean(programStudent)}
          onOpenChange={(open) => !open && setProgramStudent(null)}
          student={{
            id: programStudent.id,
            name: programStudent.name,
            slug: programStudent.username,
            cardNumber: programStudent.nfcCard,
          }}
        />
      ) : null}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>Create a new student account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            <Input placeholder="University" value={form.university} onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))} />
            <Input placeholder="Major" value={form.major} onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddStudent}
              disabled={submitting || !form.name || !form.email || !form.password}
            >
              {submitting ? "Creating…" : "Create Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
