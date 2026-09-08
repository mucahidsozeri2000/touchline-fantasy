import { prisma } from "../lib/prisma";
import { closeAuctionWindow } from "./closeAuctionWindow";
import { ApiFootballProvider } from "../football/apiFootball";
import { syncFixtures, syncResults } from "../football/sync";

/**
 * The background clock. Without it nothing in the game happens on its own:
 * auction windows never close, squads are never auto-filled, and results never
 * arrive.
 *
 * Provider requests are the scarce resource — the API-Football free plan allows
 * 100 a day — so the two paid jobs are spaced out and the results job spends
 * nothing unless the database already knows about a finished, unscored fixture.
 * The window job never touches the provider at all.
 *
 * State lives in the database, not in this process, so a restart loses nothing
 * and a run that fails is simply retried on the next tick. It assumes a single
 * instance: two API processes would both tick, which wastes quota and is worth
 * avoiding by running the scheduler on one of them (ENABLE_SCHEDULER=0 on the
 * others).
 */

const MINUTE = 60_000;

function intervalFromEnv(name: string, fallbackMinutes: number): number {
  const raw = Number(process.env[name]);
  return (Number.isFinite(raw) && raw > 0 ? raw : fallbackMinutes) * MINUTE;
}

/** Runs `fn` on an interval, never letting one failure stop the schedule. */
function every(label: string, ms: number, fn: () => Promise<void>) {
  let running = false;
  const tick = async () => {
    if (running) return; // a slow run must not overlap the next tick
    running = true;
    try {
      await fn();
    } catch (err: any) {
      console.error(`[scheduler] ${label} failed:`, err?.message ?? err);
    } finally {
      running = false;
    }
  };
  void tick();
  const handle = setInterval(tick, ms);
  handle.unref?.();
  return handle;
}

async function closeDueAuctionWindows() {
  const due = await prisma.league.findMany({
    where: { auctionClosesAt: { lte: new Date() }, auctionClosedAt: null },
    select: { id: true, name: true },
  });
  for (const league of due) {
    await closeAuctionWindow(league.id);
    console.log(`[scheduler] closed the auction window for "${league.name}"`);
  }
}

export function startScheduler() {
  if (process.env.ENABLE_SCHEDULER === "0") {
    console.log("[scheduler] disabled by ENABLE_SCHEDULER=0");
    return;
  }

  // Database-only, so it can run often and costs nothing.
  every("close-auction-window", intervalFromEnv("SCHEDULE_WINDOW_MINUTES", 1), closeDueAuctionWindows);

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    console.log("[scheduler] FOOTBALL_API_KEY is not set — fixture and result sync are off");
    return;
  }

  const season = Number(process.env.FOOTBALL_SEASON ?? new Date().getFullYear());
  const provider = new ApiFootballProvider(apiKey);

  // One provider request per run: every 3 hours is 8 a day.
  every("sync-fixtures", intervalFromEnv("SCHEDULE_FIXTURES_MINUTES", 180), async () => {
    const s = await syncFixtures(provider, season);
    if (s.fixtures) console.log(`[scheduler] fixtures synced: ${s.fixtures}`);
  });

  // Free unless a finished fixture is waiting to be scored; then one request
  // per fixture, capped so a backlog cannot exhaust the daily quota at once.
  every("sync-results", intervalFromEnv("SCHEDULE_RESULTS_MINUTES", 20), async () => {
    const limit = Number(process.env.SYNC_RESULT_LIMIT ?? 10);
    const s = await syncResults(provider, { limit });
    if (s.fixturesScored) {
      console.log(`[scheduler] scored ${s.fixturesScored} fixtures, ${s.eventsWritten} events`);
    }
  });
}
