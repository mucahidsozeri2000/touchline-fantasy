import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";
import { CAPTAIN_MULTIPLIER, pointsForEvent } from "../lib/scoring";

async function myPlayerIds(leagueId: string, managerId: string) {
  const membership = await requireMembership(leagueId, managerId);
  const slots = await prisma.squadSlot.findMany({ where: { leagueMembershipId: membership.id } });
  return { membership, slots };
}

export async function getMatchdayLive(leagueId: string, managerId: string) {
  const { slots } = await myPlayerIds(leagueId, managerId);
  const myPlayerIdSet = new Set(slots.map((s) => s.playerId));
  const captainId = slots.find((s) => s.isCaptain)?.playerId;

  const liveFixtures = await prisma.fixture.findMany({
    where: { status: { in: ["LIVE", "FT"] } },
    include: { homeClub: true, awayClub: true, events: { include: { player: true }, orderBy: { minute: "desc" } } },
    orderBy: { kickoffAt: "desc" },
  });

  const feed = liveFixtures.flatMap((fx) =>
    fx.events.map((e) => {
      const isMine = myPlayerIdSet.has(e.playerId);
      const pts = e.pointsDelta * (e.playerId === captainId ? CAPTAIN_MULTIPLIER : 1);
      return {
        minute: `${e.minute}'`,
        player: e.player.name,
        action: e.type,
        match: `${fx.homeClub.shortCode} ${fx.homeScore ?? 0}-${fx.awayScore ?? 0} ${fx.awayClub.shortCode}`,
        pts: pts >= 0 ? `+${pts}` : `${pts}`,
        mine: isMine,
      };
    })
  );

  const myXi = await prisma.squadSlot.findMany({
    where: { leagueMembershipId: (await requireMembership(leagueId, managerId)).id, isStarting: true },
    include: { player: { include: { club: true, matchEvents: { where: { fixture: { status: { in: ["LIVE", "FT"] } } } } } } },
  });
  const myXiDto = myXi.map((s) => {
    const events = s.player.matchEvents;
    const pts = events.reduce((a, e) => a + e.pointsDelta, 0) * (s.isCaptain ? CAPTAIN_MULTIPLIER : 1);
    const state = events.length ? "live" : "upcoming";
    return {
      name: s.player.name,
      club: s.player.club.shortCode,
      isCaptain: s.isCaptain,
      state,
      pts,
      status: events.length ? `${events.length} event(s) so far` : "Yet to kick off",
    };
  });

  const memberships = await prisma.leagueMembership.findMany({
    where: { leagueId },
    include: { manager: true, squadSlots: { include: { player: { include: { matchEvents: { where: { fixture: { status: { in: ["LIVE", "FT"] } } } } } } } } },
  });
  const liveTable = memberships
    .map((m) => {
      const live = m.squadSlots
        .filter((s) => s.isStarting)
        .reduce((a, s) => a + s.player.matchEvents.reduce((b, e) => b + e.pointsDelta, 0) * (s.isCaptain ? CAPTAIN_MULTIPLIER : 1), 0);
      const stillToPlay = m.squadSlots.filter((s) => s.isStarting && s.player.matchEvents.length === 0).length;
      return { manager: m.manager.coachName, live, playing: `${stillToPlay} to play`, me: m.managerId === managerId };
    })
    .sort((a, b) => b.live - a.live);

  const myTotal = myXiDto.reduce((a, x) => a + x.pts, 0);
  const myRank = liveTable.findIndex((r) => r.me) + 1;

  return {
    header: { total: myTotal, rank: myRank, playersLeft: myXiDto.filter((x) => x.state === "upcoming").length },
    feed,
    myXi: myXiDto,
    liveTable,
  };
}

export async function getMatchResults(managerId: string, leagueId: string) {
  const { slots } = await myPlayerIds(leagueId, managerId);
  const myPlayerIdSet = new Set(slots.map((s) => s.playerId));
  const captainId = slots.find((s) => s.isCaptain)?.playerId;

  const fixtures = await prisma.fixture.findMany({
    where: { status: "FT" },
    include: { homeClub: true, awayClub: true, events: true },
    orderBy: { kickoffAt: "desc" },
  });

  return fixtures.map((fx) => {
    const yourPts = fx.events
      .filter((e) => myPlayerIdSet.has(e.playerId))
      .reduce((a, e) => a + e.pointsDelta * (e.playerId === captainId ? CAPTAIN_MULTIPLIER : 1), 0);
    return {
      home: fx.homeClub.name,
      away: fx.awayClub.name,
      homeScore: fx.homeScore,
      awayScore: fx.awayScore,
      date: fx.kickoffAt,
      gameweek: fx.gameweek,
      yourPts,
    };
  });
}
