import { getEnv } from "../../config/env.js";

/** Escape text for Telegram HTML parse mode. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function bold(text: string): string {
  return `<b>${escapeHtml(text)}</b>`;
}

export function code(text: string): string {
  return `<code>${escapeHtml(text)}</code>`;
}

export function profileUrlForUsername(username: string): string {
  const site = getEnv().SITE_URL.replace(/\/$/, "");
  return `${site}/u/${username}`;
}

export function formatStudentCreated(s: {
  name: string;
  email: string | null;
  university: string | null;
  id: string;
  username: string;
}): string {
  const url = profileUrlForUsername(s.username);
  return [
    `✅ ${bold("Student Created")}`,
    "",
    `${bold("Name")}: ${escapeHtml(s.name)}`,
    `${bold("Email")}: ${escapeHtml(s.email ?? "—")}`,
    `${bold("College")}: ${escapeHtml(s.university || "—")}`,
    `${bold("Student ID")}: ${code(s.id)}`,
    `${bold("Username")}: ${code(s.username)}`,
    `${bold("Profile URL")}: ${escapeHtml(url)}`,
  ].join("\n");
}

export function formatStudentCard(s: {
  name: string;
  email: string | null;
  university: string | null;
  id: string;
  username: string;
  status: string;
  nfcCard?: string | null;
}): string {
  const url = profileUrlForUsername(s.username);
  const lines = [
    `${bold(s.name)}`,
    `Email: ${escapeHtml(s.email ?? "—")}`,
    `College: ${escapeHtml(s.university || "—")}`,
    `Status: ${escapeHtml(s.status)}`,
    `ID: ${code(s.id)}`,
    `Profile: ${escapeHtml(url)}`,
  ];
  if (s.nfcCard) lines.push(`NFC: ${code(s.nfcCard)}`);
  return lines.join("\n");
}

export function formatStudentList(
  title: string,
  students: Array<{ name: string; email: string | null; university: string | null; status: string }>,
  limit = 20,
): string {
  if (students.length === 0) {
    return `ℹ️ ${bold(title)}\n\nNo students found.`;
  }
  const shown = students.slice(0, limit);
  const lines = [`📋 ${bold(title)}`, `Showing ${shown.length} of ${students.length}`, ""];
  for (const [i, s] of shown.entries()) {
    lines.push(
      `${i + 1}. ${escapeHtml(s.name)} — ${escapeHtml(s.email ?? "—")} (${escapeHtml(s.university || "—")}, ${escapeHtml(s.status)})`,
    );
  }
  if (students.length > limit) {
    lines.push("", `…and ${students.length - limit} more`);
  }
  return lines.join("\n");
}

export function formatError(message: string): string {
  return `❌ ${escapeHtml(message)}`;
}

export function formatSuccess(title: string, details?: string): string {
  return details ? `✅ ${bold(title)}\n\n${details}` : `✅ ${bold(title)}`;
}

export function formatConfirmPrompt(summary: string): string {
  return [
    `⚠️ ${bold("Confirmation required")}`,
    "",
    escapeHtml(summary),
    "",
    `Reply ${bold("YES")} to confirm or ${bold("CANCEL")} to abort.`,
  ].join("\n");
}

export function truncate(text: string, max = 3900): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 20)}\n\n…(truncated)`;
}
