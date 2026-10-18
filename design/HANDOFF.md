# Caboclo Cup redesign: handoff for Claude Code

This is a **visual redesign**. The calculations stay exactly as they are in `src/lib/analytics` (including everything PR #7 added). Your job is to rebuild the presentation layer to match the prototype, wiring each component to the analytics function listed below. Do not change formulas.

- `design/prototype/` — the clickable prototype (plain HTML + d3, no build step). It is the visual and behavioral reference.
- `design/data.json` and `design/prototype/data.js` — every number the prototype shows, exported by `scripts/export-design-data.ts` **from the site's own analytics**, so the prototype and the site agree.
- Published copy of the prototype: https://claude.ai/artifact/Q2p3qWgtizk5N7Yo21AmkY (private to the owner until shared).

## How to view the prototype locally

```bash
npx tsx scripts/export-design-data.ts design/data.json      # refresh the numbers (also re-checks them against Yahoo)
(printf 'window.DATA = '; cat design/data.json; printf ';\n') > design/prototype/data.js
npx serve design/prototype    # or open design/prototype/index.html in a browser
```

The export prints `data problems: none` when derived category records and playoff seeds still match the Yahoo captures.

## Before you start: one decision for the owner

`main` has a light "courtside" reskin (green/cream, commit b193337) that predates this prototype. Ask the owner whether this prototype's look replaces it. Keep anything from it they want (for example the landing page or `SeasonExplorer`).

## Ground rules

1. **Visuals only.** Every number comes from an existing `src/lib/analytics` function. The few prototype-only view helpers are listed in section 3; move them into `src/lib/analytics` with tests rather than computing in components.
2. **Keep what works:** the password proxy (`src/proxy.ts`, `LEAGUE_PASSWORD`), the `/demo` league (now with full data), Yahoo attribution, `coreLeague()` trimming for client components, `generateStaticParams`, and all 157+ existing tests.
3. **Desktop-first.** The owner only needs desktop. Don't break phones, but no phone-specific design work.
4. **Read the Next.js docs in `node_modules/next/dist/docs/` first** (AGENTS.md: this Next version has breaking changes).
5. **Explainers:** every ⓘ in the prototype carries wording in `App.TIP` (`design/prototype/js/core.js`). Port it to `src/lib/explainers.ts`. Where the site's own page already has explainer copy for a metric (PR #7 added many), the site's copy wins; keep the prototype's placement.

## 1. Visual system

Light-first with dark-mode tokens. Copy the `:root` block (and both dark blocks) from `design/prototype/index.html` into `src/app/globals.css` and map them in `@theme inline`.

| Token | Light | Role |
|---|---|---|
| `--bg` | `#eceff3` | page floor (scorebook gray) |
| `--panel` / `--panel-2` | `#ffffff` / `#f5f7fa` | cards / hover + insets |
| `--ink` / `--ink-2` / `--muted` | `#142030` / `#46546a` / `#7a8698` | text levels |
| `--line` / `--line-2` | `#dde3eb` / `#c9d1dc` | borders, gridlines |
| `--band` | `#18293f` | navy header band, hero card, banners, monograms |
| `--accent` / `--accent-ink` / `--accent-wash` | `#e0601c` / `#b44710` / `#fde9dc` | ball orange: interaction, active tab, highlights |
| `--gold` / `--gold-wash` | `#c99a1a` / `#fbf1d3` | championships only |
| `--pos` / `--neg` (+ `-wash`) | blue `#2a78d6` / red `#e34948` | diverging: won/better vs lost/worse |
| `--s1..--s4` | blue, orange, green, amber | pinned series |

**Type:** display = **Big Shoulders Display** 800–900 uppercase (titles, section heads, big numbers); body = **Public Sans** 400–700. Load both with `next/font/google`. Tabular numbers wherever digits line up.

**Color rules:** blue/red only mean win/loss or better/worse; gold only means a title; orange is interaction/accent. Managers are identified by the navy monogram, not per-manager colors.

## 2. Shared components

| Component | Prototype source | Notes |
|---|---|---|
| `HeaderBand` with tabs | `index.html` `.band`, `core.js` router | Sticky navy band replaces the sidebar. "Awards" gets a NEW tag. |
| `InfoTip` | `App.info`, `#tip` | ⓘ shows the explainer on hover, focus and click. |
| `ChartTooltip` | `App.showTip` / `App.tt` | one floating tooltip, title + label/value rows + footer, kept in the viewport. |
| `StatTile`, `RecordCard`, `FormStrip` | `App.tile`, `.rec`, `.form-strip` | |
| `CountUp` | `App.count` | 0→value over 700ms on client navigation; off with `prefers-reduced-motion`. |
| `Monogram` / `ManagerLink` | `App.mono`, `App.who` | collision-aware initials (Jacob G. → JG; Michael → MC, Mitchell → MT). |
| `Segmented`, `Pill`, `Badge`, `ShowMore` | `App.seg`, `.pill`, `.badge`, `.capped` lists | long lists show 8–12 items with "Show all N". |
| `InlineBar` / diverging inline bar | `.inbar` | tables (leaderboard, draft, trades, habits). |
| `Storyline` button | `.story` (seasons.js) | icon + kind + team + one-line detail; pressed state highlights lines in the race chart. |

**Charts:** d3 v7 in client components (`"use client"`, `useRef` + `useEffect`, `ResizeObserver` redraw). Each chart in the prototype is a self-contained `draw*` function you can port nearly line for line. Every chart needs hover tooltips with exact values and an `aria-label`. Recharts can be removed once nothing uses it (`RaceChart` from PR #7 is replaced by the race chart below).

**Motion:** page fade-in, count-ups, bars growing on load, animated reordering in the all-time race and the replay, draw-on lines for pinned series, the champion-seed dots dropping into place, the draft gauge sweeping. Nothing waits on scroll; everything is readable at rest.

## 3. Prototype-only view helpers (move into `src/lib/analytics` with tests)

Everything else already exists in the site. These small helpers don't yet:

| Helper | What it returns | Used by |
|---|---|---|
| `weeklyProfile(league)` | per manager: average categories won per week, 9-0 sweeps for/against, distribution of categories won (0–9) | Overview bragging rights, Manager "typical week", Awards |
| `allTimeRaceFrames(league)` | cumulative category wins, matchup wins, titles, podiums and seasons at the end of each season | Overview all-time race |
| `oneCategoryGames(league)` | regular-season wins/losses by exactly one category | Manager "close calls" |
| `managerBadges(league, id)` | archetype badges and their rules (`managers.js` `badgesFor`) | Manager cards and profiles |
| `seasonAwards(league, year)` / `allTimeAwards(league)` | award winners (rules in the Awards table below) | Awards |

## 4. Page specs (site function → visual)

Routes stay as they are, plus **new `/awards` and `/awards/[year]`** and a **`/managers` index** (card grid).

### Overview `[overview.js]`
- Hero: navy reigning-champion card + tiles (most titles, longest win streak ← `longestStreaks(league, "W")[0]`, seasons, matchups).
- **Banners in the rafters** ← `championHistory`.
- **All-time race** (bar chart race, Play/slider, metric toggle) ← `allTimeRaceFrames`.
- **Power ratings** ← `eloRatings`: ranked list (rank, monogram, rating, this-season sparkline and change, bar), click to pin up to 4 lines on a rating-over-time chart (season bands, 1500 dashed baseline, peak ring, nearest-point tooltip). Replaces the "Power ratings" list and the Elo metric in "Performance over time".
- **Where everyone finished** bump chart ← `managerSeasons`.
- **Bragging rights** ← `longestStreaks` (W and L), `weeklyProfile`.

### Seasons `[seasons.js]`
- Season pills; tiles (champion, runner-up, regular-season #1, biggest blowout).
- **The standings race** ← `seasonRace(season)`, one panel with a toggle:
  - *Every week*: rank-by-week bump chart, playoff zone shaded, champion in gold, team labels at the end; **storyline buttons** (front-runner = most `weeksInFirst`; `comebacks`; `collapses`; final-week knockout = `lastWeekOut`/`lastWeekIn`). Clicking one highlights those lines.
  - *Replay*: the animated bars from .500 (category win % by week, `seasonStandings(season, { throughWeek })`).
- **Playoff bracket** ← playoff matchups + seeds.
- **What if weeks won decided it?** ← `seasonStandings(season, { method: "matchups" })` + `alternateStandings(season)`: slope chart real order → matchups order, lines crossing the playoff line in blue (gets in) / red (drops out), callout naming who swaps and whether a finalist would have missed.
- **Roster builds** ← `rosterProfiles(season)`: team × category heat map (diverging standard scores), outlined "PUNT" cells, finish column. Seasons without player stats show a note.
- **Every week, every team** grid, **Final standings** table.

### Managers `[managers.js]`
- `/managers`: trading cards (monogram, titles, category win %, average finish, finish sparkline, badges).
- Profile: badges, team-name chips, tiles (titles, category win %, average finish, longest win streak ← `managerStreaks`), then a **form strip**: power rating (current rank, peak, career sparkline ← `eloRatings`), matchup luck (career total + per-season diverging bars ← `careerLuck`, `matchupLuck`), longest losing streak, **Yahoo manager rating** with a level pill (Diamond/Platinum/Gold/Silver) ← `league.ratings`.
- Career path, typical week, head-to-head vs everyone, then panels: **Draft habits** (value vs league, reach ← `reachStats`, picks kept ← `keepRates`, favourite player ← `favouritePlayers`, best and worst pick), wire & trades, close calls; season table; quick switcher.

### Leaderboard `[leaderboard.js]`
Sortable table with season range and search, inline bars, finish sparklines, trophies. Keep the site's default sort unless the owner chooses otherwise (the prototype ties on category win %).

### Rivalries `[rivalries.js]`
Picker + swap, big score, tug-of-war bar, tiles, every-meeting lollipop timeline, rivalry index (lopsided / even / playoff rivals), everyone-vs-everyone heat grid ← `headToHead`, `h2hMatrix`.

### Records `[records.js]`
Grouped with section headers and a sticky "jump to" bar: Playoffs · Streaks & the race · Luck & what-ifs · Scorelines · Best & worst · Named after a player.
- Record cards (best season, longest win streak, playoff riser, one-category record).
- **Seeds & upsets** ← `seedHistory`: 4 tiles + champion-seed strip (each season's playoff field as a column, gold dot drops to the champion's seed; "#1 seed finished Nth" underneath).
- Playoff risers & fallers ← `playoffRecords`; title droughts ← `titleDroughts`; coin-flip weeks ← `marginRecords`.
- **Longest streaks** ← `longestStreaks` (W and L): bars placed on the season's week axis.
- **Front-runners** and **Comebacks & collapses** ← `raceRecords`.
- **Matchup luck** ← `matchupLuck` (scatter: expected vs actual wins, diagonal, lucky zone shaded) + `careerLuck` (diverging bars).
- **What if weeks won decided the standings?** ← `leagueAlternates`: one card per season that changes.
- **How matchups end** ← `scorelines` (histogram colored by margin) + most dominant seasons ← `marginAverages` (5+ wins); **Clean sweeps** ← `sweeps`.
- Best/worst regular seasons ← `teamSeasons`; steady or streaky ← `consistency`; **Parity by season** ← `parity` (worst→best range bar, orange tick at the last playoff seed, most even season in blue). Strength of schedule is gone, as on the site.
- **Did the namesake deliver?** ← `namesakes`: cards (team name, player's rank, team finish, a "drafted & kept / lost him / never had him" chip), 8 shown + "Show all".

### Draft `[draft.js]`
- **Report card** ← `managerDraftStats`: letter grade (placeholder cut-offs on the new value scale: A ≥ +0.30, B ≥ +0.10, C within ±0.10, D ≤ −0.10, F ≤ −0.30 vs league), diverging value bar, hit rate, rounds 1–3 slot → finish, late gems, best pick. Clicking a row highlights that manager in the scatter.
- **How much does draft day decide?** ← `draftImpact`: semicircle gauge sweeping to r² (19%).
- **Does reaching pay off?** ← `reachStats().groups`: three bars (beat-the-rankings rate), plus the `keepRates` correlation note.
- **Draft position** ← `draftPositions`: per-manager dot strip of first-round slots (gold = #1 pick), ring at the average, chips for #1 picks, #2 picks, top-3 finishers drafted.
- **Every pick, ever** scatter ← `leaguePicks` (values are value points now; one decimal).
- Steals / busts ← `topSteals`, `topBusts`; **Draft habits** table ← `reachStats().rows`, `keepRates`, `favouritePlayers`.
- **Favourite players** ← `favouritePlayers`: cards with one chip per year (blue beat the slot, red fell short).
- **The ones that got away** ← `gotAway`: list with traded/dropped badge.
- **First overall picks** ← `draftSlotHistory`: horizontal timeline cards.
- Does draft slot matter ← `finishByDraftSlot`; late-round gems ← `lateGems` (scroll or collapse after 15); draft boards ← `seasonPicks` (cell colors: ≥ +3 strong steal, ≥ 0 steal, > −3 miss, else bust).

### Trades `[trades.js]`
Tiles, **who trades with whom** network, wire-vs-finish bars + scatter ← `activityVsFinish`, activity table ← `managerActivity`, trade log by season ← `leagueTrades`, **Undrafted gems** ← `undraftedGems` (12 + show all) beside **Stars nobody owned** ← `unownedStars` (dot on a #1–#60 track, drafted-by note).

### Awards (new) `[awards.js]`
Season pills + "All-time". Card = icon, name + ⓘ, headline value, manager(s), one-line reason.

| Season award | Pick from |
|---|---|
| Champion | season outcome |
| Regular-season MVP | standings #1 |
| Cinderella / Playoff heartbreak | biggest gain / drop from seed to final finish |
| Horseshoe / Snake-bitten | highest / lowest `matchupLuck` that season |
| Broom award | most 9-0 weeks (`sweeps`) |
| Front-runner | most `weeksInFirst` (`seasonRace`) |
| Comeback of the year | first `seasonRace().comebacks` entry |
| Waiver warrior | most moves |
| Steal of the draft / Bust of the year | highest pick value / lowest in rounds 1–3 |
| Heist of the year | completed trade with the largest margin |
| Biggest beatdown | largest regular-season category margin |

All-time: Most decorated, Podium regular, Category machine, Mr. Steady, Power player (top current Elo), Heater / Ice cold (`longestStreaks`), Broom closet, Horseshoe / Snake-bitten (`careerLuck`), Draft guru, Trade shark, Wire hawk, Still waiting. Names are placeholders for the league to vote on.

## 5. Things to present carefully

- Power ratings predict next week only slightly better than a coin flip (`predictiveSkill` ≈ 0.02). Frame them as current form, not a forecast (the explainer says so).
- No 2019-20 season. Seasons are labelled by end year in data (`2026` = 2025-26).
- Only category counts per matchup are stored (6-3), not category stats, so there are no per-category head-to-heads yet.
- Draft and trade values use full-season ranks; injuries count against a pick and trade value includes weeks before the trade.
- Roster builds use season-end rosters and start in 2022-23.

## 6. Verification checklist

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass.
- [ ] `npx tsx scripts/export-design-data.ts` prints `data problems: none`.
- [ ] Every number on every page comes from an analytics function (no numeric literals in components besides fixed thresholds).
- [ ] Every ⓘ in the prototype exists on the real page.
- [ ] `/demo` and `/caboclo` both render; `/caboclo` is still password-protected.
- [ ] Light and dark mode readable; `prefers-reduced-motion` turns animation off.
- [ ] Desktop at 1280–1920px matches the prototype.
- [ ] Open a PR; Vercel builds a preview for the owner before merge.
