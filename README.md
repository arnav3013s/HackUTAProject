# FaZe Clan · HackUTA 2026

A local fan hub for FaZe's current teams, historic moments, gallery, news, merchandise discovery, and a points wallet. The current checkout is a working hackathon prototype, with some live integrations gated by credentials and funded inventory.

## Start

Requires Node.js 24 or later. From this folder:

```powershell
npm install
npm start
```

Open the origin printed by the server (usually `http://localhost:4173`). On Windows, `Start-Clan.cmd` is another launcher. Copy `.env.example` to `.env` to configure optional services. `npm test` runs the server regression suite.

## What to explore

| Page or feature | What works now |
| --- | --- |
| Home | Video hero, recent and original clips, sourced moments, and current division links. New visitors see a signup dialog and guided tour. |
| Fan Lab in More | Four synthetic demo personas: Regular, New, Returning, and Pro Streamer. |
| About Us at `/about` | Owner-supplied history, achievements timeline and filters, division links, counters, values, leadership and partner placeholders, and a validated contact form stored in app state. |
| Teams at `/teams` | One roster source for six current divisions and 26 players/coaches. Search, game selector, scrollable cards, profile links, and silhouette placeholders until approved portraits are supplied. |
| Esports | Current divisions in an automatic carousel, past results, upcoming/standings placeholders, highlights, and links to Teams. Real fixture and standing feeds need an operator source. |
| Clan | Historical eras and video links. The former page name and route were removed. |
| Gallery | 24 checked source photos, a local video with poster and failure message, and YouTube highlights. Image failures switch to a local placeholder. |
| Player profiles | One page per current roster member with labeled sample metrics and six responsive Chart.js views. Live game or streaming stats are not available without approved data sources. |
| Rewards | Daily and weekly tasks, a completion bonus, points ledger and expiry, referrals, weekly/monthly/all-time ranking, OG tasks, creator code, and a demo reward ladder. Leaderboard badges are display targets; prize fulfillment is not active. |
| Shop | Official product discovery and a local cart. Checkout takes the fan to the official store; this app does not process payment or ship goods. |
| Floating guide | Fan questions go to `/api/ask`; Gemini is called on the server when configured. The panel has rate limiting and a fallback answer. |
| Light and dark themes | Toggle in the header and mobile menu, stored preference, system preference when not manually selected, and themed charts. |

The account dialog includes email/password, Google, Discord, and demo options. Google and Discord buttons become available only after the corresponding OAuth credentials are configured. The local demo is not a proof of a verified external identity.

## Code map

| Files | Responsibility |
| --- | --- |
| `public/index.html`, `public/club-bootstrap.js`, `public/clan.js`, `public/clan.css`, `public/clan-features.css` | App shell, vendor scripts, routes, navigation, signup dialog, footer, themes, shared styling. |
| `public/teams-data.js`, `public/teams-page.js`, `public/player-page.js` | Current roster source, Teams page, player profiles and sample charts. |
| `public/about-data.js`, `public/about-page.js` | Editable About facts, placeholders, timeline and page UI. |
| `public/club-pages.js`, `public/gallery-data.js`, `public/esports-data.js`, `faze.mjs` | Home, Esports, Clan, News, Gallery, curated photos, division and video data. |
| `public/rewards-ui.js`, `public/shop-ui.js`, `public/floating.js` | Points pages, merchandise and cart UI, guide and tour. |
| `server.mjs`, `catalog.mjs`, `engagement.mjs`, `fans.mjs`, `assistant.mjs` | API, eligibility, ledger, task and referral rules, account segmentation, assistant context. |
| `store.mjs`, `services.mjs` | SQLite/Tiger Data persistence and external Gemini/Solana/Vultr integrations. |
| `public/app.js`, `public/experience.js` | Earlier account, patch, inbox, match activity, and track screens still loaded for those routes. |

There is no front-end build step. The server serves local React, Tailwind, Chart.js, and ES modules. If packages are absent, React/Tailwind vendor routes fall back to jsDelivr. Browser writes call JSON routes in `server.mjs`; the server validates session, eligibility, rate limits, duplicate credit IDs, and budget/stock before writing. The local data file is `data/patchline.sqlite`; Tiger Data is selected with `DATABASE_URL`.

## Points and referrals

The server is authoritative. A daily check-in is 5 points, trivia 10, a watched-highlight task 5, daily completion 10, a first archive challenge 20, weekly quests 20 each, and the weekly chest 50. The 15-point meta pick is available during the first 21 days. New positive credits expire in 365 days. Points have no cash value. Physical merchandise remains demo or funded-campaign only; live campaigns start with zero merchandise budget by default.

The weekly, monthly and all-time charts use earned ledger points. Real profiles must opt in. A creator code records one eligible entry. For a live referral, both people need distinct verified Google identities; the invitee must be seven days old with three qualifying days, then an operator approves it. In local preview, an invited account's first completed challenge triggers the sample payout. Each inviter is capped at five credited friends. Demo accounts and live accounts are separated.

Game handles are self reported. Match points require trusted import through `POST /api/matches/import` with `MATCH_INGEST_TOKEN`; demo matches are labeled synthetic. The four Fan Lab profiles are examples for judging, not real customer records.

## HackUTA tracks

| Track | Implemented path | To make it live |
| --- | --- | --- |
| Google Gemini | Server-side assistant and patch ranking draft using supplied publisher notes and weapon roster; evidence and status appear in API responses. | Set `GEMINI_API_KEY`; optionally set `GEMINI_MODEL`. Accuracy depends on input evidence. |
| Solana | Devnet proof for a redemption memo; the API verifies finality, authority, memo, and replay. Points remain in the database. | Set receipt authority and fund the operator Devnet signer; use `npm run receipt -- <memo>`. |
| Vultr | Docker Compose, Caddy HTTPS proxy, `/health`, and instance status check. | Deploy to a Vultr Cloud Compute instance and set `VULTR_API_KEY`, `VULTR_INSTANCE_ID`, DNS, and HTTPS origin. |
| Tiger Data | PostgreSQL state plus patch rank/activity hypertables and event analytics. | Set `DATABASE_URL` to Tiger Cloud with TimescaleDB and install dependencies. |

Set `PUBLIC_ORIGIN` for deployment and keep the local demo database separate from a live database. Configure Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and Discord OAuth (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`) with the callbacks shown in `.env.example`. A YouTube channel connection needs Google permission. `RESEND_API_KEY` and a verified sender are needed for opt-in email delivery; newsletter signup alone only stores an address.

See [DATABASE-MIGRATION.md](DATABASE-MIGRATION.md) for the actual three-table database and a proposed nine-table migration, [PLAYER-PHOTO-CHECKLIST.md](PLAYER-PHOTO-CHECKLIST.md) for portrait paths, [ASSET-AUDIT.md](ASSET-AUDIT.md) for failed gallery sources, [IMPLEMENTATION-REVIEW.md](IMPLEMENTATION-REVIEW.md) for the item-by-item review and planning estimate, [CHANGE-MANIFEST.md](CHANGE-MANIFEST.md) for every changed file, and [FULL-UPDATED-CODE.md](FULL-UPDATED-CODE.md) for copyable full file contents.
