import { Suspense } from "react";
import AuthContinuePage from "./page-client";
import { Spinner } from "@/components/ui/spinner";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Spinner size="lg" />
        </div>
      }
    >
      <AuthContinuePage />
    </Suspense>
  );
}
