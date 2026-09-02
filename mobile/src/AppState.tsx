import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL, api } from "./api";
import type { Phase, WindowInfo } from "./api";
import { useAuth } from "./AuthContext";

interface AppState {
  window: WindowInfo | null;
  refreshWindow: () => Promise<void>;
  setPhase: (phase: Phase) => Promise<void>;
  socket: Socket | null;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { token, refreshMe } = useAuth();
  const [win, setWin] = useState<WindowInfo | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const refreshWindow = useCallback(async () => {
    try {
      setWin(await api.window());
    } catch {
      // ignore transient failures; screens keep their last-known phase
    }
  }, []);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    refreshWindow();
    const socket = io(API_BASE_URL!, { transports: ["websocket", "polling"] });
    socket.on("connect", () => socket.emit("join", token));
    socket.on("window:changed", (payload: WindowInfo) => setWin(payload));
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, refreshWindow]);

  const setPhase = useCallback(
    async (phase: Phase) => {
      const updated = await api.setWindowPhase(phase);
      setWin(updated);
      await refreshMe();
    },
    [refreshMe]
  );

  return <AppStateContext.Provider value={{ window: win, refreshWindow, setPhase, socket: socketRef.current }}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
