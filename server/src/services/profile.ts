import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";

export async function getManagerProfile(leagueId: string, targetManagerId: string) {
  const membership = await requireMembership(leagueId, targetManagerId);
  const manager = await prisma.manager.findUniqueOrThrow({ where: { id: targetManagerId } });
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });

  const slots = await prisma.squadSlot.findMany({
    where: { leagueMembershipId: membership.id },
    include: { player: true },
  });
  const squadValue = Math.round(slots.reduce((a, s) => a + s.player.basePrice, 0) * 10) / 10;

  const scores = await prisma.gameweekScore.findMany({ where: { leagueMembershipId: membership.id }, orderBy: { gameweek: "asc" } });
  const bestGw = scores.reduce((best, s) => (s.points > (best?.points ?? -1) ? s : best), scores[0]);

  const ownerships = await prisma.playerOwnership.findMany({
    where: { leagueId, managerId: targetManagerId },
    include: { player: { include: { matchEvents: true } } },
  });
  const signingHistory = ownerships.map((o) => ({
    name: o.player.name,
    route: o.acquiredVia,
    price: o.currentPrice,
    return: o.player.matchEvents.reduce((a, e) => a + e.pointsDelta, 0),
  }));

  const rank = (await prisma.leagueMembership.findMany({ where: { leagueId }, include: { gameweekScores: true } }))
    .map((m) => ({ id: m.managerId, total: m.gameweekScores.reduce((a, s) => a + s.points, 0) }))
    .sort((a, b) => b.total - a.total)
    .findIndex((m) => m.id === targetManagerId) + 1;

  return {
    coachName: manager.coachName,
    teamName: manager.teamName,
    league: league.name,
    badge: rank === 1 ? "Reigning champion" : null,
    stats: { squadValue, signings: ownerships.length, bestGameweek: bestGw?.points ?? 0 },
    seasonForm: scores.map((s) => ({ label: `GW${s.gameweek}`, pts: s.points })),
    signingHistory,
    career: [
      { label: "Seasons played", value: "1" },
      { label: "League titles", value: rank === 1 ? "1" : "0" },
      { label: "Auctions won", value: String(ownerships.filter((o) => o.acquiredVia === "AUCTION").length) },
      { label: "Best finish", value: `${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"}` },
    ],
  };
}
