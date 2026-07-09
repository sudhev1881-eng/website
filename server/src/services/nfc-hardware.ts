/**
 * USB NFC reader integration via PC/SC (ACR122U and compatible readers).
 * Only loaded when NFC_READER_ENABLED=true on the server.
 */

import type { Reader, Card } from "nfc-pcsc";
import type { NfcReaderStatus, NfcWriteResult } from "./nfc.js";
import {
  buildNdefUriMessage,
  encapsulateNdef,
  parseUriFromTagData,
  urisMatch,
} from "./nfc-ndef.js";

const DEFAULT_TIMEOUT_MS = Number(process.env.NFC_CARD_TIMEOUT_MS ?? "30000");

interface PendingProgram {
  profileUrl: string;
  resolve: (result: NfcWriteResult) => void;
  timer: NodeJS.Timeout;
}

class NfcHardwareManager {
  private readers = new Map<string, Reader>();
  private initialized = false;
  private initError: string | null = null;
  private pending: PendingProgram | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const { NFC } = await import("nfc-pcsc");
      const nfc = new NFC();

      nfc.on("reader", (reader: Reader) => {
        const name = reader.reader.name;
        console.log(`[NFC] Reader attached: ${name}`);
        this.readers.set(name, reader);

        reader.on("end", () => {
          console.log(`[NFC] Reader detached: ${name}`);
          this.readers.delete(name);
        });

        reader.on("error", (err: Error) => {
          console.error(`[NFC] Reader error (${name}):`, err.message);
        });

        reader.on("card", async (card: Card) => {
          const pending = this.pending;
          if (!pending) return;

          clearTimeout(pending.timer);
          this.pending = null;

          try {
            const result = await this.writeAndVerify(reader, card, pending.profileUrl);
            pending.resolve(result);
          } catch (err) {
            pending.resolve({
              success: false,
              verified: false,
              message: err instanceof Error ? err.message : "Card write failed",
            });
          }
        });
      });
    } catch (err) {
      this.initError =
        err instanceof Error ? err.message : "Failed to initialize NFC/PCSC";
      console.error("[NFC] Hardware init failed:", this.initError);
    }
  }

  getStatus(): NfcReaderStatus {
    if (this.initError) {
      return {
        connected: false,
        readerName: null,
        mode: "hardware",
        message: `NFC init error: ${this.initError}. Install pcscd and libpcsclite-dev, then restart the API.`,
      };
    }

    const names = [...this.readers.keys()];
    if (names.length === 0) {
      return {
        connected: false,
        readerName: null,
        mode: "hardware",
        message:
          "No reader detected. Plug the USB reader into the server and ensure pcscd is running (sudo systemctl start pcscd).",
      };
    }

    return {
      connected: true,
      readerName: names[0],
      mode: "hardware",
      message: this.pending
        ? "Reader ready — place NTAG card on reader now"
        : "Reader ready",
    };
  }

  async programCard(profileUrl: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<NfcWriteResult> {
    await this.initialize();

    if (this.initError) {
      return { success: false, verified: false, message: this.initError };
    }

    if (this.readers.size === 0) {
      return {
        success: false,
        verified: false,
        message:
          "No NFC reader connected. Plug the USB reader into the Ubuntu server (not the admin's PC).",
      };
    }

    if (this.pending) {
      return {
        success: false,
        verified: false,
        message: "Another card programming operation is already in progress.",
      };
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending = null;
        resolve({
          success: false,
          verified: false,
          message: `Timed out after ${timeoutMs / 1000}s waiting for card. Place an NTAG card on the reader and try again.`,
        });
      }, timeoutMs);

      this.pending = { profileUrl, resolve, timer };
    });
  }

  private async writeAndVerify(
    reader: Reader,
    card: Card,
    profileUrl: string,
  ): Promise<NfcWriteResult> {
    if (!card.uid) {
      throw new Error("Could not read card UID. Use NTAG21x tags (ISO 14443-3).");
    }

    if (card.type !== "TAG_ISO_14443_3") {
      throw new Error(
        `Unsupported card type (${card.type}). StudentLink expects NTAG21x tags.`,
      );
    }

    const uid = card.uid.toUpperCase();
    const ndefMessage = buildNdefUriMessage(profileUrl);
    const tlvData = encapsulateNdef(ndefMessage);

    // NTAG pages are 4 bytes; pad TLV to a 4-byte boundary
    const padded = Buffer.alloc(Math.ceil(tlvData.length / 4) * 4);
    tlvData.copy(padded);

    await reader.write(4, padded);

    const readBack = await reader.read(4, Math.max(padded.length, 48));
    const parsedUri = parseUriFromTagData(readBack);
    const verified = parsedUri !== null && urisMatch(profileUrl, parsedUri);

    if (!verified) {
      return {
        success: false,
        cardUid: uid,
        urlWritten: profileUrl,
        verified: false,
        message: `Write completed but verification failed. Card contains: ${parsedUri ?? "no URI"}`,
      };
    }

    return {
      success: true,
      cardUid: uid,
      urlWritten: profileUrl,
      verified: true,
      message: `Card programmed with ${profileUrl}`,
    };
  }
}

export const nfcHardware = new NfcHardwareManager();
