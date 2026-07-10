/** Shared types between frontend and backend */

export type UserRole = "student" | "admin";

export type StudentStatus = "active" | "pending" | "inactive" | "unclaimed";

export type NfcCardStatus = "active" | "unassigned" | "deactivated";

export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  service: string;
  database: "connected" | "disconnected";
  storage: "connected" | "disconnected";
  timestamp: string;
}
