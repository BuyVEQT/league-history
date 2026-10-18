// Fills gaps in the Yahoo captures with NBA stats from Sleeper's public API (no key needed).
// Writes, per season, next to the Yahoo captures in data/leagues/caboclo/raw/<yahooYear>/:
//   sleeper-stats.txt   season totals for every ranked or drafted player (Yahoo shows none for 2018-2020
//                       and none for free agents)
//   sleeper-trades.txt  each traded player's rank on only the games played after the trade
// Responses are cached in data/leagues/caboclo/.sleeper-cache/ (gitignored). Then run build-caboclo.mjs.
// Usage: node scripts/capture-sleeper.mjs [yahooYear ...]   (default: every raw season)
// Behind a proxy, run with NODE_USE_ENV_PROXY=1.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "data", "leagues", "caboclo");
const RAW = join(ROOT, "raw");
const CACHE = join(ROOT, ".sleeper-cache");
const CATS = ["fgm", "fga", "ftm", "fta", "tpm", "pts", "reb", "ast", "stl", "blk", "to"];

const lines = (y, f) =>
  existsSync(join(RAW, String(y), f))
    ? readFileSync(join(RAW, String(y), f), "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    : [];

/** Same name key as build-caboclo.mjs: ignores accents, punctuation and Jr./III suffixes. */
const nameKey = (name) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, "").replace(/[^a-z ]/g, "").split(" ").filter(Boolean).join(" ");

async function get(url, file) {
  const path = join(CACHE, file);
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const json = await res.json();
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(path, JSON.stringify(json));
  await new Promise((r) => setTimeout(r, 300)); // be polite
  return json;
}

/** Players only: Sleeper's feeds also carry whole-team rows (ids like TEAM_PHX). */
const isPlayer = (r) => /^\d+$/.test(String(r.player_id));
const sleeperName = (r) => nameKey(`${r.player?.first_name ?? ""} ${r.player?.last_name ?? ""}`);

/** Rank every player on 9-category z-scores of their totals, scored against the top `poolSize` (like Yahoo's ranks). */
function rankByValue(totals, poolSize) {
  const ids = [...totals.keys()];
  let pool = ids;
  let vals = new Map();
  for (let pass = 0; pass < 2; pass++) {
    const P = pool.map((id) => totals.get(id));
    const sum = (k) => P.reduce((a, t) => a + t[k], 0);
    const fg = sum("fgm") / sum("fga");
    const ft = sum("ftm") / sum("fta");
    const feats = (t) => [t.fgm - fg * t.fga, t.ftm - ft * t.fta, t.tpm, t.pts, t.reb, t.ast, t.stl, t.blk, -t.to];
    const F = P.map(feats);
    const mean = F[0].map((_, j) => F.reduce((a, f) => a + f[j], 0) / F.length);
    const sd = F[0].map((_, j) => Math.sqrt(F.reduce((a, f) => a + (f[j] - mean[j]) ** 2, 0) / F.length) || 1);
    vals = new Map(ids.map((id) => [id, feats(totals.get(id)).reduce((a, x, j) => a + (x - mean[j]) / sd[j], 0)]));
    pool = [...ids].sort((a, b) => vals.get(b) - vals.get(a)).slice(0, poolSize);
  }
  return new Map([...ids].sort((a, b) => vals.get(b) - vals.get(a)).map((id, i) => [id, i + 1]));
}

