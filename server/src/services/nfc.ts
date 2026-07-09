/**
 * NFC Reader Service
 *
 * Runs on the Ubuntu server and communicates with the USB NFC reader.
 * The browser NEVER calls this directly — only the REST API does.
 *
 * NFC_READER_ENABLED=false  → stub mode (development without hardware)
 * NFC_READER_ENABLED=true   → PC/SC via nfc-pcsc (ACR122U, etc.)
 */

import { nfcHardware } from "./nfc-hardware.js";

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
  mode: "stub" | "hardware";
}

export class NfcService {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NFC_READER_ENABLED === "true";
  }

  isHardwareEnabled(): boolean {
    return this.enabled;
  }

  async initialize(): Promise<void> {
    if (this.enabled) {
      await nfcHardware.initialize();
    }
  }

  async getStatus(): Promise<NfcReaderStatus> {
    if (!this.enabled) {
      return {
        connected: false,
        readerName: null,
        mode: "stub",
        message:
          "NFC reader disabled (stub mode). Set NFC_READER_ENABLED=true on the server with a USB reader attached.",
      };
    }

    return nfcHardware.getStatus();
  }

  buildProfileUrl(studentSlug: string): string {
    const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
    return `${siteUrl}/u/${studentSlug}?src=nfc`;
  }

  async programCard(studentSlug: string, _cardNumber?: string): Promise<NfcWriteResult> {
    const profileUrl = this.buildProfileUrl(studentSlug);

    if (!this.enabled) {
      await this.simulateWriteDelay();
      return {
        success: true,
        cardUid: `STUB-${Date.now().toString(16).toUpperCase()}`,
        urlWritten: profileUrl,
        verified: true,
        message: `[STUB] Card programmed with ${profileUrl}. Set NFC_READER_ENABLED=true on the server for real hardware.`,
      };
    }

    return nfcHardware.programCard(profileUrl);
  }

  private simulateWriteDelay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

export const nfcService = new NfcService();
