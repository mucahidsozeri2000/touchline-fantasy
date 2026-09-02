import { prisma } from "./db";
import { CAPTAIN_MULTIPLIER, pointsForStat } from "./scoring";
import type { Position } from "./types";

/** Points a manager earned from a single fixture, applying their captain's ×2 if relevant. */
export async function pointsForManagerFixture(managerId: string, fixtureId: string): Promise<number> {
  const manager = await prisma.manager.findUniqueOrThrow({ where: { id: managerId } });
  const stats = await prisma.playerMatchStat.findMany({
    where: { fixtureId, player: { ownerId: managerId } },
    include: { player: true },
  });
  let total = 0;
  for (const stat of stats) {
    let pts = pointsForStat(stat.player.position as Position, stat);
    if (stat.playerId === manager.captainPlayerId) pts *= CAPTAIN_MULTIPLIER;
    total += pts;
  }
  return total;
}

/** Sum of a manager's real computed points across every fixture in their league. */
export async function computedTotalPoints(managerId: string, leagueId: string): Promise<number> {
  const fixtures = await prisma.fixture.findMany({ where: { leagueId }, select: { id: true } });
  let total = 0;
  for (const fx of fixtures) total += await pointsForManagerFixture(managerId, fx.id);
  return total;
}

/** Real computed points from just the most recently played fixture (by gameweek). */
export async function computedLatestGwPoints(managerId: string, leagueId: string): Promise<number> {
  const latest = await prisma.fixture.findFirst({ where: { leagueId }, orderBy: { gameweek: "desc" } });
  if (!latest) return 0;
  return pointsForManagerFixture(managerId, latest.id);
}
