import multer from "multer";

const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype) && /\.(pdf|doc|docx)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"));
    }
  },
});

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

/**
 * Verify file content matches its claimed type via magic bytes,
 * so a renamed executable can't sneak through the mimetype filter.
 */
export function verifyFileSignature(
  buffer: Buffer,
  kind: "image" | "resume",
): boolean {
  if (kind === "image") {
    return (
      startsWith(buffer, [0xff, 0xd8, 0xff]) || // JPEG
      startsWith(buffer, [0x89, 0x50, 0x4e, 0x47]) || // PNG
      startsWith(buffer, [0x47, 0x49, 0x46, 0x38]) || // GIF8
      (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && // RIFF…WEBP
        startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8))
    );
  }

  return (
    startsWith(buffer, [0x25, 0x50, 0x44, 0x46]) || // %PDF
    startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0]) || // legacy DOC (OLE2)
    startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) // DOCX (ZIP)
  );
}
