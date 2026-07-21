import bcrypt from "bcryptjs";
import { query, withTransaction } from "../../db/pool.js";
import { getEnv } from "../../config/env.js";
import { nfcService } from "../../services/nfc.js";
import type { StudentSummary } from "../telegramTypes.js";
import { profileUrlForUsername } from "../telegramUtils/format.js";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueUsername(base: string, q: typeof query = query): Promise<string> {
  let username = base || "student";
  let i = 1;
  while (true) {
    const existing = await q(`SELECT id FROM students WHERE username = $1`, [username]);
    if (existing.rowCount === 0) return username;
    username = `${base}-${i++}`;
  }
}

function mapStudent(row: {
  id: string;
  name: string;
  username: string;
  email: string | null;
  university: string | null;
  major: string | null;
  status: string;
  phone: string | null;
  nfc_card: string | null;
  created_at: Date;
  user_id?: string | null;
}): StudentSummary {
  const status = row.user_id === null || row.user_id === undefined ? row.status : row.status;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    university: row.university,
    major: row.major,
    status: row.user_id ? status : status === "pending" ? "unclaimed" : status,
    phone: row.phone,
    nfcCard: row.nfc_card,
    profileUrl: profileUrlForUsername(row.username),
    createdAt: row.created_at,
  };
}

const STUDENT_SELECT = `
  SELECT s.id, s.name, s.username, u.email, s.university, s.major, s.status,
         s.phone, s.created_at, s.user_id,
         nc.card_number AS nfc_card
  FROM students s
  LEFT JOIN users u ON u.id = s.user_id
  LEFT JOIN nfc_cards nc ON nc.student_id = s.id AND nc.status = 'active'
`;

