/**
 * Ambient TypeScript definitions for the Web NFC API (W3C).
 *
 * Chrome on Android exposes `NDEFReader` in secure contexts (HTTPS or localhost).
 * Desktop Chrome and Safari do not implement Web NFC — feature-detect at runtime.
 *
 * @see https://w3c.github.io/web-nfc/
 */

export {};

declare global {
  /** Payload for constructing an NDEF message to write. */
  interface NDEFMessageInit {
    records: NDEFRecordInit[];
  }

  /** One NDEF record in a write payload. */
  interface NDEFRecordInit {
    /** Well-known types: "url", "text", "mime", "absolute-url", "empty", "unknown", "smart-poster" */
    recordType: string;
    mediaType?: string;
    id?: string;
    /** For URL records, pass the absolute URL string. */
    data?: string | BufferSource | NDEFMessageInit;
    encoding?: string;
    lang?: string;
  }

  interface NDEFMessage {
    readonly records: readonly NDEFRecord[];
  }

  interface NDEFRecord {
    readonly recordType: string;
    readonly mediaType: string | null;
    readonly id: string;
    readonly encoding: string | null;
    readonly lang: string | null;
    readonly data: DataView | null;
    toRecords?(): NDEFRecord[] | null;
  }

  interface NDEFReadingEvent extends Event {
    readonly message: NDEFMessage;
    /** Tag UID as hex string when available. */
    readonly serialNumber: string;
  }

  interface NDEFWriteOptions {
    /** Abort in-flight write (e.g. when the admin closes the modal). */
    signal?: AbortSignal;
    /** Overwrite existing NDEF content. Default true in most browsers. */
    overwrite?: boolean;
  }

  interface NDEFScanOptions {
    signal?: AbortSignal;
  }

  /**
   * Web NFC reader/writer.
   * Instantiating does not request permission — permission is prompted on first
   * `scan()` or `write()` that requires NFC hardware access.
   */
  interface NDEFReader extends EventTarget {
    scan(options?: NDEFScanOptions): Promise<void>;
    write(
      message: NDEFMessageInit | string,
      options?: NDEFWriteOptions,
    ): Promise<void>;
    makeReadOnly?(options?: { signal?: AbortSignal }): Promise<void>;
    onreading: ((this: NDEFReader, event: NDEFReadingEvent) => void) | null;
    onreadingerror: ((this: NDEFReader, event: Event) => void) | null;
  }

  var NDEFReader: {
    prototype: NDEFReader;
    new (): NDEFReader;
  };

  interface Window {
    NDEFReader?: typeof NDEFReader;
  }
}
