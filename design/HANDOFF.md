# Caboclo Cup redesign: handoff for Claude Code

This folder holds a working design prototype of the redesigned league site and everything needed to rebuild it in the real Next.js app.

- `design/prototype/` — the clickable prototype (plain HTML + d3, no build step). It is the visual and behavioral reference.
- `design/data.json` and `design/prototype/data.js` — every number the prototype shows, exported by `scripts/export-design-data.ts`.
- `scripts/export-design-data.ts` — computes those numbers **with the site's own `src/lib/analytics`**, plus a few new metrics (marked `NEW METRICS`) that need to move into `src/lib/analytics` with tests.
- Published copy of the prototype: https://claude.ai/artifact/Q2p3qWgtizk5N7Yo21AmkY (private to the owner until shared).

## How to view the prototype locally

```bash
npx tsx scripts/export-design-data.ts design/data.json      # refresh the numbers (also re-checks them against Yahoo)
(printf 'window.DATA = '; cat design/data.json; printf ';\n') > design/prototype/data.js
npx serve design/prototype    # or open design/prototype/index.html directly in a browser
```

The export script prints `data problems: none` when every season's derived category records and playoff seeds still match the Yahoo captures (same checks as `src/lib/data/caboclo.test.ts`).

## Before you start: reconcile with main

`main` gained a separate light reskin after this prototype was designed (commit b193337, "Redesign Hoops History with animated courtside visuals": `globals.css`, league layout, leaderboard table, landing page, `SeasonExplorer`). It changes presentation only; analytics and data are untouched, so every number here still holds. Ask the owner which direction wins before replacing it. Keep anything from it the owner likes (for example the landing page or `SeasonExplorer`) and apply this spec's tokens and components to the league pages.

## Ground rules

1. **Data stays derived.** Do not hard-code any number in components. Everything comes from `src/lib/analytics` functions over `League`. New metrics go into `src/lib/analytics/*.ts` with vitest tests, like the existing ones.
2. **Keep what works:** the password proxy (`src/proxy.ts`, `LEAGUE_PASSWORD`), the `/demo` league, Yahoo attribution in the footer, `coreLeague()` trimming for client components, `generateStaticParams` everywhere, and all existing tests.
3. **Desktop-first.** The owner only needs desktop/PC. Don't spend effort on phone layouts beyond not breaking (a horizontal scroll on wide charts/tables is fine).
4. **Read the Next.js docs in `node_modules/next/dist/docs/` first** (see AGENTS.md: this Next version has breaking changes).
5. Every metric that someone might question gets an ⓘ explainer. The wording is centralized in `App.TIP` in `design/prototype/js/core.js`; port it into one `src/lib/explainers.ts` and reuse it everywhere.

## Suggested build order

1. Design tokens, fonts, shell (header band + tabs), shared components.
2. Port the new metrics into `src/lib/analytics` + tests.
3. Pages in this order: Overview → Seasons → Managers → Leaderboard → Rivalries → Records → Draft → Trades → Awards (new).
4. Verify (checklist at the bottom), then open a PR so Vercel builds a preview.

## 1. Visual system

Light-first, with a dark mode via tokens. Copy the `:root` block from `design/prototype/index.html` into `src/app/globals.css` (replacing the current dark-first tokens) and map them in `@theme inline` for Tailwind.

| Token | Light | Role |
|---|---|---|
| `--bg` | `#eceff3` | page floor (scorebook gray) |
| `--panel` / `--panel-2` | `#ffffff` / `#f5f7fa` | cards / hover + insets |
| `--ink` / `--ink-2` / `--muted` | `#142030` / `#46546a` / `#7a8698` | text levels |
| `--line` / `--line-2` | `#dde3eb` / `#c9d1dc` | borders, gridlines |
| `--band` | `#18293f` | navy header band, hero card, banners, monograms |
| `--accent` / `--accent-ink` | `#e0601c` / `#b44710` | ball orange: active tab, primary button, leader bar |
| `--gold` / `--gold-wash` | `#c99a1a` / `#fbf1d3` | titles/champions only |
| `--pos` / `--neg` (+ `-wash`) | blue `#2a78d6` / red `#e34948` | diverging: won/better vs lost/worse |
| `--s1..--s4` | blue, orange, green, amber | categorical series (pinned managers) |

Dark values are in the same file (both the `prefers-color-scheme` block and `[data-theme="dark"]`).

