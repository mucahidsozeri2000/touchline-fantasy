// Static preview mode: serves the exact same screens with real, previously-
// captured response shapes instead of hitting a live backend. Used only when
// EXPO_PUBLIC_DEMO_MODE=1 at build time (see client.ts). Mutations act on an
// in-memory clone so interactions (bidding, chat, captaincy...) feel real
// within a session, but nothing persists past a page reload.
import { MOCK } from "./mockData";

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

const state = {
  manager: clone(MOCK.me),
  league: clone(MOCK.league),
  standings: clone(MOCK.standings),
  squad: clone(MOCK.squad),
  transfers: clone(MOCK.transfers),
  auction: clone(MOCK.auction) as any,
  waivers: clone(MOCK.waivers),
  reauction: clone(MOCK.reauction),
  matchdayLive: clone(MOCK["matchday-live"]),
  results: clone(MOCK.results),
  draftFeed: clone(MOCK["draft-feed"]),
  risk: clone(MOCK.risk),
  predictions: clone(MOCK.predictions),
  h2h: clone(MOCK.h2h),
  chat: clone(MOCK.chat),
  profile: clone(MOCK.profile),
  paywall: clone(MOCK.paywall),
  rules: clone(MOCK.rules),
};

const LEAGUE_ID = state.league.id as string;
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));

function match(path: string, pattern: RegExp) {
  return pattern.test(path.split("?")[0]);
}

// React Native's URL has no `searchParams`, so parse the query by hand rather
// than reaching for it — this same code has to run in a native demo build.
function queryParam(path: string, key: string): string | null {
  const q = path.split("?")[1];
  if (!q) return null;
  for (const pair of q.split("&")) {
    const eq = pair.indexOf("=");
    const k = eq === -1 ? pair : pair.slice(0, eq);
    if (decodeURIComponent(k) !== key) continue;
    return eq === -1 ? "" : decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " "));
  }
  return null;
}