async function capture(yahooYear) {
  if (lines(yahooYear, "settings.txt").includes("status|upcoming")) return console.log(`${yahooYear}: not started, skipped`);
  // Yahoo players for the season: ranked (pid,rank,pre,gp,team,name,...) and drafted (round.pick.team.pid.name).
  const yahoo = new Map();
  for (const l of lines(yahooYear, "ranks.txt")) {
    const [pid, , , , , name] = l.split(",");
    yahoo.set(pid, name);
  }
  const drafted = lines(yahooYear, "draft.txt").join("|").split("|").filter(Boolean).map((t) => t.split("."));
  for (const [, , , pid, ...name] of drafted) yahoo.set(pid, name.join(".")); // the draft has full names
  const rounds = Math.max(...drafted.map(([r]) => Number(r)));
  const teams = lines(yahooYear, "teams.txt").length;

  // Season totals, and a name index of Sleeper players.
  const season = (await get(`https://api.sleeper.com/stats/nba/${yahooYear}?season_type=regular`, `${yahooYear}-season.json`)).filter(isPlayer);
  const byKey = new Map();
  // Two players can share a name (there are two Jaylin Williamses): keep the one who played more.
  for (const r of [...season].sort((a, b) => (a.stats?.gp ?? 0) - (b.stats?.gp ?? 0))) byKey.set(sleeperName(r), r.player_id);
  const resolve = (name) => {
    const m = name.match(/^([A-Z])\. (.+)$/); // the ranks page abbreviates long names
    if (m) return [...byKey.entries()].find(([k]) => k.startsWith(m[1].toLowerCase()) && k.endsWith(` ${nameKey(m[2])}`))?.[1];
    return byKey.get(nameKey(name));
  };

  const totals = new Map(season.map((r) => [r.player_id, r.stats]));
  const out = ["# yahooPlayerId|gp|fgm|fga|ftm|fta|3pm|pts|reb|ast|stl|blk|to   (Sleeper regular-season totals)"];
  const missing = [];
  for (const [pid, name] of yahoo) {
    const s = totals.get(resolve(name));
    if (!s?.gp) {
      missing.push(name);
      continue;
    }
    out.push([pid, s.gp, ...CATS.map((c) => s[c] ?? 0)].join("|"));
  }
  writeFileSync(join(RAW, String(yahooYear), "sleeper-stats.txt"), out.join("\n") + "\n");

  // Game logs, week by week, until the season runs out.
  const games = [];
  for (let week = 1, empty = 0; empty < 2 && week < 40; week++) {
    const rows = await get(`https://api.sleeper.com/stats/nba/${yahooYear}/${week}?season_type=regular`, `${yahooYear}-w${week}.json`);
    const played = rows.filter((r) => isPlayer(r) && r.date && r.stats && Object.keys(r.stats).length);
    empty = played.length ? 0 : empty + 1;
    games.push(...played);
  }
  const lastDate = games.reduce((a, r) => (r.date > a ? r.date : a), "");

  // Traded players: rank on the games after the trade, through the end of the NBA regular season.
  const trades = lines(yahooYear, "moves-trades.txt").filter((l) => /^\d{4}-\d{2}-\d{2}\|/.test(l));
  const tradeOut = [`# date|player|rank on games after the trade (to ${lastDate}, among all players)|games played`];
  const windows = new Map();
  for (const t of trades) {
    const [date, , body] = t.split("|");
    if (!windows.has(date)) {
      const after = new Map();
      for (const r of games) {
        if (r.date <= date) continue;
        const sum = after.get(r.player_id) ?? Object.fromEntries([...CATS, "gp"].map((c) => [c, 0]));
        for (const c of CATS) sum[c] += r.stats[c] ?? 0;
        sum.gp++;
        after.set(r.player_id, sum);
      }
      windows.set(date, { after, rank: after.size ? rankByValue(after, teams * rounds) : new Map() });
    }
    const { after, rank } = windows.get(date);
    for (const side of body.split(";;")) {
      for (const player of side.split(":")[1].split(",").map((s) => s.trim())) {
        const id = resolve(player);
        tradeOut.push([date, player, rank.get(id) ?? "-", after.get(id)?.gp ?? 0].join("|"));
      }
    }
  }
  writeFileSync(join(RAW, String(yahooYear), "sleeper-trades.txt"), tradeOut.join("\n") + "\n");
  console.log(`${yahooYear}: stats for ${out.length - 1}/${yahoo.size} players, ${games.length} game lines to ${lastDate}, ${tradeOut.length - 1} traded players`);
  if (missing.length) console.log(`  no Sleeper season line (didn't play, or name mismatch): ${missing.join(", ")}`);
}

const years = process.argv.slice(2).map(Number);
for (const y of years.length ? years : readdirSync(RAW).filter((d) => /^\d{4}$/.test(d)).map(Number)) await capture(y);
