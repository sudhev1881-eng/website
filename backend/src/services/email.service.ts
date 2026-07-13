import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { getEnv } from "../config/env.js";
import { logger } from "../config/logger.js";

let client: MailerSend | null = null;

function getClient(): MailerSend | null {
  const key = getEnv().MAILERSEND_API_KEY;
  if (!key) return null;
  if (!client) client = new MailerSend({ apiKey: key });
  return client;
}

/** Strip "Name <email@x.com>" → email@x.com */
function bareEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function parseFrom(value: string): { email: string; name?: string } {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    return { name: match[1].trim() || undefined, email: match[2].trim() };
  }
  return { email: value.trim() };
}

export function getAdminNotifyEmail(): string | null {
  const env = getEnv();
  const raw = env.ADMIN_NOTIFY_EMAIL ?? env.MAILERSEND_FROM_EMAIL;
  return raw ? bareEmail(raw) : null;
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e5e7eb;">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:13px;letter-spacing:0.04em;color:#64748b;text-transform:uppercase;">StudentLink</p>
              <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${title}</h1>
              ${bodyHtml}
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">This is an automated message from StudentLink.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const mailer = getClient();
  const fromRaw = getEnv().MAILERSEND_FROM_EMAIL;
  if (!mailer || !fromRaw) {
    logger.warn("Email not sent — MailerSend not configured", {
      to: params.to,
      subject: params.subject,
    });
    return false;
  }

  const from = parseFrom(fromRaw);
  const fromName = getEnv().MAILERSEND_FROM_NAME ?? from.name ?? "StudentLink";

  try {
    const emailParams = new EmailParams()
      .setFrom(new Sender(from.email, fromName))
      .setTo([new Recipient(params.to)])
      .setSubject(params.subject)
      .setHtml(params.html);

    await mailer.email.send(emailParams);
    logger.info("Email sent", { to: params.to, subject: params.subject });
    return true;
  } catch (error) {
    logger.error("MailerSend email failed", { error, to: params.to });
    return false;
  }
}

/** Never block API responses on email delivery. */
export function sendEmailInBackground(params: {
  to: string;
  subject: string;
  html: string;
}): void {
  void sendEmail(params).catch((err) => {
    logger.error("Background email failed", { err, to: params.to });
  });
}

export function notifyAdminNewRegistration(data: {
  name: string;
  email: string;
  university?: string;
}): void {
  const admin = getAdminNotifyEmail();
  if (!admin) return;

  const site = getEnv().SITE_URL.replace(/\/$/, "");
  sendEmailInBackground({
    to: admin,
    subject: `New student registration — ${data.name}`,
    html: layout(
      "New registration pending approval",
      `<p style="margin:0 0 12px;color:#334155;line-height:1.5;">
        <strong>${escapeHtml(data.name)}</strong> (${escapeHtml(data.email)})
        requested access${data.university ? ` from <strong>${escapeHtml(data.university)}</strong>` : ""}.
      </p>
      <p style="margin:0 0 16px;color:#334155;line-height:1.5;">
        Review them in the admin Students page.
      </p>
      <p style="margin:0;">
        <a href="${site}/admin" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;">
          Open admin
        </a>
      </p>`,
    ),
  });
}

export function notifyStudentApproved(data: {
  name: string;
  email: string;
}): void {
  const site = getEnv().SITE_URL.replace(/\/$/, "");
  sendEmailInBackground({
    to: data.email,
    subject: "Your StudentLink account was approved",
    html: layout(
      "You're approved",
      `<p style="margin:0 0 12px;color:#334155;line-height:1.5;">
        Hi ${escapeHtml(data.name)}, your StudentLink account is now active.
      </p>
      <p style="margin:0 0 16px;color:#334155;line-height:1.5;">
        Sign in with the email and password you registered with.
      </p>
      <p style="margin:0;">
        <a href="${site}/login" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px;">
          Sign in
        </a>
      </p>`,
    ),
  });
}

export function notifyStudentDeclined(data: {
  name: string;
  email: string;
}): void {
  sendEmailInBackground({
    to: data.email,
    subject: "StudentLink registration update",
    html: layout(
      "Registration not approved",
      `<p style="margin:0 0 12px;color:#334155;line-height:1.5;">
        Hi ${escapeHtml(data.name)}, your StudentLink registration was not approved at this time.
      </p>
      <p style="margin:0;color:#334155;line-height:1.5;">
        If you believe this is a mistake, contact your school administrator.
      </p>`,
    ),
  });
}

export function notifyAdminNfcReplacement(data: {
  name: string;
  username: string;
}): void {
  const admin = getAdminNotifyEmail();
  if (!admin) return;

  sendEmailInBackground({
    to: admin,
    subject: `NFC replacement request — ${data.name}`,
    html: layout(
      "NFC replacement requested",
      `<p style="margin:0;color:#334155;line-height:1.5;">
        <strong>${escapeHtml(data.name)}</strong> (${escapeHtml(data.username)}) requested a replacement NFC card.
      </p>`,
    ),
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
