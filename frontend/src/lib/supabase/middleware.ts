import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Only refresh Supabase cookies when needed.
 * Calling getUser() on every page was adding 300–1200ms of latency.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  // Skip unless OAuth callback/continue or existing Supabase cookies need refresh.
  const path = request.nextUrl.pathname;
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.includes("sb-") && c.name.includes("auth"));

  if (!hasAuthCookie && !path.startsWith("/auth/")) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // getSession reads/refreshes cookies locally when possible.
  // Prefer it over getUser() which always hits Supabase network.
  await supabase.auth.getSession();

  return supabaseResponse;
}
