# Round 3: make the data pages explorable

Five interaction features, designed and working in `design/prototype` (mainly the new `js/explore.js`, plus small hooks in each page). Like rounds 1–2, this is **presentation only**: every number comes from `src/lib/analytics`. Build after HANDOFF-2's global pieces (d3, shared tooltip, InfoTip), since these reuse them.

Try them in the prototype first: click any manager name, pick someone in the header's **Spotlight**, click a cell in a season's weekly grid, and press **Replay draft night** on a draft board.

## 1. Side panel (click anything → details without leaving the page)

**Prototype:** `explore.js` → `App.openPanel(kind, id)`, `managerPanel`, `seasonPanel`, `playerPanel`; styles `.drawer`, `.veil`, `.dr-*`.

- A right-hand drawer (440px, slides in over a dimmed page, Esc / ✕ / click outside closes, focus moves to ✕ and returns on close, closes on navigation).
- **Opens from:** every manager name (`ManagerLink` opens the panel; Cmd/Ctrl-click still goes to the profile), bars in the all-time race, points in "where everyone finished", nodes in the trade network, season links in record lists (`data-panel="season:YEAR"`), and every player name: steals, busts, gems, favourites, got away, first picks, trade log players, undrafted gems, draft-board cells, scatter dots (`data-panel="player:NAME"`).
- **Manager panel:** monogram + name + span, up to 4 badges, 4 mini tiles (titles, category win %, average finish, playoffs), finish-by-season mini chart (gold title dots), best and worst season, favourite victim and nemesis (head-to-head, 6+ meetings), latest season's last-5 form chips. Actions: Full profile, Spotlight, "vs nemesis" (opens Rivalries preloaded).
- **Season panel:** champion, final standings with inline category-% bars, week jump links, links to the season and its awards.
- **Player panel:** every time he was drafted (season, manager, round/pick, finish, value chip), trades he was part of, and record-book mentions (got away, nobody owned him, teams named after him).
- **Build:** a `<DrawerProvider>` in the league layout with `openPanel(kind, id)` in context, so any client component can open it. Keep the URL in sync with a bare hash or a search param (for example `?panel=player:Jalen%20Brunson`) so panels can be linked to.
- **Data:** `careerStats`/`managerSeasons`, `h2hMatrix`, badges (round-1 helper), `seasonOutcome`, `leaguePicks`, `leagueTrades`, `gotAway`, `unownedStars`, `namesakes`. Look players up by **player id** in the real build (the prototype uses names).

## 2. Spotlight a manager

**Prototype:** `explore.js` → `App.setSpot`, `App.mountExplore`; every chart mark and table row carries `data-m="<managerId>"`.

- A **Spotlight** select in the header band (target icon, "Nobody" by default), with an orange "Name ✕" chip to clear it. The panel's "Spotlight" button sets it too.
- While set, every element tagged with another manager's id fades (charts to 22% opacity, table rows to 45%), and the spotlit manager's table rows get an orange left edge and a light orange wash. It works on every page with no per-chart logic beyond the tag.
- **Tag** (`data-m`): table rows (leaderboard, standings, week standings, draft report card, draft habits, trade activity), chart groups or marks (all-time race rows, finish lines and points, power list, standings race lines, replay rows, weekly grid cells, risers and fallers, droughts, coin-flip weeks, streaks, front-runners, luck dots, career luck, steady/streaky, draft scatter, draft position, trade network, wire scatter), manager cards, draft-board cells, panel rows.
- **Build:** `SpotlightProvider` (context + `localStorage`, read safely) that sets `data-spot` on `<body>`; one CSS rule does the fading: `body[data-spot] [data-m]:not([data-m=<id>])`. Generate the rule from the selected id or use a `:has()`-free approach such as a style tag. Use `!important` on opacity because d3 writes inline styles.

## 3. Charts inside tables

**Prototype:** `explore.js` → `App.formChips`, `App.pctBar`, `App.seedArrow`; styles `.form`, `.fc`, `.sa`, `.cutline`.

