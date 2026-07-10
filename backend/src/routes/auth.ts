import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { signToken, signClaimToken, verifyClaimToken, type AuthRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/supabase-auth.js";
import { verifyGoogleIdToken, normalizeLegalName } from "../services/google-auth.js";

export const authRouter = Router();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueUsername(base: string): Promise<string> {
  let username = base;
  let i = 1;
  while (true) {
    const existing = await query(`SELECT id FROM students WHERE username = $1`, [username]);
    if (existing.rowCount === 0) return username;
    username = `${base}-${i++}`;
  }
}

/** POST /api/auth/register */
authRouter.post("/register", async (req, res) => {
  const { email, password, name, university } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id`,
      [email.toLowerCase(), passwordHash],
    );

    const userId = userResult.rows[0].id;
    const username = await uniqueUsername(slugify(name));

    const studentResult = await query<{ id: string }>(
      `INSERT INTO students (user_id, username, name, university)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, username, name, university ?? ""],
    );

    const token = signToken({
      userId,
      email: email.toLowerCase(),
      role: "student",
      studentId: studentResult.rows[0].id,
    });

    res.status(201).json({
      token,
      user: { id: userId, email: email.toLowerCase(), role: "student" },
      student: { id: studentResult.rows[0].id, username },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/** POST /api/auth/login */
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const userResult = await query<{
      id: string;
      email: string;
      password_hash: string;
      role: "student" | "admin";
    }>(`SELECT id, email, password_hash, role FROM users WHERE email = $1`, [
      email.toLowerCase(),
    ]);

    if (!userResult.rowCount) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = userResult.rows[0];
    if (!user.password_hash) {
      res.status(401).json({ error: "This account uses Google Sign-In. Please continue with Google." });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    let studentId: string | undefined;
    if (user.role === "student") {
      const studentResult = await query<{ id: string }>(
        `SELECT id FROM students WHERE user_id = $1`,
        [user.id],
      );
      studentId = studentResult.rows[0]?.id;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      studentId,
    });

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
      studentId,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/** POST /api/auth/google — Sign in with Google ID token */
authRouter.post("/google", async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400).json({ error: "Google credential is required" });
    return;
  }

  try {
    const google = await verifyGoogleIdToken(credential);

    const existingUser = await query<{
      id: string;
      email: string;
      role: "student" | "admin";
    }>(
      `SELECT id, email, role FROM users WHERE google_id = $1 OR email = $2`,
      [google.googleId, google.email],
    );

    if (existingUser.rowCount) {
      const user = existingUser.rows[0];

      await query(`UPDATE users SET google_id = $1, auth_provider = 'google' WHERE id = $2 AND google_id IS NULL`, [
        google.googleId,
        user.id,
      ]);

      let studentId: string | undefined;
      if (user.role === "student") {
        const studentResult = await query<{ id: string }>(
          `SELECT id FROM students WHERE user_id = $1`,
          [user.id],
        );
        studentId = studentResult.rows[0]?.id;
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        studentId,
      });

      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role },
        studentId,
        needsClaim: false,
      });
      return;
    }

    const claimToken = signClaimToken({
      purpose: "google_claim",
      googleId: google.googleId,
      email: google.email,
      googleName: google.name,
    });

    res.json({
      needsClaim: true,
      claimToken,
      email: google.email,
      message: "Enter your legal name as registered with your university to claim your profile.",
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({
      error: err instanceof Error ? err.message : "Google sign-in failed",
    });
  }
});

