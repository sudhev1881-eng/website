import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function signClaimToken(payload: ClaimTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function verifyClaimToken(token: string): ClaimTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as ClaimTokenPayload;
  if (payload.purpose !== "google_claim") {
    throw new Error("Invalid claim token");
  }
  return payload;
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
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
