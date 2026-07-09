"use client";

import { Sparkles, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/charts/SimpleBarChart";
import { useStudentData } from "@/providers/student-data-provider";

export function StudentSkills() {
  const { data } = useStudentData();
  if (!data) return null;
  const studentSkills = data.skills;
  const categories = [...new Set(studentSkills.map((s) => s.category))];

  return (
    <div>
      <PageHeader
        title="Skills"
        description="Highlight your technical and professional skills."
        actions={
          <Button>
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
                  <div key={skill.name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium">{skill.name}</span>
                      <span className="text-xs text-muted-foreground">{skill.level}%</span>
                    </div>
                    <ProgressBar value={skill.level} />
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 shadow-card">
        <CardHeader>
          <CardTitle>All Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {studentSkills.map((skill) => (
              <Badge key={skill.name} variant="secondary">
                {skill.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
