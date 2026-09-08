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

// ── Does the response actually carry the fields the adapter reads? ────────
//
// The adapter is written from documentation; this checks it against the real
// payload, so a field that was renamed or is simply absent shows up here
// rather than as silently-missing points three weeks into a season.

function probe(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function checkFields(label, sample, fields) {
  if (sample === undefined) {
    line(`  ${label}: no sample available, skipped`);
    return true;
  }
  let allOk = true;
  const missing = [];
  for (const [path, required] of fields) {
    const v = probe(sample, path);
    if (v === undefined) {
      missing.push(path);
      if (required) allOk = false;
    }
  }
  line(`  ${label}: ${missing.length === 0 ? "all fields present" : "missing " + missing.join(", ")}`);
  return allOk;
}

if (ok) {
  line("");
  line("Field check (what the importer reads):");
  try {
    const teams = await get("/teams", { league: CHAMPIONS_LEAGUE, season: SEASON });
    const team = teams.response?.[0];
    ok = checkFields("teams", team, [["team.id", true], ["team.name", true], ["team.code", false]]) && ok;

    if (team?.team?.id) {
      const squad = await get("/players/squads", { team: team.team.id });
      const player = squad.response?.[0]?.players?.[0];
      line(`  squad size for ${team.team.name}: ${squad.response?.[0]?.players?.length ?? 0}`);
      ok = checkFields("squad player", player, [["id", true], ["name", true], ["position", true]]) && ok;
      if (player?.position) line(`  position values look like: "${player.position}"`);
    }

    const fixtures = await get("/fixtures", { league: CHAMPIONS_LEAGUE, season: SEASON });
    const finished = (fixtures.response ?? []).filter((f) =>
      ["FT", "AET", "PEN"].includes(f.fixture?.status?.short)
    );
    ok = checkFields("fixture", fixtures.response?.[0], [
      ["fixture.id", true], ["fixture.date", true], ["fixture.status.short", true],
      ["league.round", true], ["teams.home.id", true], ["teams.away.id", true],
      ["goals.home", true], ["goals.away", true],
    ]) && ok;

    if (finished.length) {
      const stats = await get("/fixtures/players", { fixture: finished[0].fixture.id });
      const row = stats.response?.[0]?.players?.[0];
      ok = checkFields("player match stats", row, [
        ["player.id", true], ["statistics.0.games.minutes", true],
        ["statistics.0.goals.total", true], ["statistics.0.goals.assists", true],
        ["statistics.0.goals.conceded", true], ["statistics.0.cards.yellow", true],
        ["statistics.0.cards.red", true], ["statistics.0.penalty.saved", true],
        ["statistics.0.penalty.missed", true], ["statistics.0.goals.own", false],
      ]) && ok;
    } else {
      line("  player match stats: no finished fixture to sample");
    }
  } catch (err) {
    ok = false;
    line(`  field check failed: ${err.message}`);
  }
}

line("");
line(ok ? "OK — this key can drive the sync for that season." : "NOT USABLE as-is, see above.");
process.exit(ok ? 0 : 1);
