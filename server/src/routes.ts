import { Router } from "express";
import type { Server as SocketServer } from "socket.io";
import type { Position } from "./types";
import { prisma } from "./db";
import { requireAuth } from "./auth";
import { initialsOf, randomToken } from "./util";
import { computePhase, ensureAutoAssigned, MAX_PER_CLUB, SQUAD_SIZE, TOTAL_BUDGET } from "./window";
import { computedLatestGwPoints, computedTotalPoints, pointsForManagerFixture } from "./points";
import { SCORING_TABLE } from "./scoring";

export function createRouter(io: SocketServer) {
  const router = Router();

  // ---------------------------------------------------------------- auth --
  router.post("/auth/register", async (req, res) => {
    const teamName = String(req.body?.teamName || "").trim();
    const coachName = String(req.body?.coachName || "").trim();
    if (!teamName || !coachName) return res.status(400).json({ error: "teamName and coachName are required" });

    const league = await prisma.league.findFirstOrThrow();
    const manager = await prisma.manager.create({
      data: { token: randomToken(), teamName, coachName, leagueId: league.id },
    });
    res.json({ token: manager.token, manager: { id: manager.id, teamName, coachName } });
  });

  // Stand-in for "Continue with Google": we don't hold real Google OAuth
  // credentials for this project, so this issues a real account with a
  // generated identity instead of a fake/no-op button.
  router.post("/auth/guest", async (_req, res) => {
    const league = await prisma.league.findFirstOrThrow();
    const n = Math.floor(1000 + Math.random() * 9000);
    const manager = await prisma.manager.create({
      data: {
        token: randomToken(),
        teamName: `FC Guest ${n}`,
        coachName: `Guest Coach ${n}`,
        leagueId: league.id,
      },
    });
    res.json({ token: manager.token, manager: { id: manager.id, teamName: manager.teamName, coachName: manager.coachName } });
  });

  router.use(requireAuth);

  // ------------------------------------------------------------------ me --
  router.get("/me", async (req, res) => {
    const manager = await prisma.manager.findUniqueOrThrow({
      where: { id: req.managerId! },
      include: { players: true, league: true },
    });
    await ensureAutoAssigned(manager.leagueId);
    const spent = manager.players.reduce((s, p) => s + p.price, 0);
    const totalPoints = manager.bonusPoints + (await computedTotalPoints(manager.id, manager.leagueId));
    const standings = await buildStandings(manager.leagueId, manager.id);
    const rank = standings.findIndex((s) => s.managerId === manager.id) + 1;

    res.json({
      teamName: manager.teamName,
      coachName: manager.coachName,
      coachInitial: (manager.coachName[0] || "?").toUpperCase(),
      leagueName: manager.league.name,
      squadValue: Number(spent.toFixed(1)),
      budgetRemaining: Number((TOTAL_BUDGET - spent).toFixed(1)),
      totalPoints,
      rank,
    });
  });

  // -------------------------------------------------------------- window --
  router.get("/window", async (req, res) => {
    res.json(await windowPayload(req.leagueId!));
  });

  router.post("/window/phase", async (req, res) => {
    const phase = String(req.body?.phase || "");
    if (!["waiting", "open", "closed"].includes(phase)) return res.status(400).json({ error: "invalid phase" });
    await prisma.transferWindow.update({
      where: { leagueId: req.leagueId! },
      data: { phaseOverride: phase, autoAssignDone: phase === "closed" ? false : true },
    });
    await ensureAutoAssigned(req.leagueId!);
    const payload = await windowPayload(req.leagueId!);
    io.to(`league:${req.leagueId}`).emit("window:changed", payload);
    res.json(payload);
  });

  // --------------------------------------------------------------- squad --
  router.get("/squad", async (req, res) => {
    const manager = await prisma.manager.findUniqueOrThrow({ where: { id: req.managerId! }, include: { players: true } });
    const starters = manager.players.filter((p) => !p.isBench);
    const bench = manager.players.filter((p) => p.isBench);
    const marker = (p: (typeof manager.players)[number]) => ({
      id: p.id,
      name: p.name,
      shortName: p.name,
      initials: initialsOf(p.name),
      photoUrl: p.photoUrl,
      position: p.position,
      isCaptain: p.id === manager.captainPlayerId,
    });
    res.json({
      captainPlayerId: manager.captainPlayerId,
      gk: starters.filter((p) => p.position === "GK").map(marker),
      defMarkers: starters.filter((p) => p.position === "DEF").map(marker),
      midMarkers: starters.filter((p) => p.position === "MID").map(marker),
      fwdMarkers: starters.filter((p) => p.position === "FWD").map(marker),
      bench: bench.map(marker),
    });
  });

  router.post("/squad/captain", async (req, res) => {
    const playerId = String(req.body?.playerId || "");
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player || player.ownerId !== req.managerId || player.isBench) {
      return res.status(400).json({ error: "player must be one of your starting XI" });
    }
    await prisma.manager.update({ where: { id: req.managerId! }, data: { captainPlayerId: playerId } });
    res.json({ captainPlayerId: playerId });
  });

  // -------------------------------------------------------------- market --
  router.get("/market", async (req, res) => {
    const posFilter = String(req.query.position || "ALL");
    const { phase } = await windowPayload(req.leagueId!);
    const players = await prisma.player.findMany({
      where: {
        leagueId: req.leagueId!,
        ...(posFilter !== "ALL" ? { position: posFilter as Position } : {}),
      },
      include: { owner: true },
      orderBy: [{ position: "asc" }, { price: "desc" }],
    });
    res.json(
      players.map((p) => ({
        id: p.id,
        name: p.name,
        club: p.club,
        position: p.position,
        price: p.price,
        form: p.form,
        photoUrl: p.photoUrl,
        initials: initialsOf(p.name),
        taken: !!p.ownerId,
        takenBy: p.ownerId === req.managerId ? "You" : p.owner?.teamName ?? null,
        canPick: !p.ownerId && phase === "open",
      }))
    );
  });

  router.post("/transfers/confirm", async (req, res) => {
    const playerIds: string[] = Array.isArray(req.body?.playerIds) ? req.body.playerIds : [];
    const { phase } = await windowPayload(req.leagueId!);
    if (phase !== "open") return res.status(409).json({ error: "Transfer window is not open" });

    const drafted: string[] = [];
    const rejected: { playerId: string; reason: string }[] = [];

    for (const playerId of playerIds) {
      const reason = await draftOne(req.managerId!, req.leagueId!, playerId, io);
      if (reason) rejected.push({ playerId, reason });
      else drafted.push(playerId);
    }

    res.json({ drafted, rejected });
  });

  // ---------------------------------------------------------------league --
  router.get("/league", async (req, res) => {
    const league = await prisma.league.findUniqueOrThrow({ where: { id: req.leagueId! } });
    const standings = await buildStandings(req.leagueId!, req.managerId!);
    res.json({ name: league.name, standings });
  });

  // ---------------------------------------------------------- draft feed --
  router.get("/draft-feed", async (req, res) => {
    const events = await prisma.draftEvent.findMany({
      where: { leagueId: req.leagueId! },
      include: { player: true, manager: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(events.map(serializeDraftEvent(req.managerId!)));
  });

  // ----------------------------------------------------------- fixtures --
  router.get("/fixtures", async (req, res) => {
    const fixtures = await prisma.fixture.findMany({ where: { leagueId: req.leagueId! }, orderBy: { kickoffAt: "asc" } });
    const out = [];
    for (const fx of fixtures) {
      const yourPts = await pointsForManagerFixture(req.managerId!, fx.id);
      out.push({
        id: fx.id,
        home: fx.homeClub,
        away: fx.awayClub,
        score: `${fx.homeScore} – ${fx.awayScore}`,
        date: fx.kickoffAt.toISOString(),
        yourPts,
      });
    }
    res.json(out);
  });

  // -------------------------------------------------------------- rules --
  router.get("/rules", async (_req, res) => {
    res.json({
      squadSize: SQUAD_SIZE,
      budget: TOTAL_BUDGET,
      maxPerClub: MAX_PER_CLUB,
      bench: 4,
      startingXi: "1 GK · 3-5 DEF · 3-5 MID · 1-3 FWD",
      scoring: SCORING_TABLE,
    });
  });

  return router;
}

async function draftOne(managerId: string, leagueId: string, playerId: string, io: SocketServer): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player || player.leagueId !== leagueId) return "Player not found";
    if (player.ownerId) return "Already drafted by another manager";

    const manager = await tx.manager.findUniqueOrThrow({ where: { id: managerId }, include: { players: true } });
    if (manager.players.length >= SQUAD_SIZE) return "Squad is already full";
    const spent = manager.players.reduce((s, p) => s + p.price, 0);
    if (spent + player.price > TOTAL_BUDGET) return "Not enough budget left";
    const clubCount = manager.players.filter((p) => p.club === player.club).length;
    if (clubCount >= MAX_PER_CLUB) return `Already have ${MAX_PER_CLUB} players from ${player.club}`;

    const startingCount = manager.players.filter((p) => !p.isBench).length;
    const isBench = startingCount >= 11;

    await tx.player.update({ where: { id: playerId }, data: { ownerId: managerId, isBench } });
    const event = await tx.draftEvent.create({
      data: { leagueId, managerId, playerId },
      include: { player: true, manager: true },
    });

    io.to(`league:${leagueId}`).emit("draft:new", serializeDraftEvent(managerId)(event));
    return null;
  });
}

