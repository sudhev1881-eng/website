import { query } from "../db/pool.js";
import { getEnv } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { TelegramAdminRecord, TelegramPermissionLevel } from "./telegramTypes.js";

function mapAdmin(row: {
  id: string;
  telegram_user_id: string | number;
  user_id: string;
  email: string;
  role: "admin" | "student";
  permission_level: TelegramPermissionLevel;
  college_scope: string | null;
  display_name: string | null;
  is_active: boolean;
}): TelegramAdminRecord {
  return {
    id: row.id,
    telegramUserId: Number(row.telegram_user_id),
    userId: row.user_id,
    email: row.email,
    role: row.role,
    permissionLevel: row.permission_level,
    collegeScope: row.college_scope,
    displayName: row.display_name,
    isActive: row.is_active,
  };
}

async function findLinkedAdmin(telegramUserId: number): Promise<TelegramAdminRecord | null> {
  const result = await query<{
    id: string;
    telegram_user_id: string | number;
    user_id: string;
    email: string;
    role: "admin" | "student";
    permission_level: TelegramPermissionLevel;
    college_scope: string | null;
    display_name: string | null;
    is_active: boolean;
  }>(
    `SELECT ta.id, ta.telegram_user_id, ta.user_id, u.email, u.role,
            ta.permission_level, ta.college_scope, ta.display_name, ta.is_active
     FROM telegram_admins ta
     JOIN users u ON u.id = ta.user_id
     WHERE ta.telegram_user_id = $1
     LIMIT 1`,
    [telegramUserId],
  );
  if (!result.rowCount) return null;
  return mapAdmin(result.rows[0]);
}

/**
 * Bootstrap: if Telegram ID is listed in TELEGRAM_SUPER_ADMIN_IDS and no row exists,
 * link to the first active admin user (or ADMIN_NOTIFY_EMAIL match).
 */
async function tryBootstrapSuperAdmin(
  telegramUserId: number,
  displayName?: string,
): Promise<TelegramAdminRecord | null> {
  const env = getEnv();
  if (!env.TELEGRAM_SUPER_ADMIN_IDS.includes(telegramUserId)) {
    return null;
  }

  let adminUser = await query<{ id: string; email: string; role: "admin" | "student" }>(
    `SELECT id, email, role FROM users
     WHERE role = 'admin'
       AND ($1::text IS NULL OR lower(email) = lower($1))
     ORDER BY created_at ASC
     LIMIT 1`,
    [env.ADMIN_NOTIFY_EMAIL ?? null],
  );

  if (!adminUser.rowCount) {
    adminUser = await query<{ id: string; email: string; role: "admin" | "student" }>(
      `SELECT id, email, role FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`,
    );
  }

  if (!adminUser.rowCount) {
    logger.warn("Telegram bootstrap failed: no admin user in database", { telegramUserId });
    return null;
  }

  const user = adminUser.rows[0];
  if (user.role !== "admin") return null;

  await query(
    `INSERT INTO telegram_admins (telegram_user_id, user_id, permission_level, display_name, is_active)
     VALUES ($1, $2, 'super_admin', $3, TRUE)
     ON CONFLICT (telegram_user_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       updated_at = NOW(),
       is_active = TRUE,
       permission_level = 'super_admin',
       display_name = COALESCE(EXCLUDED.display_name, telegram_admins.display_name)`,
    [telegramUserId, user.id, displayName ?? null],
  );

  logger.audit("telegram.bootstrap_super_admin", {
    telegramUserId,
    userId: user.id,
    email: user.email,
  });

  return findLinkedAdmin(telegramUserId);
}

export class TelegramAuthError extends Error {
  constructor(
    message: string,
    public readonly code: "unauthorized" | "inactive" | "not_admin",
  ) {
    super(message);
    this.name = "TelegramAuthError";
  }
}

/**
 * Verify Telegram user against telegram_admins + StudentLink admin role.
 * Rejects unauthorized users immediately.
 */
export async function authenticateTelegramUser(
  telegramUserId: number,
  displayName?: string,
): Promise<TelegramAdminRecord> {
  let admin = await findLinkedAdmin(telegramUserId);

  if (!admin) {
    admin = await tryBootstrapSuperAdmin(telegramUserId, displayName);
  }

  if (!admin) {
    throw new TelegramAuthError("Unauthorized. Your Telegram account is not linked.", "unauthorized");
  }

  if (!admin.isActive) {
    throw new TelegramAuthError("Your Telegram admin access is disabled.", "inactive");
  }

  if (admin.role !== "admin") {
    throw new TelegramAuthError("Linked account is not a StudentLink admin.", "not_admin");
  }

  return admin;
}

export function canWrite(admin: TelegramAdminRecord): boolean {
  return admin.permissionLevel === "super_admin" || admin.permissionLevel === "college_admin";
}

export function canMutateGlobal(admin: TelegramAdminRecord): boolean {
  return admin.permissionLevel === "super_admin";
}

/** College admins may only operate on their scoped college. */
export function assertCollegeAccess(admin: TelegramAdminRecord, university: string | null | undefined): void {
  if (admin.permissionLevel !== "college_admin") return;
  const scope = (admin.collegeScope ?? "").trim().toLowerCase();
  const uni = (university ?? "").trim().toLowerCase();
  if (!scope || uni !== scope) {
    throw new TelegramAuthError("You can only manage students in your college.", "unauthorized");
  }
}

export function permissionDeniedMessage(admin: TelegramAdminRecord): string {
  if (admin.permissionLevel === "read_only") {
    return "Read-only admins cannot perform this action.";
  }
  return "Insufficient permissions.";
}
