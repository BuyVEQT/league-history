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

function build(yahooYear) {
  const year = yahooYear + 1; // Yahoo's "2025 Season" is 2025-26
  const settings = Object.fromEntries(lines(yahooYear, "settings.txt").map((l) => l.split("|")));
  const categories = settings.categories.split(",");
  const teamRows = lines(yahooYear, "teams.txt").map((l) => l.split("|"));
  const id = (idx) => `${year}:${teamRows[Number(idx)][2]}`;
  const teams = teamRows.map(([, name, managerId]) => ({ id: `${year}:${managerId}`, managerId, name }));
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
            return { teamId: id(idxOfName(team)), receives: players.split(",").map((s) => s.trim()) };
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
}

const years = process.argv.slice(2).map(Number);
for (const y of years.length ? years : readdirSync(RAW).filter((d) => /^\d{4}$/.test(d)).map(Number)) build(y);
