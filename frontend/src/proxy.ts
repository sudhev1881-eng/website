import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Keep this narrow. App JWT lives in localStorage — only Google OAuth
     * needs Supabase cookie refresh on these paths.
     */
    "/auth/:path*",
    "/login",
    "/admin/:path*",
    "/student/:path*",
    "/admin",
    "/student",
  ],
};