**Type:** display = **Big Shoulders Display** 800–900, uppercase, for page titles, section titles, big numbers, banner years. Body = **Public Sans** 400–700. Use `next/font/google` for both (replace Geist). Tabular numbers everywhere digits line up.

**Color rules:** blue/red only ever mean win/loss or better/worse. Gold only means a championship. Orange is the interaction/accent color. Manager identity is shown with the navy monogram, not 13 different colors. Pinned series use `--s1..--s3`.

## 2. Shared components (build once, use everywhere)

| Component | Prototype source | Notes |
|---|---|---|
| `HeaderBand` with tabs | `index.html` `.band`, `core.js` router | Sticky navy band: logo, league name, "2018-19 – 2025-26 · 7 seasons · 13 managers", tabs on the right. Replace the current sidebar. "Awards" gets a small NEW tag. |
| `InfoTip` | `App.info`, `#tip` | ⓘ button; shows explainer on hover, focus and click. Accessible: `aria-label` holds the text. |
| `ChartTooltip` | `App.showTip/App.tt` | One floating tooltip following the pointer; title + label/value rows + optional footer. Keep inside viewport. |
| `StatTile` | `App.tile` | label (+ ⓘ), big display number, detail line. |
| `RecordCard` | `.rec` in index.html | heavier "record book" tile with a 4px ink top rule. |
| `CountUp` | `App.count` | animate numbers 0→value over 700ms on client navigation; respect `prefers-reduced-motion`. |
| `Monogram` / `ManagerLink` | `App.mono`, `App.who` | Initials are collision-aware: two-part names use both initials (Jacob G. → JG); colliding single names use the first differing letter (Michael → MC, Mitchell → MT). Logic in `core.js`. |
| `Segmented`, `Pill`, `Badge` | `App.seg`, `.pill`, `.badge` | |
| `InlineBar` / diverging inline bar | `.inbar` | Used in tables (leaderboard, draft card, trades). |

**Charts:** use **d3 (v7) inside client components** (`"use client"`, `useRef` + `useEffect`, redraw on resize with a `ResizeObserver`). Recharts can't do the race, bump, beeswarm, network or week grid well; you can drop it once nothing uses it. Each chart in the prototype is a self-contained `draw*` function you can port nearly line for line. Every chart must have hover tooltips with exact values and an `aria-label`.

**Motion:** page fade-in (350ms), count-ups, bar growth on load, animated reordering in the race and replay, line draw-on for pinned bump lines. Nothing waits on scroll; everything is readable at rest.

## 3. New analytics to add (with tests)

All exist in prototype form in `scripts/export-design-data.ts` (`NEW METRICS`) or the page scripts. Put them in `src/lib/analytics/` and test each one against hand-checked values.

| Function | Rule | Where used | Test idea |
|---|---|---|---|
| `managerGames(league)` | Every weekly matchup from each side: year, week, stage, opponent, cats for/against/tied, result. Chronological. | base for the rest | count = 2 × matchups |
| `streaks(league)` | Longest consecutive matchup **wins** and **losses** per manager, playoffs included, carrying across seasons; a tie ends a streak. Returns n, from (year:week), to. | Overview, Awards, Manager | Dadder's longest win streak is 11 (2020-21 wk 15 → 2021-22 wk 6); Eddie's losing streak is 13 |
| `weeklyProfile(league)` | Per manager: average cats won per week, 9-0 sweeps for/against, distribution of cats won (0–9). | Overview, Manager ("typical week") | Najim has 2 sweeps (league high); Matt's average cats per week is 5.02 |
| `raceFrames(league)` | Cumulative category wins, matchup wins, titles, podiums (top-3 final) and seasons at the end of each season. | Overview "all-time race" | last frame: Matt 642 category wins |
| `oneCategoryGames(league)` | Regular-season wins/losses decided by exactly one category. | Manager, Awards | |
| `weeklyStandings(season)` | Cumulative category W-L-T per team after each regular week, ranked by category win %, then cat differential, then cat wins. **Final frame must equal `seasonStandings` order** (it handles Yahoo tiebreaks via `sourceSeedOrder`). | Seasons "replay" | last frame order == `seasonStandings(season)` |
| `meetings(league, a, b)` | Every game between two managers with stage, week and both scores. (Extend `headToHead` if you prefer.) | Rivalries timeline | Matt vs Najim: 16 meetings, 9-7 |
| `seasonAwards(league, year)` / `allTimeAwards(league)` | See "Awards" below for each rule. | Awards | each award picks the expected manager for 2025-26 |
| `managerBadges(league, id)` | Archetype badges (Dynasty, Draft guru, Wire hawk, Trade shark, Ice in veins, Playoff riser, Steady hand, Heater). Rules in `managers.js` `badgesFor`. Min 3 seasons for rate-based badges. | Manager cards and profiles | |
| `tradeNetwork(league)` | Completed trades counted per manager pair. | Trades | 40 completed trades total |

