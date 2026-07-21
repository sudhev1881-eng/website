/**
 * Low-level Web NFC write + read-back verification.
 *
 * Flow:
 * 1. Feature-detect NDEFReader + secure context
 * 2. Create NDEFReader (permission prompted on first write/scan)
 * 3. Write a single URL NDEF record
 * 4. Scan once to read the tag back and compare URLs
 *
 * AbortController.signal cancels in-flight write/scan when the modal closes.
 */

import { urlsMatch } from "./profile-url";
import { isSecureContext, isWebNfcSupported, mapNfcDomError } from "./support";
import { NfcError, type NfcWriteVerifyResult } from "./types";

function decodeRecordPayload(record: NDEFRecord): string | null {
  if (!record.data) return null;

  // URL / absolute-url records store UTF-8 text in the DataView
  if (record.recordType === "url" || record.recordType === "absolute-url") {
    try {
      const decoder = new TextDecoder(record.encoding ?? "utf-8");
      return decoder.decode(record.data);
    } catch {
      return null;
    }
  }

  if (record.recordType === "text") {
    try {
      const decoder = new TextDecoder(record.encoding ?? "utf-8");
      return decoder.decode(record.data);
    } catch {
      return null;
    }
  }

  return null;
}

/** Extract the first URL-like payload from an NDEF message. */
export function extractUrlFromMessage(message: NDEFMessage): string | null {
  for (const record of message.records) {
    const value = decodeRecordPayload(record);
    if (!value) continue;
    if (record.recordType === "url" || record.recordType === "absolute-url") {
      return value;
    }
    // Some writers store a bare URL as text
    if (/^https?:\/\//i.test(value)) return value;
  }
  return null;
}

async function ensureWebNfcAvailable(): Promise<void> {
  if (typeof window === "undefined") {
    throw new NfcError("unsupported", "Web NFC is only available in the browser.");
  }
  if (!isSecureContext()) {
    throw new NfcError(
      "insecure_context",
      "Web NFC requires HTTPS (or localhost). Open the admin dashboard over a secure connection.",
    );
  }
  if (!isWebNfcSupported() || typeof window.NDEFReader !== "function") {
    throw new NfcError(
      "unsupported",
      "Web NFC is not supported here. Use Android Chrome with NFC hardware.",
    );
  }
}

/**
 * Write one URL record, then immediately scan to verify the tag content.
 */
export async function writeAndVerifyNfcUrl(
  url: string,
  options?: {
    signal?: AbortSignal;
    /** Max time to wait for the user to present a tag (ms). Default 45s. */
    timeoutMs?: number;
    /**
     * Optional phase callback:
     * - scanning: waiting for the user to present a tag (during write())
     * - writing: tag contacted; write in progress / just completed
     * - verifying: read-back scan in progress
     */
    onPhase?: (phase: "scanning" | "writing" | "verifying") => void;
  },
): Promise<NfcWriteVerifyResult> {
  await ensureWebNfcAvailable();

  const signal = options?.signal;
  const timeoutMs = options?.timeoutMs ?? 45_000;
  const onPhase = options?.onPhase;

  if (signal?.aborted) {
    throw new NfcError("aborted", "NFC operation was cancelled.");
  }

  const reader = new window.NDEFReader!();

  try {
    // write() waits until a tag is presented, then writes NDEF.
    // Chrome prompts for NFC permission on this call (must be from a user gesture).
    onPhase?.("scanning");
    await reader.write(
      {
        records: [{ recordType: "url", data: url }],
      },
      { signal, overwrite: true },
    );
    onPhase?.("writing");
  } catch (err) {
    throw mapNfcDomError(err);
  }

  // Read-back verification: scan until we get one reading or timeout / abort
  onPhase?.("verifying");
  let serialNumber: string | null = null;
  let urlRead: string | null = null;

  try {
    urlRead = await new Promise<string | null>((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        reader.onreading = null;
        reader.onreadingerror = null;
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        signal?.removeEventListener("abort", onAbort);
      };

      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn();
      };

      const onAbort = () => {
        finish(() => reject(new NfcError("aborted", "NFC operation was cancelled.")));
      };

      const timeoutId = setTimeout(() => {
        finish(() =>
          reject(
            new NfcError(
              "verify_failed",
              "Timed out waiting to read the tag back. Hold the card steady and try again.",
            ),
          ),
        );
      }, timeoutMs);

      signal?.addEventListener("abort", onAbort);

      reader.onreading = (event) => {
        serialNumber = event.serialNumber || null;
        const found = extractUrlFromMessage(event.message);
        finish(() => resolve(found));
      };

      reader.onreadingerror = () => {
        finish(() =>
          reject(
            new NfcError(
              "verify_failed",
              "Could not read the tag after writing. Try again with an NTAG213/215/216 card.",
            ),
          ),
        );
      };

      reader.scan({ signal }).catch((err) => {
        finish(() => reject(mapNfcDomError(err)));
      });
    });
  } catch (err) {
    throw mapNfcDomError(err);
  }

  const verified = urlsMatch(url, urlRead);
  if (!verified) {
    throw new NfcError(
      "verify_failed",
      `Tag content did not match. Expected ${url}${urlRead ? `, read ${urlRead}` : ", read nothing"}.`,
    );
  }

  return {
    success: true,
    urlWritten: url,
    urlRead,
    verified: true,
    serialNumber,
  };
}
