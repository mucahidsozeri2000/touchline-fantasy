// Checks what an API-Football key can actually reach, before anyone wires it
// into the server. Zero dependencies and no database — just Node:
//
//   node scripts/check-football-key.mjs YOUR_KEY [SEASON]
//
// The question that matters is not "does the key work" but "does this plan
// cover the season we need". Free plans are commonly restricted to older
// seasons, and finding that out from a half-finished sync is miserable.
//
// Costs 4 requests out of the free plan's 100 per day.

const KEY = process.argv[2];
const SEASON = Number(process.argv[3] ?? 2026);
const CHAMPIONS_LEAGUE = 2;

if (!KEY) {
  console.error("usage: node scripts/check-football-key.mjs YOUR_KEY [SEASON]");
  process.exit(2);
}

async function get(path, params = {}) {
  const url = new URL("https://v3.football.api-sports.io" + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url, { headers: { "x-apisports-key": KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);

  const body = await res.json();
  const errors = body?.errors;
  const has = Array.isArray(errors) ? errors.length > 0 : errors && Object.keys(errors).length > 0;
  if (has) {
    const detail = Array.isArray(errors)
      ? errors.join("; ")
      : Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join("; ");
    throw new Error(`${path} refused: ${detail}`);
  }
  return body;
}

let ok = true;
const line = (s) => console.log(s);

try {
  const status = await get("/status");
  const r = status.response ?? {};
  line(`account       : ${r.account?.email ?? "unknown"}`);
  line(`plan          : ${r.subscription?.plan ?? "unknown"} (active: ${r.subscription?.active})`);
  line(`requests today: ${r.requests?.current} / ${r.requests?.limit_day}`);
} catch (err) {
  console.error(`\nCannot even read /status: ${err.message}`);
  console.error("The key is probably wrong, or this machine cannot reach api-sports.io.");
  process.exit(1);
}

line("");

try {
  const leagues = await get("/leagues", { id: CHAMPIONS_LEAGUE });
  const seasons = (leagues.response?.[0]?.seasons ?? []).map((s) => s.year);
  line(`Champions League seasons this key can see:`);
  line(`  ${seasons.length ? seasons.join(", ") : "(none)"}`);
  if (!seasons.includes(SEASON)) {
    ok = false;
    line(`\n  !! season ${SEASON} is NOT among them.`);
    line(`     Pick one that is (set FOOTBALL_SEASON), or upgrade the plan.`);
  }
} catch (err) {
  ok = false;
  line(`/leagues failed: ${err.message}`);
}

line("");

try {
  const teams = await get("/teams", { league: CHAMPIONS_LEAGUE, season: SEASON });
  const n = teams.response?.length ?? 0;
  line(`teams in season ${SEASON}: ${n}`);
  if (n === 0) ok = false;
  else line(`  e.g. ${teams.response.slice(0, 5).map((t) => t.team.name).join(", ")}`);
} catch (err) {
  ok = false;
  line(`/teams failed: ${err.message}`);
}

try {
  const fixtures = await get("/fixtures", { league: CHAMPIONS_LEAGUE, season: SEASON });
  const rows = fixtures.response ?? [];
  const finished = rows.filter((f) => ["FT", "AET", "PEN"].includes(f.fixture?.status?.short));
  line(`fixtures in season ${SEASON}: ${rows.length} (${finished.length} finished)`);
  if (rows.length) {
    const rounds = [...new Set(rows.map((f) => f.league?.round))];
    line(`  rounds: ${rounds.slice(0, 6).join(" | ")}${rounds.length > 6 ? " | …" : ""}`);
  }
} catch (err) {
  ok = false;
  line(`/fixtures failed: ${err.message}`);
}

line("");
line(ok ? "OK — this key can drive the sync for that season." : "NOT USABLE for that season, see above.");
process.exit(ok ? 0 : 1);
