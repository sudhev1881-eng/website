export type TelegramPermissionLevel = "super_admin" | "college_admin" | "read_only";

export interface TelegramAdminRecord {
  id: string;
  telegramUserId: number;
  userId: string;
  email: string;
  role: "admin" | "student";
  permissionLevel: TelegramPermissionLevel;
  collegeScope: string | null;
  displayName: string | null;
  isActive: boolean;
}

export type IntentName =
  | "help"
  | "create_student"
  | "delete_student"
  | "suspend_student"
  | "reactivate_student"
  | "change_college"
  | "find_student"
  | "list_students"
  | "list_by_college"
  | "list_inactive"
  | "list_today"
  | "bulk_import"
  | "generate_nfc"
  | "regenerate_nfc"
  | "disable_nfc"
  | "enable_nfc"
  | "nfc_url"
  | "stats"
  | "health"
  | "confirm"
  | "cancel"
  | "unknown";

export interface ParsedIntent {
  intent: IntentName;
  confidence: number;
  args: Record<string, string | undefined>;
  raw: string;
  source: "command" | "pattern" | "ai";
}

export type PendingActionType =
  | "delete_student"
  | "suspend_student"
  | "disable_nfc"
  | "bulk_import"
  | "change_college";

export interface PendingAction {
  type: PendingActionType;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface TelegramSessionState {
  id: string;
  telegramUserId: number;
  adminId: string | null;
  state: string;
  pendingAction: PendingAction | null;
  context: Record<string, unknown>;
  expiresAt: Date;
}

export interface StudentSummary {
  id: string;
  name: string;
  username: string;
  email: string | null;
  university: string | null;
  major: string | null;
  status: string;
  phone: string | null;
  nfcCard: string | null;
  profileUrl: string;
  createdAt: Date;
}

export const WRITE_INTENTS: ReadonlySet<IntentName> = new Set([
  "create_student",
  "delete_student",
  "suspend_student",
  "reactivate_student",
  "change_college",
  "bulk_import",
  "generate_nfc",
  "regenerate_nfc",
  "disable_nfc",
  "enable_nfc",
]);

export const DESTRUCTIVE_INTENTS: ReadonlySet<IntentName> = new Set([
  "delete_student",
  "suspend_student",
  "disable_nfc",
  "bulk_import",
  "change_college",
]);
