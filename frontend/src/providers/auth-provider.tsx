"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api, type AuthUser } from "@/lib/api";
import { getToken, setToken, clearToken, peekTokenUser } from "@/lib/auth-token";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<import("@/lib/api").AuthResponse>;
  register: (data: {
    email: string;
    password: string;
    name: string;
    university: string;
  }) => Promise<import("@/lib/api").RegisterResponse>;
  googleSignIn: (credential: string) => Promise<import("@/lib/api").GoogleAuthResponse>;
  googleClaim: (data: {
    claimToken: string;
    firstName: string;
    lastName: string;
  }) => Promise<import("@/lib/api").GoogleAuthResponse>;
  applySession: (token: string, user: AuthUser) => void;
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
      setLoading(false);
      return;
    }

    // Show the app immediately from the JWT; confirm with /me in the background.
    const peeked = peekTokenUser(token);
    if (peeked) {
      setUser(peeked);
      setLoading(false);
    }

    let cancelled = false;
    api.auth
      .me()
      .then(({ user: next }) => {
        if (!cancelled) {
          setUser(next);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = React.useCallback((token: string, nextUser: AuthUser) => {
    setToken(token);
    setUser(nextUser);
    setLoading(false);
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login({ email, password });
      applySession(res.token, res.user);
      return res;
    },
    [applySession],
  );

  const register = React.useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      university: string;
    }) => {
      // Self-registration waits for admin approval — do not create a session.
      return api.auth.register(data);
    },
    [],
  );

  const googleSignIn = React.useCallback(
    async (credential: string) => {
      const res = await api.auth.google(credential);
      if (!res.needsClaim && res.token && res.user) {
        applySession(res.token, res.user);
      }
      return res;
    },
    [applySession],
  );

  const googleClaim = React.useCallback(
    async (data: {
      claimToken: string;
      firstName: string;
      lastName: string;
    }) => {
      const res = await api.auth.googleClaim(data);
      if (res.token && res.user) {
        applySession(res.token, res.user);
      }
      return res;
    },
    [applySession],
  );

  const logout = React.useCallback(() => {
    clearToken();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = React.useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      googleSignIn,
      googleClaim,
      applySession,
      logout,
    }),
    [user, loading, login, register, googleSignIn, googleClaim, applySession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
