import { Router } from "express";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { query } from "../db/pool.js";
import { getWebAuthnOrigin, getWebAuthnRpId } from "../config/env.js";
import { signToken, type AuthRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/supabase-auth.js";
import { authRateLimit, sensitiveRateLimit } from "../middleware/security.js";

export const webauthnRouter = Router();

const RP_NAME = "StudentLink";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function saveChallenge(params: {
  challenge: string;
  type: "register" | "login";
  userId?: string | null;
}): Promise<void> {
  await query(`DELETE FROM webauthn_challenges WHERE expires_at < NOW()`);
  await query(
    `INSERT INTO webauthn_challenges (challenge, user_id, type, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4::text || ' milliseconds')::interval)`,
    [params.challenge, params.userId ?? null, params.type, String(CHALLENGE_TTL_MS)],
  );
}

async function consumeChallenge(
  challenge: string,
  type: "register" | "login",
  userId?: string | null,
): Promise<boolean> {
  const result = await query<{ id: string }>(
    `DELETE FROM webauthn_challenges
     WHERE challenge = $1
       AND type = $2
       AND expires_at > NOW()
       AND ($3::uuid IS NULL OR user_id IS NULL OR user_id = $3::uuid)
     RETURNING id`,
    [challenge, type, userId ?? null],
  );
  return Boolean(result.rowCount);
}

async function assertStudentCanUsePasskeys(userId: string, role: string): Promise<string | null> {
  if (role !== "student") return null;
  const result = await query<{ id: string; status: string }>(
    `SELECT id, status FROM students WHERE user_id = $1`,
    [userId],
  );
  const student = result.rows[0];
  if (!student) return "Student profile not found";
  if (student.status === "pending") {
    return "Your account is pending admin approval. Please wait to be approved.";
  }
  if (student.status !== "active") {
    return "Your account is not active";
  }
  return null;
}

/** GET /api/auth/webauthn/credentials — list current user's passkeys */
webauthnRouter.get("/credentials", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query<{
      id: string;
      label: string;
      device_type: string;
      backed_up: boolean;
      created_at: Date;
    }>(
      `SELECT id, label, device_type, backed_up, created_at
       FROM webauthn_credentials
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.userId],
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        label: r.label,
        deviceType: r.device_type,
        backedUp: r.backed_up,
        createdAt: r.created_at.toISOString(),
      })),
    );
  } catch (err) {
    console.error("GET /webauthn/credentials error:", err);
    res.status(500).json({ error: "Failed to list passkeys" });
  }
});

/** DELETE /api/auth/webauthn/credentials/:id */
webauthnRouter.delete("/credentials/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      `DELETE FROM webauthn_credentials WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user!.userId],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Passkey not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /webauthn/credentials error:", err);
    res.status(500).json({ error: "Failed to remove passkey" });
  }
});

/** POST /api/auth/webauthn/register/options */
webauthnRouter.post(
  "/register/options",
  requireAuth,
  sensitiveRateLimit,
  async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const blocked = await assertStudentCanUsePasskeys(user.userId, user.role);
      if (blocked) {
        res.status(403).json({ error: blocked });
        return;
      }

      const existing = await query<{ credential_id: string; transports: string[] | null }>(
        `SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = $1`,
        [user.userId],
      );

      const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: getWebAuthnRpId(),
        userID: new TextEncoder().encode(user.userId),
        userName: user.email,
        userDisplayName: user.email,
        attestationType: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "preferred",
          requireResidentKey: false,
          userVerification: "preferred",
        },
        excludeCredentials: existing.rows.map((row) => ({
          id: row.credential_id,
          transports: (row.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
        })),
      });

      await saveChallenge({
        challenge: options.challenge,
        type: "register",
        userId: user.userId,
      });

      res.json(options);
    } catch (err) {
      console.error("POST /webauthn/register/options error:", err);
      res.status(500).json({ error: "Failed to start Windows Hello enrollment" });
    }
  },
);

