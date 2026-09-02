import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearToken, getToken, setToken as persistToken } from "./api";
import type { Me } from "./api";

interface AuthState {
  booting: boolean;
  token: string | null;
  me: Me | null;
  register: (teamName: string, coachName: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [token, setTokenState] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  const refreshMe = useCallback(async () => {
    try {
      setMe(await api.me());
    } catch {
      // token invalid/stale — drop back to logged-out state
      await clearToken();
      setTokenState(null);
      setMe(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const existing = await getToken();
      if (existing) {
        setTokenState(existing);
        await refreshMe();
      }
      setBooting(false);
    })();
  }, [refreshMe]);

  const applyLogin = useCallback(async (t: string) => {
    await persistToken(t);
    setTokenState(t);
    await refreshMe();
  }, [refreshMe]);

  const register = useCallback(async (teamName: string, coachName: string) => {
    const { token: t } = await api.register(teamName, coachName);
    await applyLogin(t);
  }, [applyLogin]);

  const guestLogin = useCallback(async () => {
    const { token: t } = await api.guest();
    await applyLogin(t);
  }, [applyLogin]);

  const logout = useCallback(async () => {
    await clearToken();
    setTokenState(null);
    setMe(null);
  }, []);

  return (
    <AuthContext.Provider value={{ booting, token, me, register, guestLogin, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
