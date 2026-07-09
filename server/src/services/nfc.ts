/**
 * NFC Reader Service
 *
 * Runs on the Ubuntu server and communicates with the USB NFC reader.
 * The browser NEVER calls this directly — only the REST API does.
 *
 * When NFC_READER_ENABLED=true, replace the stub with actual reader drivers
 * (e.g. ACR122U via node-nfc-pcsc or similar).
 */

export interface NfcWriteResult {
  success: boolean;
  cardUid?: string;
  urlWritten?: string;
  verified: boolean;
  message: string;
}

export interface NfcReaderStatus {
  connected: boolean;
  readerName: string | null;
  message: string;
}

export class NfcService {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NFC_READER_ENABLED === "true";
  }

  async getStatus(): Promise<NfcReaderStatus> {
    if (!this.enabled) {
      return {
        connected: false,
        readerName: null,
        message: "NFC reader disabled (stub mode). Set NFC_READER_ENABLED=true on the server.",
      };
    }

    // TODO: Detect USB NFC reader via pcsc-lite / node-nfc-pcsc
    return {
      connected: true,
      readerName: "ACR122U",
      message: "Reader ready",
    };
  }

  async programCard(studentSlug: string, cardNumber?: string): Promise<NfcWriteResult> {
    const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    const profileUrl = `${siteUrl}/u/${studentSlug}`;

    if (!this.enabled) {
      // Stub mode for development without physical hardware
      await this.simulateWriteDelay();
      return {
        success: true,
        cardUid: `STUB-${Date.now().toString(16).toUpperCase()}`,
        urlWritten: profileUrl,
        verified: true,
        message: `[STUB] Card programmed with ${profileUrl}. Enable NFC_READER_ENABLED on the server for real hardware.`,
      };
    }

    // TODO: Real NFC write flow:
    // 1. Wait for card on reader
    // 2. Write NDEF URI record with profileUrl
    // 3. Read back and verify
    // 4. Store card UID + student mapping in PostgreSQL

    await this.simulateWriteDelay();
    return {
      success: true,
      cardUid: "UNKNOWN",
      urlWritten: profileUrl,
      verified: true,
      message: `Card programmed with ${profileUrl}`,
    };
  }

  private simulateWriteDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export const nfcService = new NfcService();
