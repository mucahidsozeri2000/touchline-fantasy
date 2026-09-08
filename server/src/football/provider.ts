import { Position } from "@prisma/client";

// The shapes the rest of the app works in. Every provider maps its own JSON
// into these, so swapping provider means writing one new adapter and nothing
// else — the sync, the scoring and the schema never learn a vendor's field
// names.

export interface ProviderClub {
  externalId: string;
  name: string;
  shortCode: string;
}

export interface ProviderPlayer {
  externalId: string;
  name: string;
  clubExternalId: string;
  position: Position;
}

export type ProviderFixtureStatus = "SCHEDULED" | "LIVE" | "FT" | "POSTPONED";

export interface ProviderFixture {
  externalId: string;
  round: string;
  kickoffAt: Date;
  homeClubExternalId: string;
  homeClubName: string;
  awayClubExternalId: string;
  awayClubName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: ProviderFixtureStatus;
}

/** One player's line in one match, already normalised. */
export interface ProviderPlayerMatchStat {
  playerExternalId: string;
  /** Which side they played for, so a clean sheet can be read off the score. */
  teamExternalId: string;
  minutes: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  penaltiesSaved: number;
  penaltiesMissed: number;
  ownGoals: number;
}

export interface AccessReport {
  provider: string;
  ok: boolean;
  /** Free-text lines to print: plan, quota, what the key can and cannot see. */
  notes: string[];
}

export interface FootballProvider {
  readonly name: string;
  /** Reports what this key can actually reach, without assuming it can. */
  checkAccess(season: number): Promise<AccessReport>;
  fetchClubs(season: number): Promise<ProviderClub[]>;
  fetchSquad(clubExternalId: string): Promise<ProviderPlayer[]>;
  fetchFixtures(season: number): Promise<ProviderFixture[]>;
  fetchFixturePlayerStats(fixtureExternalId: string): Promise<ProviderPlayerMatchStat[]>;
}
