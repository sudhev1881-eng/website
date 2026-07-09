"use client";

import { Building2, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminUniversities } from "@/data/mock-admin";

export function AdminUniversities() {
  return (
    <div>
      <PageHeader
        title="Universities"
        description="Manage partner universities and their administrators."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Add University
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {adminUniversities.map((uni) => (
          <Card key={uni.id} hover className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{uni.name}</h3>
                    <p className="text-sm text-muted-foreground">{uni.admin}</p>
                  </div>
                </div>
                <Badge variant={uni.status === "active" ? "success" : "warning"}>
                  {uni.status}
                </Badge>
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
    </div>
  );
}
