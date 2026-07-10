"use client";

import * as React from "react";
import { Building2, Plus, Users, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { api, type AdminUniversity } from "@/lib/api";

export function AdminUniversities() {
  const [universities, setUniversities] = React.useState<AdminUniversity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editUni, setEditUni] = React.useState<AdminUniversity | null>(null);
  const [deleteUni, setDeleteUni] = React.useState<AdminUniversity | null>(null);
  const [name, setName] = React.useState("");
  const [adminName, setAdminName] = React.useState("");
  const [status, setStatus] = React.useState("active");
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    api.admin
      .universities()
      .then(setUniversities)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (editUni) {
      setName(editUni.name);
      setAdminName(editUni.admin ?? "");
      setStatus(editUni.status);
    }
  }, [editUni]);

  const resetForm = () => {
    setName("");
    setAdminName("");
    setStatus("active");
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const uni = await api.admin.createUniversity({
        name: name.trim(),
        adminName: adminName.trim() || undefined,
      });
      setUniversities((prev) => [...prev, uni].sort((a, b) => a.name.localeCompare(b.name)));
      resetForm();
      setDialogOpen(false);
      toast.success("University added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add university");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editUni) return;
    setSubmitting(true);
    try {
      const updated = await api.admin.updateUniversity(editUni.id, {
        name: name.trim(),
        adminName: adminName.trim() || undefined,
        status,
      });
      setUniversities((prev) =>
        prev.map((u) => (u.id === editUni.id ? updated : u)).sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditUni(null);
      resetForm();
      toast.success("University updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update university");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUni) return;
    setSubmitting(true);
    try {
      await api.admin.deleteUniversity(deleteUni.id);
      setUniversities((prev) => prev.filter((u) => u.id !== deleteUni.id));
      setDeleteUni(null);
      toast.success("University removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete university");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Universities"
        description="Manage partner universities and their administrators."
        actions={
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Add University
          </Button>
        }
      />

      {universities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No universities added yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {universities.map((uni) => (
            <Card key={uni.id} hover className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{uni.name}</h3>
                      <p className="text-sm text-muted-foreground">{uni.admin ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={uni.status === "active" ? "success" : "warning"}>{uni.status}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setEditUni(uni)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteUni(uni)}><Trash2 className="h-4 w-4 text-error" /></Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-bold">{uni.students.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{uni.activeCards.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Active Cards</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add University</DialogTitle>
            <DialogDescription>Register a new partner university.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="University name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Admin contact (optional)" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting || !name.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUni)} onOpenChange={(open) => !open && setEditUni(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit University</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Admin contact" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            <select
              className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="active">active</option>
              <option value="pending">pending</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUni(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteUni)} onOpenChange={(open) => !open && setDeleteUni(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteUni?.name}?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUni(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
