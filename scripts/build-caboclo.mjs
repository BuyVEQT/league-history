// Builds data/leagues/caboclo/<endYear>.json from the raw page captures in
// data/leagues/caboclo/raw/<yahooYear>/. See docs/EXTRACTION.md.
// Usage: node scripts/build-caboclo.mjs [yahooYear ...]   (default: every raw season)
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "data", "leagues", "caboclo");
const RAW = join(ROOT, "raw");

const lines = (yahooYear, file) => {
  const p = join(RAW, String(yahooYear), file);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
};
const num = (s) => Number(String(s).replace(/,/g, ""));

/** Name key that ignores accents, punctuation and Jr./Sr./II-style suffixes ("Luka Dončić" = "luka doncic"). */
const nameKey = (name) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, "")
    .replace(/[^a-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .join(" ");

/**
 * Resolves player names to Yahoo player ids from a season's draft and player ranks. The ranks
 * page abbreviates long names ("N. Alexander-Walker"), so those also match on initial + surname.
 */
function playerResolver(entries) {
  const full = new Map();
  const abbrev = new Map();
  const add = (map, key, id) => map.set(key, map.has(key) && map.get(key) !== id ? null : id); // null = ambiguous
  for (const { playerId, name } of entries) {
    const m = name.match(/^([A-Z])\. (.+)$/);
    if (m) add(abbrev, nameKey(`${m[1]} ${m[2]}`), playerId);
    else add(full, nameKey(name), playerId);
  }
  return (name) => {
    const k = nameKey(name);
    if (full.get(k)) return full.get(k);
    const [first, ...rest] = k.split(" ");
    return abbrev.get(`${first?.[0]} ${rest.join(" ")}`) ?? null;
  };
}

const settingsOf = (yahooYear) => Object.fromEntries(lines(yahooYear, "settings.txt").map((l) => l.split("|")));
const isUpcoming = (yahooYear) => settingsOf(yahooYear).status === "upcoming";

/**
 * A season that hasn't started: teams and whatever of the draft is captured, written to upcoming.json.
 * It joins the history (as <endYear>.json) once it has matchups.
 */
function buildUpcoming(yahooYear) {
  const year = yahooYear + 1;
  const settings = settingsOf(yahooYear);
  const teamRows = lines(yahooYear, "teams.txt").map((l) => l.split("|"));
  const teams = teamRows.map(([, name, managerId, namesake]) => ({
    id: `${year}:${managerId}`,
    managerId,
    name,
    ...(namesake && { namesake: { name: namesake, playerId: null } }),
  }));
  const draft = (lines(yahooYear, "draft.txt") ?? []).join("|").split("|").filter(Boolean).map((tok) => {
    const [round, pick, teamIdx, playerId, ...name] = tok.split(".");
    return { round: num(round), pick: num(pick), overall: (num(round) - 1) * teams.length + num(pick), teamId: `${year}:${teamRows[Number(teamIdx)][2]}`, playerId, playerName: name.join(".") };
  });
  for (const t of teams) if (t.namesake) t.namesake.playerId = draft.find((d) => d.playerName === t.namesake.name)?.playerId ?? null;
  const season = { year, label: `${yahooYear}-${String(year).slice(2)}`, scoring: settings.scoring, categories: settings.categories.split(","), teams, matchups: [], draft };
  writeFileSync(join(ROOT, "upcoming.json"), JSON.stringify(season, null, 2) + "\n");
  console.log(`${yahooYear} -> upcoming.json: ${teams.length} teams, ${draft.length} picks (season not started)`);
}

function build(yahooYear) {
  if (isUpcoming(yahooYear)) return buildUpcoming(yahooYear);
  const year = yahooYear + 1; // Yahoo's "2025 Season" is 2025-26
  const settings = settingsOf(yahooYear);
  const categories = settings.categories.split(",");
  const teamRows = lines(yahooYear, "teams.txt").map((l) => l.split("|"));
  const id = (idx) => `${year}:${teamRows[Number(idx)][2]}`;
  const teams = teamRows.map(([, name, managerId]) => ({ id: `${year}:${managerId}`, managerId, name }));
  const namesakes = new Map(teamRows.filter((r) => r[3]).map(([, , managerId, player]) => [`${year}:${managerId}`, player]));
  const byName = new Map(teamRows.map(([idx, name]) => [name.toLowerCase(), Number(idx)]));
  const idxOfName = (name) => {
    const i = byName.get(name.trim().toLowerCase());
    if (i === undefined) throw new Error(`${yahooYear}: unknown team name "${name}"`);
    return i;
  };

  const matchups = lines(yahooYear, "regular.txt").map((tok) => {
    const [, w, a, b, x, y] = tok.match(/^(\d+):(\d+):(\d+)=(\d+)-(\d+)$/).map(Number);
    return { week: w, stage: "regular", homeTeamId: id(a), awayTeamId: id(b), homeCats: x, awayCats: y, tiedCats: categories.length - x - y };
  });
  for (const l of lines(yahooYear, "playoffs.txt")) {
    const [week, stage, a, b, x, y] = l.split("|");
    const m = { week: num(week), stage, homeTeamId: id(a), awayTeamId: id(b), homeCats: num(x), awayCats: num(y), tiedCats: categories.length - num(x) - num(y) };
    if (m.homeCats === m.awayCats) m.tiebreakWinnerTeamId = m.homeTeamId; // higher seed listed first
    matchups.push(m);
  }

  const standing = lines(yahooYear, "standings.txt");
  const seedsLine = standing.find((l) => l.startsWith("seeds|"));
  const rows = standing.filter((l) => !l.startsWith("seeds|")).map((l) => l.split("|"));
  const finalRanks = Object.fromEntries(rows.map(([t, , r]) => [id(t), num(r)]));
  const finalRankEntries = Object.entries(finalRanks).sort((a, b) => a[1] - b[1]);

  const season = {
    year,
    label: `${yahooYear}-${String(year).slice(2)}`,
    scoring: settings.scoring,
    categories,
    teams,
    matchups,
    finalRanks,
    sourceSeedOrder: seedsLine.split("|")[1].split(",").map(id),
  };

  const draft = lines(yahooYear, "draft.txt");
  if (draft) {
    const perRound = teams.length;
    season.draft = draft.join("|").split("|").filter(Boolean).map((tok) => {
      const [round, pick, teamIdx, playerId, ...name] = tok.split(".");
      return { round: num(round), pick: num(pick), overall: (num(round) - 1) * perRound + num(pick), teamId: id(teamIdx), playerId, playerName: name.join(".") };
    });
  }

  const ranks = lines(yahooYear, "ranks.txt");
  if (ranks) {
    season.players = ranks.map((l) => {
      const f = l.split(",");
      const [pid, cur, pre, gp, teamIdx, name] = f;
      const p = { playerId: pid, name, actualRank: num(cur), preseasonRank: pre && pre !== "-" ? num(pre) : null, gamesPlayed: gp === "-" ? null : num(gp), teamId: num(teamIdx) >= 0 ? id(teamIdx) : null };
      // Older seasons show "-" instead of stats; keep the ranks, skip the stats.
      if (f.length >= 17 && f[10] !== "-") {
        const [fg, , ft, , threes, pts, reb, ast, stl, blk, to] = f.slice(6);
        const [fgm, fga] = fg.split("/").map(num);
        const [ftm, fta] = ft.split("/").map(num);
        p.stats = { fgm, fga, ftm, fta, threes: num(threes), pts: num(pts), reb: num(reb), ast: num(ast), stl: num(stl), blk: num(blk), to: num(to) };
      }
      return p;
    });
  }

  // Sleeper fills stats Yahoo doesn't show (2018-2020 seasons, free agents); see capture-sleeper.mjs.
  const sleeperStats = new Map((lines(yahooYear, "sleeper-stats.txt") ?? []).map((l) => l.split("|")).map(([pid, ...v]) => [pid, v.map(num)]));
  for (const p of season.players ?? []) {
    const s = sleeperStats.get(p.playerId);
    if (p.stats || !s) continue;
    const [gp, fgm, fga, ftm, fta, threes, pts, reb, ast, stl, blk, to] = s;
    if (p.gamesPlayed === null) p.gamesPlayed = gp;
    p.stats = { fgm, fga, ftm, fta, threes, pts, reb, ast, stl, blk, to };
  }
  const afterTrade = new Map(
    (lines(yahooYear, "sleeper-trades.txt") ?? []).map((l) => l.split("|")).map(([date, name, rank, games]) => [`${date}|${name}`, { rank: rank === "-" ? null : num(rank), games: num(games) }]),
  );

  const resolve = playerResolver([...(season.draft ?? []).map((d) => ({ playerId: d.playerId, name: d.playerName })), ...(season.players ?? [])]);
  for (const team of teams) {
    const player = namesakes.get(team.id);
    if (player) team.namesake = { name: player, playerId: resolve(player) };
  }
  const unresolved = new Set();

  const mt = lines(yahooYear, "moves-trades.txt");
  if (mt) {
    season.activity = {};
    season.trades = [];
    for (const l of mt) {
      const parts = l.split("|");
      if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
        const [date, status, body] = parts;
        season.trades.push({
          date,
          status,
          sides: body.split(";;").map((side) => {
            const [team, players] = side.split(":");
            const receives = players.split(",").map((s) => {
              const name = s.trim();
              const playerId = resolve(name);
              if (!playerId) unresolved.add(name);
              const after = afterTrade.get(`${date}|${name}`);
              return { name, playerId, ...(after && { afterTrade: after }) };
            });
            return { teamId: id(idxOfName(team)), receives };
          }),
        });
      } else {
        const [team, moves, trades] = parts;
        season.activity[id(idxOfName(team))] = { moves: num(moves), trades: num(trades) };
      }
    }
  }

  const categoryRecords = Object.fromEntries(rows.map(([t, rec]) => [id(t), rec]));
  season.verification = {
    source: `https://basketball.fantasysports.yahoo.com/${yahooYear}/nba/${settings.leagueId ?? 5250}`,
    categoryRecords,
    playoffSeeds: seedsLine.split("|")[1].split(",").map(id),
    champion: finalRankEntries[0][0],
  };

  const out = join(ROOT, `${year}.json`);
  writeFileSync(out, JSON.stringify(season, null, 2) + "\n");
  console.log(`${yahooYear} -> ${year}.json: ${matchups.length} matchups, ${season.draft?.length ?? 0} picks, ${season.players?.length ?? 0} players, ${season.trades?.length ?? 0} trades`);
  // Traded players who were neither drafted nor ranked top 300 have no id; they count as unranked.
  if (unresolved.size) console.log(`  unranked trade players (no id): ${[...unresolved].join(", ")}`);
  const unnamed = teams.filter((t) => t.namesake && !t.namesake.playerId).map((t) => t.namesake.name);
  if (unnamed.length) console.log(`  namesakes outside the draft and top 300: ${unnamed.join(", ")}`);
}

/** League-wide captures: Yahoo's manager Ratings & Levels from raw/league/alltime.txt. */
function buildLeague() {
  const all = readFileSync(join(RAW, "league", "alltime.txt"), "utf8").split(/\r?\n/);
  const at = all.findIndex((l) => l.startsWith("# Ratings & Levels"));
  if (at < 0) return;
  const asOf = all[at].match(/captured (\d{4}-\d{2}-\d{2})/)[1];
  // Rows name each manager's team in the latest played season; that season's teams.txt maps it to a manager id.
  const latestYear = readdirSync(RAW).filter((d) => /^\d{4}$/.test(d) && !isUpcoming(Number(d))).sort().at(-1);
  const latest = lines(latestYear, "teams.txt").map((l) => l.split("|"));
  const managerOf = new Map(latest.map(([, name, managerId]) => [name.toLowerCase(), managerId]));
  const rows = all
    .slice(at + 1)
    .map((l) => l.trim())
    .filter((l) => /^\d+\|/.test(l))
    .map((l) => {
      const [rank, , team, rating, level] = l.split("|");
      const managerId = managerOf.get(team.toLowerCase());
      if (!managerId) throw new Error(`ratings: unknown team "${team}"`);
      return { managerId, rank: num(rank), rating: num(rating), level };
    });
  writeFileSync(join(ROOT, "league.json"), JSON.stringify({ ratings: { asOf, rows } }, null, 2) + "\n");
  console.log(`league.json: ${rows.length} manager ratings as of ${asOf}`);
}

const years = process.argv.slice(2).map(Number);
for (const y of years.length ? years : readdirSync(RAW).filter((d) => /^\d{4}$/.test(d)).map(Number)) build(y);
if (!years.length) buildLeague();
