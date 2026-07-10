import { Resend } from "resend";
import { getEnv } from "../config/env.js";
import { logger } from "../config/logger.js";

let resend: Resend | null = null;

function getResend(): Resend | null {
  const key = getEnv().RESEND_API_KEY;
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const client = getResend();
  const from = getEnv().RESEND_FROM_EMAIL;
  if (!client || !from) {
    logger.warn("Email not sent — Resend not configured", { to: params.to, subject: params.subject });
    return false;
  }

  const { error } = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    logger.error("Resend email failed", { error, to: params.to });
    return false;
  }

  return true;
}
