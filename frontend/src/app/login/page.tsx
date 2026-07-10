import { Suspense } from "react";
import { AuthPage } from "@/components/auth/AuthPage";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <AuthPage />
    </Suspense>
  );
}
