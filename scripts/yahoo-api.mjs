// Read-only access to the Yahoo Fantasy Sports API for the commissioner's own league (OAuth 2.0).
// The client ID and secret come from the environment (YAHOO_CLIENT_ID, YAHOO_CLIENT_SECRET; put them in
// .env.local, which is gitignored). Tokens are kept in .yahoo-tokens.local.json (gitignored). Raw API
// responses contain Yahoo account ids, so they are cached only in data/leagues/caboclo/.yahoo-cache/
// (gitignored) and never committed.
//
// Usage (behind a proxy, add NODE_USE_ENV_PROXY=1):
//   node --env-file=.env.local scripts/yahoo-api.mjs auth-url          print the sign-in link
//   node --env-file=.env.local scripts/yahoo-api.mjs exchange <code>   trade the code Yahoo shows for tokens
//   node --env-file=.env.local scripts/yahoo-api.mjs get <path>        GET fantasy/v2/<path> as JSON (refreshes the token)
//   node --env-file=.env.local scripts/yahoo-api.mjs leagues           every NBA league the signed-in user has been in
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TOKENS = join(ROOT, ".yahoo-tokens.local.json");
export const CACHE = join(ROOT, "data", "leagues", "caboclo", ".yahoo-cache");
const AUTH = "https://api.login.yahoo.com/oauth2";
const API = "https://fantasysports.yahooapis.com/fantasy/v2";
// "oob" = Yahoo shows the code on screen instead of redirecting to a site.
const REDIRECT = "oob";

function client() {
  const { YAHOO_CLIENT_ID: id, YAHOO_CLIENT_SECRET: secret } = process.env;
  if (!id || !secret) throw new Error("Set YAHOO_CLIENT_ID and YAHOO_CLIENT_SECRET (see .env.example)");
  return { id, basic: Buffer.from(`${id}:${secret}`).toString("base64") };
}

export const authUrl = () => `${AUTH}/request_auth?${new URLSearchParams({ client_id: client().id, redirect_uri: REDIRECT, response_type: "code" })}`;

async function token(params) {
  const res = await fetch(`${AUTH}/get_token`, {
    method: "POST",
    headers: { Authorization: `Basic ${client().basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ redirect_uri: REDIRECT, ...params }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Yahoo token endpoint: ${res.status} ${body.error ?? ""} ${body.error_description ?? ""}`.trim());
  const saved = { access_token: body.access_token, refresh_token: body.refresh_token ?? params.refresh_token, expires_at: Date.now() + (body.expires_in - 60) * 1000 };
  writeFileSync(TOKENS, JSON.stringify(saved, null, 2) + "\n", { mode: 0o600 });
  return saved;
}

export const exchange = (code) => token({ grant_type: "authorization_code", code });

async function accessToken() {
  if (!existsSync(TOKENS)) throw new Error("Not signed in: run auth-url, then exchange <code>");
  const t = JSON.parse(readFileSync(TOKENS, "utf8"));
  return (t.expires_at > Date.now() ? t : await token({ grant_type: "refresh_token", refresh_token: t.refresh_token })).access_token;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET a fantasy/v2 path as JSON. With `cacheFile`, the response is read from and written to the local cache. */
export async function yahoo(path, cacheFile) {
  const file = cacheFile && join(CACHE, cacheFile);
  if (file && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  const url = `${API}/${path}${path.includes("?") ? "&" : "?"}format=json`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    if (res.ok) {
      const json = await res.json();
      if (file) {
        mkdirSync(join(file, ".."), { recursive: true });
        writeFileSync(file, JSON.stringify(json));
      }
      await sleep(400); // stay well inside Yahoo's rate limits
      return json;
    }
    // 999 is Yahoo's rate-limit status; back off and retry a few times.
    if ((res.status === 999 || res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${res.status} ${path}: ${(await res.text()).slice(0, 300)}`);
  }
}

/**
 * Yahoo's JSON is XML turned inside out: lists are objects keyed "0", "1", … plus "count", and a resource
 * is an array of fragments. These two helpers flatten both.
 */
export const list = (obj) => (obj ? Object.keys(obj).filter((k) => /^\d+$/.test(k)).sort((a, b) => a - b).map((k) => obj[k]) : []);
export const merge = (fragments) => Object.assign({}, ...[fragments].flat(Infinity).filter((f) => f && typeof f === "object"));

/** Every NBA league the signed-in user has been a member of, oldest first. */
export async function leagues() {
  const json = await yahoo("users;use_login=1/games;game_codes=nba/leagues");
  const games = list(json.fantasy_content.users[0].user[1].games).map((g) => g.game);
  return games
    .filter((g) => Array.isArray(g) && g[1]?.leagues)
    .flatMap(([game, { leagues: ls }]) => list(ls).map((l) => ({ season: game.season, gameKey: game.game_key, ...merge(l.league) })))
    .map(({ season, gameKey, league_key, league_id, name, num_teams, renew, renewed, scoring_type }) => ({ season, gameKey, league_key, league_id, name, num_teams, scoring_type, renew, renewed }))
    .sort((a, b) => a.season - b.season);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "auth-url") console.log(authUrl());
  else if (cmd === "exchange" && arg) {
    await exchange(arg.trim());
    console.log("Signed in. Tokens saved to .yahoo-tokens.local.json (gitignored).");
  } else if (cmd === "get" && arg) console.log(JSON.stringify(await yahoo(arg), null, 2));
  else if (cmd === "leagues") console.table(await leagues());
  else {
    console.error("Usage: yahoo-api.mjs auth-url | exchange <code> | get <path> | leagues");
    process.exit(1);
  }
}
