import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import { getEnv } from "../config/env.js";

/**
 * Strict limiter for credential endpoints (login, register, claim).
 * Counts only failed attempts so normal users are not locked out.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts. Please wait 15 minutes and try again." },
});

/** Slightly looser limiter for claim/sync endpoints that hit external services. */
export const sensitiveRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

export function applySecurityMiddleware(app: Express): void {
  const env = getEnv();

  app.disable("x-powered-by");

  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      // JSON API — lock everything down; no inline anything.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      noSniff: true,
      frameguard: { action: "deny" },
      hidePoweredBy: true,
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
      maxAge: 600,
    }),
  );

  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
      skip: (req) =>
        (req.originalUrl ?? req.url ?? req.path).startsWith("/api/telegram/webhook"),
    }),
  );

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
}
