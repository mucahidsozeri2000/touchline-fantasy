import { PrismaClient } from "@prisma/client";
import { PLAYERS } from "./players";

const prisma = new PrismaClient();

async function fetchPhoto(wikiTitle: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    const res = await fetch(url, { headers: { "User-Agent": "touchline-fantasy-seed/1.0" } });
    if (!res.ok) return null;
    const json: any = await res.json();
    return json?.thumbnail?.source ?? json?.originalimage?.source ?? null;
  } catch (e) {
    console.warn(`  photo lookup failed for ${wikiTitle}:`, (e as Error).message);
    return null;
  }
}

const BOTS = [
  { key: "jamie", teamName: "Jamie K.", coachName: "Jamie K.", bonusPoints: 606, bonusGwPoints: 78 },
  { key: "priya", teamName: "Priya S.", coachName: "Priya S.", bonusPoints: 597, bonusGwPoints: 65 },
  { key: "marcus", teamName: "Marcus O.", coachName: "Marcus O.", bonusPoints: 559, bonusGwPoints: 60 },
  { key: "elena", teamName: "Elena R.", coachName: "Elena R.", bonusPoints: 554, bonusGwPoints: 71 },
  { key: "tom", teamName: "Tom H.", coachName: "Tom H.", bonusPoints: 533, bonusGwPoints: 58 },
  { key: "sofia", teamName: "Sofia M.", coachName: "Sofia M.", bonusPoints: 521, bonusGwPoints: 66 },
  { key: "dan", teamName: "Dan B.", coachName: "Dan B.", bonusPoints: 493, bonusGwPoints: 54 },
] as const;

// bot key -> [playerId, minutesAgoDrafted][]
const BOT_DRAFTS: Record<string, [string, number][]> = {
  jamie: [
    ["vinicius", 1],
    ["haaland", 6],
    ["mbappe", 10],
  ],
  elena: [["wirtz", 2]],
  marcus: [
    ["yamal", 4],
    ["bellingham", 21],
  ],
  priya: [["rice", 8]],
  tom: [
    ["dejong", 13],
    ["musiala", 15],
  ],
  sofia: [["terstegen", 18]],
  dan: [
    ["frimpong", 24],
    ["taa", 27],
  ],
};

function randomToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function main() {
  console.log("Wiping existing data…");
  await prisma.playerMatchStat.deleteMany();
  await prisma.fixture.deleteMany();
  await prisma.draftEvent.deleteMany();
  await prisma.player.deleteMany();
  await prisma.transferWindow.deleteMany();
  await prisma.manager.deleteMany();
  await prisma.league.deleteMany();

  console.log("Creating league…");
  const league = await prisma.league.create({ data: { name: "THE OFFSIDE TRAP" } });

  const now = new Date();
  await prisma.transferWindow.create({
    data: {
      leagueId: league.id,
      opensAt: new Date(now.getTime() - 24 * 3600 * 1000),
      closesAt: new Date(now.getTime() + 5 * 24 * 3600 * 1000),
    },
  });

  console.log("Fetching player photos from Wikipedia…");
  const photoByPlayerId: Record<string, string | null> = {};
  for (const p of PLAYERS) {
    photoByPlayerId[p.id] = await fetchPhoto(p.wikiTitle);
    console.log(`  ${p.name}: ${photoByPlayerId[p.id] ? "ok" : "no photo, will fall back to initials"}`);
  }

  console.log("Creating players…");
  for (const p of PLAYERS) {
    await prisma.player.create({
      data: {
        id: p.id,
        name: p.name,
        club: p.club,
        position: p.position,
        price: p.price,
        form: p.form,
        photoUrl: photoByPlayerId[p.id],
        leagueId: league.id,
      },
    });
  }

  console.log("Creating bot managers…");
  const botIdByKey: Record<string, string> = {};
  for (const bot of BOTS) {
    const manager = await prisma.manager.create({
      data: {
        token: randomToken(),
        teamName: bot.teamName,
        coachName: bot.coachName,
        isBot: true,
        bonusPoints: bot.bonusPoints,
        bonusGwPoints: bot.bonusGwPoints,
        leagueId: league.id,
      },
    });
    botIdByKey[bot.key] = manager.id;
  }

  console.log("Assigning bot draft picks…");
  for (const [botKey, picks] of Object.entries(BOT_DRAFTS)) {
    const managerId = botIdByKey[botKey];
    for (const [playerId, minutesAgo] of picks) {
      await prisma.player.update({ where: { id: playerId }, data: { ownerId: managerId } });
      await prisma.draftEvent.create({
        data: {
          leagueId: league.id,
          managerId,
          playerId,
          createdAt: new Date(now.getTime() - minutesAgo * 60 * 1000),
        },
      });
    }
  }

  console.log("Creating fixtures + match stats…");
  const sep = (day: number) => new Date(Date.UTC(2026, 8, day, 19, 0, 0));

  const rmaBay = await prisma.fixture.create({
    data: { leagueId: league.id, gameweek: 3, homeClub: "Real Madrid", awayClub: "Bayern Munich", homeScore: 3, awayScore: 1, kickoffAt: sep(16) },
  });
  const mciPsg = await prisma.fixture.create({
    data: { leagueId: league.id, gameweek: 3, homeClub: "Man City", awayClub: "PSG", homeScore: 2, awayScore: 2, kickoffAt: sep(16) },
  });
  const livBar = await prisma.fixture.create({
    data: { leagueId: league.id, gameweek: 3, homeClub: "Liverpool", awayClub: "Barcelona", homeScore: 1, awayScore: 0, kickoffAt: sep(17) },
  });
  const levGal = await prisma.fixture.create({
    data: { leagueId: league.id, gameweek: 3, homeClub: "Bayer Leverkusen", awayClub: "Galatasaray", homeScore: 2, awayScore: 0, kickoffAt: sep(17) },
  });
  const arsInt = await prisma.fixture.create({
    data: { leagueId: league.id, gameweek: 3, homeClub: "Arsenal", awayClub: "Inter Milan", homeScore: 0, awayScore: 0, kickoffAt: sep(17) },
  });
  await prisma.fixture.create({
    data: { leagueId: league.id, gameweek: 3, homeClub: "Juventus", awayClub: "Atletico Madrid", homeScore: 1, awayScore: 2, kickoffAt: sep(17) },
  });

  const stat = (fixtureId: string, playerId: string, s: Partial<{ goals: number; assists: number; cleanSheet: boolean; yellow: number; red: number }>) =>
    prisma.playerMatchStat.create({ data: { fixtureId, playerId, goals: 0, assists: 0, cleanSheet: false, yellow: 0, red: 0, ...s } });

  await Promise.all([
    stat(rmaBay.id, "mbappe", { goals: 2 }),
    stat(rmaBay.id, "vinicius", { goals: 1 }),
    stat(rmaBay.id, "bellingham", { assists: 1 }),
    stat(rmaBay.id, "kane", { goals: 1 }),
    stat(rmaBay.id, "musiala", { assists: 1 }),

    stat(mciPsg.id, "haaland", { goals: 2 }),
    stat(mciPsg.id, "kvara", { goals: 1 }),
    stat(mciPsg.id, "hakimi", { assists: 1 }),

    stat(livBar.id, "taa", { cleanSheet: true, assists: 1 }),
    stat(livBar.id, "vandijk", { cleanSheet: true }),
    stat(livBar.id, "konate", { cleanSheet: true }),
    stat(livBar.id, "alisson", { cleanSheet: true }),
    stat(livBar.id, "salah", { goals: 1 }),
    stat(livBar.id, "yamal", { yellow: 1 }),

    stat(levGal.id, "frimpong", { cleanSheet: true, assists: 1 }),
    stat(levGal.id, "wirtz", { goals: 1 }),
    stat(levGal.id, "osimhen", { yellow: 1 }),

    stat(arsInt.id, "saliba", { cleanSheet: true }),
    stat(arsInt.id, "rice", { cleanSheet: true }),
  ]);

  console.log("Seed complete.");
  console.log(`League: ${league.name} (${league.id})`);
  console.log(`Players: ${PLAYERS.length}, free agents: ${PLAYERS.length - Object.values(BOT_DRAFTS).flat().length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
