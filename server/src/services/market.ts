import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";
import { windowPhase } from "../lib/window";
import { HttpError } from "../lib/wrap";

export async function getTransferMarket(leagueId: string, managerId: string, positionFilter?: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const membership = await requireMembership(leagueId, managerId);
  const phase = windowPhase(league.auctionOpensAt, league.auctionClosesAt);

  const ownerships = await prisma.playerOwnership.findMany({
    where: { leagueId, ...(positionFilter ? { player: { position: positionFilter as any } } : {}) },
    include: { player: { include: { club: true } }, manager: true },
  });

  const players = ownerships.map((o) => ({
    playerId: o.playerId,
    name: o.player.name,
    club: o.player.club.shortCode,
    clubColor: o.player.club.colorHex,
    position: o.player.position,
    price: o.currentPrice,
    initials: o.player.initials,
    ownedByMe: o.managerId === managerId,
    drafted: !!o.managerId,
    draftedBy: o.managerId && o.managerId !== managerId ? o.manager?.coachName : null,
  }));

  return { phase, budgetRemaining: membership.budgetRemaining, players };
}

export async function confirmTransfers(leagueId: string, managerId: string, playerIds: string[]) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const phase = windowPhase(league.auctionOpensAt, league.auctionClosesAt);
  if (phase !== "open") throw new HttpError(409, "Transfer window is not open");
  const membership = await requireMembership(leagueId, managerId);

  return prisma.$transaction(async (tx) => {
    const ownerships = await tx.playerOwnership.findMany({
      where: { leagueId, playerId: { in: playerIds } },
    });
    const alreadyOwned = ownerships.find((o) => o.managerId);
    if (alreadyOwned) throw new HttpError(409, "One of the shortlisted players has already been drafted");
    const total = ownerships.reduce((a, o) => a + o.currentPrice, 0);
    let membershipRow = await tx.leagueMembership.findUniqueOrThrow({ where: { id: membership.id } });
    if (total > membershipRow.budgetRemaining) throw new HttpError(400, "Not enough budget for this shortlist");

    for (const o of ownerships) {
      await tx.playerOwnership.update({
        where: { id: o.id },
        data: { managerId, acquiredVia: "OPEN_SALE", acquiredAt: new Date() },
      });
      await tx.squadSlot.upsert({
        where: { leagueMembershipId_playerId: { leagueMembershipId: membership.id, playerId: o.playerId } },
        update: {},
        create: { leagueMembershipId: membership.id, playerId: o.playerId, isStarting: false },
      });
    }
    membershipRow = await tx.leagueMembership.update({
      where: { id: membership.id },
      data: { budgetRemaining: { decrement: total } },
    });
    return { budgetRemaining: membershipRow.budgetRemaining, acquired: ownerships.length };
  });
}
