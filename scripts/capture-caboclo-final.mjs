// Evidence for the "Why the Caboclo Cup" page: the 2018-19 final was decided by field-goal percentage at the
// 4th decimal, in the last NBA game of the fantasy season.
// Reads the Yahoo matchup capture (raw/2018/final-week24.txt) and fetches public box-score data:
//   ESPN scoreboard            every game on Sunday 2019-03-31 with tip times
//   Basketball-Reference       play-by-play of MEM @ LAC, and the length of the late games
//   Sleeper game logs          (already cached by capture-sleeper.mjs) to work out which days each player was active
// Writes data/leagues/caboclo/caboclo-final.json. Responses are cached in data/leagues/caboclo/.story-cache/ (gitignored).
// Usage: NODE_USE_ENV_PROXY=1 node scripts/capture-caboclo-final.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "data", "leagues", "caboclo");
const CACHE = join(ROOT, ".story-cache");
const SUNDAY = "2019-03-31";
const LAST_GAME = "201903310LAC"; // Basketball-Reference id of MEM @ LAC
const LATE_GAMES = ["201903310DEN", "201903310GSW", LAST_GAME];
/** Skip's players in the last game, as Basketball-Reference abbreviates them in play-by-play. */
const SKIP_IN_LAST_GAME = { "B. Caboclo": "Bruno Caboclo", "J. Holiday": "Justin Holiday" };

async function get(url, file) {
  const path = join(CACHE, file);
  if (existsSync(path)) return readFileSync(path, "utf8");
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (league-history capture)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const text = await res.text();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, text);
  await new Promise((r) => setTimeout(r, 3000)); // Basketball-Reference asks for a slow crawl
  return text;
}

const strip = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

