/**
 * Shared student status checks for login / session issuance.
 * Password, Google, and Supabase auth must enforce the same approval gate.
 */

export type StudentLoginAccess =
  | { ok: true; studentId: string }
  | { ok: false; status: 403; error: string };

/**
 * Decide whether a student may receive a session JWT.
 * Pending / inactive accounts must not bypass admin approval via OAuth.
 */
export function studentLoginAccess(
  student: { id: string; status: string } | undefined,
): StudentLoginAccess {
  if (!student) {
    return { ok: false, status: 403, error: "Student profile not found" };
  }
  if (student.status === "pending") {
    return {
      ok: false,
      status: 403,
      error: "Your account is pending admin approval. Please wait to be approved.",
    };
  }
  if (student.status === "inactive") {
    return {
      ok: false,
      status: 403,
      error: "Your account was declined or deactivated. Contact your administrator.",
    };
  }
  return { ok: true, studentId: student.id };
}
