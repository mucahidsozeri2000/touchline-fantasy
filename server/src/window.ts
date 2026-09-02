import type { Position } from "./types";
import { prisma } from "./db";

export type Phase = "waiting" | "open" | "closed";

export function computePhase(win: { opensAt: Date; closesAt: Date; phaseOverride: string | null }): Phase {
  if (win.phaseOverride === "waiting" || win.phaseOverride === "open" || win.phaseOverride === "closed") {
    return win.phaseOverride;
  }
  const now = Date.now();
  if (now < win.opensAt.getTime()) return "waiting";
  if (now < win.closesAt.getTime()) return "open";
  return "closed";
}

export const SQUAD_SIZE = 15;
export const TOTAL_BUDGET = 120.0;
export const MAX_PER_CLUB = 3;
// Default starting-XI shape used to seed squads and fill in auto-assignment. Sums to 11.
export const STARTING_MIN: Record<Position, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 };

/**
 * Called whenever the window is observed to be closed. Idempotent: only the
 * first caller after close does the work, guarded by autoAssignDone.
 */
export async function ensureAutoAssigned(leagueId: string) {
  const win = await prisma.transferWindow.findUnique({ where: { leagueId } });
  if (!win) return;
  const phase = computePhase(win);
  if (phase !== "closed" || win.autoAssignDone) return;

  await prisma.transferWindow.update({ where: { leagueId }, data: { autoAssignDone: true } });

  const managers = await prisma.manager.findMany({
    where: { leagueId, isBot: false },
    include: { players: true },
  });

  for (const manager of managers) {
    if (manager.players.length >= SQUAD_SIZE) continue;
    await autoFillSquad(leagueId, manager.id);
  }
}

async function autoFillSquad(leagueId: string, managerId: string) {
  const manager = await prisma.manager.findUniqueOrThrow({
    where: { id: managerId },
    include: { players: true },
  });
  const spent = manager.players.reduce((s, p) => s + p.price, 0);
  let budgetLeft = TOTAL_BUDGET - spent;
  const clubCounts = new Map<string, number>();
  for (const p of manager.players) clubCounts.set(p.club, (clubCounts.get(p.club) ?? 0) + 1);
  const posCounts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of manager.players) posCounts[p.position as Position]++;

  let slotsLeft = SQUAD_SIZE - manager.players.length;
  if (slotsLeft <= 0) return;

  const freeAgents = await prisma.player.findMany({
    where: { leagueId, ownerId: null },
    orderBy: { price: "asc" },
  });

  const picks: { id: string; bench: boolean }[] = [];
  const tryPick = (pos: Position | null, bench: boolean) => {
    const idx = freeAgents.findIndex((p) => {
      if (picks.some((pk) => pk.id === p.id)) return false;
      if (pos && p.position !== pos) return false;
      if (p.price > budgetLeft) return false;
      if ((clubCounts.get(p.club) ?? 0) >= MAX_PER_CLUB) return false;
      return true;
    });
    if (idx === -1) return false;
    const p = freeAgents[idx];
    picks.push({ id: p.id, bench });
    budgetLeft -= p.price;
    clubCounts.set(p.club, (clubCounts.get(p.club) ?? 0) + 1);
    posCounts[p.position as Position]++;
    slotsLeft--;
    return true;
  };

  // First satisfy the minimum starting-XI shape (non-bench), then fill the rest as bench.
  for (const pos of Object.keys(STARTING_MIN) as Position[]) {
    while (posCounts[pos] < STARTING_MIN[pos] && slotsLeft > 0) {
      if (!tryPick(pos, false)) break;
    }
  }
  while (slotsLeft > 0) {
    if (!tryPick(null, true)) break;
  }

  if (!picks.length) return;

  await prisma.$transaction(
    picks.map((pick) =>
      prisma.player.update({
        where: { id: pick.id },
        data: { ownerId: managerId, isBench: pick.bench },
      })
    )
  );
  await prisma.draftEvent.createMany({
    data: picks.map((pick) => ({ leagueId, managerId, playerId: pick.id })),
  });
}