/** POST /api/auth/google/claim — Match legal name to pre-registered student */
authRouter.post("/google/claim", async (req, res) => {
  const { claimToken, firstName, lastName } = req.body;

  if (!claimToken || !firstName || !lastName) {
    res.status(400).json({ error: "claimToken, firstName, and lastName are required" });
    return;
  }

  try {
    const claim = verifyClaimToken(claimToken);
    const legalName = normalizeLegalName(firstName, lastName);

    const studentResult = await query<{
      id: string;
      username: string;
      user_id: string | null;
      status: string;
    }>(
      `SELECT id, username, user_id, status FROM students
       WHERE UPPER(TRIM(name)) = $1
       ORDER BY created_at ASC
       LIMIT 1`,
      [legalName],
    );

    if (!studentResult.rowCount) {
      res.status(404).json({
        error: `No profile found for "${legalName}". Ask your administrator to pre-register your name, or check spelling.`,
      });
      return;
    }

    const student = studentResult.rows[0];

    if (student.user_id) {
      res.status(409).json({
        error: "This profile has already been claimed. Try signing in with email/password or contact support.",
      });
      return;
    }

    const existingGoogle = await query(`SELECT id FROM users WHERE google_id = $1 OR email = $2`, [
      claim.googleId,
      claim.email,
    ]);
    if (existingGoogle.rowCount) {
      res.status(409).json({ error: "This Google account is already linked to another user." });
      return;
    }

    const userResult = await query<{ id: string }>(
      `INSERT INTO users (email, google_id, auth_provider, role)
       VALUES ($1, $2, 'google', 'student') RETURNING id`,
      [claim.email, claim.googleId],
    );

    const userId = userResult.rows[0].id;

    await query(
      `UPDATE students SET user_id = $1, status = 'active', updated_at = NOW() WHERE id = $2`,
      [userId, student.id],
    );

    const token = signToken({
      userId,
      email: claim.email,
      role: "student",
      studentId: student.id,
    });

    res.json({
      token,
      user: { id: userId, email: claim.email, role: "student" as const },
      student: { id: student.id, username: student.username },
      matchedName: legalName,
      needsClaim: false,
    });
  } catch (err) {
    console.error("Google claim error:", err);
    res.status(400).json({
      error: err instanceof Error ? err.message : "Failed to claim profile",
    });
  }
});

/** POST /api/auth/supabase/sync — link Supabase Auth user to app account */
authRouter.post("/supabase/sync", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Supabase access token required" });
    return;
  }

  const accessToken = header.slice(7);

  try {
    const { verifySupabaseAccessToken } = await import("../lib/supabase.js");
    const supabaseUser = await verifySupabaseAccessToken(accessToken);
    if (!supabaseUser?.email) {
      res.status(401).json({ error: "Invalid Supabase session" });
      return;
    }

    const existing = await query<{ id: string; role: string }>(
      `SELECT id, role FROM users WHERE supabase_auth_id = $1 OR email = $2 LIMIT 1`,
      [supabaseUser.id, supabaseUser.email.toLowerCase()],
    );

    let userId: string;
    let role: "student" | "admin" = "student";

    if (existing.rowCount) {
      userId = existing.rows[0].id;
      role = existing.rows[0].role as "student" | "admin";
      await query(`UPDATE users SET supabase_auth_id = $1 WHERE id = $2`, [
        supabaseUser.id,
        userId,
      ]);
    } else {
      const inserted = await query<{ id: string }>(
        `INSERT INTO users (email, role, supabase_auth_id, auth_provider)
         VALUES ($1, 'student', $2, 'supabase')
         RETURNING id`,
        [supabaseUser.email.toLowerCase(), supabaseUser.id],
      );
      userId = inserted.rows[0].id;
    }

    let studentId: string | undefined;
    if (role === "student") {
      const studentResult = await query<{ id: string }>(
        `SELECT id FROM students WHERE user_id = $1`,
        [userId],
      );
      studentId = studentResult.rows[0]?.id;
    }

    const token = signToken({
      userId,
      email: supabaseUser.email.toLowerCase(),
      role,
      studentId,
    });

    res.json({
      token,
      user: { id: userId, email: supabaseUser.email.toLowerCase(), role },
      needsClaim: role === "student" && !studentId,
    });
  } catch (err) {
    console.error("Supabase sync error:", err);
    res.status(500).json({ error: "Failed to sync account" });
  }
});

