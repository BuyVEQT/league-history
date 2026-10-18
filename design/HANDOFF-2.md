# Round 2: what the face-lift missed

Audit of `main` at 5b8c7f7 (after PRs #9 face-lift, #10 GOAT, #11 slot luck) against `design/prototype`.

**What #9 did well:** tokens, fonts, navy arena band with tabs, banners in the rafters, hero card, monograms, Managers card grid, Awards pages, bracket component, storyline text, series colors. Keep all of it.

**What it didn't do:** almost none of the prototype's custom charts and interactions were built. Trades, Records and Draft render **every** section as a table or list (zero charts on those pages). Only 3 ⓘ explainers exist site-wide (the prototype has one on nearly every metric). There are no count-up numbers or chart entrance animations, and `d3` is not installed.

This round is **visual only**: every number already comes from `src/lib/analytics`; wire each visual to the function named below and don't change formulas. Each prototype chart is a self-contained `draw*` function in `design/prototype/js/*.js` you can port almost line for line into a `"use client"` component (d3 v7, `useRef` + `useEffect`, redraw on `ResizeObserver`, respect `prefers-reduced-motion`).

To view the prototype: `open design/prototype/index.html` (data is already in `design/prototype/data.js`, exported from the current analytics).

## 0. Global (do first)

| # | Change | Detail |
|---|---|---|
| 0.1 | **Always light** | `src/app/globals.css` switches to dark automatically via `@media (prefers-color-scheme: dark)`. The owner wants light. Delete that media block (or change its selector to `:root[data-theme="dark"]` so dark only applies if a future toggle sets it). Keep `color-scheme: light` on `:root`. |
| 0.2 | **Add d3** | `npm i d3@7 @types/d3`. Build one `useD3Chart(draw)` hook: ref, `ResizeObserver` redraw, cleanup, reduced-motion flag passed to `draw`. |
| 0.3 | **Chart tooltip** | One shared floating tooltip (title + label/value rows + footer, kept in the viewport) used by every chart. Prototype: `App.showTip` / `App.tt` in `core.js`. |
| 0.4 | **Explainers everywhere** | Port `App.TIP` from `core.js` into `src/lib/explainers.ts` and put an `<InfoTip>` next to every metric the prototype explains: tiles, table headers, section titles. Where the site already has explainer copy for a metric, the site's wording wins. |
| 0.5 | **Count-ups** | `CountUp` for big numbers in tiles and record cards (0 → value, 700ms ease-out, client navigation only). Prototype: `App.count`. |
| 0.6 | **Show-more lists** | Long lists show 8–12 items with a "Show all N" button (`.capped` in the prototype). |

## 1. Trades & moves (owner's priority) — `trades.js`

| Prototype visual | Live now | Build | Data |
|---|---|---|---|
| **Who trades with whom**: circular network, edge width = trades between the pair, draw-on animation; hover a manager to light up partners, click → profile | missing | `drawNetwork` | `leagueTrades` (completed only, count per pair) |
| **Does grinding the wire pay off?**: horizontal bars (champions / top third / league avg / bottom third) | 4 stat cards | `drawWire` | `activityVsFinish` |
| **Every team-season** scatter: moves (x) vs final finish (y), champions in gold, hover for team/season | missing | `drawWireScatter` | `seasonOutcome` + `season.activity` |
| **Activity by manager**: inline bar for moves, diverging inline bar for net trade value | plain table | `.inbar` cells | `managerActivity` |
| **Trade log**: season filter (defaults to latest), each side's value as a bar that grows on load, winner's bar in blue, vetoed dimmed | cards, no bars or filter | log section in `trades.js` | `leagueTrades` (use the site's new after-trade value) |
| **Stars nobody owned**: one row per player, dot on a #1–#60 track, "drafted by X / undrafted" | table | `drawUnowned` | `unownedStars` |
| **Undrafted gems**: rank badge cards, 12 + show all | table | `#und` cards | `undraftedGems` |

## 2. Records — `records.js`

Group the page with section headers and a sticky "jump to" pill bar: Playoffs · Streaks & the race · Luck & what-ifs · Scorelines · Best & worst · Named after a player.

| Prototype visual | Live now | Build | Data |
|---|---|---|---|
| **Seeds & upsets** champion-seed strip: each season's playoff field as a column, gold dot drops (bounce) to the champion's seed; "#1 seed finished Nth" under each | tiles + table | `drawSeedStrip` | `seedHistory` |
| **Playoff risers & fallers**: arrow from average seed to average finish, blue/red | table | `drawSeed` | `playoffRecords` |
| **Title droughts**: season strip per manager, gold = title year, pink = seasons since, dashed = not in league | table | `drawDrought` | `titleDroughts` + `managerSeasons` |
| **Coin-flip weeks**: butterfly bars (losses left, wins right), toggle to blowouts | table | `drawClutch` | `marginRecords` |
| **Longest streaks**: bars placed on the season's week axis (W blue, L red), length in the bar | tables | `drawStreaks` | `longestStreaks` |
| **Front-runners**: share of season in first place, gold if they won it | list | `drawFront` | `raceRecords().frontRunners` |
| **Matchup luck**: scatter expected (x) vs actual (y) weeks won, diagonal, lucky zone shaded, extremes labelled; plus **career luck** diverging bars | tables | `drawLuck`, `drawCareerLuck` | `matchupLuck`, `careerLuck` |
| **What-if** cards per season that changes (out ▼ / in ▲ / new 1st, finalist warning chip), click → season | table/list | `#alts` cards | `leagueAlternates` |
| **How matchups end**: histogram of scorelines colored by margin (one-category orange, 2–6 blue, blowout navy, sweep gold) | table | `drawScores` | `scorelines` |
| **Steady or streaky**: scatter typical finish vs swing, names in a right column with leader lines | table | `drawCons` | `consistency` |
| **Parity by season**: worst→best range bar per season, orange tick at the last playoff seed, most even season in blue | table | `drawParity` | `parity` |
| **Named after a player**: cards (team name, player rank, team finish, "drafted & kept / lost him / never had him" chip) | table | `#names` cards | `namesakes` |

## 3. Draft — `draft.js`

| Prototype visual | Live now | Build | Data |
|---|---|---|---|
| **Report card**: letter-grade chip, diverging value bar; click a row to highlight that manager in the scatter | table | grades table | `managerDraftStats` (+ the new slot-luck column) |
| **Every pick, ever**: scatter of overall pick vs finish rank for ~1,000 picks, diagonal, steal zone shaded, manager + season filters | missing | `drawScatter` | `leaguePicks` |
| **How much does draft day decide?**: semicircle gauge sweeping to r² with the number counting up | stat card | `drawGauge` | `draftImpact` |
| **Does reaching pay off?**: three bars of beat-the-rankings rate | stat cards | `drawReach` | `reachStats().groups` |
| **Draft position**: per-manager dot strip of first-round slots (gold = #1), ring at the average, chips for #1 / #2 / top-3 finishers | table | `drawPositions` | `draftPositions` (add the 2026-27 slot as an outlined "next" dot, and slot luck as a column) |
| **Draft habits**: diverging "spots early" bar (orange = reaches, blue = waits) and kept-picks bar | table | habits table | `reachStats().rows`, `keepRates` |
| **Favourite players**: cards with one chip per year (blue beat the slot, red fell short), 8 + show all | table | `#favs` | `favouritePlayers` |
| **The ones that got away**: list with traded/dropped badge, 10 + show all | table | `#away` | `gotAway` |
| **First overall picks**: horizontal timeline cards | table | `#firsts` | `draftSlotHistory` |
| **Does draft slot matter?**: bars of average finish by slot with trophies | list | `drawSlots` | `finishByDraftSlot` |

## 4. Seasons — `seasons.js`

| Prototype visual | Live now | Build |
|---|---|---|
| **Standings race** toggle: *Every week* (current line chart is fine) / *Replay* (animated bars from .500 with Play + week slider, rows re-sorting) | line chart only | `drawReplay` (`seasonStandings(season, { throughWeek })`) |
| **Storyline buttons** that highlight the matching lines in the race chart | static text | `.story` buttons + `drawRace` focus logic |
| **What if weeks won decided it?** slope chart (real order → matchups order, crossing lines blue/red) + callout | missing on season page | `drawWhatIf` (`seasonStandings(season, { method: "matchups" })`, `alternateStandings`) |
| **Roster builds** as a heat map (diverging cells, outlined PUNT cells) | table | `drawRoster` (`rosterProfiles`) |
| **Every week, every team** grid (cats won, blue/red by margin, gold outline for playoffs) | missing | `drawGrid` |

## 5. Managers & Rivalries — `managers.js`, `rivalries.js`

| Prototype visual | Live now | Build |
|---|---|---|
| **Form strip** with mini charts: power-rating career sparkline (peak in gold), luck per season diverging bars, Yahoo level pill | text tiles | `drawEloMini`, `drawLuckMini`, `.form-strip` |
| **Career path**: final finish dot + regular-season seed ring per season | line chart | `drawPath` |
| **Typical week**: histogram of categories won vs league-average line | missing | `drawDist` (prototype-only helper `weeklyProfile`; add to analytics with a test) |
| **Head-to-head vs everyone**: diverging bars from 50%, click → rivalry | list | `drawRivals` (`opponentRecords`) |
| Rivalries: animated **tug-of-war** bar, **every-meeting timeline** (lollipops, height = margin, gold ring = playoffs), **rivalry index** (most lopsided / dead even / playoff rivals) | static bar, no timeline, no index | `renderPair`, `drawTimeline`, `#ix-*` |
| Rivalries grid: SVG heat grid with staggered fade-in and diverging blue/red fills | HTML table | `drawMatrix` (`h2hMatrix`) |

## 6. Overview & Leaderboard — `overview.js`, `leaderboard.js`

| Prototype visual | Live now | Build |
|---|---|---|
| **All-time race**: bar chart race with Play/Pause, season slider, metric toggle (category wins / titles / podiums), leader in orange, big season watermark | missing | `drawRace` (prototype-only helper `allTimeRaceFrames`; add to analytics with a test) |
| **Where everyone finished**: pin up to 3 (pills), nearest-point hover highlight, draw-on animation, gold title dots | recharts line chart | `drawBump` |
| Leaderboard: inline bar for category win %, finish sparkline per manager, trophies in the titles column | plain table | `leaderboard.js` (reuse `Sparkline`) |
| Power ratings | dropped in #9 (barely beats a coin flip) | Leave out unless the owner wants it back. The panel design is in `drawPower` if so. |

## 7. Built after the prototype: give these the same treatment

- **GOAT banner** (#10): show the score as a big count-up number and a stacked bar of the six weighted parts (titles 30%, average finish 20%, category win % 20%, finals, playoff rate, playoff game win % 10% each) for the top 3, with an ⓘ for the weights.
- **Slot luck** (#11): add as a diverging bar column in the draft report card and the draft-position strip.
- **2026-27 draft order** (#11): outlined "next season" dot on the draft-position strip; on the upcoming board, a "Draft night is coming" header with the round-one order as monogram chips.
- **After-trade value** (#8): the trade log bars should use these values. Add an ⓘ explaining "games after the trade".

## Verification

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass.
- [ ] Every chart above renders on `/demo` and `/caboclo`, has a hover tooltip with exact values and an `aria-label`, and finishes animating at rest (nothing waits on scroll).
- [ ] The site stays light with the computer in dark mode.
- [ ] No numbers are computed in components; each visual reads an analytics function.
- [ ] Desktop 1280–1920px matches the prototype; `prefers-reduced-motion` turns animation off.
- [ ] Open a PR so Vercel builds a preview before merging.
