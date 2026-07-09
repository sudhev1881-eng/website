import ndef from "ndef";

/** Build raw NDEF message bytes for a URI record. */
export function buildNdefUriMessage(url: string): Buffer {
  const message = [ndef.uriRecord(url)];
  return Buffer.from(ndef.encodeMessage(message));
}

/**
 * Wrap NDEF message in Type 2 tag TLV (0x03 … 0xFE).
 * Required for Android / iOS to recognize the tag as NDEF-formatted.
 */
export function encapsulateNdef(ndefMessage: Buffer): Buffer {
  if (ndefMessage.length < 255) {
    return Buffer.concat([
      Buffer.from([0x03, ndefMessage.length]),
      ndefMessage,
      Buffer.from([0xfe]),
    ]);
  }

  const len = ndefMessage.length;
  return Buffer.concat([
    Buffer.from([0x03, 0xff, (len >> 8) & 0xff, len & 0xff]),
    ndefMessage,
    Buffer.from([0xfe]),
  ]);
}

/** Parse the first URI from raw tag memory (TLV-wrapped NDEF). */
export function parseUriFromTagData(data: Buffer): string | null {
  let i = 0;
  while (i < data.length) {
    const tlvType = data[i];
    if (tlvType === 0x00) {
      i += 1;
      continue;
    }
    if (tlvType === 0xfe) break;
    if (tlvType !== 0x03) break;

    let length = data[i + 1];
    let offset = i + 2;
    if (length === 0xff) {
      length = (data[i + 2] << 8) | data[i + 3];
      offset = i + 4;
    }

    const ndefBytes = data.subarray(offset, offset + length);
    const records = ndef.decodeMessage([...ndefBytes]);
    for (const record of records) {
      if (record.type === ndef.RTD_URI && record.value) {
        return record.value;
      }
    }
    return null;
  }
  return null;
}

/** Compare URIs ignoring trailing slashes and minor encoding differences. */
export function urisMatch(expected: string, actual: string): boolean {
  const norm = (u: string) => u.trim().toLowerCase().replace(/\/$/, "");
  return norm(expected) === norm(actual);
}