`schedules()` rows don't carry final finish; join it from `seasonOutcome` (the prototype does this in `records.js` `drawSos`).

## 4. Page specs

Routes stay the same (`/[league]`, `/leaderboard`, `/seasons/[year]`, `/managers/[id]`, `/rivalries`, `/records`, `/draft`, `/draft/[year]`, `/trades`) plus **new `/awards` and `/awards/[year]`**. Also add a **`/managers` index** (card grid; today it doesn't exist). Prototype file in brackets.

### Overview `[overview.js]`
- Hero: navy "reigning champion" card (team name huge, manager monogram, "title #N · beat X in the final", link to season) + 4 tiles (most titles, longest win streak, seasons, matchups played).
- **Banners in the rafters:** one pennant per champion, newest in orange; click → season.
- **All-time race:** animated bar chart race with Play/Pause, a season slider, metric toggle (category wins / titles / podiums), leader in orange, big season watermark. Tooltip shows all metrics through that season.
- **Where everyone finished:** bump chart of final finish by season, all managers in gray, two pinned in color (pills to pin up to 3), nearest-point hover highlights a line, gold dots for titles, gaps for missed seasons.
- **Bragging rights:** hottest streak, coldest streak, most 9-0 sweeps, best categories per week.

### Seasons `[seasons.js]`
- Season pills; 4 tiles (champion, runner-up, regular-season #1, biggest blowout).
- **Replay the season:** week slider + Play, diverging bars from .500 category win % per team, rows animate into the new order, orange "playoff line" after the last playoff seed.
- **Playoff bracket:** quarterfinals → semis → final + third place, seeds, scores, champion card. Seed tiebreaks noted.
- **Every week, every team:** heat grid (team × week), number = cats won, blue win / red loss / gray tie, darker = bigger margin, playoff weeks outlined in gold.
- **Final standings table:** seed, team, manager, category W-L-T, category win %, matchup W-L-T, moves, final (champion badge, "Nth · playoffs").

### Managers `[managers.js]`
- `/managers`: trading-card grid (monogram, name, titles, seasons, category win %, mini finish sparkline, badges).
- Profile: badges with explainers, team-name history chips (title years with a trophy), tiles (titles, category win %, average finish, best streak), **career path** (final finish dot + regular-season seed ring per season, connected), **typical week** histogram vs league average, **head-to-head vs everyone** diverging bars (click → rivalry), draft / wire & trades / close calls panels, season-by-season table, quick switcher.

### Leaderboard `[leaderboard.js]`
- Sortable table with season-range filter and search; inline bars for category win %, finish sparkline per manager, trophies in the titles column.
- **Decision for the owner:** the prototype ranks ties by **category win %** (the number Yahoo uses for this league's standings); the current site uses matchup win %. Both columns are shown. Pick one for the default sort and the overview "best win %" tile.

### Rivalries `[rivalries.js]`
- Manager A / B selects + Swap. Big score (wins each), "X leads", tug-of-war bar, tiles (regular season, playoffs, categories, current streak).
- **Every meeting** timeline: one lollipop per game, up = A won, down = B won, height = category margin, ringed gold = playoffs. Note the biggest beatdown.
- Rivalry index: most lopsided (min 10 meetings), dead even, playoff rivals; each row loads that pair.
- **Everyone vs everyone** heat grid (row's record vs column), diverging blue/red, click a square to load the pair.

### Records `[records.js]`
- Record cards: best and worst regular season (category win %), biggest playoff riser (3+ trips), best one-category record.
- **Playoff risers & fallers:** arrow from average seed to average finish per manager.
- **Title droughts:** season strip per manager (gold = title year, pink = seasons since last title, dashed = not in league).
- **Coin-flip weeks:** butterfly chart of wins/losses in one-category weeks, toggle to blowouts.
- Best/worst regular seasons ever (top 8 lists).
- **Steady or streaky:** scatter of typical finish vs swing (names in a right-side column with leader lines).
- **Strength of schedule:** beeswarm of every team-season's opponents' category win %, title winners in gold, extremes labelled.

### Draft `[draft.js]`
- **Report card** table with a letter grade (A ≥ +15, B ≥ +6, C within ±6, D ≤ −6, F ≤ −15 vs league; placeholder cut-offs), diverging value bar, hit rate, rounds 1–3 slot → finish, late gems, best pick. Clicking a row highlights that manager in the scatter.
- **Every pick, ever:** scatter of overall pick vs finish rank for all ~1,000 picks; diagonal "finished where drafted", steal zone shaded; filters by manager and season; players outside the top 300 shown at 300+.
- Biggest steals / busts (rounds 1–3), **Does draft slot matter?** bars (average finish by first-round slot, trophies per slot), late-round gems list.
- **Draft boards** (`/draft/[year]`): full board colored by value, with each column's final place.

### Trades `[trades.js]`
- Tiles: trades completed (+ vetoed), most trades, most moves in one season, most lopsided trade.
- **Who trades with whom:** circular network, edge width = number of trades, hover a manager to light up their partners, click → profile.
- **Does grinding the wire pay off?** bars (champions / top third / league avg / bottom third) + scatter of moves vs final finish for every team-season.
- Activity table with inline bars (moves, net trade value diverging).
- **Trade log** filtered by season (defaults to the latest), value bars per side; vetoed trades dimmed with no winner.
- Undrafted gems.

### Awards (new) `[awards.js]`
Season pills + "All-time". Each card: icon, award name + ⓘ, headline value, manager(s), one-line reason.

Season awards (all from that season only):

| Award | Rule |
|---|---|
| Champion | won the final |
| Regular-season MVP | #1 in regular-season standings (category win %) |
| Cinderella | biggest gain from playoff seed to final finish (only if > 0) |
| Playoff heartbreak | biggest drop from seed to final finish (only if < 0) |
| Unluckiest | most regular-season losses by one category (ties → fewer one-category wins) |
| Broom award | most 9-0 weeks (skip if none) |
| Toughest road | hardest strength of schedule |
| Waiver warrior | most adds/drops |
| Steal of the draft | highest pick value |
| Bust of the year | lowest pick value, rounds 1–3 |
| Heist of the year | completed trade with the largest value margin (winner gets it) |
| Biggest beatdown | largest category margin in a regular-season week |

All-time: Most decorated (titles, ties shown), Podium regular (top-3 finishes), Category machine (best career category win %, 3+ seasons), Mr. Steady (smallest swing), Heater / Ice cold (streaks), Broom closet (most sweeps), Snake-bitten (most one-category losses), Draft guru, Trade shark, Wire hawk (moves per season), Still waiting (longest active drought, never won). Names are placeholders for the league to vote on.

## 5. Known data limits (say so in the UI where relevant)

- No 2019-20 season exists. Seasons are labelled by end year in data (`2026` = 2025-26).
- Only category **counts** per matchup are stored (e.g. 6-3), not the category stats. So no per-category strengths, no all-play "luck" record, no "won FG% by 0.002". These need the weekly category totals (next data phase).
- Draft value and trade value use full-season player ranks, so injuries count against a pick and trade value includes weeks before the trade. Explainers already say this.
- "Moves" is Yahoo's season count of adds/drops.
- 10-team seasons (2018-19 to 2021-22) and 12-team seasons are mixed; typical finish uses percentiles to compare fairly.

## 6. Verification checklist (before opening the PR)

- [ ] `npm run typecheck`, `npm run lint`, `npm test` (all existing + new tests), `npm run build` all pass.
- [ ] `npx tsx scripts/export-design-data.ts` prints `data problems: none`.
- [ ] Spot-check against Yahoo: 2025-26 champion Baby-Faced Assassin (Najim) over Mad Maxey (Matt); Matt's 2025-26 category record 109-58-4; Matt vs Najim all-time 9-7.
- [ ] Every number on every page traces to an analytics function (grep components for numeric literals).
- [ ] Every ⓘ in the prototype exists on the real page with the same wording.
- [ ] Both `/demo` and `/caboclo` render (the demo league has no draft/trades data, so those tabs stay hidden there, as today).
- [ ] `/caboclo` is still password-protected.
- [ ] Light and dark mode both readable; `prefers-reduced-motion` turns animation off.
- [ ] Desktop at 1280–1920px wide looks like the prototype.
- [ ] Delete `scripts/export-design-data.ts` only if its metrics have all moved into `src/lib/analytics`; keep `design/` until the owner signs off.