export async function createStudent(input: {
  name: string;
  email?: string | null;
  university?: string | null;
  major?: string | null;
  password?: string | null;
}): Promise<StudentSummary> {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Name is required");

  const university = (input.university ?? "").trim();
  const major = (input.major ?? "").trim();
  const email = input.email?.trim().toLowerCase() || null;

  if (email) {
    const password = input.password?.trim() || `Temp-${Math.random().toString(36).slice(2, 10)}!`;
    const passwordHash = await bcrypt.hash(password, 10);
    const username = await uniqueUsername(slugify(name));

    const created = await withTransaction(async (q) => {
      await q(
        `DELETE FROM users u
         WHERE lower(u.email) = $1
           AND u.role = 'student'
           AND NOT EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.id)`,
        [email],
      );

      const existing = await q(`SELECT id FROM users WHERE lower(email) = $1`, [email]);
      if (existing.rowCount) {
        throw new Error("Email already registered");
      }

      const userResult = await q<{ id: string }>(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id`,
        [email, passwordHash],
      );
      const userId = userResult.rows[0].id;
      const studentResult = await q<{
        id: string;
        name: string;
        username: string;
        university: string | null;
        major: string | null;
        status: string;
        phone: string | null;
        created_at: Date;
        user_id: string;
      }>(
        `INSERT INTO students (user_id, username, name, university, major, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [userId, username, name, university, major],
      );
      return studentResult.rows[0];
    });

    return mapStudent({ ...created, email, nfc_card: null });
  }

  // Pre-register (name only) — matches admin preregister flow
  const legalName = name.toUpperCase();
  const existing = await query(
    `SELECT id FROM students WHERE UPPER(TRIM(name)) = $1 AND user_id IS NULL`,
    [legalName],
  );
  if (existing.rowCount) {
    throw new Error("A pending profile with this name already exists");
  }

  const username = await uniqueUsername(slugify(legalName));
  const result = await query<{
    id: string;
    name: string;
    username: string;
    university: string | null;
    major: string | null;
    status: string;
    phone: string | null;
    created_at: Date;
    user_id: string | null;
  }>(
    `INSERT INTO students (username, name, university, major, status, user_id)
     VALUES ($1, $2, $3, $4, 'pending', NULL) RETURNING *`,
    [username, legalName, university, major],
  );

  return mapStudent({ ...result.rows[0], email: null, nfc_card: null });
}

export async function deleteStudent(studentId: string): Promise<boolean> {
  return withTransaction(async (q) => {
    const student = await q<{ id: string; user_id: string | null }>(
      `SELECT id, user_id FROM students WHERE id = $1 FOR UPDATE`,
      [studentId],
    );
    if (!student.rowCount) return false;
    const userId = student.rows[0].user_id;
    await q(`DELETE FROM students WHERE id = $1`, [studentId]);
    if (userId) {
      await q(`DELETE FROM users WHERE id = $1`, [userId]);
    }
    return true;
  });
}

export async function setStudentStatus(studentId: string, status: "active" | "inactive" | "pending"): Promise<StudentSummary | null> {
  const result = await query(
    `UPDATE students SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [studentId, status],
  );
  if (!result.rowCount) return null;
  return findStudentById(studentId);
}

export async function changeCollege(studentId: string, university: string): Promise<StudentSummary | null> {
  const result = await query(
    `UPDATE students SET university = $2, updated_at = NOW() WHERE id = $1 RETURNING id`,
    [studentId, university.trim()],
  );
  if (!result.rowCount) return null;
  return findStudentById(studentId);
}

export async function findStudentById(id: string): Promise<StudentSummary | null> {
  const result = await query(`${STUDENT_SELECT} WHERE s.id = $1 LIMIT 1`, [id]);
  if (!result.rowCount) return null;
  return mapStudent(result.rows[0] as Parameters<typeof mapStudent>[0]);
}

export async function searchStudents(
  term: string,
  opts?: { collegeScope?: string | null; limit?: number },
): Promise<StudentSummary[]> {
  const limit = opts?.limit ?? 25;
  const like = `%${term.trim()}%`;
  const params: unknown[] = [like, limit];
  let collegeClause = "";
  if (opts?.collegeScope) {
    params.push(opts.collegeScope);
    collegeClause = `AND lower(s.university) = lower($${params.length})`;
  }

  const result = await query(
    `${STUDENT_SELECT}
     WHERE (
       s.name ILIKE $1 OR u.email ILIKE $1 OR s.username ILIKE $1
       OR s.university ILIKE $1 OR s.phone ILIKE $1 OR s.id::text ILIKE $1
       OR CAST(s.id AS text) = replace($1, '%', '')
     )
     ${collegeClause}
     ORDER BY s.name
     LIMIT $2`,
    params,
  );
  return result.rows.map((r) => mapStudent(r as Parameters<typeof mapStudent>[0]));
}

export async function listStudents(opts: {
  university?: string;
  status?: string;
  todayOnly?: boolean;
  collegeScope?: string | null;
  limit?: number;
}): Promise<StudentSummary[]> {
  const limit = opts.limit ?? 50;
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (opts.university) {
    params.push(opts.university);
    clauses.push(`lower(s.university) = lower($${params.length})`);
  }
  if (opts.collegeScope) {
    params.push(opts.collegeScope);
    clauses.push(`lower(s.university) = lower($${params.length})`);
  }
  if (opts.status) {
    params.push(opts.status);
    clauses.push(`s.status = $${params.length}`);
  }
  if (opts.todayOnly) {
    clauses.push(`s.created_at >= date_trunc('day', NOW())`);
  }

  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `${STUDENT_SELECT} ${where} ORDER BY s.created_at DESC LIMIT $${params.length}`,
    params,
  );
  return result.rows.map((r) => mapStudent(r as Parameters<typeof mapStudent>[0]));
}

export async function resolveStudent(
  queryText: string,
  collegeScope?: string | null,
): Promise<StudentSummary | null> {
  const q = queryText.trim();
  if (!q) return null;

  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q)) {
    const byId = await findStudentById(q);
    if (byId) {
      if (collegeScope && byId.university?.toLowerCase() !== collegeScope.toLowerCase()) return null;
      return byId;
    }
  }

  const results = await searchStudents(q, { collegeScope, limit: 5 });
  if (results.length === 1) return results[0];
  if (results.length === 0) return null;

  // Prefer exact email / username match
  const exact = results.find(
    (s) =>
      s.email?.toLowerCase() === q.toLowerCase() ||
      s.username.toLowerCase() === q.toLowerCase() ||
      s.name.toLowerCase() === q.toLowerCase(),
  );
  return exact ?? null;
}

export async function generateNfcForStudent(studentId: string): Promise<{
  student: StudentSummary;
  cardNumber: string;
  profileUrl: string;
  message: string;
}> {
  const student = await findStudentById(studentId);
  if (!student) throw new Error("Student not found");

  const program = await nfcService.programCard(student.username);
  const cardNumber = `SL-${Date.now()}`;
  await query(
    `INSERT INTO nfc_cards (card_number, student_id, card_uid, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (card_number) DO UPDATE SET
       student_id = EXCLUDED.student_id,
       card_uid = EXCLUDED.card_uid,
       status = 'active'`,
    [cardNumber, studentId, program.cardUid ?? null],
  );

  const updated = (await findStudentById(studentId))!;
  return {
    student: updated,
    cardNumber,
    profileUrl: nfcService.buildProfileUrl(student.username),
    message: program.message,
  };
}

export async function regenerateNfc(studentId: string): Promise<{
  student: StudentSummary;
  cardNumber: string;
  profileUrl: string;
}> {
  await query(
    `UPDATE nfc_cards SET status = 'deactivated' WHERE student_id = $1 AND status = 'active'`,
    [studentId],
  );
  return generateNfcForStudent(studentId);
}

export async function setNfcStatus(
  studentId: string,
  status: "active" | "deactivated",
): Promise<StudentSummary | null> {
  const result = await query(
    `UPDATE nfc_cards SET status = $2
     WHERE student_id = $1 AND status = CASE WHEN $2 = 'active' THEN 'deactivated' ELSE 'active' END
     RETURNING id`,
    [studentId, status],
  );
  if (!result.rowCount && status === "active") {
    // enable: reactivate any deactivated card for student
    await query(
      `UPDATE nfc_cards SET status = 'active'
       WHERE id = (
         SELECT id FROM nfc_cards WHERE student_id = $1 AND status = 'deactivated'
         ORDER BY issued_at DESC LIMIT 1
       )`,
      [studentId],
    );
  } else if (!result.rowCount && status === "deactivated") {
    await query(
      `UPDATE nfc_cards SET status = 'deactivated' WHERE student_id = $1 AND status = 'active'`,
      [studentId],
    );
  }
  return findStudentById(studentId);
}

export async function getAdminStats(collegeScope?: string | null): Promise<{
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  pendingStudents: number;
  todayRegistrations: number;
  activeCards: number;
  byCollege: Array<{ name: string; count: number }>;
  storageUsedGb: number;
  storageTotalGb: number;
  storageUsedPercent: number;
}> {
  const params: unknown[] = [];
  let collegeFilter = "";
  if (collegeScope) {
    params.push(collegeScope);
    collegeFilter = `WHERE lower(university) = lower($1)`;
  }

  const [counts, today, cards, byCollege] = await Promise.all([
    query<{ total: string; active: string; inactive: string; pending: string }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE status = 'active')::text AS active,
         COUNT(*) FILTER (WHERE status = 'inactive')::text AS inactive,
         COUNT(*) FILTER (WHERE status = 'pending')::text AS pending
       FROM students ${collegeFilter}`,
      params,
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM students
       WHERE created_at >= date_trunc('day', NOW())
       ${collegeScope ? "AND lower(university) = lower($1)" : ""}`,
      collegeScope ? [collegeScope] : [],
    ),
    query<{ count: string }>(
      collegeScope
        ? `SELECT COUNT(*)::text AS count FROM nfc_cards nc
           JOIN students s ON s.id = nc.student_id
           WHERE nc.status = 'active' AND lower(s.university) = lower($1)`
        : `SELECT COUNT(*)::text AS count FROM nfc_cards WHERE status = 'active'`,
      collegeScope ? [collegeScope] : [],
    ),
    query<{ name: string; count: string }>(
      `SELECT COALESCE(NULLIF(university, ''), 'Unknown') AS name, COUNT(*)::text AS count
       FROM students
       ${collegeFilter}
       GROUP BY 1
       ORDER BY COUNT(*) DESC
       LIMIT 15`,
      params,
    ),
  ]);

  let storage = { usedGb: 0, totalGb: 100, usedPercent: 0 };
  try {
    const { getStorageStats } = await import("../../services/storage.js");
    storage = await getStorageStats();
  } catch {
    // storage optional for stats
  }

  const c = counts.rows[0];
  return {
    totalStudents: parseInt(c.total, 10),
    activeStudents: parseInt(c.active, 10),
    inactiveStudents: parseInt(c.inactive, 10),
    pendingStudents: parseInt(c.pending, 10),
    todayRegistrations: parseInt(today.rows[0].count, 10),
    activeCards: parseInt(cards.rows[0].count, 10),
    byCollege: byCollege.rows.map((r) => ({ name: r.name, count: parseInt(r.count, 10) })),
    storageUsedGb: storage.usedGb,
    storageTotalGb: storage.totalGb,
    storageUsedPercent: storage.usedPercent,
  };
}

export async function getHealthSnapshot(): Promise<{
  database: "connected" | "disconnected";
  storage: "connected" | "disconnected";
  api: "ok";
  siteUrl: string;
}> {
  let database: "connected" | "disconnected" = "disconnected";
  let storage: "connected" | "disconnected" = "disconnected";
  try {
    await query(`SELECT 1`);
    database = "connected";
  } catch {
    database = "disconnected";
  }
  try {
    const { ensureStorageReady } = await import("../../services/storage.js");
    await ensureStorageReady();
    storage = "connected";
  } catch {
    storage = "disconnected";
  }
  return {
    database,
    storage,
    api: "ok",
    siteUrl: getEnv().SITE_URL,
  };
}
