// Seeds one demo league ("THE OFFSIDE TRAP") with real Champions League
// clubs/players and the same reference data used in the Touchline Fantasy
// design prototype, so the API has realistic content to serve on first run.
import { PrismaClient, Position, AcquisitionRoute, LotStatus, EventType, FixtureStatus } from "@prisma/client";

const db = new PrismaClient();

const CLUBS = [
  { code: "MCI", name: "Manchester City", color: "#6CABDD" },
  { code: "RMA", name: "Real Madrid", color: "#FEBE10" },
  { code: "LIV", name: "Liverpool", color: "#C8102E" },
  { code: "BAY", name: "Bayern Munich", color: "#DC052D" },
  { code: "BAR", name: "Barcelona", color: "#A50044" },
  { code: "PSG", name: "Paris Saint-Germain", color: "#004170" },
  { code: "ARS", name: "Arsenal", color: "#EF0107" },
  { code: "LEV", name: "Bayer Leverkusen", color: "#E32219" },
  { code: "GAL", name: "Galatasaray", color: "#FDB913" },
  { code: "MIL", name: "AC Milan", color: "#FB090B" },
  { code: "INT", name: "Inter Milan", color: "#010E80" },
  { code: "JUV", name: "Juventus", color: "#000000" },
  { code: "ATM", name: "Atletico Madrid", color: "#CB3524" },
];

type SeedPlayer = { name: string; club: string; pos: Position; price: number; bench?: boolean };

const PLAYERS: SeedPlayer[] = [
  // Sen's starting squad + bench (from the prototype's SQUAD constant)
  { name: "Ederson", club: "MCI", pos: "GK", price: 5.0 },
  { name: "Alexander-Arnold", club: "LIV", pos: "DEF", price: 7.0 },
  { name: "Van Dijk", club: "LIV", pos: "DEF", price: 6.0 },
  { name: "Hakimi", club: "PSG", pos: "DEF", price: 5.5 },
  { name: "Rüdiger", club: "RMA", pos: "DEF", price: 5.0 },
  { name: "Bellingham", club: "RMA", pos: "MID", price: 9.5 },
  { name: "Pedri", club: "BAR", pos: "MID", price: 6.5 },
  { name: "Musiala", club: "BAY", pos: "MID", price: 8.0 },
  { name: "Mbappé", club: "RMA", pos: "FWD", price: 12.5 },
  { name: "Haaland", club: "MCI", pos: "FWD", price: 12.0 },
  { name: "Vinicius Jr", club: "RMA", pos: "FWD", price: 10.5 },
  { name: "Courtois", club: "RMA", pos: "GK", price: 4.5, bench: true },
  { name: "Saliba", club: "ARS", pos: "DEF", price: 5.0, bench: true },
  { name: "Kimmich", club: "BAY", pos: "MID", price: 5.5, bench: true },
  { name: "Kane", club: "BAY", pos: "FWD", price: 8.5, bench: true },
  // Open market / other managers' rosters / auction lots
  { name: "Alisson", club: "LIV", pos: "GK", price: 5.5 },
  { name: "Dias", club: "MCI", pos: "DEF", price: 6.0 },
  { name: "Gvardiol", club: "MCI", pos: "DEF", price: 6.5 },
  { name: "Konaté", club: "LIV", pos: "DEF", price: 5.5 },
  { name: "Rice", club: "ARS", pos: "MID", price: 6.5 },
  { name: "Wirtz", club: "LEV", pos: "MID", price: 8.5 },
  { name: "Bernardo Silva", club: "MCI", pos: "MID", price: 7.0 },
  { name: "Salah", club: "LIV", pos: "FWD", price: 12.5 },
  { name: "Osimhen", club: "GAL", pos: "FWD", price: 9.0 },
  { name: "Kvaratskhelia", club: "PSG", pos: "FWD", price: 9.5 },
  { name: "Lamine Yamal", club: "BAR", pos: "FWD", price: 11.0 },
  { name: "Frenkie de Jong", club: "BAR", pos: "MID", price: 6.0 },
  { name: "Ter Stegen", club: "BAR", pos: "GK", price: 5.0 },
  { name: "Frimpong", club: "LEV", pos: "DEF", price: 5.0 },
  { name: "Ter Stegen Jr Reserve", club: "GAL", pos: "GK", price: 3.5 },
];