// ---- Yahoo capture ----
const raw = readFileSync(join(ROOT, "raw", "2018", "final-week24.txt"), "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => l.split("|"));
const season = JSON.parse(readFileSync(join(ROOT, "2019.json"), "utf8"));
const teamName = (managerId) => season.teams.find((t) => t.managerId === managerId).name;
const [, weekFrom, weekTo] = raw.find((r) => r[0] === "dates");
const teams = raw
  .filter((r) => r[0] === "team")
  .map(([, managerId, fgm, fga, fgPct, tpm, pts, reb, ast, stl, blk, to, won]) => ({
    managerId,
    teamName: teamName(managerId),
    fgm: +fgm,
    fga: +fga,
    yahooFgPct: +fgPct,
    tpm: +tpm,
    pts: +pts,
    reb: +reb,
    ast: +ast,
    stl: +stl,
    blk: +blk,
    to: +to,
    categoriesWon: +won,
  }));
const winners = Object.fromEntries(raw.find((r) => r[0] === "winners").slice(1).map((w) => w.split(":")));
const weekLines = raw
  .filter((r) => r[0] === "week")
  .map(([, name, fgPct, ftPct, tpm, pts]) => ({ name, fgPct, ftPct, tpm: +tpm, pts: +pts }));

// ---- Which days were they active? The week line equals the sum of exactly one set of that week's games. ----
const sleeperGames = [];
for (const w of ["2018-w24.json", "2018-w25.json"]) {
  const p = join(ROOT, ".sleeper-cache", w);
  if (!existsSync(p)) throw new Error(`missing ${p}: run scripts/capture-sleeper.mjs 2018 first`);
  for (const r of JSON.parse(readFileSync(p, "utf8"))) {
    if (!r.date || r.date < weekFrom || r.date > weekTo || !r.stats) continue;
    const name = `${r.player?.first_name} ${r.player?.last_name}`;
    sleeperGames.push({ name, date: r.date, game: r.game_id, fgm: r.stats.fgm ?? 0, fga: r.stats.fga ?? 0, pts: r.stats.pts ?? 0, tpm: r.stats.tpm ?? 0 });
  }
}
const activeDays = weekLines.map((line) => {
  const games = sleeperGames.filter((g) => g.name === line.name).sort((a, b) => a.date.localeCompare(b.date));
  const matches = [];
  for (let mask = 1; mask < 1 << games.length; mask++) {
    const set = games.filter((_, i) => mask & (1 << i));
    const sum = (k) => set.reduce((a, g) => a + g[k], 0);
    const fg = sum("fga") ? (sum("fgm") / sum("fga")).toFixed(3).replace(/^0/, "") : "-";
    if (sum("pts") === line.pts && sum("tpm") === line.tpm && fg === line.fgPct) matches.push(set);
  }
  if (matches.length !== 1) throw new Error(`${line.name}: ${matches.length} game sets match the Yahoo week line`);
  return { name: line.name, yahoo: line, games: matches[0].map(({ date, game, fgm, fga, pts }) => ({ date, game, fgm, fga, pts })) };
});

// ---- Sunday's schedule (ESPN) ----
const espn = JSON.parse(await get(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${SUNDAY.replace(/-/g, "")}`, "espn-20190331.json"));
const sunday = espn.events
  .map((e) => ({ tip: e.date, game: e.shortName, espnId: e.id }))
  .sort((a, b) => a.tip.localeCompare(b.tip));

// ---- Length of the late games (Basketball-Reference box scores) ----
const lengths = {};
for (const id of LATE_GAMES) {
  const html = await get(`https://www.basketball-reference.com/boxscores/${id}.html`, `${id}.html`);
  const m = html.match(/Time of Game:\s*<\/strong>\s*(\d+):(\d+)/) ?? html.match(/Time of Game:[^0-9]*(\d+):(\d+)/);
  lengths[id] = m ? +m[1] * 60 + +m[2] : null;
}

// ---- Every Skip shot in the last game (Basketball-Reference play-by-play) ----
const pbpUrl = `https://www.basketball-reference.com/boxscores/pbp/${LAST_GAME}.html`;
const pbp = await get(pbpUrl, `pbp-${LAST_GAME}.html`);
const table = pbp.slice(pbp.indexOf('id="pbp"'), pbp.indexOf("</table>", pbp.indexOf('id="pbp"')));
const shots = [];
let period = 0;
for (const row of table.split(/<tr/).slice(1)) {
  const q = row.match(/^[^>]*id="q(\d)"/);
  if (q) {
    period = +q[1];
    continue;
  }
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => strip(c[1]));
  if (cells.length < 6) continue;
  const [clock, away, , score] = cells;
  const text = away; // Memphis is the away side (left column)
  const m = text.match(/^(\S+ \S+) (makes|misses) (2|3)-pt (.+)$/);
  if (!m || !SKIP_IN_LAST_GAME[m[1]]) continue;
  shots.push({ period, clock: clock.replace(/\.0$/, ""), player: SKIP_IN_LAST_GAME[m[1]], made: m[2] === "makes", points: +m[3], description: `${m[2]} ${m[3]}-pt ${m[4]}`, score });
}

// Sanity checks against the box score.
for (const { name, games } of activeDays) {
  const sun = games.find((g) => g.date === SUNDAY && g.game.includes("LAC"));
  if (!sun) continue;
  const mine = shots.filter((s) => s.player === name);
  if (mine.length !== sun.fga || mine.filter((s) => s.made).length !== sun.fgm) throw new Error(`${name}: play-by-play shots don't match the box score`);
}

const out = {
  week: { number: 24, from: weekFrom, to: weekTo },
  teams,
  winners,
  activeDays,
  sunday: sunday.map((g) => ({ ...g, lengthMin: g.game === "WSH @ DEN" ? lengths["201903310DEN"] : g.game === "CHA @ GS" ? lengths["201903310GSW"] : g.game === "MEM @ LAC" ? lengths[LAST_GAME] : null })),
  lastGame: { id: LAST_GAME, game: "MEM @ LAC", pbpUrl, shots },
  sources: [
    { label: "Yahoo Fantasy matchup page, 2018-19 week 24 (captured by Matt)", url: null },
    { label: "Basketball-Reference play-by-play, Grizzlies at Clippers, March 31, 2019", url: pbpUrl },
    { label: "Basketball-Reference box scores for the late Sunday games", url: "https://www.basketball-reference.com/boxscores/?month=3&day=31&year=2019" },
    { label: "ESPN scoreboard, Sunday March 31, 2019", url: "https://www.espn.com/nba/scoreboard/_/date/20190331" },
    { label: "Sleeper game logs (which days each player was active)", url: null },
  ],
};
writeFileSync(join(ROOT, "caboclo-final.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`caboclo-final.json: ${shots.length} Skip shots in the last game, ${sunday.length} Sunday games`);
