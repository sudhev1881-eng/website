import type {
  TelegramAdminRecord,
  ParsedIntent,
  PendingAction,
  StudentSummary,
} from "../telegramTypes.js";
import { WRITE_INTENTS } from "../telegramTypes.js";
import {
  assertCollegeAccess,
  canWrite,
  permissionDeniedMessage,
  TelegramAuthError,
} from "../telegramAuth.js";
import {
  clearPendingAction,
  setPendingAction,
  writeAudit,
} from "../telegramServices/auditService.js";
import * as students from "../telegramServices/studentService.js";
import { parseDelimitedText, type ImportStudentRow } from "../telegramServices/importService.js";
import {
  bold,
  code,
  escapeHtml,
  formatConfirmPrompt,
  formatError,
  formatStudentCard,
  formatStudentCreated,
  formatStudentList,
  formatSuccess,
  truncate,
} from "../telegramUtils/format.js";

export interface HandlerContext {
  admin: TelegramAdminRecord;
  telegramUserId: number;
  ipAddress?: string | null;
  text: string;
}

function collegeScope(admin: TelegramAdminRecord): string | null {
  return admin.permissionLevel === "college_admin" ? admin.collegeScope : null;
}

function requireWrite(admin: TelegramAdminRecord): void {
  if (!canWrite(admin)) {
    throw new TelegramAuthError(permissionDeniedMessage(admin), "unauthorized");
  }
}

async function requireStudent(
  query: string | undefined,
  admin: TelegramAdminRecord,
): Promise<StudentSummary> {
  if (!query?.trim()) throw new Error("Provide a student name, email, or ID");
  const found = await students.resolveStudent(query, collegeScope(admin) ?? undefined);
  if (!found) {
    const matches = await students.searchStudents(query, {
      collegeScope: collegeScope(admin),
      limit: 5,
    });
    if (matches.length > 1) {
      throw new Error(
        `Multiple matches — be more specific:\n${matches.map((m) => `• ${m.name} (${m.email ?? m.username})`).join("\n")}`,
      );
    }
    throw new Error("Student not found");
  }
  assertCollegeAccess(admin, found.university);
  return found;
}

async function queueConfirm(
  ctx: HandlerContext,
  action: PendingAction,
): Promise<string> {
  await setPendingAction(ctx.telegramUserId, ctx.admin.id, action);
  return formatConfirmPrompt(action.summary);
}

