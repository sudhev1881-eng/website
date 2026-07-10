import { getEnv } from "./env.js";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  const configured = getEnv().LOG_LEVEL;
  return LEVELS[level] >= LEVELS[configured];
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(meta !== undefined ? { meta } : {}),
  };
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (shouldLog("debug")) console.debug(formatMessage("debug", message, meta));
  },
  info(message: string, meta?: unknown) {
    if (shouldLog("info")) console.info(formatMessage("info", message, meta));
  },
  warn(message: string, meta?: unknown) {
    if (shouldLog("warn")) console.warn(formatMessage("warn", message, meta));
  },
  error(message: string, meta?: unknown) {
    if (shouldLog("error")) console.error(formatMessage("error", message, meta));
  },
  audit(action: string, meta: Record<string, unknown>) {
    console.info(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "audit",
        action,
        ...meta,
      }),
    );
  },
};
