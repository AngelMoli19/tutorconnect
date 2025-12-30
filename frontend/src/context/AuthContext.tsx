import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { api, parseApiError } from "../api/client";
import { clearAuth, loadAuth, saveAuth } from "../utils/auth-storage";
import type { StoredAuth } from "../utils/auth-storage";

interface AuthContextValue {
  auth: StoredAuth | null;
  isAuthenticating: boolean;
  login: (credentials: LoginPayload) => Promise<StoredAuth>;
  logout: () => void;
}

interface LoginPayload {
  dni: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  role: string;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isAuthenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    const stored = loadAuth();
    if (stored) {
      setAuth(stored);
    }
  }, []);

  const login = useCallback(async ({ dni, password }: LoginPayload) => {
    setAuthenticating(true);
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", { dni, password });
      const payload: StoredAuth = {
        token: data.access_token,
        role: data.role,
        expiresAt: data.expires_at,
      };
      saveAuth(payload);
      setAuth(payload);
      return payload;
    } catch (error) {
      throw parseApiError(error);
    } finally {
      setAuthenticating(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setAuth(null);
  }, []);

  useEffect(() => {
    if (!auth?.token || !auth.expiresAt) return;
    const expiresAtMs = new Date(auth.expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) {
      logout();
      return;
    }
    const remainingMs = expiresAtMs - Date.now();
    if (remainingMs <= 0) {
      logout();
      return;
    }
    const timerId = window.setTimeout(() => {
      logout();
    }, remainingMs);
    return () => window.clearTimeout(timerId);
  }, [auth?.token, auth?.expiresAt, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      isAuthenticating,
      login,
      logout,
    }),
    [auth, isAuthenticating, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
