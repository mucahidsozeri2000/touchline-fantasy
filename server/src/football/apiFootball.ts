import { Position } from "@prisma/client";
import {
  AccessReport,
  FootballProvider,
  ProviderClub,
  ProviderFixture,
  ProviderFixtureStatus,
  ProviderPlayer,
  ProviderPlayerMatchStat,
} from "./provider";

const BASE = "https://v3.football.api-sports.io";

/** API-Football's id for the UEFA Champions League. */
const CHAMPIONS_LEAGUE = 2;

// Status codes from the provider, grouped into the three states the app has.
// Anything unrecognised is treated as scheduled rather than guessed at.
const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);
const ABANDONED = new Set(["PST", "CANC", "ABD", "AWD", "WO"]);

const POSITIONS: Record<string, Position> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfielder: "MID",
  Attacker: "FWD",
};

type Json = any;

export class ApiFootballProvider implements FootballProvider {
  readonly name = "api-football";
  private requests = 0;

  constructor(private apiKey: string) {
    if (!apiKey) throw new Error("FOOTBALL_API_KEY is not set");
  }

  /** How many provider requests this process has spent — the free plan caps the day. */
  get requestsUsed() {
    return this.requests;
  }

  private async get(path: string, params: Record<string, string | number> = {}): Promise<Json> {
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

    this.requests += 1;
    const res = await fetch(url, { headers: { "x-apisports-key": this.apiKey } });

    if (res.status === 429) {
      throw new Error(
        "API-Football rate limit reached. The free plan allows 100 requests a day; " +
          "wait for the quota to reset or reduce what you are syncing."
      );
    }
    if (!res.ok) {
      throw new Error(`API-Football ${path} returned HTTP ${res.status}`);
    }

    const body = (await res.json()) as Json;

    // The API answers 200 with an `errors` object for auth and plan problems,
    // so a bare status check would sail straight past them.
    const errors = body?.errors;
    const hasErrors = Array.isArray(errors) ? errors.length > 0 : errors && Object.keys(errors).length > 0;
    if (hasErrors) {
      const detail = Array.isArray(errors) ? errors.join("; ") : Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join("; ");
      throw new Error(`API-Football ${path} refused the request — ${detail}`);
    }
    return body;
  }

  async checkAccess(season: number): Promise<AccessReport> {
    const notes: string[] = [];
    let ok = true;

    try {
      const status = await this.get("/status");
      const r = status.response ?? {};
      notes.push(`account: ${r.account?.email ?? "unknown"}`);
      notes.push(`plan: ${r.subscription?.plan ?? "unknown"} (active: ${r.subscription?.active ?? "?"})`);
      notes.push(`requests today: ${r.requests?.current ?? "?"} / ${r.requests?.limit_day ?? "?"}`);
    } catch (err: any) {
      return { provider: this.name, ok: false, notes: [`/status failed: ${err.message}`] };
    }

    // The decisive question for a free key is not "does it work" but "does it
    // cover the season we need", so ask for exactly that.
    try {
      const seasons = await this.get("/leagues", { id: CHAMPIONS_LEAGUE });
      const league = seasons.response?.[0];
      const years: number[] = (league?.seasons ?? []).map((s: Json) => s.year);
      notes.push(`Champions League seasons visible to this key: ${years.length ? years.join(", ") : "none"}`);
      if (!years.includes(season)) {
        ok = false;
        notes.push(
          `season ${season} is NOT in that list — the sync cannot run. Free plans are ` +
            `commonly restricted to older seasons; pick a visible season with ` +
            `FOOTBALL_SEASON, or upgrade the plan.`
        );
      }
    } catch (err: any) {
      ok = false;
      notes.push(`/leagues failed: ${err.message}`);
    }

    try {
      const teams = await this.get("/teams", { league: CHAMPIONS_LEAGUE, season });
      notes.push(`teams returned for season ${season}: ${teams.response?.length ?? 0}`);
      if (!teams.response?.length) ok = false;
    } catch (err: any) {
      ok = false;
      notes.push(`/teams failed: ${err.message}`);
    }

    return { provider: this.name, ok, notes };
  }

  async fetchClubs(season: number): Promise<ProviderClub[]> {
    const body = await this.get("/teams", { league: CHAMPIONS_LEAGUE, season });
    return (body.response ?? []).map((row: Json): ProviderClub => {
      const name: string = row.team?.name ?? "Unknown";
      return {
        externalId: String(row.team.id),
        name,
        // `code` is often null, so fall back to something derived and stable.
        shortCode: (row.team?.code ?? name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()) || "UNK",
      };
    });
  }

  async fetchSquad(clubExternalId: string): Promise<ProviderPlayer[]> {
    const body = await this.get("/players/squads", { team: clubExternalId });
    const squad = body.response?.[0];
    return (squad?.players ?? [])
      .map((p: Json): ProviderPlayer | null => {
        const position = POSITIONS[p.position];
        if (!position) return null; // unknown position: skip rather than mis-score
        return {
          externalId: String(p.id),
          name: p.name ?? "Unknown",
          clubExternalId: String(clubExternalId),
          position,
        };
      })
      .filter(Boolean) as ProviderPlayer[];
  }

  private fixtureCache = new Map<number, ProviderFixture[]>();

  async fetchFixtures(season: number): Promise<ProviderFixture[]> {
    const cached = this.fixtureCache.get(season);
    if (cached) return cached;

    const body = await this.get("/fixtures", { league: CHAMPIONS_LEAGUE, season });
    const mapped = (body.response ?? []).map((row: Json): ProviderFixture => {
      const short: string = row.fixture?.status?.short ?? "NS";
      let status: ProviderFixtureStatus = "SCHEDULED";
      if (FINISHED.has(short)) status = "FT";
      else if (LIVE.has(short)) status = "LIVE";
      else if (ABANDONED.has(short)) status = "POSTPONED";

      return {
        externalId: String(row.fixture.id),
        round: row.league?.round ?? "League phase",
        kickoffAt: new Date(row.fixture.date),
        homeClubExternalId: String(row.teams.home.id),
        homeClubName: row.teams.home.name ?? "Unknown",
        awayClubExternalId: String(row.teams.away.id),
        awayClubName: row.teams.away.name ?? "Unknown",
        homeScore: row.goals?.home ?? null,
        awayScore: row.goals?.away ?? null,
        status,
      };
    });
    this.fixtureCache.set(season, mapped);
    return mapped;
  }

  async fetchFixturePlayerStats(fixtureExternalId: string): Promise<ProviderPlayerMatchStat[]> {
    const body = await this.get("/fixtures/players", { fixture: fixtureExternalId });
    const out: ProviderPlayerMatchStat[] = [];

    for (const team of body.response ?? []) {
      for (const entry of team.players ?? []) {
        const s = entry.statistics?.[0];
        if (!s) continue;
        out.push({
          playerExternalId: String(entry.player.id),
          teamExternalId: String(team.team?.id ?? ""),
          // Every count comes back as null rather than 0 when nothing happened,
          // so `?? 0` is load-bearing here, not defensive decoration.
          minutes: s.games?.minutes ?? 0,
          goals: s.goals?.total ?? 0,
          assists: s.goals?.assists ?? 0,
          yellowCards: s.cards?.yellow ?? 0,
          redCards: s.cards?.red ?? 0,
          penaltiesSaved: s.penalty?.saved ?? 0,
          penaltiesMissed: s.penalty?.missed ?? 0,
          ownGoals: s.goals?.own ?? 0,
        });
      }
    }
    return out;
  }
}
