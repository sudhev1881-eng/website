import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";
import { signToken, requireAuth, type AuthRequest } from "../middleware/auth.js";

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
