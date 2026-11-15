# FaZe Clan project handoff

This is the HackUTA FaZe Clan fan hub. Work in this repository's `Patchline` directory. The app is a Node.js 24 server that serves a React front end without a bundling step. Start with `npm install`, `npm start`, open the printed local origin, and run `npm test`. Do not assume the local demo is a deployed live service.

## Product intent and scope

The main experience serves new fans and returning fans: open a clip, explore current teams and the legacy, complete a challenge, collect points, invite a friend, and see an attainable reward. The visual language is from the supplied FaZe brand kit: black, FaZe red, white, condensed headings, photo and video led sections. Navigation is a top bar with hover/focus submenus. The four HackUTA track surfaces are Gemini, Solana, Vultr, and Tiger Data; each has a real code path, but live credentials and deployment are separate.

## First paths to inspect

| Path | What it owns |
| --- | --- |
| `public/clan.js` | React shell, URLs, header/footer, login/signup dialog, theme switch, first visit behavior, route dispatcher. `/about`, `/teams`, `/clan`, `/players/:slug`, `/terms`, and `/privacy` are path routes; most older screens are hash routes. |
| `public/club-pages.js` | Home, Esports, News, Gallery, Clan, video modal, and Fan Lab in More. |
| `public/teams-data.js` | **Only current roster source for Teams**: six ordered divisions and 26 named players/coaches. `rosters.mjs` is a historical/archive API source and must not be used to add former players to Teams. |
| `public/teams-page.js`, `public/player-page.js` | Searchable current roster with local portrait convention, then player profiles with explicitly sample charts. |
| `public/about-data.js`, `public/about-page.js` | Owner supplied About facts, `[VERIFY]` timeline comments, placeholders, page components and partner form. |
| `public/rewards-ui.js`, `catalog.mjs`, `engagement.mjs`, `fans.mjs` | Points presentation, reward prices/rules, daily/weekly progress, wallet FIFO spending and expiry, categories and returning status. |
| `server.mjs` | HTTP/static/SPA routing, sessions, OAuth, API writes, rate limiting, referral and redemption checks, point credits, account types, public state. |
| `store.mjs` | SQLite or Tiger Data persistence; one JSON state row plus two event tables, transactionally written. |
| `assistant.mjs`, `services.mjs`, `public/floating.js` | Evidence retrieval, server side Gemini call, visible assistant panel, guided tour. |
| `public/app.js`, `public/experience.js` | Earlier account, inbox, patch intel, match and MLH tracks screens reached through `More`. |

## Account and points flow

Email/password uses scrypt and an HTTP-only session cookie. Google and Discord OAuth require configured credentials; Google is also used for verified identity and optional YouTube channel linking. New visitors see a signup dialog once; a full site tour starts after closing it. Returning Users get a shorter tour. The Replay tour action is in More. A floating assistant is visible on every route.

`GET /api/state` composes curated data, products, verified account state, tasks, wallet, rankings, photo availability, and provider configuration. UI writes use `public/club-ui.js` `api()` to POST JSON routes in `server.mjs`, then refresh state. The server alone credits points. Ledger IDs are deterministic for daily/weekly tasks, preventing duplicate claims. Positive credits expire after 365 days, and `fanWallet` spends unexpired credits in first-in, first-out order. A redemption uses an attempt ID, checks available balance, item eligibility, stock, per-account cap, and funded live budget in the store transaction. Physical rewards in the local demo are reservations, not shipped goods.

`accountType` is one of exactly `Streamer`, `Returning User`, `New User`, or `Normal User`, calculated in that priority order for live accounts. A Streamer has a linked YouTube channel or creator profile. The engagement model marks Returning after seven full days without qualifying activity. An account under 21 days is New unless already Streamer or Returning. Behavior category and game interest are separate fields. Self reported handles never count as official match stats; trusted match imports use `MATCH_INGEST_TOKEN`. The four seeded Fan Lab personas are synthetic and isolated from live identities.

Referrals are pending until qualification. Local preview gives sample points after the new account's first challenge. Live payout needs distinct verified Google identities, a seven-day-old invitee, challenges on three UTC days, and operator approval. Inviter and invitee receive 40 and 20 points, respectively, subject to a five-friend cap. A creator code registers one eligible entry; funded campaign attribution is separate from cash payment.

## External integrations

| Track | Code behavior | Still required |
| --- | --- | --- |
| Gemini | `/api/ask` gathers evidence from current roster, rewards and curated records, calls Gemini on the server, returns an evidence-aware answer or fallback. Patch intel can draft weapon rankings only from operator supplied publisher notes and weapon rosters. | Valid API key, selected model, and publisher evidence. No claim of automatic pre-release access. |
| Solana | A Devnet receipt memo can prove a redemption; the server verifies signer authority, memo match, finality, and replay. | Operator signer and receipt authority. Points are still database entries, not tradeable coins. |
| Vultr | Docker Compose and Caddy health-gated HTTPS deployment plus API status verification. | An instance, DNS, API credentials and deployment. |
| Tiger Data | PostgreSQL state plus TimescaleDB rank/activity hypertables and event analytics. | Tiger Cloud database and `DATABASE_URL`. |

Live email uses Resend and explicit opt in from Inbox. Newsletter signup stores an address but is not itself a mailing service. Google/Discord OAuth, email delivery, livestream data, official game stats, shipping, and leader prize fulfillment are not proven by the local demo.

## Current media and content

Gallery has 26 checked remote photos after replacing five broken URLs and removing four without trustworthy replacements. `scripts/audit-gallery.mjs --videos` checks gallery images and seven YouTube thumbnail URLs. The hero reel and poster are local files. The Smash division image is a local SVG. All 26 player portraits are expected at `public/images/players/{game-slug}/{player-slug}.webp`; none were supplied, so silhouette fallbacks are intentional. See `ASSET-AUDIT.md` and `PLAYER-PHOTO-CHECKLIST.md`.

About placeholders are in `public/about-data.js`. Do not invent leadership, partners, founding year, press contact, unknown division dates, or an overall championship count. Profile chart values are labeled sample. Esports upcoming events and standings are placeholders until an authorized source is connected. The points leaderboard shows badge targets but does not award prizes. Keep all such labels honest.

## Test and change discipline

Run `npm test`, `git diff --check`, and `node scripts/audit-gallery.mjs --videos` when changing relevant paths. In the browser inspect `/about`, `/teams`, a `/players/:slug` page, `/#gallery`, `/#esports`, and `/#rewards` in dark and light modes at desktop and mobile widths. Check browser console, internal navigation, and image/video fallback. No production OAuth, mail, Tiger Data, Solana, Vultr, shipping, or live gameplay feed can be certified without those external services.

Detailed schema and migration notes are in `DATABASE-MIGRATION.md`; the item-by-item review and market planning scenarios are in `IMPLEMENTATION-REVIEW.md`.
