import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import i18n from "../i18n";
import { api, getToken, setToken, clearToken } from "../api/client";

type Manager = { id: string; teamName: string; coachName: string; avatarInitial: string };

interface AppState {
  booting: boolean;
  manager: Manager | null;
  needsOnboarding: boolean;
  leagueId: string | null;
  leagueName: string | null;
  language: "en" | "tr";
  setLanguage: (lang: "en" | "tr") => void;
  register: (input: { email: string; password: string; teamName: string; coachName: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshLeagues: () => Promise<void>;
  setActiveLeague: (id: string, name: string) => void;
  completeOnboarding: () => void;
}

const AppCtx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [manager, setManager] = useState<Manager | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [language, setLanguageState] = useState<"en" | "tr">("en");

  const setLanguage = useCallback((lang: "en" | "tr") => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
  }, []);

  const refreshLeagues = useCallback(async () => {
    try {
      const leagues = await api.myLeagues();
      if (leagues.length) {
        setLeagueId(leagues[0].id);
        setLeagueName(leagues[0].name);
      }
    } catch {
      // no leagues yet — fine, League Setup will create/join one
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const me = await api.me();
          setManager(me);
          await refreshLeagues();
        } catch {
          await clearToken();
        }
      }
      setBooting(false);
    })();
  }, [refreshLeagues]);

  // A brand-new account gets the onboarding tour; someone signing back in
  // already had it, so send them straight to the app.
  const register = useCallback(async (input: { email: string; password: string; teamName: string; coachName: string }) => {
    const { token, manager } = await api.register(input);
    await setToken(token);
    setManager(manager);
    setNeedsOnboarding(true);
    await refreshLeagues();
  }, [refreshLeagues]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, manager } = await api.login(email, password);
    await setToken(token);
    setManager(manager);
    setNeedsOnboarding(false);
    await refreshLeagues();
  }, [refreshLeagues]);

  const logout = useCallback(async () => {
    await clearToken();
    setManager(null);
    setNeedsOnboarding(false);
    setLeagueId(null);
    setLeagueName(null);
  }, []);

  const setActiveLeague = useCallback((id: string, name: string) => {
    setLeagueId(id);
    setLeagueName(name);
  }, []);

  const completeOnboarding = useCallback(() => {
    setNeedsOnboarding(false);
  }, []);

  const value = useMemo(
    () => ({
      booting, manager, needsOnboarding, leagueId, leagueName, language, setLanguage,
      register, login, logout, refreshLeagues, setActiveLeague, completeOnboarding,
    }),
    [booting, manager, needsOnboarding, leagueId, leagueName, language, setLanguage, register, login, logout, refreshLeagues, setActiveLeague, completeOnboarding]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
