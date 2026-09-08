// Pulls real Champions League data into the database.
//
//   npm run sync doctor     what this API key can actually reach (2 requests)
//   npm run sync catalog    clubs + squads       (1 + one request per club)
//   npm run sync fixtures   fixtures and scores  (1 request)
//   npm run sync results    score finished games (1 request per fixture)
//   npm run sync all        catalog, fixtures, results
//
// Request cost matters: the API-Football free plan allows 100 requests a day.
import "dotenv/config";
import { ApiFootballProvider } from "../football/apiFootball";
import { FootballProvider } from "../football/provider";
import { syncCatalog, syncFixtures, syncResults, SyncSummary } from "../football/sync";
import { prisma } from "../lib/prisma";

function buildProvider(): FootballProvider & { requestsUsed?: number } {
  const name = process.env.FOOTBALL_PROVIDER ?? "api-football";
  switch (name) {
    case "api-football":
      return new ApiFootballProvider(process.env.FOOTBALL_API_KEY ?? "");
    default:
      throw new Error(`Unknown FOOTBALL_PROVIDER "${name}". Supported: api-football`);
  }
}

function report(label: string, s: SyncSummary) {
  const parts: string[] = [];
  if (s.clubs) parts.push(`${s.clubs} clubs`);
  if (s.players) parts.push(`${s.players} players`);
  if (s.fixtures) parts.push(`${s.fixtures} fixtures`);
  if (s.fixturesScored) parts.push(`${s.fixturesScored} fixtures scored`);
  if (s.eventsWritten) parts.push(`${s.eventsWritten} scoring events`);
  console.log(`${label}: ${parts.length ? parts.join(", ") : "nothing to do"}`);
  for (const n of s.notes) console.log(`  - ${n}`);
}

async function main() {
  const command = process.argv[2] ?? "doctor";
  const season = Number(process.env.FOOTBALL_SEASON ?? new Date().getFullYear());
  const provider = buildProvider();

  if (command === "doctor") {
    const r = await provider.checkAccess(season);
    console.log(`provider: ${r.provider}`);
    console.log(`season asked for: ${season}`);
    for (const n of r.notes) console.log(`  ${n}`);
    console.log(r.ok ? "\nOK — this key can sync that season." : "\nNOT USABLE for that season, see above.");
    process.exitCode = r.ok ? 0 : 1;
    return;
  }

  if (command === "catalog" || command === "all") report("catalog", await syncCatalog(provider, season));
  if (command === "fixtures" || command === "all") report("fixtures", await syncFixtures(provider, season));
  if (command === "results" || command === "all") {
    const limit = Number(process.env.SYNC_RESULT_LIMIT ?? 20);
    report("results", await syncResults(provider, { limit }));
  }

  if (!["catalog", "fixtures", "results", "all"].includes(command)) {
    console.error(`Unknown command "${command}". Try: doctor | catalog | fixtures | results | all`);
    process.exitCode = 1;
    return;
  }

  const used = (provider as any).requestsUsed;
  if (typeof used === "number") console.log(`\nprovider requests used this run: ${used}`);
}

main()
  .catch((err) => {
    console.error(`\nSync failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
