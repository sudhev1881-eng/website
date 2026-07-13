import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side OAuth callback — exchanges the PKCE code using cookies.
 * Then redirects to the client continue page for app sync / name claim.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    const msg = encodeURIComponent(oauthError);
    return NextResponse.redirect(`${origin}/auth/continue?error=${msg}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/continue?error=${encodeURIComponent("missing_code")}`,
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(
      `${origin}/auth/continue?error=${encodeURIComponent("config")}`,
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const friendly =
      error.message.toLowerCase().includes("pkce") ||
      error.message.toLowerCase().includes("verifier")
        ? "signin_incomplete"
        : error.message;
    return NextResponse.redirect(
      `${origin}/auth/continue?error=${encodeURIComponent(friendly)}`,
    );
  }

  return NextResponse.redirect(`${origin}/auth/continue`);
}