/** POST /api/auth/supabase/claim — match legal name after Supabase Google sign-in */
authRouter.post("/supabase/claim", async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Supabase access token required" });
    return;
  }

  const { firstName, lastName } = req.body;
  if (!firstName || !lastName) {
    res.status(400).json({ error: "firstName and lastName are required" });
    return;
  }

  const accessToken = header.slice(7);

  try {
    const { verifySupabaseAccessToken } = await import("../lib/supabase.js");
    const { normalizeLegalName } = await import("../services/google-auth.js");
    const supabaseUser = await verifySupabaseAccessToken(accessToken);
    if (!supabaseUser?.email) {
      res.status(401).json({ error: "Invalid Supabase session" });
      return;
    }

    const legalName = normalizeLegalName(firstName, lastName);

    const studentResult = await query<{ id: string; username: string; user_id: string | null }>(
      `SELECT id, username, user_id FROM students
       WHERE UPPER(TRIM(name)) = $1 AND (user_id IS NULL OR user_id IN (
         SELECT id FROM users WHERE supabase_auth_id = $2
       ))
       LIMIT 1`,
      [legalName, supabaseUser.id],
    );

    if (!studentResult.rowCount) {
      res.status(404).json({ error: "No matching student record found for that name" });
      return;
    }

    const student = studentResult.rows[0];
    if (student.user_id) {
      res.status(409).json({ error: "This student profile is already claimed" });
      return;
    }

    let userId: string;
    const userRow = await query<{ id: string }>(
      `SELECT id FROM users WHERE supabase_auth_id = $1`,
      [supabaseUser.id],
    );

    if (userRow.rowCount) {
      userId = userRow.rows[0].id;
    } else {
      const inserted = await query<{ id: string }>(
        `INSERT INTO users (email, role, supabase_auth_id, auth_provider)
         VALUES ($1, 'student', $2, 'supabase') RETURNING id`,
        [supabaseUser.email.toLowerCase(), supabaseUser.id],
      );
      userId = inserted.rows[0].id;
    }

    await query(`UPDATE students SET user_id = $1, status = 'active', updated_at = NOW() WHERE id = $2`, [
      userId,
      student.id,
    ]);

    const token = signToken({
      userId,
      email: supabaseUser.email.toLowerCase(),
      role: "student",
      studentId: student.id,
    });

    res.json({
      token,
      user: { id: userId, email: supabaseUser.email.toLowerCase(), role: "student" as const },
      student: { id: student.id, username: student.username },
      matchedName: legalName,
    });
  } catch (err) {
    console.error("Supabase claim error:", err);
    res.status(400).json({ error: err instanceof Error ? err.message : "Claim failed" });
  }
});

/** POST /api/auth/change-password */
authRouter.post("/change-password", requireAuth, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  try {
    const userResult = await query<{ password_hash: string | null; auth_provider: string }>(
      `SELECT password_hash, auth_provider FROM users WHERE id = $1`,
      [req.user!.userId],
    );

    if (!userResult.rowCount) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = userResult.rows[0];
    if (!user.password_hash || user.auth_provider === "supabase") {
      res.status(400).json({
        error: "Password change is not available for Google sign-in accounts. Manage your password in Google.",
      });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      req.user!.userId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

/** GET /api/auth/me */
authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userResult = await query<{ id: string; email: string; role: string }>(
      `SELECT id, email, role FROM users WHERE id = $1`,
      [req.user!.userId],
    );

    if (!userResult.rowCount) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = userResult.rows[0];
    let student = null;

    if (user.role === "student") {
      const studentResult = await query(
        `SELECT id, username, name FROM students WHERE user_id = $1`,
        [user.id],
      );
      student = studentResult.rows[0] ?? null;
    }

    res.json({ user, student });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});
