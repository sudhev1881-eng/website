/**
 * Feature detection and user-facing copy for Web NFC availability.
 *
 * Web NFC requires:
 * - Android Chrome (or Chromium-based browser with Web NFC)
 * - Secure context (HTTPS or localhost)
 * - Device NFC hardware enabled
 * - User gesture to start scan/write (permission prompt)
 */

import { NfcError, type NfcErrorCode } from "./types";

export function isSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

/** True when the Web NFC API constructor is present. */
export function isWebNfcSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.NDEFReader === "function";
}

export function getWebNfcSupportMessage(): string {
  if (typeof window === "undefined") {
    return "Web NFC is only available in the browser.";
  }
  if (!isSecureContext()) {
    return "Web NFC requires a secure context (HTTPS or localhost). Open this admin page over HTTPS.";
  }
  if (!isWebNfcSupported()) {
    return "Web NFC is not available in this browser. Use Android Chrome with NFC enabled to write cards from the dashboard.";
  }
  return "Web NFC is available. Hold an NTAG card near your phone to write.";
}

/**
 * Map DOMException / unknown errors from NDEFReader into typed NfcError codes.
 * @see https://w3c.github.io/web-nfc/#error-handling
 */
export function mapNfcDomError(err: unknown): NfcError {
  if (err instanceof NfcError) return err;

  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
        return new NfcError(
          "permission_denied",
          "NFC permission was denied. Allow NFC access when Chrome prompts, then try again.",
        );
      case "NotSupportedError":
        return new NfcError(
          "unsupported_tag",
          "This tag type is not supported for NDEF URL writing. Use NTAG213, NTAG215, or NTAG216.",
        );
      case "NotReadableError":
        return new NfcError(
          "tag_removed",
          "The tag was removed too early or could not be read. Hold the card steady and try again.",
        );
      case "InvalidStateError":
        return new NfcError(
          "unavailable",
          "NFC is busy or in an invalid state. Close other NFC apps and try again.",
        );
      case "AbortError":
        return new NfcError("aborted", "NFC operation was cancelled.");
      case "NetworkError":
        // Spec uses NetworkError when the tag is lost mid-transfer
        return new NfcError(
          "tag_removed",
          "Connection to the tag was lost. Keep the card against the phone until writing finishes.",
        );
      default:
        break;
    }

    const msg = err.message.toLowerCase();
    if (msg.includes("read-only") || msg.includes("readonly")) {
      return new NfcError(
        "read_only",
        "This tag is locked read-only and cannot be rewritten.",
      );
    }
    if (msg.includes("nfc") && (msg.includes("disabled") || msg.includes("off"))) {
      return new NfcError(
        "disabled",
        "NFC appears to be turned off. Enable NFC in Android Settings and try again.",
      );
    }
  }

  if (err instanceof Error) {
    return new NfcError("write_failed", err.message || "NFC write failed.");
  }

  return new NfcError("unknown", "An unexpected NFC error occurred.");
}

export function friendlyErrorTitle(code: NfcErrorCode): string {
  switch (code) {
    case "unsupported":
      return "Browser not supported";
    case "insecure_context":
      return "HTTPS required";
    case "unavailable":
      return "NFC unavailable";
    case "disabled":
      return "NFC disabled";
    case "permission_denied":
      return "Permission denied";
    case "tag_removed":
      return "Tag removed early";
    case "read_only":
      return "Read-only tag";
    case "unsupported_tag":
      return "Unsupported tag";
    case "write_failed":
      return "Write failed";
    case "verify_failed":
      return "Verification failed";
    case "aborted":
      return "Cancelled";
    default:
      return "NFC error";
  }
}
