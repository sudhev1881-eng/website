const TOKEN_KEY = "studentlink_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Decode JWT payload without verifying — for optimistic UI only. */
export function peekTokenUser(
  token: string,
): { id: string; email: string; role: "student" | "admin" } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as {
      userId?: string;
      email?: string;
      role?: string;
      exp?: number;
    };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (
      !payload.userId ||
      !payload.email ||
      (payload.role !== "student" && payload.role !== "admin")
    ) {
      return null;
    }
    return { id: payload.userId, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}
