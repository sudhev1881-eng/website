export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@studentlink.app";

export const PROFILE_NOT_REGISTERED_MESSAGE =
  `Your admin hasn't added your profile yet. Please contact your admin or email us at ${SUPPORT_EMAIL}.`;

export const SIGNIN_INCOMPLETE_MESSAGE =
  "Sign-in didn't finish. Please go back and try Continue with Google again.";

/** Map raw Supabase / API errors to user-facing copy. */
export function friendlyAuthError(raw: string | null | undefined): string {
  if (!raw) return SIGNIN_INCOMPLETE_MESSAGE;

  const lower = raw.toLowerCase();

  if (
    lower.includes("pkce") ||
    lower.includes("verifier") ||
    lower.includes("signin_incomplete") ||
    lower.includes("missing_code") ||
    lower.includes("session expired") ||
    lower === "config"
  ) {
    return SIGNIN_INCOMPLETE_MESSAGE;
  }

  if (
    lower.includes("no matching student") ||
    lower.includes("not match") ||
    lower.includes("not found") ||
    lower.includes("hasn't added") ||
    lower.includes("not registered")
  ) {
    return PROFILE_NOT_REGISTERED_MESSAGE;
  }

  if (lower.includes("already claimed")) {
    return "This student profile is already claimed. Sign in with the Google account that claimed it, or contact your admin.";
  }

  // Never show long technical dumps in the UI
  if (raw.length > 160 || lower.includes("storage") || lower.includes("ssr")) {
    return SIGNIN_INCOMPLETE_MESSAGE;
  }

  return raw;
}
