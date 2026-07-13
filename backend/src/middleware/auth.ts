import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/env.js";

const JWT_ISSUER = "studentlink-api";
const JWT_AUDIENCE = "studentlink-app";

/** Never fall back to a hardcoded secret — env validation enforces 32+ chars. */
function jwtSecret(): string {
  return getEnv().JWT_SECRET;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: "student" | "admin";
  studentId?: string;
}

export interface ClaimTokenPayload {
  purpose: "google_claim";
  googleId: string;
  email: string;
  googleName: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtSecret(), {
    algorithm: "HS256",
    expiresIn: "24h",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function signClaimToken(payload: ClaimTokenPayload): string {
  return jwt.sign(payload, jwtSecret(), {
    algorithm: "HS256",
    expiresIn: "10m",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyClaimToken(token: string): ClaimTokenPayload {
  const payload = jwt.verify(token, jwtSecret(), {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as ClaimTokenPayload;
  if (payload.purpose !== "google_claim") {
    throw new Error("Invalid claim token");
  }
  return payload;
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, jwtSecret(), {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }) as JwtPayload;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requireStudent(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "student") {
    res.status(403).json({ error: "Student access required" });
    return;
  }
  next();
}
