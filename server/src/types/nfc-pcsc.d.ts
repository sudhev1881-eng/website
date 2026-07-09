declare module "nfc-pcsc" {
  import type { EventEmitter } from "node:events";

  export interface Card {
    type: string;
    standard: string;
    uid?: string;
  }

  export class Reader extends EventEmitter {
    reader: { name: string };
    on(event: "card", listener: (card: Card) => void): this;
    on(event: "card.off", listener: (card: Card) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    read(blockNumber: number, length: number, blockSize?: number, packetSize?: number): Promise<Buffer>;
    write(blockNumber: number, data: Buffer, blockSize?: number): Promise<void>;
  }

  export class NFC extends EventEmitter {
    on(event: "reader", listener: (reader: Reader) => void): this;
  }
}

declare module "ndef" {
  interface NdefRecord {
    type: string;
    value?: string;
  }

  function uriRecord(uri: string): unknown;
  function encodeMessage(records: unknown[]): number[];
  function decodeMessage(bytes: number[] | Buffer): NdefRecord[];

  const ndef: {
    uriRecord: typeof uriRecord;
    encodeMessage: typeof encodeMessage;
    decodeMessage: typeof decodeMessage;
    TNF_WELL_KNOWN: number;
    RTD_URI: string;
  };

  export default ndef;
}