/** POST /api/auth/webauthn/register/verify */
webauthnRouter.post(
  "/register/verify",
  requireAuth,
  sensitiveRateLimit,
  async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const blocked = await assertStudentCanUsePasskeys(user.userId, user.role);
      if (blocked) {
        res.status(403).json({ error: blocked });
        return;
      }

      const response = req.body?.response as RegistrationResponseJSON | undefined;
      const label =
        typeof req.body?.label === "string" && req.body.label.trim()
          ? String(req.body.label).trim().slice(0, 255)
          : "Windows Hello";

      if (!response?.id || !response.response) {
        res.status(400).json({ error: "Invalid registration response" });
        return;
      }

      const expectedChallenge = typeof response.response.clientDataJSON === "string"
        ? (() => {
            try {
              const json = Buffer.from(response.response.clientDataJSON, "base64url").toString(
                "utf8",
              );
              return (JSON.parse(json) as { challenge?: string }).challenge ?? "";
            } catch {
              return "";
            }
          })()
        : "";

      if (!expectedChallenge || !(await consumeChallenge(expectedChallenge, "register", user.userId))) {
        res.status(400).json({ error: "Registration challenge expired. Try again." });
        return;
      }

      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: getWebAuthnOrigin(),
        expectedRPID: getWebAuthnRpId(),
        requireUserVerification: true,
      });

      if (!verification.verified || !verification.registrationInfo) {
        res.status(400).json({ error: "Windows Hello registration could not be verified" });
        return;
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      const inserted = await query<{
        id: string;
        label: string;
        device_type: string;
        backed_up: boolean;
        created_at: Date;
      }>(
        `INSERT INTO webauthn_credentials
           (user_id, credential_id, public_key, counter, device_type, backed_up, transports, label)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, label, device_type, backed_up, created_at`,
        [
          user.userId,
          credential.id,
          Buffer.from(credential.publicKey),
          credential.counter,
          credentialDeviceType,
          credentialBackedUp,
          credential.transports ?? [],
          label,
        ],
      );

      const row = inserted.rows[0];
      res.status(201).json({
        id: row.id,
        label: row.label,
        deviceType: row.device_type,
        backedUp: row.backed_up,
        createdAt: row.created_at.toISOString(),
      });
    } catch (err) {
      console.error("POST /webauthn/register/verify error:", err);
      const message = err instanceof Error ? err.message : "Registration failed";
      if (message.includes("unique") || message.toLowerCase().includes("duplicate")) {
        res.status(409).json({ error: "This device is already enrolled" });
        return;
      }
      res.status(500).json({ error: "Failed to enroll Windows Hello" });
    }
  },
);

/** POST /api/auth/webauthn/login/options */
webauthnRouter.post("/login/options", authRateLimit, async (_req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: getWebAuthnRpId(),
      userVerification: "preferred",
      // Empty allowCredentials = discoverable / resident keys (Windows Hello account picker)
      allowCredentials: [],
    });

    await saveChallenge({
      challenge: options.challenge,
      type: "login",
    });

    res.json(options);
  } catch (err) {
    console.error("POST /webauthn/login/options error:", err);
    res.status(500).json({ error: "Failed to start Windows Hello sign-in" });
  }
});

/** POST /api/auth/webauthn/login/verify */
webauthnRouter.post("/login/verify", authRateLimit, async (req, res) => {
  try {
    const response = req.body?.response as AuthenticationResponseJSON | undefined;
    if (!response?.id || !response.response) {
      res.status(400).json({ error: "Invalid authentication response" });
      return;
    }

    const expectedChallenge = (() => {
      try {
        const json = Buffer.from(response.response.clientDataJSON, "base64url").toString("utf8");
        return (JSON.parse(json) as { challenge?: string }).challenge ?? "";
      } catch {
        return "";
      }
    })();

    if (!expectedChallenge || !(await consumeChallenge(expectedChallenge, "login"))) {
      res.status(400).json({ error: "Sign-in challenge expired. Try again." });
      return;
    }

    const credResult = await query<{
      id: string;
      user_id: string;
      credential_id: string;
      public_key: Buffer;
      counter: string | number;
      transports: string[] | null;
    }>(`SELECT * FROM webauthn_credentials WHERE credential_id = $1 LIMIT 1`, [response.id]);

    if (!credResult.rowCount) {
      res.status(401).json({
        error: "No Windows Hello passkey found. Sign in another way and enable it in Settings.",
      });
      return;
    }

    const stored = credResult.rows[0];
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: getWebAuthnOrigin(),
      expectedRPID: getWebAuthnRpId(),
      credential: {
        id: stored.credential_id,
        publicKey: new Uint8Array(stored.public_key),
        counter: Number(stored.counter),
        transports: (stored.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      res.status(401).json({ error: "Windows Hello verification failed" });
      return;
    }

    await query(`UPDATE webauthn_credentials SET counter = $2 WHERE id = $1`, [
      stored.id,
      verification.authenticationInfo.newCounter,
    ]);

    const userResult = await query<{
      id: string;
      email: string;
      role: "student" | "admin";
    }>(`SELECT id, email, role FROM users WHERE id = $1`, [stored.user_id]);

    if (!userResult.rowCount) {
      res.status(401).json({ error: "Account not found" });
      return;
    }

    const user = userResult.rows[0];
    let studentId: string | undefined;

    if (user.role === "student") {
      const studentResult = await query<{ id: string; status: string }>(
        `SELECT id, status FROM students WHERE user_id = $1`,
        [user.id],
      );
      const student = studentResult.rows[0];
      if (!student) {
        res.status(403).json({ error: "Student profile not found" });
        return;
      }
      if (student.status === "pending") {
        res.status(403).json({
          error: "Your account is pending admin approval. Please wait to be approved.",
        });
        return;
      }
      if (student.status !== "active") {
        res.status(403).json({
          error: "Your account was declined or deactivated. Contact your administrator.",
        });
        return;
      }
      studentId = student.id;
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
    console.error("POST /webauthn/login/verify error:", err);
    res.status(500).json({ error: "Windows Hello sign-in failed" });
  }
});
