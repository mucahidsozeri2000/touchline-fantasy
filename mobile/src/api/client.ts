import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { demoRequest } from "./demoClient";

// Static-preview build (no backend attached): set at build time via
// `EXPO_PUBLIC_DEMO_MODE=1 npx expo export --platform web`. Every api.* call
// below is served from src/api/demoClient.ts's in-memory mock instead of
// fetching a real server — same screens, frozen/replayable data.
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "1";

// Where the app talks to the backend. Set EXPO_PUBLIC_API_BASE_URL at build time
// to point a real build at a deployed API (e.g. https://api.example.com/api);
// app.json's extra.apiBaseUrl is the fallback, and localhost is the dev default.
const configuredBase =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string | undefined) ||
  ((Constants.expoConfig?.extra as any)?.apiBaseUrl as string | undefined);
export const API_BASE = configuredBase ?? "http://localhost:4000/api";

const TOKEN_KEY = "touchline.token";

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// "localhost" means the phone itself, so a device build pointed there can only
// ever fail — and it fails as an opaque network error. Name the cause instead.
const POINTS_AT_LOCALHOST = /\/\/(localhost|127\.0\.0\.1)\b/.test(API_BASE);
const ON_DEVICE = Platform.OS === "android" || Platform.OS === "ios";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (DEMO_MODE) {
    return demoRequest<T>(path, options);
  }
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (err: any) {
    if (ON_DEVICE && POINTS_AT_LOCALHOST) {
      throw new Error(
        `This build points at ${API_BASE}, which on a phone means the phone itself. ` +
          `Rebuild with EXPO_PUBLIC_API_BASE_URL set to a reachable API ` +
          `(your machine's LAN address for local testing, or your deployed host).`
      );
    }
    throw new Error(`Can't reach the API at ${API_BASE}. ${err?.message ?? "Network request failed"}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) }),

  // Auth
  enter: (teamName: string, coachName: string, email?: string) =>
    request<{ token: string; manager: any }>("/auth/enter", { method: "POST", body: JSON.stringify({ teamName, coachName, email }) }),
  google: () => request<{ token: string; manager: any }>("/auth/google", { method: "POST" }),
  me: () => request<any>("/me"),

  // Leagues
  myLeagues: () => request<any[]>("/leagues/mine"),
  openLeagues: () => request<any[]>("/leagues/open"),
  createLeague: (input: any) => request<any>("/leagues", { method: "POST", body: JSON.stringify(input) }),
  joinLeague: (inviteCode: string) => request<any>("/leagues/join", { method: "POST", body: JSON.stringify({ inviteCode }) }),
  standings: (leagueId: string) => request<any>(`/leagues/${leagueId}/standings`),
  league: (leagueId: string) => request<any>(`/leagues/${leagueId}`),

  // Squad
  squad: (leagueId: string) => request<any>(`/leagues/${leagueId}/squad`),
  setCaptain: (leagueId: string, playerId: string) =>
    request<any>(`/leagues/${leagueId}/squad/captain`, { method: "POST", body: JSON.stringify({ playerId }) }),
  swap: (leagueId: string, starterPlayerId: string, benchPlayerId: string) =>
    request<any>(`/leagues/${leagueId}/squad/swap`, { method: "POST", body: JSON.stringify({ starterPlayerId, benchPlayerId }) }),

  // Transfers
  transfers: (leagueId: string, position?: string) =>
    request<any>(`/leagues/${leagueId}/transfers${position && position !== "ALL" ? `?position=${position}` : ""}`),
  confirmTransfers: (leagueId: string, playerIds: string[]) =>
    request<any>(`/leagues/${leagueId}/transfers/confirm`, { method: "POST", body: JSON.stringify({ playerIds }) }),

  // Auction
  auction: (leagueId: string, position?: string, search?: string) => {
    const params = new URLSearchParams();
    if (position && position !== "ALL") params.set("position", position);
    if (search) params.set("search", search);
    const qs = params.toString();
    return request<any>(`/leagues/${leagueId}/auction${qs ? `?${qs}` : ""}`);
  },
  bid: (leagueId: string, playerId: string, amount: number) =>
    request<any>(`/leagues/${leagueId}/auction/bid`, { method: "POST", body: JSON.stringify({ playerId, amount }) }),
  counterBid: (leagueId: string, playerId: string) =>
    request<any>(`/leagues/${leagueId}/auction/counter`, { method: "POST", body: JSON.stringify({ playerId }) }),
  setBlind: (leagueId: string, enabled: boolean) =>
    request<any>(`/leagues/${leagueId}/auction/blind`, { method: "POST", body: JSON.stringify({ enabled }) }),
  waivers: (leagueId: string) => request<any[]>(`/leagues/${leagueId}/waivers`),
  claimWaiver: (leagueId: string, playerId: string) =>
    request<any>(`/leagues/${leagueId}/waivers/claim`, { method: "POST", body: JSON.stringify({ playerId }) }),

  // Re-auction & pricing
  reauction: (leagueId: string) => request<any>(`/leagues/${leagueId}/reauction`),

  // Matchday
  matchdayLive: (leagueId: string) => request<any>(`/leagues/${leagueId}/matchday/live`),
  results: (leagueId: string) => request<any[]>(`/leagues/${leagueId}/results`),
  draftFeed: (leagueId: string) => request<any[]>(`/leagues/${leagueId}/draft-feed`),

  // Engagement
  risk: (leagueId: string) => request<any>(`/leagues/${leagueId}/risk`),
  predictions: (leagueId: string, gameweek = 6) => request<any>(`/leagues/${leagueId}/predictions?gameweek=${gameweek}`),
  submitPrediction: (leagueId: string, gameweek: number, topScorerPick: string, picks: any[]) =>
    request<any>(`/leagues/${leagueId}/predictions`, { method: "POST", body: JSON.stringify({ gameweek, topScorerPick, picks }) }),
  h2h: (leagueId: string, gameweek = 6) => request<any>(`/leagues/${leagueId}/h2h?gameweek=${gameweek}`),
  chat: (leagueId: string) => request<any[]>(`/leagues/${leagueId}/chat`),
  sendChat: (leagueId: string, text: string) =>
    request<any>(`/leagues/${leagueId}/chat`, { method: "POST", body: JSON.stringify({ text }) }),
  profile: (leagueId: string, managerId: string) => request<any>(`/leagues/${leagueId}/profile/${managerId}`),

  // Paywall
  paywall: (leagueId: string) => request<any>(`/leagues/${leagueId}/paywall`),
  purchase: (leagueId: string, plan: string) =>
    request<any>(`/leagues/${leagueId}/purchase`, { method: "POST", body: JSON.stringify({ plan }) }),

  rules: () => request<any>("/rules"),
};
