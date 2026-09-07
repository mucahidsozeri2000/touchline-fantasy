import { prisma } from "../lib/prisma";
import { closeLot } from "../services/auction";
import { Position } from "@prisma/client";

const SQUAD_POOL: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const STARTING: Record<Position, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 };

/**
 * Deterministic backend job for a league's transfer-window close: resolves every
 * open auction lot (highest bid wins; empty lots become open-sale at list price),
 * then auto-builds a legal squad from remaining budget for any manager who hasn't
 * confirmed one, so nobody's squad is empty when real matches kick off.
 */
export async function closeAuctionWindow(leagueId: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  if (new Date() < league.auctionClosesAt) throw new Error("Auction window has not closed yet");

  const openLots = await prisma.auctionLot.findMany({ where: { leagueId, status: "OPEN" } });
  for (const lot of openLots) {
    await closeLot(leagueId, lot.playerId);
  }

  const memberships = await prisma.leagueMembership.findMany({ where: { leagueId } });
  for (const membership of memberships) {
    if (membership.autoSquadApplied) continue;
    const existingSlots = await prisma.squadSlot.count({ where: { leagueMembershipId: membership.id } });
    if (existingSlots >= 15) {
      await prisma.leagueMembership.update({ where: { id: membership.id }, data: { autoSquadApplied: true } });
      continue;
    }
    await autoAssignSquad(leagueId, membership.id);
  }
}

async function autoAssignSquad(leagueId: string, membershipId: string) {
  const membership = await prisma.leagueMembership.findUniqueOrThrow({ where: { id: membershipId } });
  let budget = membership.budgetRemaining;

  const currentSlots = await prisma.squadSlot.findMany({ where: { leagueMembershipId: membershipId }, include: { player: true } });
  const have: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const s of currentSlots) have[s.player.position]++;

  for (const position of ["GK", "DEF", "MID", "FWD"] as Position[]) {
    const need = SQUAD_POOL[position] - have[position];
    if (need <= 0) continue;
    const candidates = await prisma.playerOwnership.findMany({
      where: { leagueId, managerId: null, player: { position } },
      include: { player: true },
      orderBy: { currentPrice: "asc" },
      take: need,
    });
    for (const c of candidates) {
      if (c.currentPrice > budget) continue;
      await prisma.playerOwnership.update({
        where: { id: c.id },
        data: { managerId: membership.managerId, acquiredVia: "AUTO_ASSIGN", acquiredAt: new Date() },
      });
      await prisma.squadSlot.create({ data: { leagueMembershipId: membershipId, playerId: c.playerId, isStarting: false } });
      budget -= c.currentPrice;
    }
  }

  const finalSlots = await prisma.squadSlot.findMany({ where: { leagueMembershipId: membershipId }, include: { player: true } });
  const byPosition: Record<Position, typeof finalSlots> = { GK: [], DEF: [], MID: [], FWD: [] } as any;
  for (const s of finalSlots) byPosition[s.player.position].push(s);

  const startingIds: string[] = [];
  for (const position of ["GK", "DEF", "MID", "FWD"] as Position[]) {
    const chosen = byPosition[position]
      .sort((a, b) => b.player.basePrice - a.player.basePrice)
      .slice(0, STARTING[position]);
    startingIds.push(...chosen.map((s) => s.id));
  }
  await prisma.squadSlot.updateMany({ where: { id: { in: startingIds } }, data: { isStarting: true } });

  const priciestStarter = finalSlots
    .filter((s) => startingIds.includes(s.id))
    .sort((a, b) => b.player.basePrice - a.player.basePrice)[0];
  if (priciestStarter) {
    await prisma.squadSlot.update({ where: { id: priciestStarter.id }, data: { isCaptain: true } });
  }

  await prisma.leagueMembership.update({ where: { id: membershipId }, data: { budgetRemaining: budget, autoSquadApplied: true } });
}