export function helpText(admin: TelegramAdminRecord): string {
  return [
    `🤖 ${bold("StudentLink Admin Assistant")}`,
    `Permission: ${code(admin.permissionLevel)}`,
    admin.collegeScope ? `College scope: ${escapeHtml(admin.collegeScope)}` : "",
    "",
    bold("Students"),
    "/create Name, email, College",
    `/find ${escapeHtml("<name|email|id>")}`,
    "/list [college]",
    "/today  /inactive",
    `/suspend ${escapeHtml("<student>")}  /reactivate ${escapeHtml("<student>")}`,
    `/delete ${escapeHtml("<student>")}  (asks confirmation)`,
    `/college ${escapeHtml("<student>")} to ${escapeHtml("<college>")}`,
    "",
    bold("NFC"),
    `/nfc ${escapeHtml("<student>")}  /nfcregen ${escapeHtml("<student>")}`,
    `/nfcdisable ${escapeHtml("<student>")}  /nfcenable ${escapeHtml("<student>")}`,
    `/nfcurl ${escapeHtml("<student>")}`,
    "",
    bold("Other"),
    "/stats  /health  /help",
    "Paste multi-line CSV or send .csv/.xlsx/.txt files to import.",
    "",
    "Natural language works too, e.g. “find jane@school.edu” or “stats”.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function handleIntent(ctx: HandlerContext, intent: ParsedIntent): Promise<string> {
  if (WRITE_INTENTS.has(intent.intent)) {
    requireWrite(ctx.admin);
  }

  switch (intent.intent) {
    case "help":
      return helpText(ctx.admin);

    case "create_student": {
      const name = intent.args.name;
      if (!name) {
        return formatError("Usage: /create Name, email@x.com, College");
      }
      if (ctx.admin.permissionLevel === "college_admin") {
        intent.args.college = intent.args.college || ctx.admin.collegeScope || undefined;
        assertCollegeAccess(ctx.admin, intent.args.college);
      }
      const created = await students.createStudent({
        name,
        email: intent.args.email,
        university: intent.args.college,
        major: intent.args.major,
      });
      await writeAudit({
        telegramUserId: ctx.telegramUserId,
        adminId: ctx.admin.id,
        action: "create_student",
        targetType: "student",
        targetId: created.id,
        details: { name: created.name, email: created.email },
        ipAddress: ctx.ipAddress,
      });
      return formatStudentCreated(created);
    }

    case "find_student": {
      const q = intent.args.query;
      if (!q) return formatError("Usage: /find <name|email|id>");
      const matches = await students.searchStudents(q, {
        collegeScope: collegeScope(ctx.admin),
        limit: 10,
      });
      if (matches.length === 0) return formatError("No students matched.");
      if (matches.length === 1) return `🔎 ${bold("Student found")}\n\n${formatStudentCard(matches[0])}`;
      return formatStudentList("Search results", matches);
    }

    case "list_students": {
      const list = await students.listStudents({
        collegeScope: collegeScope(ctx.admin),
        limit: 30,
      });
      return formatStudentList("Students", list);
    }

    case "list_by_college": {
      const college = intent.args.college;
      if (!college) return formatError("Usage: /list <college>");
      if (ctx.admin.permissionLevel === "college_admin") {
        assertCollegeAccess(ctx.admin, college);
      }
      const list = await students.listStudents({ university: college, limit: 40 });
      return formatStudentList(`Students at ${college}`, list);
    }

    case "list_inactive": {
      const list = await students.listStudents({
        status: "inactive",
        collegeScope: collegeScope(ctx.admin),
        limit: 40,
      });
      return formatStudentList("Inactive students", list);
    }

    case "list_today": {
      const list = await students.listStudents({
        todayOnly: true,
        collegeScope: collegeScope(ctx.admin),
        limit: 40,
      });
      return formatStudentList("Today's registrations", list);
    }

    case "delete_student": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      return queueConfirm(ctx, {
        type: "delete_student",
        summary: `Delete student ${student.name} (${student.email ?? student.username}) permanently.`,
        payload: { studentId: student.id, name: student.name },
        createdAt: new Date().toISOString(),
      });
    }

    case "suspend_student": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      return queueConfirm(ctx, {
        type: "suspend_student",
        summary: `Suspend ${student.name} (set status to inactive).`,
        payload: { studentId: student.id, name: student.name },
        createdAt: new Date().toISOString(),
      });
    }

    case "reactivate_student": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      const updated = await students.setStudentStatus(student.id, "active");
      await writeAudit({
        telegramUserId: ctx.telegramUserId,
        adminId: ctx.admin.id,
        action: "reactivate_student",
        targetType: "student",
        targetId: student.id,
        ipAddress: ctx.ipAddress,
      });
      return formatSuccess("Student reactivated", formatStudentCard(updated!));
    }

    case "change_college": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      const college = intent.args.college?.trim();
      if (!college) return formatError("Usage: /college <student> to <college>");
      if (ctx.admin.permissionLevel === "college_admin" && !canWrite(ctx.admin)) {
        return formatError(permissionDeniedMessage(ctx.admin));
      }
      // College admins moving out of scope need super admin — block
      if (ctx.admin.permissionLevel === "college_admin") {
        return formatError("College admins cannot change a student's college. Ask a Super Admin.");
      }
      return queueConfirm(ctx, {
        type: "change_college",
        summary: `Change college for ${student.name} to "${college}".`,
        payload: { studentId: student.id, college, name: student.name },
        createdAt: new Date().toISOString(),
      });
    }

    case "generate_nfc": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      const result = await students.generateNfcForStudent(student.id);
      await writeAudit({
        telegramUserId: ctx.telegramUserId,
        adminId: ctx.admin.id,
        action: "generate_nfc",
        targetType: "student",
        targetId: student.id,
        details: { cardNumber: result.cardNumber },
        ipAddress: ctx.ipAddress,
      });
      return [
        `✅ ${bold("NFC Profile Generated")}`,
        "",
        `${bold("Student")}: ${escapeHtml(result.student.name)}`,
        `${bold("Card")}: ${code(result.cardNumber)}`,
        `${bold("Profile URL")}: ${escapeHtml(result.profileUrl)}`,
        "",
        escapeHtml(result.message),
      ].join("\n");
    }

    case "regenerate_nfc": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      const result = await students.regenerateNfc(student.id);
      await writeAudit({
        telegramUserId: ctx.telegramUserId,
        adminId: ctx.admin.id,
        action: "regenerate_nfc",
        targetType: "student",
        targetId: student.id,
        details: { cardNumber: result.cardNumber },
        ipAddress: ctx.ipAddress,
      });
      return formatSuccess(
        "NFC Regenerated",
        `${bold("Card")}: ${code(result.cardNumber)}\n${bold("URL")}: ${escapeHtml(result.profileUrl)}`,
      );
    }

    case "disable_nfc": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      return queueConfirm(ctx, {
        type: "disable_nfc",
        summary: `Disable NFC for ${student.name}.`,
        payload: { studentId: student.id, name: student.name },
        createdAt: new Date().toISOString(),
      });
    }

    case "enable_nfc": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      const updated = await students.setNfcStatus(student.id, "active");
      await writeAudit({
        telegramUserId: ctx.telegramUserId,
        adminId: ctx.admin.id,
        action: "enable_nfc",
        targetType: "student",
        targetId: student.id,
        ipAddress: ctx.ipAddress,
      });
      return formatSuccess("NFC Enabled", formatStudentCard(updated!));
    }

    case "nfc_url": {
      const student = await requireStudent(intent.args.query, ctx.admin);
      return [
        `🔗 ${bold("NFC / Profile URL")}`,
        "",
        formatStudentCard(student),
      ].join("\n");
    }

    case "bulk_import": {
      const payload = intent.args.payload ?? ctx.text;
      const parsed = parseDelimitedText(payload);
      if (parsed.rows.length === 0) {
        return formatError(
          parsed.warnings.join(" ") || "No importable rows. Paste CSV lines: Name, email, College",
        );
      }
      if (ctx.admin.permissionLevel === "college_admin") {
        for (const row of parsed.rows) {
          row.college = row.college || ctx.admin.collegeScope || undefined;
          assertCollegeAccess(ctx.admin, row.college);
        }
      }
      return queueConfirm(ctx, {
        type: "bulk_import",
        summary: `Import ${parsed.rows.length} student(s) from pasted data.`,
        payload: { rows: parsed.rows },
        createdAt: new Date().toISOString(),
      });
    }

    case "stats": {
      const stats = await students.getAdminStats(collegeScope(ctx.admin));
      const collegeLines = stats.byCollege
        .slice(0, 10)
        .map((c) => `• ${escapeHtml(c.name)}: ${c.count}`)
        .join("\n");
      return [
        `📊 ${bold("Statistics")}`,
        "",
        `Total students: ${stats.totalStudents}`,
        `Active: ${stats.activeStudents} · Inactive: ${stats.inactiveStudents} · Pending: ${stats.pendingStudents}`,
        `Today's registrations: ${stats.todayRegistrations}`,
        `Active NFC cards: ${stats.activeCards}`,
        `Storage: ${stats.storageUsedGb} / ${stats.storageTotalGb} GB (${stats.storageUsedPercent}%)`,
        "",
        bold("By college"),
        collegeLines || "—",
      ].join("\n");
    }

    case "health": {
      const health = await students.getHealthSnapshot();
      return [
        `🩺 ${bold("System Health")}`,
        "",
        `API: ${health.api}`,
        `Database: ${health.database}`,
        `Storage: ${health.storage}`,
        `Site: ${escapeHtml(health.siteUrl)}`,
      ].join("\n");
    }

    case "confirm":
      return executePending(ctx);

    case "cancel": {
      await clearPendingAction(ctx.telegramUserId);
      await writeAudit({
        telegramUserId: ctx.telegramUserId,
        adminId: ctx.admin.id,
        action: "cancel_pending",
        result: "cancelled",
        ipAddress: ctx.ipAddress,
      });
      return formatSuccess("Cancelled", "Pending action discarded.");
    }

    default:
      return truncate(
        [
          formatError("I didn't understand that."),
          "",
          "Try /help or commands like:",
          "• find jane@school.edu",
          "• /stats",
          "• /create Jane Doe, jane@school.edu, MIT",
        ].join("\n"),
      );
  }
}

