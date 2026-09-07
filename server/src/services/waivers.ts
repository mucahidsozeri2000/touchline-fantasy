import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";

export async function getWaiverPool(leagueId: string, managerId: string) {
  const claims = await prisma.waiverClaim.findMany({
    where: { leagueId, status: "PENDING" },
    include: { player: { include: { club: true } } },
    orderBy: { priority: "asc" },
  });
  const byPlayer = new Map<string, typeof claims>();
  for (const c of claims) {
    const list = byPlayer.get(c.playerId) ?? [];
    list.push(c);
    byPlayer.set(c.playerId, list);
  }
  return Array.from(byPlayer.entries()).map(([playerId, list]) => {
    const player = list[0].player;
    const myClaim = list.find((c) => c.managerId === managerId);
    return {
      playerId,
      name: player.name,
      club: player.club.shortCode,
      clubColor: player.club.colorHex,
      position: player.position,
      reason: list[0].reason,
      myPriority: myClaim ? list.findIndex((c) => c.managerId === managerId) + 1 : null,
      totalInQueue: list.length,
      claimed: !myClaim,
    };
  });
}

export async function claimWaiver(leagueId: string, managerId: string, playerId: string) {
  await requireMembership(leagueId, managerId);
  const claims = await prisma.waiverClaim.findMany({
    where: { leagueId, playerId, status: "PENDING" },
    orderBy: { priority: "asc" },
  });
  const myClaim = claims.find((c) => c.managerId === managerId);
  if (!myClaim) throw new Error("No pending waiver claim for this player");

  const winner = claims[0];
  const player = await prisma.player.findUniqueOrThrow({ where: { id: playerId } });
  const winnerMembership = await requireMembership(leagueId, winner.managerId);

  await prisma.$transaction([
    prisma.waiverClaim.update({ where: { id: winner.id }, data: { status: "AWARDED" } }),
    prisma.waiverClaim.updateMany({
      where: { leagueId, playerId, id: { not: winner.id } },
      data: { status: "PASSED" },
    }),
    prisma.playerOwnership.update({
      where: { leagueId_playerId: { leagueId, playerId } },
      data: { managerId: winner.managerId, acquiredVia: "WAIVER", acquiredAt: new Date(), currentPrice: player.basePrice },
    }),
    prisma.leagueMembership.update({
      where: { id: winnerMembership.id },
      data: { budgetRemaining: { decrement: player.basePrice } },
    }),
    prisma.squadSlot.upsert({
      where: { leagueMembershipId_playerId: { leagueMembershipId: winnerMembership.id, playerId } },
      update: {},
      create: { leagueMembershipId: winnerMembership.id, playerId, isStarting: false },
    }),
  ]);

  return { awardedTo: winner.managerId, won: winner.managerId === managerId };
}
