# Yahoo Fantasy API — integration checklist

**Status: not started.** The app runs entirely on the generated demo league. Nothing here is wired up.

## 1. Get access (do this first, it is the long pole)

Yahoo no longer provisions the Fantasy Sports API self-serve. Submit a request at
<https://sports.yahoo.com/developer/access/>. Incomplete requests are closed without reply, so prepare:

- [ ] A live site on a real domain (the demo deployed to Vercel)
- [x] Privacy policy and terms pages (`/privacy`, `/terms`) — set `CONTACT_EMAIL` in `src/lib/config.ts`
- [x] Attribution footer ("Fantasy data provided by Yahoo Fantasy" + link), shown when `league.source === "yahoo"`
- [ ] Read Yahoo's API terms on caching/retention and make the privacy policy match
- [ ] A clear description: read-only multi-season league history/analytics, what data is read, who uses it
- [ ] The OAuth redirect URI you will register (e.g. `https://<domain>/api/auth/yahoo/callback`)
- [ ] A data-retention/caching plan (check Yahoo's current developer terms before persisting Yahoo data)
- [ ] A contact email

## 2. What to build once approved

1. `src/lib/data/yahoo/` — a `LeagueProvider` implementation (see `src/lib/types.ts`) that returns the same
   normalized `League` shape. Swap it in at `src/lib/data/index.ts`. No page or analytics code should change.
2. OAuth 2.0 Authorization Code flow: `/api/auth/yahoo` (redirect, with `state`) and `/api/auth/yahoo/callback`
   (validate `state`, exchange code server-side, store tokens in an encrypted httpOnly cookie or server store).
3. Endpoints to map (all read-only): user's games/leagues, league metadata + settings, `renew`/`renewed` links for
   historical seasons, teams + managers, standings, scoreboard per week (matchups + category results),
   playoff results.
4. Normalization notes: Yahoo league keys are per season (`<game_key>.l.<league_id>`); team keys likewise. Map
   Yahoo manager GUIDs to stable `Manager.id`s and allow manual reconciliation when a manager changes account.
5. Add Zod schemas at the Yahoo boundary only, to validate API responses before normalizing.
6. Rate limiting, limited concurrency, exponential backoff, partial-import recovery.

## 3. Rules

- Never expose tokens or the client secret to the browser.
- Do not fetch URLs supplied by users.
- Keep the demo clearly labelled as fictional demonstration data.