export async function executePending(ctx: HandlerContext): Promise<string> {
  const { getOrCreateSession } = await import("../telegramServices/auditService.js");
  const session = await getOrCreateSession(ctx.telegramUserId, ctx.admin.id);
  const pending = session.pendingAction;
  if (!pending || session.state !== "awaiting_confirm") {
    return formatError("Nothing pending confirmation.");
  }

  requireWrite(ctx.admin);

  try {
    switch (pending.type) {
      case "delete_student": {
        const studentId = String(pending.payload.studentId);
        const ok = await students.deleteStudent(studentId);
        await clearPendingAction(ctx.telegramUserId);
        await writeAudit({
          telegramUserId: ctx.telegramUserId,
          adminId: ctx.admin.id,
          action: "delete_student",
          targetType: "student",
          targetId: studentId,
          details: pending.payload,
          result: ok ? "ok" : "error",
          error: ok ? null : "not found",
          ipAddress: ctx.ipAddress,
        });
        return ok
          ? formatSuccess("Student deleted", escapeHtml(String(pending.payload.name ?? studentId)))
          : formatError("Student not found");
      }
      case "suspend_student": {
        const studentId = String(pending.payload.studentId);
        const updated = await students.setStudentStatus(studentId, "inactive");
        await clearPendingAction(ctx.telegramUserId);
        await writeAudit({
          telegramUserId: ctx.telegramUserId,
          adminId: ctx.admin.id,
          action: "suspend_student",
          targetType: "student",
          targetId: studentId,
          ipAddress: ctx.ipAddress,
        });
        return updated
          ? formatSuccess("Student suspended", formatStudentCard(updated))
          : formatError("Student not found");
      }
      case "disable_nfc": {
        const studentId = String(pending.payload.studentId);
        const updated = await students.setNfcStatus(studentId, "deactivated");
        await clearPendingAction(ctx.telegramUserId);
        await writeAudit({
          telegramUserId: ctx.telegramUserId,
          adminId: ctx.admin.id,
          action: "disable_nfc",
          targetType: "student",
          targetId: studentId,
          ipAddress: ctx.ipAddress,
        });
        return updated
          ? formatSuccess("NFC disabled", formatStudentCard(updated))
          : formatError("Student not found");
      }
      case "change_college": {
        const studentId = String(pending.payload.studentId);
        const college = String(pending.payload.college);
        const updated = await students.changeCollege(studentId, college);
        await clearPendingAction(ctx.telegramUserId);
        await writeAudit({
          telegramUserId: ctx.telegramUserId,
          adminId: ctx.admin.id,
          action: "change_college",
          targetType: "student",
          targetId: studentId,
          details: { college },
          ipAddress: ctx.ipAddress,
        });
        return updated
          ? formatSuccess("College updated", formatStudentCard(updated))
          : formatError("Student not found");
      }
      case "bulk_import": {
        const rows = (pending.payload.rows as ImportStudentRow[]) ?? [];
        let created = 0;
        const errors: string[] = [];
        for (const row of rows) {
          try {
            if (ctx.admin.permissionLevel === "college_admin") {
              assertCollegeAccess(ctx.admin, row.college || ctx.admin.collegeScope);
            }
            await students.createStudent({
              name: row.name,
              email: row.email,
              university: row.college || ctx.admin.collegeScope || undefined,
              major: row.major,
            });
            created++;
          } catch (err) {
            errors.push(`Line ${row.line}: ${(err as Error).message}`);
          }
        }
        await clearPendingAction(ctx.telegramUserId);
        await writeAudit({
          telegramUserId: ctx.telegramUserId,
          adminId: ctx.admin.id,
          action: "bulk_import",
          details: { created, failed: errors.length, total: rows.length },
          result: errors.length && !created ? "error" : "ok",
          ipAddress: ctx.ipAddress,
        });
        const errBlock = errors.length
          ? `\n\n${bold("Errors")}\n${errors.slice(0, 10).map(escapeHtml).join("\n")}`
          : "";
        return truncate(
          formatSuccess("Bulk import complete", `Created ${created} of ${rows.length}.${errBlock}`),
        );
      }
      default:
        await clearPendingAction(ctx.telegramUserId);
        return formatError("Unknown pending action.");
    }
  } catch (err) {
    await writeAudit({
      telegramUserId: ctx.telegramUserId,
      adminId: ctx.admin.id,
      action: pending.type,
      result: "error",
      error: (err as Error).message,
      ipAddress: ctx.ipAddress,
    });
    throw err;
  }
}

export async function handleFileImport(
  ctx: HandlerContext,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  requireWrite(ctx.admin);
  const { detectAndParseFile } = await import("../telegramServices/importService.js");
  const parsed = await Promise.resolve(detectAndParseFile(filename, buffer));
  if (parsed.format === "ocr_stub" || parsed.format === "ocr") {
    return formatError(parsed.warnings.join("\n"));
  }
  if (parsed.rows.length === 0) {
    return formatError(parsed.warnings.join(" ") || "No rows parsed from file.");
  }
  if (ctx.admin.permissionLevel === "college_admin") {
    for (const row of parsed.rows) {
      row.college = row.college || ctx.admin.collegeScope || undefined;
      assertCollegeAccess(ctx.admin, row.college);
    }
  }
  return queueConfirm(ctx, {
    type: "bulk_import",
    summary: `Import ${parsed.rows.length} student(s) from ${filename} (${parsed.format}).`,
    payload: { rows: parsed.rows, filename },
    createdAt: new Date().toISOString(),
  });
}
