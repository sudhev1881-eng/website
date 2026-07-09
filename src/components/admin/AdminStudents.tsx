"use client";

import { Search, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { adminStudents } from "@/data/mock-admin";

const statusVariant = {
  active: "success" as const,
  pending: "warning" as const,
  inactive: "outline" as const,
};

export function AdminStudents() {
  return (
    <div>
      <PageHeader
        title="Students"
        description="Manage all registered students across universities."
        actions={<Button>Add Student</Button>}
      />

      <Card className="shadow-card">
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search students..." className="pl-10" />
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
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Views</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {adminStudents.map((student) => (
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
                      <Badge variant={statusVariant[student.status]}>{student.status}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">{student.profileViews}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" aria-label="More options">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
