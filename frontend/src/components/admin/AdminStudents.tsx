"use client";

import * as React from "react";
import { Search, Nfc, Pencil, Trash2, UserPlus, Check, X } from "lucide-react";
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
import { NFCWriterModal } from "@/components/nfc/NFCWriterModal";
import { SetupError, LoadError, DB_SETUP_STEPS, shouldShowLocalDbSetup } from "@/components/layout/SetupError";
import { UniversitySelect } from "@/components/ui/university-select";
import { api, ApiError, type AdminStudent } from "@/lib/api";

const statusVariant: Record<string, "success" | "warning" | "outline" | "primary"> = {
  active: "success",
  pending: "warning",
  inactive: "outline",
  unclaimed: "primary",
};

export function AdminStudents() {
  const [students, setStudents] = React.useState<AdminStudent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<{ message: string; status: number | null } | null>(
    null,
  );
  const [search, setSearch] = React.useState("");
  const [writeNfcStudent, setWriteNfcStudent] = React.useState<AdminStudent | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [preregisterOpen, setPreregisterOpen] = React.useState(false);
  const [editStudent, setEditStudent] = React.useState<AdminStudent | null>(null);
  const [deleteStudent, setDeleteStudent] = React.useState<AdminStudent | null>(null);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", university: "", major: "" });
  const [preregisterForm, setPreregisterForm] = React.useState({ name: "", university: "", major: "" });
  const [editForm, setEditForm] = React.useState({ name: "", university: "", major: "", status: "active" });
  const [submitting, setSubmitting] = React.useState(false);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [universities, setUniversities] = React.useState<Array<{ id: string; name: string }>>([]);

  const loadStudents = React.useCallback(() => {
    setLoading(true);
    setFetchError(null);
    api.admin
      .students()
      .then(setStudents)
      .catch((err) => {
        if (err instanceof ApiError) {
          setFetchError({ message: err.message, status: err.status });
        } else if (err instanceof TypeError) {
          setFetchError({ message: err.message || "Failed to reach API", status: null });
        } else {
          setFetchError({
            message: err instanceof Error ? err.message : "Failed to load students",
            status: null,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadStudents();
    api.universities.list().then(setUniversities).catch(() => setUniversities([]));
  }, [loadStudents]);

  React.useEffect(() => {
    if (editStudent) {
      setEditForm({
        name: editStudent.name,
        university: editStudent.university,
        major: editStudent.major,
        status: editStudent.status === "unclaimed" ? "pending" : editStudent.status,
      });
    }
  }, [editStudent]);

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
        status: "active",
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

  const handlePreregister = async () => {
    if (!preregisterForm.name.trim()) return;
    setSubmitting(true);
    try {
      const student = await api.admin.preregisterStudent({
        name: preregisterForm.name.trim().toUpperCase(),
        university: preregisterForm.university || undefined,
        major: preregisterForm.major || undefined,
      });
      setStudents((prev) => [...prev, student].sort((a, b) => a.name.localeCompare(b.name)));
      setPreregisterForm({ name: "", university: "", major: "" });
      setPreregisterOpen(false);
      toast.success(`Pre-registered ${student.name} — ready for Google claim`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pre-register student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (student: AdminStudent) => {
    setActionId(student.id);
    try {
      const updated = await api.admin.approveStudent(student.id);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, ...updated } : s)),
      );
      toast.success(`${student.name} approved — they can sign in now`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (student: AdminStudent) => {
    setActionId(student.id);
    try {
      await api.admin.declineStudent(student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      toast.success(`${student.name} declined and removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to decline");
    } finally {
      setActionId(null);
    }
  };

  const handleEdit = async () => {
    if (!editStudent) return;
    setSubmitting(true);
    try {
      const updated = await api.admin.updateStudent(editStudent.id, {
        name: editForm.name,
        university: editForm.university,
        major: editForm.major,
        status: editForm.status,
      });
      setStudents((prev) =>
        prev
          .map((s) => (s.id === editStudent.id ? { ...s, ...updated } : s))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditStudent(null);
      toast.success("Student updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteStudent) return;
    setSubmitting(true);
    try {
      await api.admin.deleteStudent(deleteStudent.id);
      setStudents((prev) => prev.filter((s) => s.id !== deleteStudent.id));
      setDeleteStudent(null);
      toast.success("Student removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete student");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = students
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
        s.university.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const aPending = a.status === "pending" && a.email ? 0 : 1;
      const bPending = b.status === "pending" && b.email ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return a.name.localeCompare(b.name);
    });

  const pendingCount = students.filter((s) => s.status === "pending" && s.email).length;

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
        {shouldShowLocalDbSetup(fetchError.status) ? (
          <SetupError title="Could not load students" steps={DB_SETUP_STEPS} />
        ) : (
          <LoadError
            title="Could not load students"
            message="Something went wrong talking to the API. Please try again."
            detail={fetchError.message}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Students"
        description={
          pendingCount > 0
            ? `${pendingCount} registration${pendingCount === 1 ? "" : "s"} waiting for approval.`
            : "Manage students, approve registrations, and write NFC cards from Android Chrome."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPreregisterOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Pre-register
            </Button>
            <Button onClick={() => setAddOpen(true)}>Add Student</Button>
          </div>
        }
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
                {filtered.map((student) => {
                  const isPendingSignup = student.status === "pending" && Boolean(student.email);
                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-border last:border-0 hover:bg-surface/50 ${
                        isPendingSignup ? "bg-warning/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={student.name} size="sm" />
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.email ?? "No account yet"}
                              {isPendingSignup ? " · awaiting approval" : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {student.university}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {student.major}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[student.status] ?? "outline"}>
                          {student.status}
                        </Badge>
                      </td>
                      <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">
                        {student.nfcCard ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {isPendingSignup ? (
                            <>
                              <Button
                                size="sm"
                                disabled={actionId === student.id}
                                onClick={() => handleApprove(student)}
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionId === student.id}
                                onClick={() => handleDecline(student)}
                                title="Decline"
                              >
                                <X className="h-4 w-4 text-error" />
                                Decline
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setWriteNfcStudent(student)}
                                title="Write NFC Card (Android Chrome)"
                                aria-label="Write NFC Card"
                              >
                                <Nfc className="h-4 w-4" />
                                <span className="hidden lg:inline">Write NFC</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditStudent(student)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteStudent(student)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-error" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {writeNfcStudent ? (
        <NFCWriterModal
          open={Boolean(writeNfcStudent)}
          onOpenChange={(open) => !open && setWriteNfcStudent(null)}
          student={{
            id: writeNfcStudent.id,
            name: writeNfcStudent.name,
            username: writeNfcStudent.username,
            cardNumber: writeNfcStudent.nfcCard,
          }}
          onProgrammed={() => {
            loadStudents();
            setWriteNfcStudent(null);
          }}
        />
      ) : null}

      <Dialog open={preregisterOpen} onOpenChange={setPreregisterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pre-register Student</DialogTitle>
            <DialogDescription>
              Enter their legal name in CAPS (same as NFC records). They will claim this profile
              after Google sign-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="ALEX MORGAN"
              value={preregisterForm.name}
              onChange={(e) =>
                setPreregisterForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))
              }
            />
            <UniversitySelect
              value={preregisterForm.university}
              onValueChange={(university) => setPreregisterForm((f) => ({ ...f, university }))}
              options={universities}
            />
            <Input
              placeholder="Major"
              value={preregisterForm.major}
              onChange={(e) => setPreregisterForm((f) => ({ ...f, major: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreregisterOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePreregister}
              disabled={submitting || !preregisterForm.name.trim()}
            >
              {submitting ? "Saving…" : "Pre-register"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Create a student with email and password login (already approved).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            <UniversitySelect
              value={form.university}
              onValueChange={(university) => setForm((f) => ({ ...f, university }))}
              options={universities}
              required
            />
            <Input
              placeholder="Major"
              value={form.major}
              onChange={(e) => setForm((f) => ({ ...f, major: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={submitting || !form.name || !form.email || !form.password}
            >
              {submitting ? "Creating…" : "Create Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editStudent)} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            />
            <UniversitySelect
              value={editForm.university}
              onValueChange={(university) => setEditForm((f) => ({ ...f, university }))}
              options={universities}
            />
            <Input
              placeholder="Major"
              value={editForm.major}
              onChange={(e) => setEditForm((f) => ({ ...f, major: e.target.value }))}
            />
            {editStudent?.status !== "unclaimed" ? (
              <select
                className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
                value={editForm.status}
                onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="inactive">inactive</option>
              </select>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteStudent)} onOpenChange={(open) => !open && setDeleteStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete student?</DialogTitle>
            <DialogDescription>
              This permanently removes {deleteStudent?.name} and their profile data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStudent(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
