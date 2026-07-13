"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStudentData } from "@/providers/student-data-provider";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { clearToken } from "@/lib/auth-token";

export function StudentSettings() {
  const router = useRouter();
  const { logout } = useAuth();
  const { data } = useStudentData();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (!data) return null;

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Enter current and new password");
      return;
    }
    setSaving(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Delete your account and all profile data? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.students.deleteAccount();
      clearToken();
      logout();
      toast.success("Account deleted");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account." />

      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Signed in as {data.profile.email}. Google accounts manage passwords through Google.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <Input label="Email" type="email" value={data.profile.email} disabled />
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Button onClick={handlePasswordChange} disabled={saving}>
              {saving ? "Updating…" : "Update Password"}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Profile URL</CardTitle>
            <CardDescription>Your public profile is always available at this link.</CardDescription>
          </CardHeader>
          <CardContent className="sm:max-w-md">
            <Input
              label="Username"
              value={data.profile.username}
              disabled
              helperText={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/u/${data.profile.username}`}
            />
          </CardContent>
        </Card>

        <Card className="border-error/30 shadow-card">
          <CardHeader>
            <CardTitle className="text-error">Danger Zone</CardTitle>
            <CardDescription>Permanently delete your account and all data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete Account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
