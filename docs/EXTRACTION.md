# Extracting a past season from Yahoo (manual, until API access)

Read-only, own league only, normal pace. Uses Claude in Chrome on the commissioner's signed-in browser.
Output: `data/leagues/caboclo/<END_YEAR>.json`, checked by `src/lib/data/caboclo.test.ts`.

Yahoo's "2025 Season" = the 2025-26 season → `year: 2026`, `label: "2025-26"`. Seasons available:
2018, 2020–2025 (Yahoo years). There is no 2019 season.

## Pages (replace `<Y>` with the Yahoo season year)

| What | URL / where |
|---|---|
| Settings: scoring type, categories, playoff format, tie-breaker | `https://basketball.fantasysports.yahoo.com/<Y>/nba/5250/settings` |
| Managers (team → manager) | `https://basketball.fantasysports.yahoo.com/<Y>/nba/5250/teams` |
| Standings (category W-L-T, final rank), playoff bracket, schedule | `https://basketball.fantasysports.yahoo.com/league/caboclo/<Y>` → tabs *Standings*, *Schedule*, *Playoffs* |

The league ID may differ in older seasons. If `/<Y>/nba/5250/...` 404s, open `league/caboclo/<Y>` and read
the ID from its links.

## Steps

1. **Settings.** Note scoring type (`Head-to-Head - Categories` → `"scoring": "categories"`), category list,
   number of teams, playoff teams/weeks, playoff tie-breaker.
2. **Managers.** Map each team name to a manager id. Ids are stable across seasons and listed in
   `data/leagues/caboclo/.identities.local.json` (gitignored; keyed by Yahoo email, which never goes in the repo).
   A new email → ask the user for a display name and add an id.
3. **Schedule tab.** Run the script below in the page. It clicks each team in the team selector, reads its
   schedule table, and pairs both sides of every matchup. Expect `problems: []`, `unpaired: []`, and
   `count = weeks × teams / 2`. Read `window.__matchups` in chunks of ~60 (tool output truncates).
4. **Playoffs tab.** Read every championship-bracket game: week, round, seeds, teams, category scores. Ties go
   to the higher seed (set `tiebreakWinnerTeamId`).
5. **Standings tab.** Copy each team's category W-L-T and final `Rank` into `verification.categoryRecords` and
   `finalRanks`; the 8 playoff seeds (from the bracket) into `verification.playoffSeeds`.
6. Build the JSON in the same shape as `2026.json`, then run `npm test`. Fix any mismatch at the source page,
   never by editing expected values.

```js
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getList = () => [...document.querySelectorAll('ul, ol, [role=list]')]
  .find(l => l.children.length >= 8 && [...l.children].every(li => li.innerText.trim().length > 0) && l.closest('section, div')?.innerText.includes('Opponent'));
const schedTable = () => [...document.querySelectorAll('table')].find(t => /^Wk\tOpponent/.test(t.rows[0]?.innerText.trim()));
const parse = () => [...schedTable().rows].slice(1).map(r => [...r.cells].map(c => c.innerText.trim())).filter(c => /^\d+/.test(c[0]));
const out = [];
for (let i = 0; i < getList().children.length; i++) {
  const li = getList().children[i]; const a = li.querySelector('a') || li;
  const before = schedTable().innerText; a.click();
  for (let k = 0; k < 20; k++) { await sleep(250); if (i === 0 || schedTable().innerText !== before) break; }
  await sleep(1200);
  out.push({ team: li.innerText.trim(), rows: parse() });
}
const names = out.map(o => o.team);
const idx = n => names.findIndex(x => x.toLowerCase() === n.toLowerCase());
const seen = new Map(); const problems = [];
out.forEach((o, i) => o.rows.forEach(r => {
  const w = parseInt(r[0]), j = idx(r[1]); const [a, b] = r[3].split('-').map(s => parseInt(s));
  if (j < 0) problems.push(`unknown opp ${r[1]}`);
  const key = `${w}:${Math.min(i, j)}:${Math.max(i, j)}`; const val = i < j ? [a, b] : [b, a];
  if (seen.has(key)) { const p = seen.get(key); if (p[0] !== val[0] || p[1] !== val[1]) problems.push(`mismatch ${key}`); p.push('ok'); }
  else seen.set(key, val);
}));
window.__matchups = [...seen.entries()].map(([k, v]) => k + '=' + v[0] + '-' + v[1]);
({ names, count: seen.size, problems, unpaired: [...seen.entries()].filter(([, v]) => v.length !== 3).map(([k]) => k) })
```

Navigating: the league page has a site-wide "Standings" link too. Click the tab inside the league's standings
module, not the header link.

## What we learned extracting 2018-19 through 2025-26

- **Raw files, then build.** Each season's captures live in `data/leagues/caboclo/raw/<yahooYear>/`
  (`teams`, `settings`, `regular`, `playoffs`, `standings`, `draft`, `ranks`, `moves-trades`).
  `node scripts/build-caboclo.mjs [yahooYear]` writes `<endYear>.json`. Never hand-edit the JSON.
- **Faster capture.** Everything except the Schedule tab can be `fetch`ed same-origin and parsed with
  `DOMParser`, one page about every second. Write the combined output into a `<pre>` and read it back with
  `get_page_text`: that avoids the ~2,000-character limit on script return values. Keep each script
  under ~40 s (split schedule / settings+standings+draft+trades / player ranks).
- **Player ranks:** `/<Y>/nba/<id>/players?status=ALL&pos=P&stat1=S_S_<Y>&sort=AR&sdir=1&count=<offset>`
  gives Current (actual) rank, Pre-Season rank, season stats and the fantasy owner at season end.
  2018, 2020 and 2021 show "-" for games played and stats; keep the ranks only.
- **League shape changed:** 10 teams with 6-team playoffs (seeds 1-2 bye) in 2018, 2020 and 2021;
  12 teams with 8-team playoffs from 2022. The bracket text shows `Bye` for byes; the 5th-place game
  is not stored (Yahoo's final ranks are).
- **Ties:** if two teams tie on category record and every derived tiebreaker, Yahoo's seed order
  (`sourceSeedOrder`) breaks it (2020-21: Sunday Strangler over The Twin Towers 2.0).
- **Record book quirk:** Yahoo counts a first-round bye as a matchup victory.
- **Identities:** match managers by Yahoo email (local, gitignored); team names change every year.
  2018-19 had two managers not seen since: "Brendon" (Daddy Dong) and "Brendan" (notoriousBMG), on
  different email accounts.
