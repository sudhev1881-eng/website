import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Backend NFC URL convention (mirrors frontend `buildNfcProfileUrl` and
 * `NfcService.buildProfileUrl`). Kept free of getEnv() so unit tests run
 * without a full .env.
 */
function buildProfileUrl(siteUrl: string, studentSlug: string): string {
  return `${siteUrl.replace(/\/$/, "")}/u/${studentSlug}?src=nfc`;
}

describe("NFC profile URL convention", () => {
  it("builds /u/{slug}?src=nfc from SITE_URL", () => {
    assert.equal(
      buildProfileUrl("https://studentlink.example/", "alex-morgan"),
      "https://studentlink.example/u/alex-morgan?src=nfc",
    );
  });
});
