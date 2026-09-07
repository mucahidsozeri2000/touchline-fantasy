import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";
import { CAPTAIN_MULTIPLIER } from "../lib/scoring";

export async function getHeadToHead(leagueId: string, managerId: string, gameweek: number) {
  await requireMembership(leagueId, managerId);

  const current = await prisma.headToHeadFixture.findFirst({
    where: { leagueId, gameweek, OR: [{ managerAId: managerId }, { managerBId: managerId }] },
  });

  let scoreboard = null;
  let differentials: any[] = [];
  if (current) {
    const iAmA = current.managerAId === managerId;
    const opponentId = iAmA ? current.managerBId : current.managerAId;
    const myScore = iAmA ? current.scoreA : current.scoreB;
    const oppScore = iAmA ? current.scoreB : current.scoreA;
    const opponent = opponentId ? await prisma.manager.findUnique({ where: { id: opponentId } }) : null;

    if (opponentId) {
      const [myMembership, oppMembership] = await Promise.all([
        requireMembership(leagueId, managerId),
        requireMembership(leagueId, opponentId),
      ]);
      const [mySlots, oppSlots] = await Promise.all([
        prisma.squadSlot.findMany({
          where: { leagueMembershipId: myMembership.id, isStarting: true },
          include: { player: { include: { matchEvents: true } } },
        }),
        prisma.squadSlot.findMany({
          where: { leagueMembershipId: oppMembership.id, isStarting: true },
          include: { player: { include: { matchEvents: true } } },
        }),
      ]);
      const oppPlayerIds = new Set(oppSlots.map((s) => s.playerId));
      const myPlayerIds = new Set(mySlots.map((s) => s.playerId));
      const contribution = (s: (typeof mySlots)[number]) =>
        s.player.matchEvents.reduce((a, e) => a + e.pointsDelta, 0) * (s.isCaptain ? CAPTAIN_MULTIPLIER : 1);
      differentials = [
        ...mySlots.filter((s) => !oppPlayerIds.has(s.playerId)).map((s) => ({ side: "me", name: s.player.name, mine: true, pts: contribution(s) })),
        ...oppSlots.filter((s) => !myPlayerIds.has(s.playerId)).map((s) => ({ side: "opp", name: s.player.name, mine: false, pts: contribution(s) })),
      ];
    }

    scoreboard = {
      myScore,
      oppScore,
      opponentTeam: null as string | null,
      opponentCoach: opponent?.coachName ?? "Bye week",
      leading: myScore >= oppScore,
      margin: Math.abs(myScore - oppScore),
    };
  }

  const fixtures = await prisma.headToHeadFixture.findMany({ where: { leagueId }, include: { } });
  const managers = await prisma.manager.findMany({ where: { memberships: { some: { leagueId } } } });
  const nameOf = (id: string | null) => managers.find((m) => m.id === id)?.coachName ?? "Bye";

  const ladder = new Map<string, { manager: string; w: number; d: number; l: number; pts: number }>();
  for (const f of fixtures) {
    if (f.scoreA === 0 && f.scoreB === 0 && !f.byeManagerId) continue; // unplayed
    for (const [id, score, oppScore] of [
      [f.managerAId, f.scoreA, f.scoreB],
      [f.managerBId, f.scoreB, f.scoreA],
    ] as const) {
      if (!id) continue;
      const entry = ladder.get(id) ?? { manager: nameOf(id), w: 0, d: 0, l: 0, pts: 0 };
      if (score > oppScore) { entry.w++; entry.pts += 3; }
      else if (score === oppScore) { entry.d++; entry.pts += 1; }
      else entry.l++;
      ladder.set(id, entry);
    }
  }
  const table = Array.from(ladder.values()).sort((a, b) => b.pts - a.pts);

  const nextFixtures = await prisma.headToHeadFixture.findMany({
    where: { leagueId, gameweek: { gt: gameweek }, OR: [{ managerAId: managerId }, { managerBId: managerId }] },
    orderBy: { gameweek: "asc" },
    take: 3,
  });

  return {
    scoreboard,
    differentials,
    table,
    nextFixtures: nextFixtures.map((f) => ({
      gameweek: f.gameweek,
      opponent: nameOf(f.managerAId === managerId ? f.managerBId : f.managerAId),
    })),
  };
}
