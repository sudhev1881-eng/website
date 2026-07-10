/**
 * StudentLink REST API client.
 * Browser → API only. Never talks to NFC hardware directly.
 */

import { getToken } from "./auth-token";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function apiBase(): string {
  return API_BASE ?? "http://localhost:4000/api";
}

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

  const res = await fetch(`${apiBase()}${path}`, {
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

function apiOrigin(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/api$/, "");
}

export function fileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

async function uploadRequest<T>(path: string, file: File, fieldName = "file"): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append(fieldName, file);

  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error ?? `Upload failed (${res.status})`,
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

export interface GoogleAuthResponse {
  needsClaim: boolean;
  token?: string;
  user?: AuthUser;
  studentId?: string;
  student?: { id: string; username: string };
  claimToken?: string;
  email?: string;
  message?: string;
  matchedName?: string;
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
  skills: Array<{ id: string; name: string; level: number; category: string }>;
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
    downloadUrl: string | null;
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
  email: string | null;
  university: string;
  major: string;
  status: string;
  nfcCard: string | null;
  profileViews: number;
  joinedAt: string;
}

export interface AdminNfcCard {
  id: string;
  cardNumber: string;
  student: string | null;
  university: string;
  status: string;
  taps: number;
  issuedAt: string;
}

export interface AdminUniversity {
  id: string;
  name: string;
  admin: string | null;
  status: string;
  students: number;
  activeCards: number;
  joinedAt: string;
}

export interface AdminAnalytics {
  signupsByMonth: Array<{ month: string; count: number }>;
  tapsByMonth: Array<{ month: string; count: number }>;
  topUniversities: Array<{ name: string; taps: number }>;
  maxTaps: number;
}

export interface AdminStorageData {
  used: number;
  total: number;
  usedPercent: number;
  breakdown: Array<{ type: string; size: number; count: number }>;
}

export interface ResumeVersion {
  id: string;
  fileName: string;
  version: number;
  active: boolean;
  uploadedAt: string;
  downloadUrl: string | null;
}

export interface NfcReaderStatus {
  connected: boolean;
  readerName: string | null;
  message: string;
  mode: "cloud" | "stub" | "hardware";
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

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
      request<{ success: boolean }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    google: (credential: string) =>
      request<GoogleAuthResponse>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
        auth: false,
      }),

    googleClaim: (data: { claimToken: string; firstName: string; lastName: string }) =>
      request<GoogleAuthResponse>("/auth/google/claim", {
        method: "POST",
        body: JSON.stringify(data),
        auth: false,
      }),

    supabaseSync: (accessToken: string) =>
      request<AuthResponse & { needsClaim?: boolean }>("/auth/supabase/sync", {
        method: "POST",
        auth: false,
        headers: { Authorization: `Bearer ${accessToken}` },
      }),

    supabaseClaim: (
      data: { firstName: string; lastName: string },
      accessToken: string,
    ) =>
      request<GoogleAuthResponse>("/auth/supabase/claim", {
        method: "POST",
        body: JSON.stringify(data),
        auth: false,
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
  },

  students: {
    me: () => request<StudentDashboardData>("/students/me"),

    updateProfile: (data: Partial<StudentProfile>) =>
      request("/students/me", { method: "PATCH", body: JSON.stringify(data) }),

    uploadResume: (file: File) =>
      uploadRequest<StudentDashboardData["resume"] & { id: string }>("/students/me/resume", file),

    resumeHistory: () => request<ResumeVersion[]>("/students/me/resumes"),

    uploadAvatar: (file: File) =>
      uploadRequest<{ avatarUrl: string }>("/students/me/avatar", file),

    uploadCover: (file: File) =>
      uploadRequest<{ coverImageUrl: string }>("/students/me/cover", file),

    uploadProjectImage: (projectId: string, file: File) =>
      uploadRequest<{ imageUrl: string }>(`/students/me/projects/${projectId}/image`, file),

    deactivateNfc: () =>
      request<{ success: boolean; message: string }>("/students/me/nfc/deactivate", {
        method: "PATCH",
      }),

    requestNfcReplacement: () =>
      request<{ success: boolean; message: string }>("/students/me/nfc/replacement-request", {
        method: "POST",
      }),

    deleteAccount: () =>
      request<{ success: boolean }>("/students/me", { method: "DELETE" }),

    createProject: (data: {
      title: string;
      description?: string;
      tech?: string[];
      url?: string;
      featured?: boolean;
    }) =>
      request("/students/me/projects", { method: "POST", body: JSON.stringify(data) }),

    deleteProject: (id: string) =>
      request(`/students/me/projects/${id}`, { method: "DELETE" }),

    createSkill: (data: { name: string; level?: number; category?: string }) =>
      request("/students/me/skills", { method: "POST", body: JSON.stringify(data) }),

    deleteSkill: (id: string) =>
      request(`/students/me/skills/${id}`, { method: "DELETE" }),

    createCertificate: (data: { name: string; issuer: string; date: string; url?: string }) =>
      request("/students/me/certificates", { method: "POST", body: JSON.stringify(data) }),

    deleteCertificate: (id: string) =>
      request(`/students/me/certificates/${id}`, { method: "DELETE" }),

    createExperience: (data: {
      role: string;
      company: string;
      period?: string;
      description?: string;
    }) =>
      request("/students/me/experience", { method: "POST", body: JSON.stringify(data) }),

    deleteExperience: (id: string) =>
      request(`/students/me/experience/${id}`, { method: "DELETE" }),
  },

  profiles: {
    get: (slug: string, options?: { src?: string; ref?: string }) => {
      const params = new URLSearchParams();
      if (options?.src) params.set("src", options.src);
      if (options?.ref) params.set("ref", options.ref);
      const qs = params.toString();
      return request<PublicProfile>(`/profiles/${slug}${qs ? `?${qs}` : ""}`, { auth: false });
    },

    resumeDownload: (slug: string) =>
      request<{ downloadUrl: string }>(`/profiles/${slug}/resume`, { auth: false }),

    list: () => request<string[]>("/profiles", { auth: false }),
  },

  admin: {
    students: () => request<AdminStudent[]>("/admin/students"),

    createStudent: (data: {
      email: string;
      password: string;
      name: string;
      university?: string;
      major?: string;
      status?: string;
    }) =>
      request<AdminStudent>("/admin/students", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    preregisterStudent: (data: { name: string; university?: string; major?: string }) =>
      request<AdminStudent>("/admin/students/preregister", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateStudent: (id: string, data: Partial<Pick<AdminStudent, "name" | "university" | "major" | "status">>) =>
      request<AdminStudent>(`/admin/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    deleteStudent: (id: string) =>
      request<{ success: boolean }>(`/admin/students/${id}`, { method: "DELETE" }),

    stats: () => request<Record<string, number>>("/admin/stats"),

    analytics: () => request<AdminAnalytics>("/admin/analytics"),

    storage: () => request<AdminStorageData>("/admin/storage"),

    nfcCards: () => request<AdminNfcCard[]>("/admin/nfc-cards"),

    createNfcCard: (data: { cardNumber: string; university?: string }) =>
      request<AdminNfcCard>("/admin/nfc-cards", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateNfcCard: (id: string, data: { status?: string; studentId?: string }) =>
      request<AdminNfcCard>(`/admin/nfc-cards/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    deleteNfcCard: (id: string) =>
      request<{ success: boolean }>(`/admin/nfc-cards/${id}`, { method: "DELETE" }),

    universities: () => request<AdminUniversity[]>("/admin/universities"),

    createUniversity: (data: { name: string; adminName?: string; status?: string }) =>
      request<AdminUniversity>("/admin/universities", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    updateUniversity: (id: string, data: { name?: string; adminName?: string; status?: string }) =>
      request<AdminUniversity>(`/admin/universities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    deleteUniversity: (id: string) =>
      request<{ success: boolean }>(`/admin/universities/${id}`, { method: "DELETE" }),
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
