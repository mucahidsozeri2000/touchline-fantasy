import { Router } from "express";
import { AuthedRequest, requireAuth } from "./lib/auth";
import { wrap } from "./lib/wrap";
import { rateLimit } from "./lib/rateLimit";
import * as auth from "./services/auth";
import * as league from "./services/league";
import * as squad from "./services/squad";
import * as market from "./services/market";
import * as auction from "./services/auction";
import * as waivers from "./services/waivers";
import * as reauction from "./services/reauction";
import * as matchday from "./services/matchday";
import * as risk from "./services/risk";
import * as predictions from "./services/predictions";
import * as h2h from "./services/h2h";
import * as chat from "./services/chat";
import * as profile from "./services/profile";
import * as paywall from "./services/paywall";
import { prisma } from "./lib/prisma";
import { closeAuctionWindow } from "./jobs/closeAuctionWindow";
import { SQUAD_RULES, GOAL_POINTS, CLEAN_SHEET_POINTS, ASSIST_POINTS, YELLOW_POINTS, RED_POINTS, CAPTAIN_MULTIPLIER } from "./lib/scoring";

export const router = Router();

// ── Auth ─────────────────────────────────────────────────────────────────
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post("/auth/register", authLimit, wrap(async (req) => auth.register(req.body)));
router.post("/auth/login", authLimit, wrap(async (req) => auth.login(req.body)));

router.get("/me", requireAuth, wrap(async (req: AuthedRequest) => auth.getMe(req.managerId!)));
router.patch("/me", requireAuth, wrap(async (req: AuthedRequest) => auth.updateProfile(req.managerId!, req.body)));

// ── Leagues ──────────────────────────────────────────────────────────────
router.get("/leagues/mine", requireAuth, wrap(async (req: AuthedRequest) => league.myLeagues(req.managerId!)));
router.get("/leagues/open", requireAuth, wrap(async () => league.listOpenLeagues()));
router.post("/leagues", requireAuth, wrap(async (req: AuthedRequest) => league.createLeague(req.managerId!, req.body)));
router.post("/leagues/join", requireAuth, wrap(async (req: AuthedRequest) => league.joinLeagueByCode(req.managerId!, req.body.inviteCode)));
router.get("/leagues/:id", requireAuth, wrap(async (req) => prisma.league.findUniqueOrThrow({ where: { id: req.params.id } })));
router.get("/leagues/:id/standings", requireAuth, wrap(async (req: AuthedRequest) => league.getStandings(req.params.id, req.managerId!)));
router.post("/leagues/:id/close-window", requireAuth, wrap(async (req) => {
  await closeAuctionWindow(req.params.id);
  return { ok: true };
}));

// ── Squad ────────────────────────────────────────────────────────────────
router.get("/leagues/:id/squad", requireAuth, wrap(async (req: AuthedRequest) => squad.getSquad(req.params.id, req.managerId!)));
router.post("/leagues/:id/squad/captain", requireAuth, wrap(async (req: AuthedRequest) => squad.setCaptain(req.params.id, req.managerId!, req.body.playerId)));
router.post("/leagues/:id/squad/swap", requireAuth, wrap(async (req: AuthedRequest) => squad.swapPlayers(req.params.id, req.managerId!, req.body.starterPlayerId, req.body.benchPlayerId)));

// ── Transfers ────────────────────────────────────────────────────────────
router.get("/leagues/:id/transfers", requireAuth, wrap(async (req: AuthedRequest) => market.getTransferMarket(req.params.id, req.managerId!, req.query.position as string | undefined)));
router.post("/leagues/:id/transfers/confirm", requireAuth, wrap(async (req: AuthedRequest) => market.confirmTransfers(req.params.id, req.managerId!, req.body.playerIds)));

// ── Auction ──────────────────────────────────────────────────────────────
router.get("/leagues/:id/auction", requireAuth, wrap(async (req: AuthedRequest) =>
  auction.getAuction(req.params.id, req.managerId!, req.query.position as string | undefined, req.query.search as string | undefined)
));
router.post("/leagues/:id/auction/bid", requireAuth, wrap(async (req: AuthedRequest) => auction.placeBid(req.params.id, req.managerId!, req.body.playerId, req.body.amount)));
router.post("/leagues/:id/auction/counter", requireAuth, wrap(async (req: AuthedRequest) => auction.counterBid(req.params.id, req.managerId!, req.body.playerId)));
router.post("/leagues/:id/auction/blind", requireAuth, wrap(async (req: AuthedRequest) => auction.setBlindRound(req.params.id, req.managerId!, req.body.enabled)));

