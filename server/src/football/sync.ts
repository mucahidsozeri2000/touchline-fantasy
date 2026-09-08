import { EventType, FixtureStatus, Position, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { pointsForEvent } from "../lib/scoring";
import { FootballProvider, ProviderPlayerMatchStat } from "./provider";

/**
 * Starting list price by position, in millions.
 *
 * The provider has no market valuation, and inventing one from last season's
 * numbers would be a guess dressed up as data. In this game the auction *is*
 * the price discovery mechanism — a lot's list price is only the floor bidding
 * starts from — and the weekly re-rating then moves prices from real match
 * output. So the floor is flat per position and deliberately low.
 */
const BASE_PRICE: Record<Position, number> = { GK: 4.0, DEF: 4.5, MID: 5.0, FWD: 5.5 };

/** Minutes a player must have played to be credited with a clean sheet. */
const CLEAN_SHEET_MINUTES = 60;

// The provider gives no brand colour, so derive a stable one. Hues are picked
// to sit beside the design system's red without competing with it.
const CLUB_COLOURS = [
  "#1B4D8F", "#0E7C5A", "#7A2E8E", "#B8860B", "#2F4858", "#8C4A2F",
  "#1F6F78", "#5B3A8E", "#A03E52", "#3A6B35", "#8A6D1F", "#43526E",
];

function colourFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CLUB_COLOURS[h % CLUB_COLOURS.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Rounds that number the main competition's matchdays, whatever it is called. */
const MATCHDAY_ROUND = /league (stage|phase)|group stage/i;

/**
 * The provider's fixture list starts months before the competition proper:
 * three qualifying rounds and a qualifying play-off, involving clubs that never
 * reach the group or league stage. Those matches carry no player statistics and
 * their clubs have no business in the auction pool.
 *
 * Filtering is by date, not by name. Names would need a blocklist, and a
 * blocklist gets this wrong: "Play-offs" is a qualifying round in August, while
 * "Knockout Round Play-offs" in February is part of the competition proper.
 * Everything from the first matchday onwards is in; everything before is out.
 */
export function mainCompetitionFixtures<T extends { round: string; kickoffAt: Date }>(fixtures: T[]): T[] {
  const matchdayKickoffs = fixtures.filter((f) => MATCHDAY_ROUND.test(f.round)).map((f) => f.kickoffAt.getTime());
  if (matchdayKickoffs.length === 0) return fixtures; // no matchday rounds to anchor on: keep everything
  const start = Math.min(...matchdayKickoffs);
  return fixtures.filter((f) => f.kickoffAt.getTime() >= start);
}

/**
 * Rounds arrive as free text: matchdays as "League Stage - 3", knockouts as
 * "Round of 16", "Quarter-finals", "Final".
 *
 * Only a number after a dash is a matchday number. Matching any trailing digits
 * would read "Round of 16" as gameweek 16, which is not what that 16 means.
 * Knockout rounds instead get numbered after the last matchday, in the order
 * they are first played, so gameweeks stay ordered and stable.
 */
function assignGameweeks(rounds: Array<{ round: string; earliest: Date }>): Map<string, number> {
  const out = new Map<string, number>();
  const unnumbered: Array<{ round: string; earliest: Date }> = [];

  for (const r of rounds) {
    const m = r.round.match(/-\s*(\d+)\s*$/);
    if (m) out.set(r.round, Number(m[1]));
    else unnumbered.push(r);
  }

  let next = out.size ? Math.max(...out.values()) : 0;
  for (const r of unnumbered.sort((a, b) => a.earliest.getTime() - b.earliest.getTime())) {
    out.set(r.round, ++next);
  }
  return out;
}

export interface SyncSummary {
  clubs: number;
  players: number;
  fixtures: number;
  fixturesScored: number;
  eventsWritten: number;
  requestsUsed?: number;
  notes: string[];
}

/**
 * Pulls the competition's clubs and squads. This is the expensive call — one
 * request per club — so it is meant to be run once at the start of a season
 * and then only when squads change.
 */
export async function syncCatalog(provider: FootballProvider, season: number): Promise<SyncSummary> {
  const notes: string[] = [];

  // Only clubs that reach the competition proper. Pulling every club the
  // provider associates with the season would add the qualifying-round teams —
  // for 2024/25 that is 81 clubs rather than 36, so more than twice the squad
  // requests, spent on players nobody can field.
  const fixtures = mainCompetitionFixtures(await provider.fetchFixtures(season));
  const participants = new Map<string, string>();
  for (const f of fixtures) {
    participants.set(f.homeClubExternalId, f.homeClubName);
    participants.set(f.awayClubExternalId, f.awayClubName);
  }
  if (participants.size === 0) {
    throw new Error(`The provider returned no fixtures for season ${season}. Run "sync doctor" to see what this key can reach.`);
  }

  const all = await provider.fetchClubs(season);
  const byExternal = new Map(all.map((c) => [c.externalId, c]));
  const clubs = [...participants].map(
    ([externalId, name]) => byExternal.get(externalId) ?? { externalId, name, shortCode: name.slice(0, 3).toUpperCase() }
  );
  notes.push(`${clubs.length} clubs in the competition proper (provider listed ${all.length} for the season)`);

  const clubIdByExternal = new Map<string, string>();
  for (const c of clubs) {
    const row = await prisma.club.upsert({
      where: { externalId: c.externalId },
      update: { name: c.name },
      create: {
        externalId: c.externalId,
        name: c.name,
        // shortCode is unique across the table; a collision would abort the
        // whole sync, so make it unique per club deterministically.
        shortCode: `${c.shortCode}${c.externalId}`.slice(0, 12),
        colorHex: colourFor(c.name),
      },
    });
    clubIdByExternal.set(c.externalId, row.id);
  }

  let players = 0;
  for (const c of clubs) {
    const squad = await provider.fetchSquad(c.externalId);
    for (const p of squad) {
      await prisma.player.upsert({
        where: { externalId: p.externalId },
        update: { name: p.name, position: p.position, clubId: clubIdByExternal.get(c.externalId)! },
        create: {
          externalId: p.externalId,
          name: p.name,
          clubId: clubIdByExternal.get(c.externalId)!,
          position: p.position,
          basePrice: BASE_PRICE[p.position],
          initials: initialsFor(p.name),
        },
      });
      players += 1;
    }
    if (squad.length === 0) notes.push(`no squad returned for ${c.name} (${c.externalId})`);
  }

  return { clubs: clubs.length, players, fixtures: 0, fixturesScored: 0, eventsWritten: 0, notes };
}

/** Pulls the fixture list and current scores. One request; safe to run often. */
export async function syncFixtures(provider: FootballProvider, season: number): Promise<SyncSummary> {
  const notes: string[] = [];
  const all = await provider.fetchFixtures(season);
  const fixtures = mainCompetitionFixtures(all);
  if (all.length !== fixtures.length) {
    notes.push(`ignored ${all.length - fixtures.length} qualifying-round fixtures`);
  }

  const byRound = new Map<string, Date>();
  for (const f of fixtures) {
    const seen = byRound.get(f.round);
    if (!seen || f.kickoffAt < seen) byRound.set(f.round, f.kickoffAt);
  }
  const gameweeks = assignGameweeks([...byRound].map(([round, earliest]) => ({ round, earliest })));

  const clubs = await prisma.club.findMany({ where: { externalId: { not: null } }, select: { id: true, externalId: true } });
  const clubIdByExternal = new Map(clubs.map((c) => [c.externalId!, c.id]));

  let written = 0;
  for (const f of fixtures) {
    const homeId = clubIdByExternal.get(f.homeClubExternalId);
    const awayId = clubIdByExternal.get(f.awayClubExternalId);
    if (!homeId || !awayId) {
      // A knockout fixture can name a club that was not in the league-phase
      // team list. Skipping keeps the sync going; the next catalog run adds it.
      notes.push(`skipped fixture ${f.externalId}: club not in catalog yet`);
      continue;
    }

    const status: FixtureStatus = f.status === "FT" ? "FT" : f.status === "LIVE" ? "LIVE" : "SCHEDULED";
    const data = {
      round: f.round,
      gameweek: gameweeks.get(f.round) ?? 1,
      homeClubId: homeId,
      awayClubId: awayId,
      kickoffAt: f.kickoffAt,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      status,
    };
    await prisma.fixture.upsert({
      where: { externalId: f.externalId },
      update: data,
      create: { externalId: f.externalId, ...data },
    });
    written += 1;
  }

  return { clubs: 0, players: 0, fixtures: written, fixturesScored: 0, eventsWritten: 0, notes };
}

/** Turns one player's match line into the scoring events the app understands. */
function eventsFor(stat: ProviderPlayerMatchStat, position: Position) {
  const events: Array<{ type: EventType; count: number }> = [
    { type: "GOAL", count: stat.goals },
    { type: "ASSIST", count: stat.assists },
    { type: "YELLOW", count: stat.yellowCards },
    { type: "RED", count: stat.redCards },
    { type: "PENALTY_SAVE", count: stat.penaltiesSaved },
    { type: "PENALTY_MISS", count: stat.penaltiesMissed },
    { type: "OWN_GOAL", count: stat.ownGoals },
  ];

  if (stat.minutes >= CLEAN_SHEET_MINUTES && stat.goalsConceded === 0) {
    events.push({ type: "CLEAN_SHEET", count: 1 });
  }

  return events
    .filter((e) => e.count > 0)
    .flatMap((e) =>
      Array.from({ length: e.count }, () => ({
        type: e.type,
        pointsDelta: pointsForEvent(e.type, position),
      }))
    );
}

/**
 * Scores finished fixtures that have not been scored yet.
 *
 * Costs one provider request per fixture, so it is bounded by `limit` — the
 * free plan allows 100 requests a day and this is the only job that scales
 * with the calendar. `statsIngestedAt` makes it safe to re-run: a fixture is
 * never scored twice, and no request is spent on one already done.
 */
export async function syncResults(
  provider: FootballProvider,
  opts: { limit: number } = { limit: 20 }
): Promise<SyncSummary> {
  const notes: string[] = [];
  const pending = await prisma.fixture.findMany({
    where: { status: "FT", statsIngestedAt: null, externalId: { not: null } },
    orderBy: { kickoffAt: "asc" },
    take: opts.limit,
  });

  const players = await prisma.player.findMany({
    where: { externalId: { not: null } },
    select: { id: true, externalId: true, position: true },
  });
  const playerByExternal = new Map(players.map((p) => [p.externalId!, p]));

  let eventsWritten = 0;
  let scored = 0;

  for (const fixture of pending) {
    const stats = await provider.fetchFixturePlayerStats(fixture.externalId!);
    if (stats.length === 0) {
      notes.push(`fixture ${fixture.externalId}: provider returned no player stats; leaving it for a later run`);
      continue;
    }

    const rows: Prisma.MatchEventCreateManyInput[] = [];
    for (const stat of stats) {
      const player = playerByExternal.get(stat.playerExternalId);
      if (!player) continue; // not in our catalog — nobody can own them, so nothing to score
      for (const ev of eventsFor(stat, player.position)) {
        rows.push({
          fixtureId: fixture.id,
          playerId: player.id,
          // The provider reports a match total per player, not timed events,
          // so there is no honest minute to record here.
          minute: 0,
          type: ev.type,
          pointsDelta: ev.pointsDelta,
        });
      }
    }

    // One transaction per fixture: either the fixture is fully scored and
    // marked, or it stays untouched and the next run retries it.
    await prisma.$transaction([
      prisma.matchEvent.deleteMany({ where: { fixtureId: fixture.id } }),
      prisma.matchEvent.createMany({ data: rows }),
      prisma.fixture.update({ where: { id: fixture.id }, data: { statsIngestedAt: new Date() } }),
    ]);

    eventsWritten += rows.length;
    scored += 1;
  }

  return { clubs: 0, players: 0, fixtures: 0, fixturesScored: scored, eventsWritten, notes };
}
