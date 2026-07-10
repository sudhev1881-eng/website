"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Upload } from "@/components/ui/upload";
import { Spinner } from "@/components/ui/spinner";
import { useStudentData } from "@/providers/student-data-provider";
import { toast } from "@/components/ui/toast";
import { api, fileUrl, type StudentProfile } from "@/lib/api";

export function StudentProfile() {
  const { data, refresh } = useStudentData();
  const [form, setForm] = React.useState<Partial<StudentProfile>>({});
  const [saving, setSaving] = React.useState(false);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  const [uploadingCover, setUploadingCover] = React.useState(false);

  React.useEffect(() => {
    if (data?.profile) setForm(data.profile);
  }, [data?.profile]);

  if (!data) return null;

  const update = (field: keyof StudentProfile, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.students.updateProfile({
        name: form.name,
        university: form.university,
        major: form.major,
        graduationYear: form.graduationYear,
        bio: form.bio,
        location: form.location,
        github: form.github,
        linkedin: form.linkedin,
        portfolio: form.portfolio,
        phone: form.phone,
        title: form.title,
      });
      toast.success("Profile saved");
      await refresh();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      await api.students.uploadAvatar(file);
      toast.success("Photo uploaded");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      await api.students.uploadCover(file);
      toast.success("Cover image uploaded");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const avatarSrc = fileUrl(form.avatar ?? data.profile.avatar);
  const coverSrc = fileUrl(form.coverImage ?? data.profile.coverImage);

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Manage your public profile information."
        actions={
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        }
      />

      <Card className="shadow-card lg:col-span-3 overflow-hidden">
        <div
          className="h-32 bg-gradient-to-r from-primary/20 to-accent/20 bg-cover bg-center"
          style={coverSrc ? { backgroundImage: `url(${coverSrc})` } : undefined}
        />
        <CardContent className="pt-4">
          {uploadingCover ? (
            <Spinner />
          ) : (
            <Upload label="Upload cover photo" accept="image/*" helperText="JPG or PNG, max 5MB" onUpload={handleCoverUpload} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Photo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar name={form.name ?? data.profile.name} size="xl" src={avatarSrc} />
            {uploadingAvatar ? (
              <Spinner />
            ) : (
              <Upload
                label="Upload photo"
                accept="image/*"
                helperText="JPG or PNG, max 5MB"
                onUpload={handleAvatarUpload}
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input label="Full Name" value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} />
            <Input label="Email" type="email" value={form.email ?? ""} disabled />
            <Input label="Title" value={form.title ?? ""} onChange={(e) => update("title", e.target.value)} />
            <Input label="University" value={form.university ?? ""} onChange={(e) => update("university", e.target.value)} />
            <Input label="Major" value={form.major ?? ""} onChange={(e) => update("major", e.target.value)} />
            <Input label="Location" value={form.location ?? ""} onChange={(e) => update("location", e.target.value)} />
            <Input
              label="Graduation Year"
              value={form.graduationYear != null ? String(form.graduationYear) : ""}
              onChange={(e) => update("graduationYear", e.target.value ? Number(e.target.value) : null)}
            />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                value={form.bio ?? ""}
                onChange={(e) => update("bio", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-3">
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input label="GitHub" value={form.github ?? ""} onChange={(e) => update("github", e.target.value)} />
            <Input label="LinkedIn" value={form.linkedin ?? ""} onChange={(e) => update("linkedin", e.target.value)} />
            <Input label="Portfolio" value={form.portfolio ?? ""} onChange={(e) => update("portfolio", e.target.value)} />
            <Input label="Phone" value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
