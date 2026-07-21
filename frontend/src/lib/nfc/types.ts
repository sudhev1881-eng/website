/**
 * Shared NFC types for the admin Web NFC writer flow.
 */

/** UI / state-machine phases shown in NFCWriterModal. */
export type NfcWriterStatus =
  | "idle"
  | "unsupported"
  | "ready"
  | "scanning"
  | "writing"
  | "verifying"
  | "success"
  | "failed"
  | "cancelled";

/** Friendly labels for status indicator copy. */
export const NFC_STATUS_LABELS: Record<NfcWriterStatus, string> = {
  idle: "Idle",
  unsupported: "Not supported",
  ready: "Ready to scan",
  scanning: "Hold card near phone",
  writing: "Writing...",
  verifying: "Verifying...",
  success: "Success",
  failed: "Failed",
  cancelled: "Cancelled",
};

export type NfcErrorCode =
  | "unsupported"
  | "insecure_context"
  | "unavailable"
  | "disabled"
  | "permission_denied"
  | "tag_removed"
  | "read_only"
  | "unsupported_tag"
  | "write_failed"
  | "verify_failed"
  | "aborted"
  | "unknown";

export class NfcError extends Error {
  readonly code: NfcErrorCode;

  constructor(code: NfcErrorCode, message: string) {
    super(message);
    this.name = "NfcError";
    this.code = code;
  }
}

export interface NfcWriteVerifyResult {
  success: boolean;
  urlWritten: string;
  urlRead: string | null;
  verified: boolean;
  serialNumber: string | null;
}

export interface MarkProgrammedPayload {
  studentId: string;
  studentSlug: string;
  urlWritten: string;
  cardUid?: string | null;
  cardNumber?: string | null;
  verified: boolean;
}