export async function demoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  await delay();
  const method = (options.method ?? "GET").toUpperCase();
  const body = options.body ? JSON.parse(options.body as string) : {};

  // ── Auth ────────────────────────────────────────────────────────────
  // The preview has no account store, so registering just renames the demo
  // manager and signing in always succeeds — there is nobody else to be.
  if (method === "POST" && path === "/auth/register") {
    state.manager.teamName = body.teamName || state.manager.teamName;
    state.manager.coachName = body.coachName || state.manager.coachName;
    state.manager.avatarInitial = (state.manager.coachName?.[0] || "?").toUpperCase();
    return { token: "demo-token", manager: clone(state.manager) } as T;
  }
  if (method === "POST" && path === "/auth/login") {
    return { token: "demo-token", manager: clone(state.manager) } as T;
  }
  if (method === "GET" && path === "/me") return clone(state.manager) as T;

  // ── Leagues ─────────────────────────────────────────────────────────
  if (method === "GET" && path === "/leagues/mine") return [clone(state.league)] as T;
  if (method === "GET" && path.startsWith("/leagues/open")) return [] as T;
  if (method === "POST" && path === "/leagues") {
    return { ...clone(state.league), name: body.name || state.league.name } as T;
  }
  if (method === "POST" && path === "/leagues/join") return clone(state.league) as T;
  if (match(path, /^\/leagues\/[^/]+$/) && method === "GET") return clone(state.league) as T;
  if (match(path, /^\/leagues\/[^/]+\/standings$/)) return clone(state.standings) as T;

  // ── Squad ───────────────────────────────────────────────────────────
  if (match(path, /^\/leagues\/[^/]+\/squad$/) && method === "GET") return clone(state.squad) as T;
  if (match(path, /^\/leagues\/[^/]+\/squad\/captain$/) && method === "POST") {
    const wasCaptain = state.squad.starters.find((s: any) => s.playerId === body.playerId)?.isCaptain;
    state.squad.starters.forEach((s: any) => (s.isCaptain = false));
    if (!wasCaptain) {
      const s = state.squad.starters.find((x: any) => x.playerId === body.playerId);
      if (s) s.isCaptain = true;
    }
    return clone(state.squad) as T;
  }
  if (match(path, /^\/leagues\/[^/]+\/squad\/swap$/) && method === "POST") {
    const starterIdx = state.squad.starters.findIndex((s: any) => s.playerId === body.starterPlayerId);
    const benchIdx = state.squad.bench.findIndex((s: any) => s.playerId === body.benchPlayerId);
    if (starterIdx !== -1 && benchIdx !== -1) {
      const starter = state.squad.starters[starterIdx];
      const bench = state.squad.bench[benchIdx];
      const wasCaptain = starter.isCaptain;
      starter.isCaptain = false;
      bench.isCaptain = wasCaptain;
      state.squad.starters[starterIdx] = bench;
      state.squad.bench[benchIdx] = starter;
    }
    return clone(state.squad) as T;
  }

  // ── Transfers ───────────────────────────────────────────────────────
  if (match(path, /^\/leagues\/[^/]+\/transfers$/) && method === "GET") {
    const position = queryParam(path, "position");
    const players = position ? state.transfers.players.filter((p: any) => p.position === position) : state.transfers.players;
    return { ...clone(state.transfers), players: clone(players) } as T;
  }
  if (match(path, /^\/leagues\/[^/]+\/transfers\/confirm$/) && method === "POST") {
    const ids: string[] = body.playerIds ?? [];
    let total = 0;
    for (const id of ids) {
      const p = state.transfers.players.find((x: any) => x.playerId === id);
      if (p && !p.drafted) {
        p.drafted = true;
        p.ownedByMe = true;
        total += p.price;
        state.squad.bench.push({
          slotId: `demo-${id}`, playerId: id, name: p.name, club: p.club, clubColor: p.clubColor,
          position: p.position, price: p.price, isCaptain: false, initials: p.initials,
        });
      }
    }
    state.transfers.budgetRemaining -= total;
    state.squad.budgetRemaining -= total;
    return { budgetRemaining: state.transfers.budgetRemaining, acquired: ids.length } as T;
  }

  // ── Auction ─────────────────────────────────────────────────────────
  if (match(path, /^\/leagues\/[^/]+\/auction$/) && method === "GET") {
    const position = queryParam(path, "position");
    const search = queryParam(path, "search")?.toLowerCase();
    let lots = state.auction.lots;
    if (position) lots = lots.filter((l: any) => l.position === position);
    if (search) lots = lots.filter((l: any) => l.name.toLowerCase().includes(search));
    return { ...clone(state.auction), lots: clone(lots) } as T;
  }
  if (match(path, /^\/leagues\/[^/]+\/auction\/bid$/) && method === "POST") {
    const lot = state.auction.lots.find((l: any) => l.playerId === body.playerId);
    if (lot) {
      lot.myBid = body.amount;
      lot.bidCount = (lot.bidCount ?? 0) + 1;
      if (state.auction.blindRound) {
        lot.status = "Bid In";
      } else {
        lot.topBid = body.amount;
        lot.topBidder = state.manager.coachName;
        lot.status = "Leading";
      }
      lot.nextBidFloor = body.amount + 0.5;
    }
    return { bid: { amount: body.amount }, extended: false } as T;
  }
  if (match(path, /^\/leagues\/[^/]+\/auction\/counter$/) && method === "POST") {
    const lot = state.auction.lots.find((l: any) => l.playerId === body.playerId);
    const amount = lot?.nextBidFloor ?? 0;
    if (lot) {
      lot.myBid = amount;
      lot.status = state.auction.blindRound ? "Bid In" : "Leading";
      if (!state.auction.blindRound) { lot.topBid = amount; lot.topBidder = state.manager.coachName; }
      lot.nextBidFloor = amount + 0.5;
    }
    return { bid: { amount }, extended: false } as T;
  }
  if (match(path, /^\/leagues\/[^/]+\/auction\/blind$/) && method === "POST") {
    state.auction.blindRound = !!body.enabled;
    return clone(state.league) as T;
  }
  if (match(path, /^\/leagues\/[^/]+\/waivers$/) && method === "GET") return clone(state.waivers) as T;
  if (match(path, /^\/leagues\/[^/]+\/waivers\/claim$/) && method === "POST") {
    const w = state.waivers.find((x: any) => x.playerId === body.playerId);
    if (w) w.claimed = true;
    return { awardedTo: state.manager.id, won: true } as T;
  }

  // ── Re-auction & pricing ────────────────────────────────────────────
  if (match(path, /^\/leagues\/[^/]+\/reauction$/)) return clone(state.reauction) as T;

  // ── Matchday / results ──────────────────────────────────────────────
  if (match(path, /^\/leagues\/[^/]+\/matchday\/live$/)) return clone(state.matchdayLive) as T;
  if (match(path, /^\/leagues\/[^/]+\/results$/)) return clone(state.results) as T;
  if (match(path, /^\/leagues\/[^/]+\/draft-feed$/)) return clone(state.draftFeed) as T;

  // ── Engagement ──────────────────────────────────────────────────────
  if (match(path, /^\/leagues\/[^/]+\/risk$/)) return clone(state.risk) as T;
  if (match(path, /^\/leagues\/[^/]+\/predictions$/) && method === "GET") return clone(state.predictions) as T;
  if (match(path, /^\/leagues\/[^/]+\/predictions$/) && method === "POST") {
    state.predictions.myPrediction = { topScorerPick: body.topScorerPick, picks: body.picks ?? [] };
    return { ok: true } as T;
  }
  if (match(path, /^\/leagues\/[^/]+\/h2h$/)) return clone(state.h2h) as T;
  if (match(path, /^\/leagues\/[^/]+\/chat$/) && method === "GET") return clone(state.chat) as T;
  if (match(path, /^\/leagues\/[^/]+\/chat$/) && method === "POST") {
    const msg = { id: `demo-${Date.now()}`, sender: state.manager.coachName, text: body.text, sentAt: new Date().toISOString(), me: true };
    state.chat.push(msg);
    return clone(msg) as T;
  }
  if (match(path, /^\/leagues\/[^/]+\/profile\/[^/]+$/)) return clone(state.profile) as T;

  // ── Paywall ─────────────────────────────────────────────────────────
  if (match(path, /^\/leagues\/[^/]+\/paywall$/) && method === "GET") return clone(state.paywall) as T;
  if (match(path, /^\/leagues\/[^/]+\/purchase$/) && method === "POST") {
    state.paywall.isPro = true;
    return { ok: true } as T;
  }

  if (path === "/rules") return clone(state.rules) as T;

  throw new Error(`Demo preview has no mock for ${method} ${path}`);
}

export const DEMO_LEAGUE_ID = LEAGUE_ID;
