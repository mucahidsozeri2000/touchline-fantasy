import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";
import { HttpError } from "../lib/wrap";

export async function getSquad(leagueId: string, managerId: string) {
  const membership = await requireMembership(leagueId, managerId);
  const slots = await prisma.squadSlot.findMany({
    where: { leagueMembershipId: membership.id },
    include: { player: { include: { club: true } } },
  });
  const starters = slots.filter((s) => s.isStarting);
  const bench = slots.filter((s) => !s.isStarting);
  const freeTransfers = 1; // one free transfer per gameweek in this economy
  return {
    budgetRemaining: membership.budgetRemaining,
    freeTransfers,
    starters: starters.map(toSlotDto),
    bench: bench.map(toSlotDto),
  };
}

function toSlotDto(s: Awaited<ReturnType<typeof prisma.squadSlot.findMany>>[number] & { player: any }) {
  return {
    slotId: s.id,
    playerId: s.playerId,
    name: s.player.name,
    club: s.player.club.shortCode,
    clubColor: s.player.club.colorHex,
    position: s.player.position,
    price: s.player.basePrice,
    isCaptain: s.isCaptain,
    initials: s.player.initials,
  };
}

export async function setCaptain(leagueId: string, managerId: string, playerId: string) {
  const membership = await requireMembership(leagueId, managerId);
  const slot = await prisma.squadSlot.findUnique({
    where: { leagueMembershipId_playerId: { leagueMembershipId: membership.id, playerId } },
  });
  if (!slot || !slot.isStarting) throw new HttpError(404, "Player is not in your starting XI");
  const alreadyCaptain = slot.isCaptain;
  await prisma.$transaction([
    prisma.squadSlot.updateMany({ where: { leagueMembershipId: membership.id }, data: { isCaptain: false } }),
    ...(alreadyCaptain
      ? []
      : [prisma.squadSlot.update({ where: { id: slot.id }, data: { isCaptain: true } })]),
  ]);
  return getSquad(leagueId, managerId);
}

export async function swapPlayers(leagueId: string, managerId: string, starterPlayerId: string, benchPlayerId: string) {
  const membership = await requireMembership(leagueId, managerId);
  const [starter, bench] = await Promise.all([
    prisma.squadSlot.findUnique({
      where: { leagueMembershipId_playerId: { leagueMembershipId: membership.id, playerId: starterPlayerId } },
      include: { player: true },
    }),
    prisma.squadSlot.findUnique({
      where: { leagueMembershipId_playerId: { leagueMembershipId: membership.id, playerId: benchPlayerId } },
      include: { player: true },
    }),
  ]);
  if (!starter || !starter.isStarting) throw new HttpError(404, "Starter not found in your XI");
  if (!bench || bench.isStarting) throw new HttpError(404, "Bench player not found");
  if (starter.player.position !== bench.player.position) {
    throw new HttpError(400, "Swaps must be between players in the same position");
  }
  await prisma.$transaction([
    prisma.squadSlot.update({ where: { id: starter.id }, data: { isStarting: false, isCaptain: false } }),
    prisma.squadSlot.update({ where: { id: bench.id }, data: { isStarting: true, isCaptain: starter.isCaptain } }),
  ]);
  return getSquad(leagueId, managerId);
}
