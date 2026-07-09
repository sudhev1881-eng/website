"use client";

import * as React from "react";
import { api, type StudentDashboardData } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface StudentDataContextValue {
  data: StudentDashboardData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const StudentDataContext = React.createContext<StudentDataContextValue | null>(null);

export function StudentDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = React.useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.students.me();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      refresh();
    });
    return () => cancelAnimationFrame(frame);
  }, [refresh]);

  if (loading && !data) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-error/30 bg-error/5 p-8 text-center">
        <p className="font-semibold text-error">Failed to load dashboard</p>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          Make sure the API is running: <code>npm run dev:api</code>
        </p>
      </div>
    );
  }

  return (
    <StudentDataContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData() {
  const ctx = React.useContext(StudentDataContext);
  if (!ctx) throw new Error("useStudentData must be used within StudentDataProvider");
  return ctx;
}