| Helper | Looks like | Used in |
|---|---|---|
| `PctBar` | number + bar on a fixed .35–.70 scale, blue at .500+, red below | season standings, manager season table, week standings, season panel |
| `FormChips` | last 5 regular-season weeks as W/L/T squares (blue/red/gray); each links to its week page | season standings, manager season table, week standings, manager panel |
| `SeedArrow` | "1 ▼ 5" pill, green wash when they finished better than seeded, red when worse | season standings (playoff teams), manager season table |
| Cut line | orange bottom border under the last playoff seed | season standings, week standings |

Season standings columns become: Seed · Team · Manager · Category win % (bar) · Category W-L-T · Matchups · Last 5 weeks · Seed → final · Moves · Final.

## 4. Week page (`/[league]/seasons/[year]/week/[week]`)

**Prototype:** `explore.js` → `App.register("week", …)`; route `#week-YEAR-WEEK`; styles `.weekstrip`, `.scoreboard`, `.game2`.

- **Header:** "2024-25 · Regular season" eyebrow (season links back), big "WEEK 5", previous/next buttons, a week strip (numbers for regular weeks, gold "P" for playoff weeks, current one filled).
- **Tiles:** biggest blowout, closest matchup, upset of the week (biggest standings-place gap where the lower team won; in playoff weeks the biggest seed gap), categories tied.
- **Scoreboard:** one card per matchup with each side's place going in (or `#seed` in the playoffs), monogram, team, manager, and categories won. The 9-segment bar shows the winner's categories in blue from the left, ties gray, the loser's orange. Tags: round name (Final in gold), Sweep, Coin flip, Upset, Tie. Loser dimmed.
- **Standings after the week** (regular weeks only): place, movement arrow since last week, team, manager, category % bar, last 5 chips; orange cut line. Playoff weeks show a callout linking to the bracket.
- **Links in:** the week strip on each season page, every cell and week number in the "every week, every team" grid, week labels on the standings-race chart, every dot on the rivalry meeting timeline, form chips everywhere, the season panel.
- **Data:** the week's matchups from `Season.matchups`, ranks from `seasonRace(season).lines[].ranks`, running records from `seasonStandings(season, { throughWeek })` (the prototype sums these for display only). `generateStaticParams` for every season × week.

## 5. Draft replay

**Prototype:** `draft.js` → `drawBoard`; styles `.replay-bar`, `.ticker`, `.pk.*`, `th.clock`.

- Controls above each draft board: **Replay draft night** (becomes Pause / Resume, then **Reveal how it went**), a 1×/3× speed toggle, and **Skip to the end**.
- A navy **ticker**: "ROUND 2 · PICK 2 (#14) — Najim selects LaMelo Ball · Eddie is on the clock". The team on the clock gets an orange-underlined column header.
- Picks fill in snake order (dashed empty slots show their pick number; each pick pops in neutral, with no result yet).
- **Reveal:** cells flip in a quick wave to their result colors (big steal / beat the slot / below the slot / big bust), then the ticker shows the verdict: steal and bust of the draft with pick → finish and value.
- At rest (and for screen readers and reduced motion) the board shows the finished, colored state. Every cell opens the player panel.
- Columns are 92px so a 12-team board fits a desktop column without scrolling.
- **Data:** `seasonPicks(season)` ordered by `overall`, value tones as today, verdict from `topSteals`/`topBusts` for that season.

## Verification

- [ ] Panel opens from every listed trigger, traps focus, closes with Esc, and survives navigation; it can be linked to.
- [ ] Spotlight persists across pages and reloads, fades every tagged chart and table, and clears from the chip.
- [ ] Week pages exist for every season × week (regular and playoff), with prev/next and links in from the grid, race, timeline and form chips.
- [ ] Draft replay runs, pauses, speeds up, skips, reveals, and leaves the board in its normal colored state; with reduced motion it skips straight to the end.
- [ ] typecheck, lint, tests and build pass; PR opened for a Vercel preview.