function initialsOf(name: string) {
  const parts = name.replace(/[^\p{L}\s-]/gu, "").split(/[\s-]+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MANAGER_SEED = [
  { teamName: "FC Northbank", coachName: "Sen", email: "you@touchline.dev" },
  { teamName: "Kop End Kings", coachName: "Jamie K." },
  { teamName: "Tiki Takers", coachName: "Priya S." },
  { teamName: "Red Card Rovers", coachName: "Marcus O." },
  { teamName: "Offside Trap FC", coachName: "Elena R." },
  { teamName: "Midfield Maestros", coachName: "Tom H." },
  { teamName: "Last Line United", coachName: "Sofia M." },
  { teamName: "Golden Boot GC", coachName: "Dan B." },
];

async function main() {
  console.log("Seeding clubs…");
  const clubByCode: Record<string, string> = {};
  for (const c of CLUBS) {
    const club = await db.club.upsert({
      where: { shortCode: c.code },
      update: { name: c.name, colorHex: c.color },
      create: { name: c.name, shortCode: c.code, colorHex: c.color },
    });
    clubByCode[c.code] = club.id;
  }
  // Bayern's exposed players get cleared in R16 in the reference scenario.
  await db.club.update({ where: { shortCode: "BAY" }, data: { eliminated: true, eliminatedRound: "Round of 16" } });

  console.log("Seeding players…");
  const playerByName: Record<string, { id: string; price: number }> = {};
  for (const p of PLAYERS) {
    const existing = await db.player.findFirst({ where: { name: p.name, clubId: clubByCode[p.club] } });
    const player = existing
      ? existing
      : await db.player.create({
          data: {
            name: p.name,
            clubId: clubByCode[p.club],
            position: p.pos,
            basePrice: p.price,
            initials: initialsOf(p.name),
          },
        });
    playerByName[p.name] = { id: player.id, price: p.price };
  }

  console.log("Seeding managers…");
  const managerByCoach: Record<string, string> = {};
  for (const m of MANAGER_SEED) {
    const manager = await db.manager.upsert({
      where: { email: m.email ?? `${m.coachName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@touchline.dev` },
      update: {},
      create: {
        email: m.email ?? `${m.coachName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@touchline.dev`,
        teamName: m.teamName,
        coachName: m.coachName,
        avatarInitial: m.coachName[0].toUpperCase(),
      },
    });
    managerByCoach[m.coachName] = manager.id;
  }
  const senId = managerByCoach["Sen"];

  console.log("Seeding league…");
  const opensAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
  const closesAt = new Date(Date.now() + 1000 * 60 * 60 * 6);
  const league = await db.league.upsert({
    where: { inviteCode: "TRAP-2027" },
    update: {},
    create: {
      name: "THE OFFSIDE TRAP",
      inviteCode: "TRAP-2027",
      managerCap: 8,
      budgetPerManager: 120.0,
      auctionOpensAt: opensAt,
      auctionClosesAt: closesAt,
      blindRound: true,
      antiSnipeSeconds: 60,
      commissionerId: senId,
    },
  });

  console.log("Seeding memberships…");
  const standings = [
    { coach: "Jamie K.", gw: 78, total: 612 },
    { coach: "Priya S.", gw: 65, total: 598 },
    { coach: "Sen", gw: 82, total: 585 },
    { coach: "Marcus O.", gw: 60, total: 570 },
    { coach: "Elena R.", gw: 71, total: 555 },
    { coach: "Tom H.", gw: 58, total: 540 },
    { coach: "Sofia M.", gw: 66, total: 522 },
    { coach: "Dan B.", gw: 54, total: 501 },
  ];
  const membershipByCoach: Record<string, string> = {};
  for (const s of standings) {
    const membership = await db.leagueMembership.upsert({
      where: { leagueId_managerId: { leagueId: league.id, managerId: managerByCoach[s.coach] } },
      update: {},
      create: {
        leagueId: league.id,
        managerId: managerByCoach[s.coach],
        budgetRemaining: s.coach === "Sen" ? 120 - PLAYERS.filter((p) => p.bench !== undefined || true).slice(0, 15).reduce((a, p) => a + p.price, 0) : 40 + Math.random() * 30,
        isCommissioner: s.coach === "Sen",
      },
    });
    membershipByCoach[s.coach] = membership.id;

    // Season form across 6 gameweeks summing to `total`, last GW == `gw`.
    // Spread GW1-5 with deterministic variance around the average rather than
    // a flat repeat, so the profile's form chart reads as a real season.
    const remainder = s.total - s.gw;
    const avg = remainder / 5;
    const seedFor = (n: number) => {
      let h = 0;
      for (const ch of `${s.coach}-${n}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      return (h % 1000) / 1000; // 0..1
    };
    const early = [1, 2, 3, 4, 5].map((gw) => Math.max(10, Math.round(avg * (0.65 + seedFor(gw) * 0.7))));
    const earlySum = early.reduce((a, b) => a + b, 0);
    early[4] += remainder - earlySum; // absorb rounding so GW1-5 sums exactly to `remainder`
    let running = 0;
    for (let gw = 1; gw <= 6; gw++) {
      const points = gw === 6 ? s.total - running : early[gw - 1];
      running += points;
      await db.gameweekScore.upsert({
        where: { leagueMembershipId_gameweek: { leagueMembershipId: membership.id, gameweek: gw } },
        update: { points },
        create: { leagueMembershipId: membership.id, gameweek: gw, points },
      });
    }
  }

  console.log("Seeding ownership + Sen's squad…");
  for (const p of PLAYERS) {
    const info = playerByName[p.name];
    const isSenSquad = ["Ederson","Alexander-Arnold","Van Dijk","Hakimi","Rüdiger","Bellingham","Pedri","Musiala","Mbappé","Haaland","Vinicius Jr","Courtois","Saliba","Kimmich","Kane"].includes(p.name);
    const takenByOther: Record<string, string> = { Rice: "Priya S.", Wirtz: "Elena R." };
    const ownerCoach = isSenSquad ? "Sen" : takenByOther[p.name];
    // Bayern (Musiala/Kimmich/Kane) were cleared from squads on elimination —
    // represent that as unowned + in the waiver pool instead of Sen-owned.
    const clearedByElimination = ["Musiala", "Kimmich", "Kane"].includes(p.name);
    const ownerId = clearedByElimination ? undefined : ownerCoach ? managerByCoach[ownerCoach] : undefined;

    await db.playerOwnership.upsert({
      where: { leagueId_playerId: { leagueId: league.id, playerId: info.id } },
      update: { managerId: ownerId ?? null },
      create: {
        leagueId: league.id,
        playerId: info.id,
        managerId: ownerId ?? null,
        currentPrice: info.price,
        acquiredVia: ownerId ? "AUCTION" : undefined,
        acquiredAt: ownerId ? opensAt : undefined,
      },
    });

    if (isSenSquad) {
      await db.squadSlot.upsert({
        where: { leagueMembershipId_playerId: { leagueMembershipId: membershipByCoach["Sen"], playerId: info.id } },
        update: {},
        create: {
          leagueMembershipId: membershipByCoach["Sen"],
          playerId: info.id,
          isStarting: !p.bench,
          isCaptain: p.name === "Bellingham",
        },
      });
    }
  }

  console.log("Seeding clearance log for Bayern's cleared players…");
  const clearedRefunds: Record<string, number> = { Musiala: 8.0, Kimmich: 5.5, Kane: 8.5 };
  for (const [name, refund] of Object.entries(clearedRefunds)) {
    const info = playerByName[name];
    await db.playerClearance.create({
      data: {
        leagueId: league.id,
        playerId: info.id,
        managerId: senId,
        refundAmount: refund,
        reason: "Bayern Munich eliminated in the Round of 16",
      },
    });
  }
  await db.leagueMembership.update({
    where: { id: membershipByCoach["Sen"] },
    data: { budgetRemaining: { increment: Object.values(clearedRefunds).reduce((a, b) => a + b, 0) } },
  });

  console.log("Seeding waiver pool for Bayern's cleared players…");
  const standingsReversed = [...standings].sort((a, b) => b.gw - a.gw); // worst gw-rank... use total ascending for priority instead
  const priorityOrder = [...standings].sort((a, b) => a.total - b.total); // worst-placed manager first
  for (const name of ["Musiala", "Kimmich", "Kane"]) {
    const info = playerByName[name];
    for (let i = 0; i < priorityOrder.length; i++) {
      const coach = priorityOrder[i].coach;
      await db.waiverClaim.create({
        data: {
          leagueId: league.id,
          playerId: info.id,
          managerId: managerByCoach[coach],
          reason: "Club eliminated in Round of 16 — released to waivers",
          priority: i + 1,
          status: "PENDING",
        },
      });
    }
  }

  console.log("Seeding auction lots + bids…");
  const lots: Array<{ name: string; list: number; bids: Array<{ coach: string; amount: number }> }> = [
    { name: "Lamine Yamal", list: 11.0, bids: [{ coach: "Priya S.", amount: 14.5 }] },
    { name: "Wirtz", list: 8.5, bids: [{ coach: "Sen", amount: 10.0 }] },
    { name: "Salah", list: 12.5, bids: [{ coach: "Jamie K.", amount: 15.0 }] },
    { name: "Rice", list: 6.5, bids: [{ coach: "Sen", amount: 7.0 }] },
    { name: "Dias", list: 6.0, bids: [] },
    { name: "Alisson", list: 5.5, bids: [{ coach: "Marcus O.", amount: 6.5 }] },
  ];
  for (const lot of lots) {
    const info = playerByName[lot.name];
    const auctionLot = await db.auctionLot.upsert({
      where: { leagueId_playerId: { leagueId: league.id, playerId: info.id } },
      update: {},
      create: { leagueId: league.id, playerId: info.id, listPrice: lot.list, closesAt, status: "OPEN" },
    });
    let winningBidId: string | undefined;
    let top = -1;
    for (const b of lot.bids) {
      const bid = await db.bid.create({
        data: {
          leagueId: league.id,
          lotId: auctionLot.id,
          playerId: info.id,
          managerId: managerByCoach[b.coach],
          amount: b.amount,
          isBlind: league.blindRound,
        },
      });
      if (b.amount > top) {
        top = b.amount;
        winningBidId = bid.id;
      }
    }
    if (winningBidId) await db.auctionLot.update({ where: { id: auctionLot.id }, data: { winningBidId } });
  }

  console.log("Seeding fixtures + match events…");
  const fixtureSeed = [
    { home: "RMA", away: "BAY", hs: 3, as: 1, days: -2 },
    { home: "MCI", away: "PSG", hs: 2, as: 2, days: -2 },
    { home: "LIV", away: "BAR", hs: 1, as: 0, days: -1 },
    { home: "LEV", away: "GAL", hs: 2, as: 0, days: -1 },
    { home: "ARS", away: "INT", hs: 0, as: 0, days: -1 },
    { home: "JUV", away: "ATM", hs: 1, as: 2, days: -1 },
    { home: "RMA", away: "ARS", hs: null, as: null, days: 0, live: true },
    { home: "MCI", away: "PSG", hs: null, as: null, days: 0, live: true, gameweek: 7 },
    { home: "BAR", away: "INT", hs: null, as: null, days: 3 },
    { home: "BAY", away: "LIV", hs: null, as: null, days: 5 },
  ];
  const fixtureIds: Record<string, string> = {};
  for (const [i, f] of fixtureSeed.entries()) {
    const kickoffAt = new Date(Date.now() + f.days * 1000 * 60 * 60 * 24);
    const status: FixtureStatus = f.live ? "LIVE" : f.hs != null ? "FT" : "SCHEDULED";
    const fx = await db.fixture.create({
      data: {
        round: "League phase",
        gameweek: f.gameweek ?? Math.min(6, Math.max(1, i + 1)),
        homeClubId: clubByCode[f.home],
        awayClubId: clubByCode[f.away],
        kickoffAt,
        homeScore: f.hs ?? undefined,
        awayScore: f.as ?? undefined,
        status,
      },
    });
    fixtureIds[`${f.home}-${f.away}-${i}`] = fx.id;
  }
  const liveFixtureId = Object.values(fixtureIds)[6];
  const liveEvents: Array<{ player: string; minute: number; type: EventType; pts: number }> = [
    { player: "Vinicius Jr", minute: 78, type: "GOAL", pts: 5 },
    { player: "Bellingham", minute: 66, type: "ASSIST", pts: 3 },
    { player: "Rüdiger", minute: 61, type: "YELLOW", pts: -1 },
  ];
  for (const e of liveEvents) {
    const info = playerByName[e.player];
    if (!info) continue;
    await db.matchEvent.create({
      data: { fixtureId: liveFixtureId, playerId: info.id, minute: e.minute, type: e.type, pointsDelta: e.pts },
    });
  }

  console.log("Seeding price re-ratings…");
  const movers = [
    { name: "Lamine Yamal", old: 11.0, now: 12.4, reason: "3 goals, 2 assists in R16" },
    { name: "Vinicius Jr", old: 10.5, now: 11.6, reason: "2 goals, 270 minutes" },
    { name: "Rice", old: 6.5, now: 7.2, reason: "2 assists, clean sheet" },
    { name: "Dias", old: 6.0, now: 6.5, reason: "2 clean sheets" },
    { name: "Alisson", old: 5.5, now: 5.9, reason: "Clean sheet, 7 saves" },
    { name: "Salah", old: 12.5, now: 11.7, reason: "0 returns in 2 games" },
    { name: "Hakimi", old: 5.5, now: 4.9, reason: "Suspended one leg" },
    { name: "Ederson", old: 5.0, now: 4.6, reason: "Benched in R16 2nd leg" },
    { name: "Rüdiger", old: 5.0, now: 4.7, reason: "Yellow card, 3 goals conceded" },
  ];
  for (const m of movers) {
    const info = playerByName[m.name];
    if (!info) continue;
    await db.playerPriceChange.create({
      data: { leagueId: league.id, playerId: info.id, gameweek: 6, oldPrice: m.old, newPrice: m.now, reason: m.reason },
    });
    await db.playerOwnership.updateMany({ where: { leagueId: league.id, playerId: info.id }, data: { currentPrice: m.now } });
  }

  console.log("Seeding chat…");
  const messages = [
    { coach: "Jamie K.", text: "Transfer window in 2 days. Who's your captain?" },
    { coach: "Priya S.", text: "Bellingham. No debate." },
    { coach: "Marcus O.", text: "Haaland scored 4 last week, going with him again." },
    { coach: "Sen", text: "Vinicius has been unreal the last three gameweeks, watch this space." },
    { coach: "Elena R.", text: "Whoever bids on Mbappé against Bayern is brave." },
    { coach: "Tom H.", text: "Brave or right. He is on a run." },
  ];
  for (const m of messages) {
    await db.chatMessage.create({ data: { leagueId: league.id, managerId: managerByCoach[m.coach], text: m.text } });
  }

  console.log("Seeding head-to-head…");
  await db.headToHeadFixture.create({
    data: {
      leagueId: league.id,
      gameweek: 6,
      managerAId: senId,
      managerBId: managerByCoach["Marcus O."],
      scoreA: 82,
      scoreB: 60,
    },
  });
  // Future scheduled H2H weeks
  const order = ["Sen", "Jamie K.", "Priya S.", "Elena R.", "Tom H.", "Sofia M.", "Dan B.", "Marcus O."];
  for (let gw = 7; gw <= 9; gw++) {
    for (let i = 0; i < order.length; i += 2) {
      await db.headToHeadFixture.create({
        data: {
          leagueId: league.id,
          gameweek: gw,
          managerAId: managerByCoach[order[(i + gw) % order.length]],
          managerBId: managerByCoach[order[(i + 1 + gw) % order.length]],
        },
      });
    }
  }

  console.log("Seeding predictions history…");
  const predictTable = [
    { coach: "Priya S.", hit: 7, miss: 2, bonus: 38 },
    { coach: "Sen", hit: 6, miss: 3, bonus: 34 },
    { coach: "Jamie K.", hit: 5, miss: 4, bonus: 27 },
    { coach: "Elena R.", hit: 4, miss: 5, bonus: 21 },
    { coach: "Marcus O.", hit: 3, miss: 6, bonus: 15 },
  ];
  for (const row of predictTable) {
    await db.prediction.upsert({
      where: { leagueId_managerId_gameweek: { leagueId: league.id, managerId: managerByCoach[row.coach], gameweek: 6 } },
      update: {},
      create: {
        leagueId: league.id,
        managerId: managerByCoach[row.coach],
        gameweek: 6,
        topScorerPick: senId,
        topScorerResolved: true,
        topScorerCorrect: row.coach === "Sen",
        bonusPoints: row.bonus,
      },
    });
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
