import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildNfcProfileUrl,
  getSiteOrigin,
  normalizeProfileUrl,
  urlsMatch,
} from "./profile-url.js";

describe("getSiteOrigin", () => {
  it("strips trailing slash from env URL", () => {
    assert.equal(getSiteOrigin("https://example.com/", undefined), "https://example.com");
  });

  it("uses fallback when env is empty", () => {
    assert.equal(getSiteOrigin("", "https://fallback.test/"), "https://fallback.test");
  });
});

describe("buildNfcProfileUrl", () => {
  it("builds /u/{slug}?src=nfc", () => {
    assert.equal(
      buildNfcProfileUrl("alex-morgan", { siteUrl: "https://studentlink.example" }),
      "https://studentlink.example/u/alex-morgan?src=nfc",
    );
  });

  it("can omit src=nfc", () => {
    assert.equal(
      buildNfcProfileUrl("alex-morgan", {
        siteUrl: "https://studentlink.example",
        includeNfcSource: false,
      }),
      "https://studentlink.example/u/alex-morgan",
    );
  });

  it("throws when username empty", () => {
    assert.throws(() => buildNfcProfileUrl("  ", { siteUrl: "https://x.com" }));
  });

  it("throws when no origin available", () => {
    assert.throws(() => buildNfcProfileUrl("alex", { siteUrl: "" }));
  });
});

describe("urlsMatch / normalizeProfileUrl", () => {
  it("matches equivalent URLs ignoring trailing slash", () => {
    const a = "https://example.com/u/alex?src=nfc";
    const b = "https://example.com/u/alex/?src=nfc";
    assert.equal(normalizeProfileUrl(a), normalizeProfileUrl(b));
    assert.equal(urlsMatch(a, b), true);
  });

  it("rejects different usernames", () => {
    assert.equal(
      urlsMatch(
        "https://example.com/u/alex?src=nfc",
        "https://example.com/u/jamie?src=nfc",
      ),
      false,
    );
  });

  it("rejects null / empty read-back", () => {
    assert.equal(urlsMatch("https://example.com/u/alex?src=nfc", null), false);
    assert.equal(urlsMatch("https://example.com/u/alex?src=nfc", ""), false);
  });
});
