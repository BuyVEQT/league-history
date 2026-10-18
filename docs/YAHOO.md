# Yahoo Fantasy API — integration checklist

**Status: not started.** The site runs on the generated demo league (public, what Yahoo reviews) and on page
captures of one real league (password-gated, see [EXTRACTION.md](EXTRACTION.md)). Nothing here is wired up.

## 1. Get access (do this first, it is the long pole)

Yahoo no longer provisions the Fantasy Sports API self-serve. Submit a request at
<https://sports.yahoo.com/developer/access/>. Incomplete requests are closed without reply, so prepare:

- [ ] A live site on a real domain (the demo deployed to Vercel); put the URL in the application
- [x] Landing page that shows the product with the demo league and states exactly what Yahoo data is read
- [x] Privacy policy and terms pages (`/privacy`, `/terms`), matched to Yahoo's API terms (third-party
      disclosure, 24-hour removal of personal data not marked storable, no GUID sharing, under-13s)
- [ ] Set `CONTACT_EMAIL` in `src/lib/config.ts` (the policy shows a placeholder until then)
- [x] Attribution footer ("Fantasy data provided by Yahoo Fantasy" + link), shown when `league.source === "yahoo"`
- [x] A clear description: see [YAHOO-APPLICATION.md](YAHOO-APPLICATION.md) (paste-ready answers)
- [ ] The OAuth redirect URI you will register (e.g. `https://<domain>/api/auth/yahoo/callback`)
- [ ] Data-retention design: fetch on view, cache ≤ 24 hours (see the API terms, §2.1)

Terms to re-read before building: Yahoo Developer Network API Terms of Use
(<https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apiforydn/index.html>): no income from the APIs without
permission (§1.7.4), no competing products (§1.7.6), consent and OAuth (§1.8), privacy policy (§2.4), retention (§2.1),
no GUID sharing (§2.3).

## 2. What to build once approved

1. `src/lib/data/yahoo/` — a `LeagueProvider` implementation (see `src/lib/types.ts`) that returns the same
   normalized `League` shape. Swap it in at `src/lib/data/index.ts`. No page or analytics code should change.
2. OAuth 2.0 Authorization Code flow: `/api/auth/yahoo` (redirect, with `state`) and `/api/auth/yahoo/callback`
   (validate `state`, exchange code server-side, store tokens in an encrypted httpOnly cookie or server store).
3. Endpoints to map (all read-only), by the feature each one powers:

   | Yahoo resource (league subresource) | Powers |
   |---|---|
   | user's games/leagues; league metadata + settings; `renew`/`renewed` | finding every past season, categories, playoff format |
   | `teams` (+ managers) | manager identities across seasons, team names, namesakes |
   | `scoreboard;week=N` (matchups + per-category results) | standings, standings race, streaks, what-if, luck, scorelines, Elo, rivalries |
   | `standings` | validation of derived standings and seeds |
   | `draftresults` | draft report card, draft position, steals/busts, favourites, the ones that got away |
   | `players` with season stats, ranks and ownership | draft value, trade value, roster builds, unowned stars, keep rate |
   | `transactions` (trades, adds/drops) | trade log and winners, activity, and later who actually picked up whom |

   The weekly scoreboard's per-team category totals and the add/drop log would also unlock features the page
   captures can't support today (all-play records, true punt detection, time-aware trade values).
4. Normalization notes: Yahoo league keys are per season (`<game_key>.l.<league_id>`); team keys likewise. Map
   Yahoo manager GUIDs to stable `Manager.id`s and allow manual reconciliation when a manager changes account.
5. Add Zod schemas at the Yahoo boundary only, to validate API responses before normalizing.
6. Rate limiting, limited concurrency, exponential backoff, partial-import recovery.

## 3. Rules

- Never expose tokens or the client secret to the browser.
- Do not fetch URLs supplied by users.
- Keep the demo clearly labelled as fictional demonstration data.
