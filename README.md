# Hoops History

Multi-season league history and analytics for Yahoo Fantasy Basketball (9-category head-to-head).
Product name is temporary — change it in `src/lib/config.ts`.

**Status:** two leagues are served.

- `/demo` — a deterministic, fictional demo league (public). It shows everything the site can do and is what Yahoo
  reviews for API access, so every feature must have data there. All demo data is invented and labelled as such.
- `/caboclo` — the real Caboclo Cup, 2018-19 to 2025-26, built from captured Yahoo pages (see
  [docs/EXTRACTION.md](docs/EXTRACTION.md)) and gated behind a shared password (`LEAGUE_PASSWORD`).

The Yahoo Fantasy API integration is **not** built yet; it waits on Yahoo's approval (see [docs/YAHOO.md](docs/YAHOO.md)).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000  (set LEAGUE_PASSWORD to open /caboclo locally)
npm test           # vitest: analytics, demo consistency, and Yahoo cross-checks for the real league
npm run typecheck  # generates Next's route types, then tsc
npm run lint
npm run build      # production build
```

Requires Node 20.19+ (developed on Node 22–24).

## Pages

| Route | What it shows |
|---|---|
| `/` | Landing page: live previews from the demo league, how the read-only Yahoo connection will work, and a disabled, clearly-labelled "Connect Yahoo" |
| `/[league]` | Reigning champion, banners in the rafters, where everyone finished, bragging rights, latest season |
| `/[league]/managers` | Every manager as a card: finish sparkline, titles, category win %, badges |
| `/[league]/awards` | Season and all-time superlatives (`/awards/[year]` for any season) |
| `/[league]/leaderboard` | Sortable/searchable all-time table with a season-range filter |
| `/[league]/seasons/[year]` | Standings, the week-by-week standings race (bump chart + storylines), "what if" standings, playoffs, roster builds |
| `/[league]/managers/[id]` | Career stats, power rating, streaks, matchup luck, manager rating, draft habits, season-by-season, rivals |
| `/[league]/rivalries` | Head-to-head between any two managers, plus the full head-to-head grid |
| `/[league]/records` | Playoff performers, seeds and upsets, droughts, clutch, streaks, standings-race records, what-if, luck, scorelines and sweeps, best/worst seasons, consistency, parity, namesakes |
| `/[league]/draft` | Draft report card, draft position, how much the draft decides, draft habits, steals/busts, late gems, favourites, the ones that got away, draft slots |
| `/[league]/draft/[year]` | One season's draft board, each pick coloured by value |
| `/[league]/injuries` | Injury luck: games played by each manager's draft picks, draft-by-draft heat grid, biggest losses, iron men, repeat risks, and whether health decided seasons |
| `/[league]/trades` | Trade log with winners, activity by manager, waiver activity vs finish, undrafted gems, stars nobody owned |

Draft and trade pages appear when a league has that data (both leagues do).

## How the data works

- `src/lib/types.ts` — the normalized model: `League → Season → Team + Matchup`, plus `Manager`, and optional
  extras per season (draft, player ranks with stats, trades, move counts) and per league (manager ratings).
  Only **matchups** are stored for results: standings, W-L-T, ranks, champions and every record are *derived* in
  `src/lib/analytics/`, so nothing can disagree with anything else.
- `src/lib/data/index.ts` — the providers, by URL slug. Pages call `getLeague(slug)` and never see raw Yahoo data.
  A Yahoo API provider will replace the page-capture one here.
- `src/lib/data/demo/` — the seeded demo league. `generate.ts` builds ~10 seasons of matchups (10 and 12-team
  leagues, a shortened season, a manager who leaves and returns, team renames, ties); `extras.ts` adds a pool of
  invented players who develop and age, snake drafts, end-of-season ranks and stat lines, trades, waiver churn,
  namesake teams and manager ratings. Extras use their own random streams, so they never change the matchups.
- `data/leagues/caboclo/` — the real league. Raw page captures live in `raw/<yahooYear>/`;
  `node scripts/build-caboclo.mjs` turns them into `<endYear>.json` and `league.json`. Never hand-edit the JSON.
  `node scripts/capture-sleeper.mjs` first adds NBA stats from Sleeper's public API (no key): season stat lines
  Yahoo doesn't show (2018-19 to 2020-21, free agents) and each traded player's rank on the games after the trade.
  Real league only.
  Every season is checked against Yahoo's own standings, seeds, podiums and record book by
  `src/lib/data/caboclo*.test.ts`.

## Statistical rules

- A matchup win/loss/tie is decided by categories won; a 6-3 result is one matchup win *and* 6 category wins.
- Win % = (W + ½T) / games. `null` (shown as "—") when no games, never 0.
- Standings rank by category win % in "categories" leagues (Yahoo Head-to-Head - Categories) and by matchup win %
  otherwise; ties fall back to category differential, category wins, the source's seed order, then team id.
  Playoffs decide the champion; official final ranks are used when the source has them.
- Rate-based "best" rankings on the overview need 3+ seasons. Head-to-head only counts games actually played.
- **Standings race:** the standings recomputed after every regular-season week. Comeback = made the playoffs after
  sitting outside a playoff place in the second half; collapse = missed them after sitting in the top half of the
  playoff places.
- **Streaks:** consecutive regular-season matchup wins or losses within a season; a tie ends a streak.
- **What if:** the same results ranked by the other method (matchup record vs category record).
- **Matchup luck:** actual matchup wins minus expected wins, where each category is a coin flip weighted by both
  teams' season category win % (log5) and a matchup is won by taking the majority. Well calibrated on the real
  league.
- **Power ratings:** Elo chained across seasons, scored on the share of categories won each week; K = 24, ratings
  move halfway back to 1500 between seasons (both tuned on the leagues' own results).
- **Player value:** `3 × ln(replacement / rank)`, 0 at or beyond replacement (teams × draft rounds) or unranked —
  roughly 9-category z-score points above a replacement-level player. Fitted on the real league: Yahoo's season
  ranks match a 9-category z-score ranking almost exactly, and value falls off like the log of rank.
  **Draft value** = value of the finish − value expected at the draft slot. **Trade value** = sum of the value of
  the players received, ranked on only the games played after the trade (Sleeper game logs, to the end of the
  regular season); full-season ranks when those aren't captured.
- **Roster builds:** standard scores per category of each team's season-end roster (players' full-season totals);
  a likely punt is 1.5 SD below the league *and* below the team's own average. Approximate by design.

## Deploy to Vercel

1. Import this GitHub repo in Vercel (framework: Next.js, defaults are fine).
2. Set `LEAGUE_PASSWORD` to open `/caboclo` (leave it unset and that league stays locked). The demo needs nothing.
3. Every push to `main` redeploys.

## Not built yet

Yahoo OAuth and API import, a database, e2e (Playwright) tests. Data the page captures don't have yet and would
unlock more: each team's weekly category totals (all-play records, true category identities and punts), the full
add/drop log (who actually picked up whom), week dates (to end post-trade windows at the fantasy final instead of
the NBA regular season) and consolation-bracket games.
