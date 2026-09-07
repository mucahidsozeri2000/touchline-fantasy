import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";
import { pointsForEvent } from "../lib/scoring";

export async function getReauctionScreen(leagueId: string, managerId: string) {
  await requireMembership(leagueId, managerId);
  const membership = await requireMembership(leagueId, managerId);

  const clearances = await prisma.playerClearance.findMany({
    where: { leagueId, managerId },
    include: { player: { include: { club: true } } },
    orderBy: { createdAt: "desc" },
  });
  const totalRefunded = clearances.reduce((a, c) => a + c.refundAmount, 0);

  const openSlots = await prisma.auctionLot.count({ where: { leagueId, status: "OPEN" } });

  const latestChangeByPlayer = new Map<string, Awaited<ReturnType<typeof prisma.playerPriceChange.findMany>>[number]>();
  const changes = await prisma.playerPriceChange.findMany({
    where: { leagueId },
    include: { player: { include: { club: true } } },
    orderBy: { createdAt: "desc" },
  });
  for (const c of changes) {
    if (!latestChangeByPlayer.has(c.playerId)) latestChangeByPlayer.set(c.playerId, c);
  }
  const movers = Array.from(latestChangeByPlayer.values()).map((c: any) => ({
    playerId: c.playerId,
    name: c.player.name,
    position: c.player.position,
    club: c.player.club.shortCode,
    clubColor: c.player.club.colorHex,
    oldPrice: c.oldPrice,
    newPrice: c.newPrice,
    delta: Math.round((c.newPrice - c.oldPrice) * 10) / 10,
    reason: c.reason,
  }));
  movers.sort((a, b) => b.delta - a.delta);

  return {
    round: "QF",
    stats: { refunded: totalRefunded, newBudget: membership.budgetRemaining, openSlots },
    cleared: clearances.map((c: any) => ({
      name: c.player.name,
      club: c.player.club.name,
      refund: c.refundAmount,
      reason: c.reason,
    })),
    movers,
  };
}

/** Sweeps every squad in the league for players from an eliminated club, refunds their
 * owners, opens a fresh auction lot for each freed player, and logs the clearance. */
export async function runEliminationSweep(leagueId: string, clubId: string, round: string, windowHours = 48) {
  const club = await prisma.club.update({ where: { id: clubId }, data: { eliminated: true, eliminatedRound: round } });
  const ownerships = await prisma.playerOwnership.findMany({
    where: { leagueId, player: { clubId }, managerId: { not: null } },
    include: { player: true },
  });
  const closesAt = new Date(Date.now() + windowHours * 60 * 60 * 1000);

  for (const o of ownerships) {
    const managerId = o.managerId!;
    const membership = await requireMembership(leagueId, managerId);
    await prisma.$transaction([
      prisma.playerClearance.create({
        data: {
          leagueId,
          playerId: o.playerId,
          managerId,
          refundAmount: o.currentPrice,
          reason: `${club.name} eliminated in the ${round}`,
        },
      }),
      prisma.leagueMembership.update({
        where: { id: membership.id },
        data: { budgetRemaining: { increment: o.currentPrice } },
      }),
      prisma.squadSlot.deleteMany({ where: { leagueMembershipId: membership.id, playerId: o.playerId } }),
      prisma.playerOwnership.update({ where: { id: o.id }, data: { managerId: null } }),
      prisma.auctionLot.upsert({
        where: { leagueId_playerId: { leagueId, playerId: o.playerId } },
        update: { status: "OPEN", closesAt, winningBidId: null },
        create: { leagueId, playerId: o.playerId, listPrice: o.currentPrice, closesAt, status: "OPEN" },
      }),
    ]);
  }
  return { clearedCount: ownerships.length };
}

/** Weekly price re-rating from real per-player match stats: aggregates the
 * gameweek's MatchEvents into a points-driven price delta (±0.1 per net point,
 * capped) and records the reason from the dominant event type. */
export async function weeklyReprice(leagueId: string, gameweek: number) {
  const ownerships = await prisma.playerOwnership.findMany({ where: { leagueId }, include: { player: true } });
  const fixtures = await prisma.fixture.findMany({ where: { gameweek }, select: { id: true } });
  const fixtureIds = fixtures.map((f) => f.id);
  const results = [];

  for (const o of ownerships) {
    const events = await prisma.matchEvent.findMany({
      where: { playerId: o.playerId, fixtureId: { in: fixtureIds } },
    });
    if (!events.length) continue;
    const netPoints = events.reduce((a, e) => a + pointsForEvent(e.type, o.player.position), 0);
    const delta = Math.max(-1.0, Math.min(1.5, Math.round(netPoints * 0.1 * 10) / 10));
    if (delta === 0) continue;
    const newPrice = Math.max(3.5, Math.round((o.currentPrice + delta) * 10) / 10);
    const dominant = events.sort((a, b) => Math.abs(pointsForEvent(b.type, o.player.position)) - Math.abs(pointsForEvent(a.type, o.player.position)))[0];
    const reason = `${events.length} contributing event(s) this gameweek (${dominant.type.toLowerCase()})`;

    await prisma.$transaction([
      prisma.playerPriceChange.create({
        data: { leagueId, playerId: o.playerId, gameweek, oldPrice: o.currentPrice, newPrice, reason },
      }),
      prisma.playerOwnership.update({ where: { id: o.id }, data: { currentPrice: newPrice } }),
    ]);
    results.push({ playerId: o.playerId, oldPrice: o.currentPrice, newPrice });
  }
  return results;
}
