import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Same-machine dev server. On a physical device this would need to be the
// LAN IP of the machine running `npm run server:dev` instead of localhost.
export const API_BASE_URL = Platform.select({ default: "http://localhost:4000" });

const TOKEN_KEY = "touchline.token";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {}

async function request<T>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error ?? `Request failed (${res.status})`);
  return json as T;
}

// ---------------------------------------------------------------- types --
export type Position = "GK" | "DEF" | "MID" | "FWD";
export type Phase = "waiting" | "open" | "closed";

export interface Me {
  teamName: string;
  coachName: string;
  coachInitial: string;
  leagueName: string;
  squadValue: number;
  budgetRemaining: number;
  totalPoints: number;
  rank: number;
}

export interface WindowInfo {
  phase: Phase;
  opensAt: string;
  closesAt: string;
}

export interface SquadMarker {
  id: string;
  name: string;
  shortName: string;
  initials: string;
  photoUrl: string | null;
  position: Position;
  isCaptain: boolean;
}

export interface Squad {
  captainPlayerId: string | null;
  gk: SquadMarker[];
  defMarkers: SquadMarker[];
  midMarkers: SquadMarker[];
  fwdMarkers: SquadMarker[];
  bench: SquadMarker[];
}

export interface MarketPlayer {
  id: string;
  name: string;
  club: string;
  position: Position;
  price: number;
  form: number;
  photoUrl: string | null;
  initials: string;
  taken: boolean;
  takenBy: string | null;
  canPick: boolean;
}

export interface StandingsRow {
  managerId: string;
  manager: string;
  gw: number;
  total: number;
  isMe: boolean;
  rank: number;
}

export interface League {
  name: string;
  standings: StandingsRow[];
}

export interface DraftFeedEvent {
  id: string;
  manager: string;
  isMe: boolean;
  player: string;
  posLabel: Position;
  club: string;
  initials: string;
  createdAt: string;
}

export interface Fixture {
  id: string;
  home: string;
  away: string;
  score: string;
  date: string;
  yourPts: number;
}

export interface RulesInfo {
  squadSize: number;
  budget: number;
  maxPerClub: number;
  bench: number;
  startingXi: string;
  scoring: { action: string; points: string }[];
}

// -------------------------------------------------------------------- api --
export const api = {
  async register(teamName: string, coachName: string) {
    return request<{ token: string; manager: { id: string; teamName: string; coachName: string } }>("/api/auth/register", {
      method: "POST",
      body: { teamName, coachName },
      auth: false,
    });
  },
  async guest() {
    return request<{ token: string; manager: { id: string; teamName: string; coachName: string } }>("/api/auth/guest", {
      method: "POST",
      auth: false,
    });
  },
  me: () => request<Me>("/api/me"),
  window: () => request<WindowInfo>("/api/window"),
  setWindowPhase: (phase: Phase) => request<WindowInfo>("/api/window/phase", { method: "POST", body: { phase } }),
  squad: () => request<Squad>("/api/squad"),
  setCaptain: (playerId: string) => request<{ captainPlayerId: string }>("/api/squad/captain", { method: "POST", body: { playerId } }),
  market: (position: Position | "ALL") => request<MarketPlayer[]>(`/api/market?position=${position}`),
  confirmTransfers: (playerIds: string[]) =>
    request<{ drafted: string[]; rejected: { playerId: string; reason: string }[] }>("/api/transfers/confirm", {
      method: "POST",
      body: { playerIds },
    }),
  league: () => request<League>("/api/league"),
  draftFeed: () => request<DraftFeedEvent[]>("/api/draft-feed"),
  fixtures: () => request<Fixture[]>("/api/fixtures"),
  rules: () => request<RulesInfo>("/api/rules"),
};
