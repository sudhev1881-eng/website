import fs from "node:fs/promises";
import path from "node:path";

export type FileCategory = "resumes" | "avatars" | "covers" | "projects" | "certificates" | "other";

const STORAGE_PATH =
  process.env.STORAGE_PATH ?? path.join(process.cwd(), "uploads");

const STORAGE_QUOTA_GB = Number(process.env.STORAGE_QUOTA_GB ?? "100");

export function getStoragePath(): string {
  return STORAGE_PATH;
}

export function getStorageQuotaGb(): number {
  return STORAGE_QUOTA_GB;
}

export function getPublicFileUrl(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  return `/api/uploads/${normalized}`;
}

export async function ensureStorageReady(): Promise<void> {
  const categories: FileCategory[] = [
    "resumes",
    "avatars",
    "covers",
    "projects",
    "certificates",
    "other",
  ];
  await fs.mkdir(STORAGE_PATH, { recursive: true });
  await Promise.all(
    categories.map((cat) => fs.mkdir(path.join(STORAGE_PATH, cat), { recursive: true })),
  );
}

export async function saveFile(
  category: FileCategory,
  ownerId: string,
  fileName: string,
  buffer: Buffer,
): Promise<{ relativePath: string; publicUrl: string; sizeBytes: number }> {
  await ensureStorageReady();

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  const relativePath = path.posix.join(category, ownerId, uniqueName);
  const absolutePath = path.join(STORAGE_PATH, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return {
    relativePath,
    publicUrl: getPublicFileUrl(relativePath),
    sizeBytes: buffer.length,
  };
}

export async function deleteFile(relativePath: string | null | undefined): Promise<void> {
  if (!relativePath) return;
  const absolutePath = path.join(STORAGE_PATH, relativePath);
  try {
    await fs.unlink(absolutePath);
  } catch {
    // File may already be gone
  }
}

function categoryFromRelativePath(relativePath: string): FileCategory {
  const top = relativePath.split("/")[0];
  if (
    top === "resumes" ||
    top === "avatars" ||
    top === "covers" ||
    top === "projects" ||
    top === "certificates"
  ) {
    return top;
  }
  return "other";
}

const CATEGORY_LABELS: Record<FileCategory, string> = {
  resumes: "Resumes",
  avatars: "Profile Images",
  covers: "Cover Images",
  projects: "Project Assets",
  certificates: "Certificates",
  other: "Other",
};

async function walkDir(dir: string): Promise<Array<{ path: string; size: number }>> {
  const results: Array<{ path: string; size: number }> = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath)));
    } else if (entry.isFile()) {
      const stat = await fs.stat(fullPath);
      results.push({ path: fullPath, size: stat.size });
    }
  }
  return results;
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

  const files = await walkDir(STORAGE_PATH);
  const byCategory = new Map<FileCategory, { bytes: number; count: number }>();

  for (const file of files) {
    const relative = path.relative(STORAGE_PATH, file.path).replace(/\\/g, "/");
    const category = categoryFromRelativePath(relative);
    const current = byCategory.get(category) ?? { bytes: 0, count: 0 };
    current.bytes += file.size;
    current.count += 1;
    byCategory.set(category, current);
  }

  const order: FileCategory[] = [
    "resumes",
    "avatars",
    "covers",
    "projects",
    "certificates",
    "other",
  ];

  const breakdown: StorageBreakdownItem[] = order
    .filter((cat) => byCategory.has(cat))
    .map((cat) => {
      const data = byCategory.get(cat)!;
      return {
        type: CATEGORY_LABELS[cat],
        category: cat,
        sizeGb: Math.round((data.bytes / 1024 ** 3) * 100) / 100,
        count: data.count,
      };
    });

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const usedGb = Math.round((totalBytes / 1024 ** 3) * 100) / 100;
  const totalGb = STORAGE_QUOTA_GB;
  const usedPercent = totalGb > 0 ? Math.round((usedGb / totalGb) * 1000) / 10 : 0;

  return { usedGb, totalGb, usedPercent, breakdown };
}