router.get("/leagues/:id/waivers", requireAuth, wrap(async (req: AuthedRequest) => waivers.getWaiverPool(req.params.id, req.managerId!)));
router.post("/leagues/:id/waivers/claim", requireAuth, wrap(async (req: AuthedRequest) => waivers.claimWaiver(req.params.id, req.managerId!, req.body.playerId)));

// ── Re-auction & pricing ─────────────────────────────────────────────────
router.get("/leagues/:id/reauction", requireAuth, wrap(async (req: AuthedRequest) => reauction.getReauctionScreen(req.params.id, req.managerId!)));
router.post("/leagues/:id/reauction/eliminate", requireAuth, wrap(async (req) => reauction.runEliminationSweep(req.params.id, req.body.clubId, req.body.round)));
router.post("/leagues/:id/reauction/reprice", requireAuth, wrap(async (req) => reauction.weeklyReprice(req.params.id, req.body.gameweek)));

// ── Matchday / results ───────────────────────────────────────────────────
router.get("/leagues/:id/matchday/live", requireAuth, wrap(async (req: AuthedRequest) => matchday.getMatchdayLive(req.params.id, req.managerId!)));
router.get("/leagues/:id/results", requireAuth, wrap(async (req: AuthedRequest) => matchday.getMatchResults(req.managerId!, req.params.id)));

// ── Draft feed ───────────────────────────────────────────────────────────
router.get("/leagues/:id/draft-feed", requireAuth, wrap(async (req: AuthedRequest) => {
  const ownerships = await prisma.playerOwnership.findMany({
    where: { leagueId: req.params.id, managerId: { not: null } },
    include: { player: { include: { club: true } }, manager: true },
    orderBy: { acquiredAt: "desc" },
    take: 30,
  });
  return ownerships.map((o) => ({
    manager: o.manager!.coachName,
    me: o.managerId === req.managerId,
    player: o.player.name,
    position: o.player.position,
    club: o.player.club.shortCode,
    time: o.acquiredAt,
  }));
}));

// ── Exposure & risk ──────────────────────────────────────────────────────
router.get("/leagues/:id/risk", requireAuth, wrap(async (req: AuthedRequest) => risk.getExposureRisk(req.params.id, req.managerId!)));

// ── Predictions ──────────────────────────────────────────────────────────
router.get("/leagues/:id/predictions", requireAuth, wrap(async (req: AuthedRequest) =>
  predictions.getPredictionsScreen(req.params.id, req.managerId!, Number(req.query.gameweek ?? 6))
));
router.post("/leagues/:id/predictions", requireAuth, wrap(async (req: AuthedRequest) =>
  predictions.submitPrediction(req.params.id, req.managerId!, req.body.gameweek, req.body.topScorerPick, req.body.picks ?? [])
));

// ── Head to head ─────────────────────────────────────────────────────────
router.get("/leagues/:id/h2h", requireAuth, wrap(async (req: AuthedRequest) =>
  h2h.getHeadToHead(req.params.id, req.managerId!, Number(req.query.gameweek ?? 6))
));

// ── Chat ─────────────────────────────────────────────────────────────────
router.get("/leagues/:id/chat", requireAuth, wrap(async (req: AuthedRequest) => chat.getChat(req.params.id, req.managerId!)));
router.post("/leagues/:id/chat", requireAuth, wrap(async (req: AuthedRequest) => chat.sendChatMessage(req.params.id, req.managerId!, req.body.text)));

// ── Manager profile ──────────────────────────────────────────────────────
router.get("/leagues/:id/profile/:managerId", requireAuth, wrap(async (req) => profile.getManagerProfile(req.params.id, req.params.managerId)));

// ── League Pass / paywall ────────────────────────────────────────────────
router.get("/leagues/:id/paywall", requireAuth, wrap(async (req) => paywall.getPaywallScreen(req.params.id)));
router.post("/leagues/:id/purchase", requireAuth, wrap(async (req: AuthedRequest) => paywall.purchasePlan(req.params.id, req.managerId!, req.body.plan)));

// ── Rules & scoring (static, server-served for a single source of truth) ──
router.get("/rules", wrap(async () => ({
  transferWindow: "Transfers open at a set time and lock at the deadline. Miss it and an automatic squad is assigned from your remaining budget.",
  auction: "Sealed or live bidding. Highest bid wins the lot. Unsold players go to open sale at list price once the transfer season officially opens.",
  ownership: "Every Champions League player can be drafted by only one manager per league, for the whole window.",
  squadRules: SQUAD_RULES,
  scoring: {
    goal: GOAL_POINTS,
    cleanSheet: CLEAN_SHEET_POINTS,
    assist: ASSIST_POINTS,
    yellow: YELLOW_POINTS,
    red: RED_POINTS,
    captainMultiplier: CAPTAIN_MULTIPLIER,
  },
})));

router.get("/clubs", wrap(async () => prisma.club.findMany()));
