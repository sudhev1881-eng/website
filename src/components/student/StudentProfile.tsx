"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Upload } from "@/components/ui/upload";
import { useStudentData } from "@/providers/student-data-provider";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api";

export function StudentProfile() {
  const { data, refresh } = useStudentData();
  if (!data) return null;
  const currentStudent = data.profile;

  const handleSave = async () => {
    try {
      await api.students.updateProfile({
        name: currentStudent.name,
        university: currentStudent.university,
        major: currentStudent.major,
        bio: currentStudent.bio,
      });
      toast.success("Profile saved successfully");
      refresh();
    } catch {
      toast.error("Failed to save profile");
    }
  };
  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Manage your public profile information."
        actions={<Button onClick={handleSave}>Save Changes</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Photo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar name={currentStudent.name} size="xl" />
            <Upload
              label="Upload photo"
              accept="image/*"
              helperText="JPG or PNG, max 5MB"
              onUpload={() => toast.success("Photo uploaded")}
            />
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input label="Full Name" defaultValue={currentStudent.name} />
            <Input label="Email" type="email" defaultValue={currentStudent.email} />
            <Input label="University" defaultValue={currentStudent.university} />
            <Input label="Major" defaultValue={currentStudent.major} />
            <Input label="Location" defaultValue={currentStudent.location} />
            <Input label="Graduation Year" defaultValue={String(currentStudent.graduationYear)} />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                defaultValue={currentStudent.bio}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card lg:col-span-3">
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input label="GitHub" defaultValue={currentStudent.github} />
            <Input label="LinkedIn" defaultValue={currentStudent.linkedin} />
            <Input label="Portfolio" defaultValue={currentStudent.portfolio} />
            <Input label="Phone" defaultValue={currentStudent.phone} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
