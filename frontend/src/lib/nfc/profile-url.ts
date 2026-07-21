/**
 * Build the public profile URL that NFC tags should open.
 *
 * Canonical format (matches backend `NfcService.buildProfileUrl`):
 *   `{SITE_URL}/u/{username}?src=nfc`
 *
 * Prefer `NEXT_PUBLIC_SITE_URL` so tags work in production even when an admin
 * programs from a preview / localhost origin. Fall back to `window.location.origin`
 * only in the browser when the env var is unset.
 */

export function getSiteOrigin(
  envSiteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
  fallbackOrigin?: string,
): string {
  const fromEnv = envSiteUrl?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return "";
}

/**
 * @param username - Student public username (slug), not UUID
 * @param options.includeNfcSource - Append `?src=nfc` for tap analytics (default true)
 */
export function buildNfcProfileUrl(
  username: string,
  options?: {
    siteUrl?: string;
    fallbackOrigin?: string;
    includeNfcSource?: boolean;
  },
): string {
  const slug = username.trim().replace(/^\/+|\/+$/g, "");
  if (!slug) {
    throw new Error("Student username is required to build an NFC profile URL");
  }

  const origin = getSiteOrigin(options?.siteUrl, options?.fallbackOrigin);
  if (!origin) {
    throw new Error(
      "SITE_URL is not configured. Set NEXT_PUBLIC_SITE_URL or program from a browser context.",
    );
  }

  const includeSource = options?.includeNfcSource !== false;
  const path = `/u/${encodeURIComponent(slug)}`;
  return includeSource ? `${origin}${path}?src=nfc` : `${origin}${path}`;
}

/**
 * Normalize URLs for equality checks after a write → read-back cycle.
 * Browsers / tags may drop trailing slashes or reorder query params rarely;
 * we compare origin + pathname + src query when present.
 */
export function normalizeProfileUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const src = parsed.searchParams.get("src");
    const base = `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}`;
    return src ? `${base}?src=${src}` : base;
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

/** True when the URL read from the tag matches the URL we intended to write. */
export function urlsMatch(expected: string, actual: string | null | undefined): boolean {
  if (!actual) return false;
  return normalizeProfileUrl(expected) === normalizeProfileUrl(actual);
}
