/**
 * StudentLink REST API client.
 * Browser → API only. Never talks to NFC hardware directly.
 */

import { getToken } from "./auth-token";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit & { auth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (options?.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string; message?: string }).error ??
        (data as { message?: string }).message ??
        `Request failed (${res.status})`,
      res.status,
    );
  }

  return data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: "student" | "admin";
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  studentId?: string;
  student?: { id: string; username: string };
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  username: string;
  university: string;
  major: string;
  graduationYear: number | null;
  bio: string;
  avatar: string | null;
  coverImage: string | null;
  location: string;
  github: string;
  linkedin: string;
  portfolio: string;
  phone: string;
  title: string;
}

export interface StudentDashboardData {
  profile: StudentProfile;
  stats: {
    profileViews: number;
    profileViewsChange: number;
    nfcTaps: number;
    nfcTapsChange: number;
    resumeDownloads: number;
    resumeDownloadsChange: number;
    recruiterContacts: number;
    recruiterContactsChange: number;
  };
  projects: Array<{
    id: string;
    title: string;
    description: string;
    tech: string[];
    url: string;
    image: string | null;
    featured: boolean;
  }>;
  skills: Array<{ name: string; level: number; category: string }>;
  certificates: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
    url: string;
  }>;
  experience: Array<{
    id: string;
    role: string;
    company: string;
    period: string;
    description: string;
  }>;
  resume: {
    fileName: string;
    fileSize: string;
    uploadedAt: string;
    version: number;
  } | null;
  nfcCard: {
    id: string;
    status: string;
    cardNumber: string;
    linkedAt: string;
    totalTaps: number;
    lastTap: string | null;
    profileUrl: string;
  } | null;
  analytics: {
    viewsByDay: Array<{ day: string; views: number; taps: number }>;
    topReferrers: Array<{ source: string; count: number; percent: number }>;
  };
}

export interface PublicProfile {
  username: string;
  name: string;
  title: string;
  university: string;
  major: string;
  bio: string;
  avatar: string | null;
  coverImage: string | null;
  github: string;
  linkedin: string;
  portfolio: string;
  email: string;
  phone: string;
  resume: StudentDashboardData["resume"];
  projects: StudentDashboardData["projects"];
  skills: StudentDashboardData["skills"];
  certificates: StudentDashboardData["certificates"];
  experience: StudentDashboardData["experience"];
}

export interface AdminStudent {
  id: string;
  name: string;
  username: string;
  email: string;
  university: string;
  major: string;
  status: string;
  nfcCard: string | null;
  profileViews: number;
  joinedAt: string;
}

export interface NfcReaderStatus {
  connected: boolean;
  readerName: string | null;
  message: string;
}

export interface NfcProgramResult {
  success: boolean;
  verified: boolean;
  cardUid?: string;
  urlWritten?: string;
  message: string;
  studentId?: string;
  cardNumber?: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const api = {
  health: () => request<{ status: string; service: string }>("/health", { auth: false }),

  auth: {
    register: (data: { email: string; password: string; name: string; university?: string }) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        auth: false,
      }),

    login: (data: { email: string; password: string }) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
        auth: false,
      }),

    me: () => request<{ user: AuthUser; student: { id: string; username: string; name: string } | null }>("/auth/me"),
  },

  students: {
    me: () => request<StudentDashboardData>("/students/me"),

    updateProfile: (data: Partial<StudentProfile>) =>
      request("/students/me", { method: "PATCH", body: JSON.stringify(data) }),
  },

  profiles: {
    get: (slug: string) =>
      request<PublicProfile>(`/profiles/${slug}`, { auth: false }),

    list: () => request<string[]>("/profiles", { auth: false }),
  },

  admin: {
    students: () => request<AdminStudent[]>("/admin/students"),
    stats: () => request<Record<string, number>>("/admin/stats"),
  },

  nfc: {
    status: () => request<NfcReaderStatus>("/nfc/status"),

    program: (payload: {
      studentId: string;
      studentSlug: string;
      cardNumber?: string;
    }) =>
      request<NfcProgramResult>("/nfc/program", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
};
