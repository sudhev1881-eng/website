import type { Request, Response, NextFunction } from "express";
import { verifySupabaseAccessToken } from "../lib/supabase.js";
import { verifyToken, type AuthRequest, type JwtPayload } from "./auth.js";
import { query } from "../db/pool.js";

async function resolveUserFromSupabase(authUserId: string): Promise<JwtPayload | null> {
  const result = await query<{
    id: string;
    email: string;
    role: "student" | "admin";
    student_id: string | null;
  }>(
    `SELECT u.id, u.email, u.role, s.id AS student_id
     FROM users u
     LEFT JOIN students s ON s.user_id = u.id
     WHERE u.supabase_auth_id = $1
     LIMIT 1`,
    [authUserId],
  );

  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    userId: row.id,
    email: row.email,
    role: row.role,
    studentId: row.student_id ?? undefined,
  };
}

/** Accepts legacy JWT or Supabase access token */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice(7);

  try {
    req.user = verifyToken(token);
    next();
    return;
  } catch {
    // fall through to Supabase verification
  }

  try {
    const supabaseUser = await verifySupabaseAccessToken(token);
    if (!supabaseUser) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const appUser = await resolveUserFromSupabase(supabaseUser.id);
    if (!appUser) {
      res.status(401).json({ error: "Account not provisioned. Complete profile setup." });
      return;
    }

    req.user = appUser;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export { requireAdmin, requireStudent } from "./auth.js";
export type { AuthRequest } from "./auth.js";
