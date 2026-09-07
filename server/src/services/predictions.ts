import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";

const TOP_SCORER_PTS = 5;
const SELF_CORRECT_PTS = 8;

export async function getPredictionsScreen(leagueId: string, managerId: string, gameweek: number) {
  await requireMembership(leagueId, managerId);

  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId },
    include: { manager: true, gameweekScores: { where: { gameweek } } },
  });
  const options = memberships.map((m) => ({
    id: m.managerId,
    manager: m.manager.coachName,
    formHint: m.gameweekScores[0] ? `${m.gameweekScores[0].points} pts last GW` : "No data yet",
  }));

  const upcoming = await prisma.fixture.findMany({
    where: { status: "SCHEDULED" },
    include: { homeClub: true, awayClub: true },
    take: 3,
    orderBy: { kickoffAt: "asc" },
  });

  const myPrediction = await prisma.prediction.findUnique({
    where: { leagueId_managerId_gameweek: { leagueId, managerId, gameweek } },
    include: { fixturePicks: true },
  });

  const allPredictions = await prisma.prediction.findMany({
    where: { leagueId },
    include: { manager: true, fixturePicks: true },
  });
  const byManager = new Map<string, { hit: number; miss: number; bonus: number; coach: string }>();
  for (const p of allPredictions) {
    const entry = byManager.get(p.managerId) ?? { hit: 0, miss: 0, bonus: 0, coach: p.manager.coachName };
    if (p.topScorerResolved) p.topScorerCorrect ? entry.hit++ : entry.miss++;
    for (const fp of p.fixturePicks) {
      if (fp.resolved) fp.correct ? entry.hit++ : entry.miss++;
    }
    entry.bonus += p.bonusPoints;
    byManager.set(p.managerId, entry);
  }
  const table = Array.from(byManager.entries())
    .map(([id, v]) => ({ manager: v.coach, hit: v.hit, miss: v.miss, bonus: v.bonus, me: id === managerId }))
    .sort((a, b) => b.bonus - a.bonus);

  const mine = table.find((t) => t.me);
  const accuracy = mine && mine.hit + mine.miss > 0 ? Math.round((mine.hit / (mine.hit + mine.miss)) * 100) : 0;

  return {
    stats: { accuracy, streak: mine?.hit ?? 0, bonus: mine?.bonus ?? 0 },
    topScorerOptions: options,
    fixtures: upcoming.map((f) => ({ id: f.id, home: f.homeClub.name, away: f.awayClub.name })),
    myPrediction: myPrediction
      ? { topScorerPick: myPrediction.topScorerPick, picks: myPrediction.fixturePicks.map((p) => ({ fixtureId: p.fixtureId, pick: p.pick })) }
      : null,
    table,
  };
}

export async function submitPrediction(
  leagueId: string,
  managerId: string,
  gameweek: number,
  topScorerPick: string,
  picks: Array<{ fixtureId: string; pick: string }>
) {
  await requireMembership(leagueId, managerId);
  const prediction = await prisma.prediction.upsert({
    where: { leagueId_managerId_gameweek: { leagueId, managerId, gameweek } },
    update: { topScorerPick },
    create: { leagueId, managerId, gameweek, topScorerPick },
  });
  await prisma.fixturePick.deleteMany({ where: { predictionId: prediction.id } });
  await prisma.fixturePick.createMany({
    data: picks.map((p) => ({ predictionId: prediction.id, fixtureId: p.fixtureId, pick: p.pick })),
  });
  return prediction;
}

/** Resolves a gameweek's predictions once the top scorer + fixture results are known. */
export async function resolvePredictions(leagueId: string, gameweek: number, actualTopScorerManagerId: string) {
  const predictions = await prisma.prediction.findMany({ where: { leagueId, gameweek }, include: { fixturePicks: true } });
  for (const p of predictions) {
    const correct = p.topScorerPick === actualTopScorerManagerId;
    const selfCorrect = correct && p.managerId === actualTopScorerManagerId;
    const bonus = correct ? (selfCorrect ? SELF_CORRECT_PTS : TOP_SCORER_PTS) : 0;
    await prisma.prediction.update({
      where: { id: p.id },
      data: { topScorerResolved: true, topScorerCorrect: correct, bonusPoints: { increment: bonus } },
    });
  }
}
