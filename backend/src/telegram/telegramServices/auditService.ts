import { query } from "../../db/pool.js";
import { logger } from "../../config/logger.js";
import type { PendingAction, TelegramSessionState } from "../telegramTypes.js";

export async function getOrCreateSession(
  telegramUserId: number,
  adminId: string | null,
): Promise<TelegramSessionState> {
  await query(`DELETE FROM telegram_sessions WHERE expires_at < NOW()`);

  const existing = await query<{
    id: string;
    telegram_user_id: string | number;
    admin_id: string | null;
    state: string;
    pending_action: PendingAction | null;
    context: Record<string, unknown>;
    expires_at: Date;
  }>(
    `SELECT id, telegram_user_id, admin_id, state, pending_action, context, expires_at
     FROM telegram_sessions WHERE telegram_user_id = $1 LIMIT 1`,
    [telegramUserId],
  );

  if (existing.rowCount) {
    const row = existing.rows[0];
    if (adminId && row.admin_id !== adminId) {
      await query(`UPDATE telegram_sessions SET admin_id = $2, updated_at = NOW() WHERE id = $1`, [
        row.id,
        adminId,
      ]);
      row.admin_id = adminId;
    }
    return {
      id: row.id,
      telegramUserId: Number(row.telegram_user_id),
      adminId: row.admin_id,
      state: row.state,
      pendingAction: row.pending_action,
      context: row.context ?? {},
      expiresAt: row.expires_at,
    };
  }

  const created = await query<{
    id: string;
    telegram_user_id: string | number;
    admin_id: string | null;
    state: string;
    pending_action: PendingAction | null;
    context: Record<string, unknown>;
    expires_at: Date;
  }>(
    `INSERT INTO telegram_sessions (telegram_user_id, admin_id, state)
     VALUES ($1, $2, 'idle')
     RETURNING id, telegram_user_id, admin_id, state, pending_action, context, expires_at`,
    [telegramUserId, adminId],
  );

  const row = created.rows[0];
  return {
    id: row.id,
    telegramUserId: Number(row.telegram_user_id),
    adminId: row.admin_id,
    state: row.state,
    pendingAction: row.pending_action,
    context: row.context ?? {},
    expiresAt: row.expires_at,
  };
}

export async function setPendingAction(
  telegramUserId: number,
  adminId: string,
  action: PendingAction,
): Promise<void> {
  await query(
    `INSERT INTO telegram_sessions (telegram_user_id, admin_id, state, pending_action, expires_at)
     VALUES ($1, $2, 'awaiting_confirm', $3::jsonb, NOW() + INTERVAL '15 minutes')
     ON CONFLICT (telegram_user_id) DO UPDATE SET
       admin_id = EXCLUDED.admin_id,
       state = 'awaiting_confirm',
       pending_action = EXCLUDED.pending_action,
       expires_at = NOW() + INTERVAL '15 minutes',
       updated_at = NOW()`,
    [telegramUserId, adminId, JSON.stringify(action)],
  );
}

export async function clearPendingAction(telegramUserId: number): Promise<void> {
  await query(
    `UPDATE telegram_sessions
     SET state = 'idle', pending_action = NULL, updated_at = NOW(),
         expires_at = NOW() + INTERVAL '30 minutes'
     WHERE telegram_user_id = $1`,
    [telegramUserId],
  );
}

export async function logCommand(params: {
  telegramUserId: number;
  adminId: string | null;
  rawText: string;
  parsedIntent: string | null;
  parsedArgs?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO telegram_commands (telegram_user_id, admin_id, raw_text, parsed_intent, parsed_args)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        params.telegramUserId,
        params.adminId,
        params.rawText.slice(0, 4000),
        params.parsedIntent,
        params.parsedArgs ? JSON.stringify(params.parsedArgs) : null,
      ],
    );
  } catch (err) {
    logger.warn("Failed to log telegram command", { message: (err as Error).message });
  }
}

export async function logResult(params: {
  telegramUserId: number | null;
  adminId: string | null;
  command: string | null;
  result: "ok" | "error" | "denied" | "unauthorized";
  error?: string | null;
  ipAddress?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO telegram_logs (telegram_user_id, admin_id, command, result, error, ip_address, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        params.telegramUserId,
        params.adminId,
        params.command,
        params.result,
        params.error ?? null,
        params.ipAddress ?? null,
        JSON.stringify(params.meta ?? {}),
      ],
    );
  } catch (err) {
    logger.warn("Failed to write telegram log", { message: (err as Error).message });
  }
}

export async function writeAudit(params: {
  telegramUserId: number;
  adminId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown>;
  result?: "ok" | "error" | "denied" | "cancelled";
  error?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO telegram_audit
         (telegram_user_id, admin_id, action, target_type, target_id, details, result, error, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        params.telegramUserId,
        params.adminId,
        params.action,
        params.targetType ?? null,
        params.targetId ?? null,
        JSON.stringify(params.details ?? {}),
        params.result ?? "ok",
        params.error ?? null,
        params.ipAddress ?? null,
      ],
    );
    logger.audit(`telegram.${params.action}`, {
      telegramUserId: params.telegramUserId,
      adminId: params.adminId,
      result: params.result ?? "ok",
      ...(params.details ?? {}),
    });
  } catch (err) {
    logger.warn("Failed to write telegram audit", { message: (err as Error).message });
  }
}
