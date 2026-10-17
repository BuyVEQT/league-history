# Hoops History

Multi-season league history and analytics for Yahoo Fantasy Basketball (9-category head-to-head).
Product name is temporary — change it in `src/lib/config.ts`.

**Status:** MVP running on a deterministic, fictional demo league. Yahoo integration is **not** built yet
(see [docs/YAHOO.md](docs/YAHOO.md)). No login, database, or environment variables are needed.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest: analytics + data-consistency tests
npm run typecheck
npm run lint
npm run build      # production build
```

Requires Node 20.19+ (developed on Node 24).

## Pages

| Route | What it shows |
|---|---|
| `/` | Landing page; "Connect Yahoo" is a disabled, clearly-labelled placeholder |
| `/demo` | Summary cards, champions, ranking previews, interactive trend chart, latest season |
| `/demo/leaderboard` | Sortable/searchable all-time table with a season-range filter |
| `/demo/seasons/[year]` | Standings, playoffs and champion for one season (`/demo/seasons` → latest) |
| `/demo/managers/[managerId]` | Career stats, season-by-season table + chart, best/worst rivals |
| `/demo/rivalries` | Pick any two managers; head-to-head built from their actual matchups |

## How the data works

- `src/lib/types.ts` — the normalized model: `League → Season → Team + Matchup`, plus `Manager`.
  Only **matchups** are stored. Standings, W-L-T, ranks, champions, playoff appearances are all *derived*
  in `src/lib/analytics/`, so nothing can disagree with anything else.
- `src/lib/data/demo/generate.ts` — seeded PRNG that builds ~10 seasons (10 and 12-team leagues, a shortened
  season, a manager who leaves and returns, team renames, tied matchups, playoff ties decided by seed). Same
  output on every run. **All demo data is fictional and labelled as such in the UI.**
- `src/lib/data/index.ts` — the single `provider`. Pages call `provider.getLeague()` and never see raw Yahoo
  data. A Yahoo provider will replace this one line.

### Statistical rules

- A matchup win/loss/tie is decided by categories won; a 6-3 result is one matchup win *and* 6 category wins,
  3 category losses.
- Win % = (W + ½T) / games. `null` (shown as "—") when no games, never 0.
- Regular-season record and rank use regular-season matchups only. Playoffs decide the champion and places 1–4.
  Teams outside the playoffs keep their regular-season rank as their final finish.
- Regular-season standings sort: win %, category differential, category wins, team id.
- Leaderboard default sort: titles, runner-ups, win %, name. Rate-based "best" ranks on the overview need
  3+ seasons.
- Head-to-head only counts matchups the two managers actually played. Seasons where they did not both play
  contribute nothing.

## Deploy to Vercel

1. Import this GitHub repo in Vercel (framework: Next.js, defaults are fine).
2. No environment variables are needed for the demo.
3. Deploy. Every push to `main` redeploys.

## Not built yet

Yahoo OAuth and API import, database, draft/player analytics, e2e (Playwright) tests, custom awards.
