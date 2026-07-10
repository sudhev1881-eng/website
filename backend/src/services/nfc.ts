/**
 * NFC Service — cloud-native mode
 *
 * Physical USB readers are not used in cloud deployment.
 * Cards are assigned in the database with the profile URL recruiters should open.
 * Universities program blank NFC tags externally with the same URL, or use QR codes.
 */

import { getEnv } from "../config/env.js";

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
  mode: "cloud" | "stub";
}

export class NfcService {
  buildProfileUrl(studentSlug: string): string {
    const siteUrl = getEnv().SITE_URL.replace(/\/$/, "");
    return `${siteUrl}/u/${studentSlug}?src=nfc`;
  }

  async getStatus(): Promise<NfcReaderStatus> {
    return {
      connected: true,
      readerName: null,
      mode: "cloud",
      message:
        "Cloud NFC mode — assign profile URLs in admin. Program physical tags with the generated URL or distribute QR codes.",
    };
  }

  async programCard(studentSlug: string, _cardNumber?: string): Promise<NfcWriteResult> {
    const profileUrl = this.buildProfileUrl(studentSlug);
    return {
      success: true,
      cardUid: `CLOUD-${Date.now().toString(16).toUpperCase()}`,
      urlWritten: profileUrl,
      verified: true,
      message: `Profile URL registered: ${profileUrl}. Program this URL onto NFC tags using your card vendor tools.`,
    };
  }
}

export const nfcService = new NfcService();
