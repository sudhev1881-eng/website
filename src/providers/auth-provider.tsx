"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, type AuthUser } from "@/lib/api";
import { getToken, setToken, clearToken } from "@/lib/auth-token";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<import("@/lib/api").AuthResponse>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    university?: string;
  }) => Promise<import("@/lib/api").AuthResponse>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      const frame = requestAnimationFrame(() => setLoading(false));
      return () => cancelAnimationFrame(frame);
    }

    api.auth
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const register = async (data: {
    email: string;
    password: string;
    name: string;
    university?: string;
  }) => {
    const res = await api.auth.register(data);
    setToken(res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    clearToken();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
