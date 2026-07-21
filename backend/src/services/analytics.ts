import { query } from "../db/pool.js";

export type ProfileEventType = "view" | "nfc_tap" | "resume_download";

export async function logProfileEvent(
  studentId: string,
  eventType: ProfileEventType,
  source?: string,
): Promise<void> {
  await query(
    `INSERT INTO profile_events (student_id, event_type, source) VALUES ($1, $2, $3)`,
    [studentId, eventType, source ?? null],
  ).catch((err) => console.warn("logProfileEvent:", err));
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function getStudentAnalytics(studentId: string) {
  const [viewsByDay, tapsByDay, referrers, periodCounts] = await Promise.all([
    query<{ dow: number; views: string }>(
      `SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(*)::text AS views
       FROM profile_events
       WHERE student_id = $1 AND event_type = 'view' AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY dow ORDER BY dow`,
      [studentId],
    ),
    query<{ dow: number; taps: string }>(
      `SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(*)::text AS taps
       FROM profile_events
       WHERE student_id = $1 AND event_type = 'nfc_tap' AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY dow ORDER BY dow`,
      [studentId],
    ),
    query<{ source: string; count: string }>(
      `SELECT COALESCE(NULLIF(source, ''), 'Direct Link') AS source, COUNT(*)::text AS count
       FROM profile_events
       WHERE student_id = $1 AND event_type IN ('view', 'nfc_tap') AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY source ORDER BY COUNT(*) DESC LIMIT 5`,
      [studentId],
    ),
    query<{ event_type: string; current: string; previous: string }>(
      `SELECT event_type,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text AS current,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')::text AS previous
       FROM profile_events
       WHERE student_id = $1 AND event_type IN ('view', 'nfc_tap', 'resume_download')
       GROUP BY event_type`,
      [studentId],
    ),
  ]);

  const viewsMap = new Map<number, number>(
    viewsByDay.rows.map((r) => [r.dow, parseInt(r.views, 10)]),
  );
  const tapsMap = new Map<number, number>(
    tapsByDay.rows.map((r) => [r.dow, parseInt(r.taps, 10)]),
  );

  const counts = new Map<string, { current: number; previous: number }>(
    periodCounts.rows.map((r) => [
      r.event_type,
      { current: parseInt(r.current, 10), previous: parseInt(r.previous, 10) },
    ]),
  );

  const totalRef = referrers.rows.reduce((s, r) => s + parseInt(r.count, 10), 0) || 1;

  return {
    viewsByDay: DAY_LABELS.map((day, i) => ({
      day,
      views: viewsMap.get(i) ?? 0,
      taps: tapsMap.get(i) ?? 0,
    })),
    topReferrers: referrers.rows.map((r) => {
      const count = parseInt(r.count, 10);
      return {
        source: r.source,
        count,
        percent: Math.round((count / totalRef) * 100),
      };
    }),
    changes: {
      profileViews: pctChange(
        counts.get("view")?.current ?? 0,
        counts.get("view")?.previous ?? 0,
      ),
      nfcTaps: pctChange(
        counts.get("nfc_tap")?.current ?? 0,
        counts.get("nfc_tap")?.previous ?? 0,
      ),
      resumeDownloads: pctChange(
        counts.get("resume_download")?.current ?? 0,
        counts.get("resume_download")?.previous ?? 0,
      ),
    },
  };
}
