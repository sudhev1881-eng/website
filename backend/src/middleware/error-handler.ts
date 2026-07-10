import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";
import { getEnv } from "../config/env.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    message,
    stack: err instanceof Error ? err.stack : undefined,
  });

  const status =
    err && typeof err === "object" && "status" in err && typeof err.status === "number"
      ? err.status
      : 500;

  res.status(status).json({
    error: getEnv().NODE_ENV === "production" ? "Internal server error" : message,
  });
}
