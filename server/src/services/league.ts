import { prisma } from "../lib/prisma";
import { windowPhase } from "../lib/window";
import { HttpError } from "../lib/wrap";

function randomInviteCode() {
  const words = ["TRAP", "AWAY", "GOAL", "SPUR", "KICK", "SAVE", "RUSH", "EDGE"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}-${n}`;
}

export async function createLeague(commissionerId: string, input: {
  name: string;
  managerCap: number;
  budgetPerManager: number;
  auctionOpensAt: string;
  auctionClosesAt: string;
}) {
  if (input.managerCap < 4 || input.managerCap > 20) {
    throw new HttpError(400, "managerCap must be between 4 and 20");
  }
  const league = await prisma.league.create({
    data: {
      name: input.name,
      inviteCode: randomInviteCode(),
      managerCap: input.managerCap,
      budgetPerManager: input.budgetPerManager,
      auctionOpensAt: new Date(input.auctionOpensAt),
      auctionClosesAt: new Date(input.auctionClosesAt),
      commissionerId,
    },
  });
  await prisma.leagueMembership.create({
    data: {
      leagueId: league.id,
      managerId: commissionerId,
      budgetRemaining: input.budgetPerManager,
      isCommissioner: true,
    },
  });
  return league;
}

export async function joinLeagueByCode(managerId: string, inviteCode: string) {
  const league = await prisma.league.findUnique({ where: { inviteCode }, include: { memberships: true } });
  if (!league) throw new HttpError(404, "No league with that invite code");
  if (league.memberships.length >= league.managerCap) throw new HttpError(409, "League is full");
  const existing = league.memberships.find((m) => m.managerId === managerId);
  if (existing) return league;
  await prisma.leagueMembership.create({
    data: { leagueId: league.id, managerId, budgetRemaining: league.budgetPerManager },
  });
  return league;
}

export async function listOpenLeagues() {
  const leagues = await prisma.league.findMany({ include: { memberships: true } });
  return leagues
    .filter((l) => l.memberships.length < l.managerCap)
    .map((l) => ({
      id: l.id,
      name: l.name,
      inviteCode: l.inviteCode,
      seatsFilled: l.memberships.length,
      seatsTotal: l.managerCap,
      auctionOpensAt: l.auctionOpensAt,
    }));
}

export async function myLeagues(managerId: string) {
  const memberships = await prisma.leagueMembership.findMany({
    where: { managerId },
    include: { league: true },
  });
  return memberships.map((m) => ({ ...m.league, membershipId: m.id, isCommissioner: m.isCommissioner }));
}

export async function requireMembership(leagueId: string, managerId: string) {
  const membership = await prisma.leagueMembership.findUnique({
    where: { leagueId_managerId: { leagueId, managerId } },
  });
  if (!membership) throw new HttpError(403, "Not a member of this league");
  return membership;
}

export async function getStandings(leagueId: string, requestingManagerId: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId },
    include: { manager: true, gameweekScores: true },
  });
  const rows = memberships.map((m) => {
    const scores = m.gameweekScores.sort((a, b) => a.gameweek - b.gameweek);
    const total = scores.reduce((a, s) => a + s.points, 0);
    const lastGw = scores.length ? scores[scores.length - 1].points : 0;
    const prevTotal = scores.length > 1 ? total - lastGw : 0;
    return { manager: m, total, lastGw, prevTotal };
  });
  rows.sort((a, b) => b.total - a.total);
  const prevRanked = [...rows].sort((a, b) => b.prevTotal - a.prevTotal);
  const prevRankOf: Record<string, number> = {};
  prevRanked.forEach((r, i) => (prevRankOf[r.manager.managerId] = i + 1));

  const standings = rows.map((r, i) => {
    const rank = i + 1;
    const prevRank = prevRankOf[r.manager.managerId] ?? rank;
    return {
      rank,
      trend: prevRank - rank, // positive = moved up
      managerId: r.manager.managerId,
      manager: r.manager.manager.coachName,
      team: r.manager.manager.teamName,
      gw: r.lastGw,
      total: r.total,
      me: r.manager.managerId === requestingManagerId,
    };
  });
  return { phase: windowPhase(league.auctionOpensAt, league.auctionClosesAt), standings };
}
