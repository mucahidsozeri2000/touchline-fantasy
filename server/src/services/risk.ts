import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";

const RISK_NOTE: Record<string, string> = {
  low: "Comfortably through on aggregate",
  medium: "Tie in the balance",
  high: "Currently going out on aggregate",
};

export async function getExposureRisk(leagueId: string, managerId: string) {
  const membership = await requireMembership(leagueId, managerId);
  const slots = await prisma.squadSlot.findMany({
    where: { leagueMembershipId: membership.id },
    include: { player: { include: { club: true, matchEvents: true } } },
  });

  const totalPoints = slots.reduce(
    (a, s) => a + s.player.matchEvents.reduce((b, e) => b + e.pointsDelta, 0),
    0
  ) || 1;

  const byClub = new Map<string, { name: string; color: string; count: number; pts: number; eliminated: boolean; round: string | null }>();
  for (const s of slots) {
    const c = s.player.club;
    const entry = byClub.get(c.id) ?? { name: c.name, color: c.colorHex, count: 0, pts: 0, eliminated: c.eliminated, round: c.eliminatedRound };
    entry.count += 1;
    entry.pts += s.player.matchEvents.reduce((b, e) => b + e.pointsDelta, 0);
    byClub.set(c.id, entry);
  }

  const clubs = Array.from(byClub.values())
    .filter((c) => c.count > 0)
    .map((c) => {
      const proportion = Math.round((c.pts / totalPoints) * 100);
      const risk = c.eliminated ? "high" : proportion > 30 ? "medium" : "low";
      return {
        club: c.name,
        clubColor: c.color,
        count: c.count,
        pts: c.pts,
        proportion,
        tie: c.eliminated ? `Eliminated · ${c.round}` : RISK_NOTE[risk],
        risk,
      };
    })
    .sort((a, b) => b.pts - a.pts);

  const atRiskPct = clubs.filter((c) => c.risk !== "low").reduce((a, c) => a + c.proportion, 0);
  const biggest = clubs[0];

  const timeline = [
    { round: "League phase", note: "Completed", state: "done" },
    { round: "Round of 16", note: "Second legs this week", state: "live" },
    { round: "Quarter-finals", note: "Re-auction opens after", state: "next" },
    { round: "Semi-finals", note: "April 2027", state: "future" },
  ];

  return {
    atRiskPct,
    biggestContributor: biggest ? `${biggest.club} alone carries ${biggest.proportion}%` : null,
    clubs,
    timeline,
  };
}
