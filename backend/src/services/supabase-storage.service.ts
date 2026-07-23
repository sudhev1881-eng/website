import { getSupabaseAdmin } from "../lib/supabase.js";
import { getEnv } from "../config/env.js";
import { logger } from "../config/logger.js";

export type FileCategory =
  | "resumes"
  | "avatars"
  | "covers"
  | "projects"
  | "certificates"
  | "other";

const CATEGORY_LABELS: Record<FileCategory, string> = {
  resumes: "Resumes",
  avatars: "Profile Images",
  covers: "Cover Images",
  projects: "Project Assets",
  certificates: "Certificates",
  other: "Other",
};

function bucketName(): string {
  return getEnv().SUPABASE_STORAGE_BUCKET;
}

const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;

function decodePathSegments(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

function extractStorageEndpointPath(value: string): string | null {
  const withoutQuery = value.split("?")[0];
  let pathname = withoutQuery;

  if (value.includes("://")) {
    try {
      pathname = new URL(value).pathname;
    } catch {
      return null;
    }
  }

  for (const marker of ["/storage/v1/object/public/", "/storage/v1/object/sign/"]) {
    const idx = pathname.indexOf(marker);
    if (idx === -1) continue;

    const afterMarker = pathname.slice(idx + marker.length);
    const slash = afterMarker.indexOf("/");
    if (slash === -1) return null;
    return decodePathSegments(afterMarker.slice(slash + 1));
  }

  return null;
}

export function normalizeStorageObjectPath(filePath: string | null | undefined): string | null {
  const trimmed = filePath?.trim();
  if (!trimmed) return null;

  const endpointPath = extractStorageEndpointPath(trimmed);
  if (endpointPath) return endpointPath;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return decodePathSegments(trimmed.replace(/^\/api\/uploads\//, "").replace(/^\//, ""));
}

function buildObjectPath(
  category: FileCategory,
  ownerId: string,
  fileName: string,
  subfolder?: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  const base = subfolder?.trim()
    ? `${category}/${ownerId}/${subfolder.replace(/[^a-zA-Z0-9._/-]/g, "_")}`
    : `${category}/${ownerId}`;
  return `${base}/${uniqueName}`;
}

export function getPublicFileUrl(objectPath: string): string {
  const env = getEnv();
  const encoded = objectPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${env.SUPABASE_URL}/storage/v1/object/public/${bucketName()}/${encoded}`;
}

export async function ensureStorageReady(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const bucket = bucketName();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  const exists = buckets?.some((b) => b.name === bucket);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
    });
    if (createError && !createError.message.includes("already exists")) {
      throw createError;
    }
    logger.info("Created Supabase storage bucket", { bucket });
  }
}

export async function saveFile(
  category: FileCategory,
  ownerId: string,
  fileName: string,
  buffer: Buffer,
  contentType?: string,
  options?: { subfolder?: string },
): Promise<{ relativePath: string; publicUrl: string; sizeBytes: number }> {
  await ensureStorageReady();
  const relativePath = buildObjectPath(category, ownerId, fileName, options?.subfolder);
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage.from(bucketName()).upload(relativePath, buffer, {
    contentType: contentType ?? "application/octet-stream",
    upsert: false,
  });

  if (error) throw error;

  return {
    relativePath,
    publicUrl: getPublicFileUrl(relativePath),
    sizeBytes: buffer.length,
  };
}

export async function deleteFile(relativePath: string | null | undefined): Promise<void> {
  if (!relativePath) return;
  const supabase = getSupabaseAdmin();
  await supabase.storage.from(bucketName()).remove([relativePath]);
}

/** Download an object via the service-role client (not a public/anon URL guess). */
export async function downloadFile(relativePath: string): Promise<Buffer> {
  const path = normalizeStorageObjectPath(relativePath);
  if (!path || path.startsWith("http://") || path.startsWith("https://")) {
    throw new Error(`Invalid storage object path: ${relativePath}`);
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucketName()).download(path);
  if (error || !data) {
    throw new Error(error?.message ?? `Failed to download storage object: ${path}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

/** Resolve a stored relative path (or legacy /api/uploads/… URL) to a public HTTPS URL. */
export function resolvePublicFileUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  const path = normalizeStorageObjectPath(filePath);
  if (!path || path.startsWith("http://") || path.startsWith("https://")) return path;
  return getPublicFileUrl(path);
}

export async function createSignedFileUrl(
  filePath: string | null | undefined,
  expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS,
): Promise<string | null> {
  const path = normalizeStorageObjectPath(filePath);
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(bucketName())
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? `Failed to create signed URL for storage object: ${path}`);
  }

  return data.signedUrl;
}

export interface StorageBreakdownItem {
  type: string;
  category: FileCategory;
  sizeGb: number;
  count: number;
}

export interface StorageStats {
  usedGb: number;
  totalGb: number;
  usedPercent: number;
  breakdown: StorageBreakdownItem[];
}

export async function getStorageStats(): Promise<StorageStats> {
  await ensureStorageReady();
  const supabase = getSupabaseAdmin();
  const order: FileCategory[] = [
    "resumes",
    "avatars",
    "covers",
    "projects",
    "certificates",
    "other",
  ];

  const breakdown: StorageBreakdownItem[] = [];
  let totalBytes = 0;

  for (const category of order) {
    const { data, error } = await supabase.storage.from(bucketName()).list(category, { limit: 1000 });
    if (error || !data?.length) continue;

    let bytes = 0;
    for (const file of data) {
      if (file.metadata?.size) bytes += file.metadata.size;
    }
    totalBytes += bytes;
    breakdown.push({
      type: CATEGORY_LABELS[category],
      category,
      sizeGb: Math.round((bytes / 1024 ** 3) * 100) / 100,
      count: data.length,
    });
  }

  const usedGb = Math.round((totalBytes / 1024 ** 3) * 100) / 100;
  const totalGb = 100;
  const usedPercent = totalGb > 0 ? Math.round((usedGb / totalGb) * 1000) / 10 : 0;

  return { usedGb, totalGb, usedPercent, breakdown };
}

export function getStorageQuotaGb(): number {
  return 100;
}

export function getStoragePath(): string {
  return `supabase://${bucketName()}`;
}
