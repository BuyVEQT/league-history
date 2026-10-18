# Yahoo Fantasy Sports API: access application (draft)

Paste-ready answers for <https://sports.yahoo.com/developer/access/>. Yahoo closes incomplete or vague
applications without replying, so every field below is specific. Replace the `<…>` placeholders first.

## Product

**Name:** Hoops History (independent; not affiliated with Yahoo)

**Live site:** `<production URL>`, with a public, fully fictional demo league at `<production URL>/demo`

**What it is:** A free, non-commercial, read-only league-history site for Yahoo Fantasy Basketball
(head-to-head categories) leagues. A league member signs in with Yahoo (OAuth 2.0), picks one of their own
leagues, and gets that league's multi-season history: champions, all-time standings, head-to-head rivalries,
weekly records and streaks, draft grades, trade outcomes and season awards. The site is visible only to members of
that league. It never writes to Yahoo: no lineup changes, trades, adds or drops.

The demo league shows every feature with invented managers, teams and players, so reviewers can see exactly what
a connected league would look like.

## Data needed (read-only)

| Resource | Used for |
|---|---|
| User's games and leagues (`users;use_login=1/games/leagues`), league `renew`/`renewed` keys | finding the user's leagues and following one league back through its past seasons |
| League metadata and settings | scoring categories, number of teams, playoff format |
| Teams and managers | team names and which manager ran each team, season to season |
| Scoreboard by week (matchups with per-category results) | standings, head-to-head records, streaks, weekly records |
| Standings | checking the standings we compute |
| Draft results | draft grades and draft history |
| Transactions (trades, adds/drops) | trade log and trade outcomes |
| Players: season stats and ranks for drafted/traded/rostered players | grading draft picks and trades |

No write scopes. No access to leagues the signed-in user is not a member of.

## Users

**Expected users:** Small (< 1,000)

**Personal or single-league use?** Built and tested on the developer's own private league (one league, 12
managers). After that, opened to other Yahoo Fantasy Basketball leagues by invitation, free of charge.

## Data handling

- OAuth 2.0 authorization code flow; tokens stay on the server, encrypted, never sent to the browser.
- Data is fetched from Yahoo when a member views their league and cached for no longer than Yahoo's terms allow
  (personal data not marked as storable is removed within 24 hours).
- No ads, no analytics trackers, no selling or sharing of data. Yahoo GUIDs are never shared.
- "Fantasy data provided by Yahoo Fantasy" attribution, linking to Yahoo Fantasy, on every page that shows Yahoo data.
- Privacy policy: `<production URL>/privacy` · Terms: `<production URL>/terms` · Contact: `<email>`

## OAuth redirect URI

`<production URL>/api/auth/yahoo/callback`

## Client ID

`<existing YDN client ID, or leave blank>`
