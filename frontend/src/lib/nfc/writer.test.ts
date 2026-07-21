import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { urlsMatch } from "./profile-url.js";
import { NfcError } from "./types.js";

/**
 * Lightweight integration-style tests for URL verify matching and error typing.
 * NDEFReader itself is mocked — real hardware is covered manually on Android.
 */

describe("NfcError", () => {
  it("carries a stable error code", () => {
    const err = new NfcError("verify_failed", "mismatch");
    assert.equal(err.code, "verify_failed");
    assert.equal(err.name, "NfcError");
    assert.ok(err instanceof Error);
  });
});

describe("verify match after write (mocked reader payload)", () => {
  it("treats written and read URLs as matching when normalized equal", () => {
    const expected = "https://app.example/u/sam?src=nfc";
    const fromTag = "https://app.example/u/sam/?src=nfc";
    assert.equal(urlsMatch(expected, fromTag), true);
  });

  it("fails verification when tag has a different path", () => {
    const expected = "https://app.example/u/sam?src=nfc";
    const fromTag = "https://app.example/u/other?src=nfc";
    assert.equal(urlsMatch(expected, fromTag), false);
  });
});

describe("mocked NDEFReader write contract", () => {
  it("accepts a single url record payload shape", async () => {
    const writes: unknown[] = [];

    class FakeNDEFReader {
      async write(message: { records: Array<{ recordType: string; data: string }> }) {
        writes.push(message);
      }
      async scan() {
        /* no-op */
      }
    }

    const reader = new FakeNDEFReader();
    const url = "https://app.example/u/sam?src=nfc";
    await reader.write({ records: [{ recordType: "url", data: url }] });

    assert.equal(writes.length, 1);
    const payload = writes[0] as { records: Array<{ recordType: string; data: string }> };
    assert.equal(payload.records[0].recordType, "url");
    assert.equal(payload.records[0].data, url);
  });

  it("propagates abort via signal mock", async () => {
    const controller = new AbortController();
    controller.abort();

    const write = mock.fn(async (_msg: unknown, opts?: { signal?: AbortSignal }) => {
      if (opts?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
    });

    await assert.rejects(
      () => write({ records: [] }, { signal: controller.signal }),
      (err: unknown) => err instanceof DOMException && err.name === "AbortError",
    );
  });
});
