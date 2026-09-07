import { prisma } from "../lib/prisma";
import { requireMembership } from "./league";
import { PlanId } from "@prisma/client";

export const PLANS = [
  {
    id: "LEAGUE_PASS" as PlanId,
    name: "League Pass",
    priceLabel: "£24 / season",
    amountCents: 2400,
    detail:
      "One commissioner payment unlocks the whole league — custom scoring, up to 20 managers (free tier caps at 8), blind auction rounds + 60s anti-snipe extension, knockout re-auctions, head-to-head scheduling.",
  },
  {
    id: "CLUB_IDENTITY" as PlanId,
    name: "Club Identity",
    priceLabel: "£4 one-off",
    amountCents: 400,
    detail: "Crest and kit designer, manager badges, a custom engraved trophy.",
  },
  {
    id: "SEASON_BOOK" as PlanId,
    name: "Season Book",
    priceLabel: "£12 at season's end",
    amountCents: 1200,
    detail: "A printed record of the season — every auction, every gameweek, the final table — posted to the champion.",
  },
];

export const UNLOCKS = [
  { title: "Custom scoring", body: "Configure your own points table instead of the default" },
  { title: "Up to 20 managers", body: "Free leagues are capped at 8 seats" },
  { title: "Blind auction rounds", body: "Sealed bidding plus a 60-second anti-snipe extension" },
  { title: "Post-elimination re-auctions", body: "A fresh window after every knockout round, refunds included" },
  { title: "Head-to-head fixtures", body: "Weekly duels and a table alongside the main standings" },
  { title: "Season Book & trophy", body: "A shareable season summary and league crest" },
];

export const NEVER_FOR_SALE = [
  "Extra transfers or bonus budget",
  "Waiver priority or queue jumps",
  "Last-second bid rights or auction extensions",
  "Rival budgets, price forecasts, or any other hidden information",
  "Matchday advertising",
];

export async function getPaywallScreen(leagueId: string) {
  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  return { isPro: league.isPro, plans: PLANS, unlocks: UNLOCKS, neverForSale: NEVER_FOR_SALE };
}

export async function purchasePlan(leagueId: string, managerId: string, plan: PlanId) {
  const membership = await requireMembership(leagueId, managerId);
  const planDef = PLANS.find((p) => p.id === plan);
  if (!planDef) throw new Error("Unknown plan");
  await prisma.purchase.create({
    data: { leagueId, managerId, plan, amountCents: planDef.amountCents },
  });
  if (plan === "LEAGUE_PASS") {
    await prisma.league.update({ where: { id: leagueId }, data: { isPro: true, managerCap: 20 } });
  }
  return { ok: true };
}
