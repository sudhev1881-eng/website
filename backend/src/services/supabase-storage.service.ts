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

function buildObjectPath(category: FileCategory, ownerId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  return `${category}/${ownerId}/${uniqueName}`;
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
): Promise<{ relativePath: string; publicUrl: string; sizeBytes: number }> {
  await ensureStorageReady();
  const relativePath = buildObjectPath(category, ownerId, fileName);
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