function serializeDraftEvent(viewerManagerId: string) {
  return (ev: { id: string; createdAt: Date; manager: { id: string; teamName: string }; player: { name: string; position: string; club: string } }) => ({
    id: ev.id,
    manager: ev.manager.teamName,
    isMe: ev.manager.id === viewerManagerId,
    player: ev.player.name,
    posLabel: ev.player.position,
    club: ev.player.club,
    initials: initialsOf(ev.player.name),
    createdAt: ev.createdAt.toISOString(),
  });
}

async function windowPayload(leagueId: string) {
  const win = await prisma.transferWindow.findUniqueOrThrow({ where: { leagueId } });
  return {
    phase: computePhase(win),
    opensAt: win.opensAt.toISOString(),
    closesAt: win.closesAt.toISOString(),
  };
}

async function buildStandings(leagueId: string, viewerManagerId?: string) {
  const managers = await prisma.manager.findMany({ where: { leagueId } });
  const rows = [];
  for (const m of managers) {
    const total = m.bonusPoints + (await computedTotalPoints(m.id, leagueId));
    const gw = m.bonusGwPoints + (await computedLatestGwPoints(m.id, leagueId));
    rows.push({ managerId: m.id, manager: m.teamName, gw, total, isMe: m.id === viewerManagerId });
  }
  rows.sort((a, b) => b.total - a.total);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}
