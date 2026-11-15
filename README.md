# FaZe Afterimage | HackUTA 2026

FaZe Afterimage is a fan hub that brings FaZe's original clips, esports history, current coverage, rewards, and official merchandise into one place. It builds on the existing HackUTA project and uses the supplied FaZe brand kit and 2010–2026 timeline.

## Product recommendation

- **Problem.** Returning fans have to search old uploads to find the moments they remember. New fans may recognize FaZe's name without knowing the teams, players, or videos that shaped it. Current fans move across several platforms for matches, streams, news, and merch.
- **Experience.** Open with the gallery and ILLCAMS archive for returning fans. New fans can pick a game, see its team and tournament history, and earn points through a short archive challenge. Current fans get recent uploads and upcoming fixtures in News. Daily challenges, comeback offers, and mutual referral credits create reasons to return.
- **First release.** Prioritize the archive-to-Rewards flow and the official merch discovery flow. The MVP includes 30 sourced gallery photos, 14 division pages, email/password accounts, referral tracking, reward redemption, and a cart with sizes and quantities.
- **Revenue.** Start with official merch discovery and a store handoff. Pilot a sponsored archive challenge with a fixed campaign fee and a budgeted fan reward. Measure first-session challenge completion, seven-day return rate, approved referrals, and visits sent to the official store. Use merchant-side attribution to measure sales and negotiate a revenue share.
- **Feasibility.** The local demo runs with SQLite. The original patch review, Fan Lab, notifications, match history, and HackUTA integration surfaces remain accessible from More and Account.

## Run the demo

On Windows, open `Start-Afterimage.cmd` from the HACKUTA folder. It uses the project-local Node runtime if present, or an installed Node.js 24 or later.

For the standard setup with npm, open a terminal in the HACKUTA folder and run:

```powershell
npm install
npm start
```

Open [http://localhost:4173](http://localhost:4173). For a quick start, run `node --env-file-if-exists=.env server.mjs`. With dependencies absent, the browser loads React and Tailwind from jsDelivr. Photos, game art, and videos include assets hosted by their original publishers. Keep the terminal open while using the site.

## Judge walkthrough

1. **Home → Sign up.** Create a fan account. Use a test email and a password of at least 10 characters. The site stores the account in SQLite and uses an HTTP-only session cookie.
2. **Gallery → Counter-Strike.** Open Antwerp, then use the arrow keys to move between photos and Escape to close. The card credits link to the source.
3. **Esports → Rainbow Six Siege.** Find the 2025 and 2026 Six Invitational results and the roster. Open News to find the next scheduled events.
4. **Rewards → Earn points.** Claim the daily check-in and try the first ILLCAMS challenge. **Redeem points** shows available, credited, and redeemed totals, then the referral link and referral history. In local preview mode, use a private window to join through the link with a different email. The inviter gets 40 points, and the new account gets 20.
5. **Shop → Team Jersey.** Pick a size and add it to the cart. Open the cart using the header icon and change its quantity. The catalog was captured from the official FaZe Esports collection on November 14, 2026. The local cart keeps your selections and links to the official store, where the shopper selects items and completes payment.
6. **More → Project details.** Review integration status. For the points redemption demo, start a demo account from Account to get the 200-point sandbox.

## Update the homepage clip

Save the final clip as `public/hero.mp4` and restart. Use `HERO_VIDEO_URL` in `.env` to select another video URL. Newsletter signup records addresses in the database. Newsletter broadcasting requires a sender integration.

Run `npm test` to run the original server regression suite.

## Hackathon integrations

| Track | Implementation | Live setup |
| --- | --- | --- |
| Google Gemini | Answers fan questions with citations to selected records. It also drafts weapon tiers, rationales, and movement for each weapon on the submitted roster. | Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL`. Ask Afterimage a question. Import notes from the operator panel or configure the feed below. |
| Solana | Reads the finalized Devnet slot. A redemption memo binds the order and its point cost to a signed proof. The API checks finality, authorized signer, matching memo and transaction replay. | Set the receipt authority and fund the operator’s Devnet keypair. |
| Vultr | The container health check gates the Caddy HTTPS proxy. The track page can verify the configured instance through the Vultr API without returning its credentials. | Point DNS to a Vultr Cloud Compute Linux instance, allow TCP 80 and 443, and run the Compose deployment below. Set `VULTR_API_KEY` and `VULTR_INSTANCE_ID` for the status check. |
| Tiger Data | A transaction records ledger updates and activity events together. TimescaleDB hypertables hold patch snapshots, reward events, and clip opens. Weekly and all-time rankings are queried from those events. | Install dependencies and set `DATABASE_URL` to a Tiger Cloud database with TimescaleDB. To show synthetic accounts on a private judging instance, use a separate database with `DEMO_MODE=1`. |

Reference docs for [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Solana transaction verification](https://solana.com/docs/rpc/http/gettransaction), [Vultr Cloud Compute](https://docs.vultr.com/products/compute/cloud-compute), and [Tiger Data hypertables](https://www.tigerdata.com/docs/reference/timescaledb/hypertables/create_hypertable).

### Configure and deploy

1. Copy `.env.example` to `.env` and `content.example.json` to `content.json`. Set `DEMO_MODE=0`, `PUBLIC_ORIGIN` to your public HTTPS URL, and the provider settings from the table. Keep the demo and live databases separate. The optional SQLite fallback is suitable for local tests.
2. Create a Google OAuth web client with `<PUBLIC_ORIGIN>/auth/google/callback` as an authorized redirect URI. Enable the YouTube Data API for channel linking. Supply `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and comma-separated lists in `OPERATOR_EMAILS` and `REVIEWER_EMAILS`. Reviewer access requires a verified account and a linked YouTube channel. Operators approve surveys from other reviewers. The Account page lists outstanding surveys.
3. For a Vultr host with Docker Compose, set `CONTENT_FILE=/app/content.json` to load curated content and run `docker compose up -d --build`. Check `/health` for the connected database. Install the `pg` dependency with `npm install` when connecting to Tiger Cloud outside Docker.
4. For homepage footage, put an MP4 in `public/hero.mp4` or set `HERO_VIDEO_URL` to an HTTPS video URL. The bundled placeholder reel is used when the local MP4 and override are absent. The home hero respects reduced-motion preferences and has a pause control. Use `MEMBER_VIDEO_URL` for the Intel Pass and the `rewinds` object in `content.json` for individual returning-player footage, keyed by verified email. Use access-controlled media URLs for private footage.
5. Add curated clips as objects with `title`, `game`, `creator` and `url`. Add standings as objects with `name`, `game`, `league` and numeric `score`. Private rows also use `"private": true` and a `members` array of lowercase verified email addresses.

### Patch ingestion

An allowlisted operator can enter publisher notes and a full weapon roster. To automate that import, configure `PATCH_FEED_URL` for a normalized JSON feed you control. Patchline checks it every two minutes and imports up to ten recent items per poll. It deduplicates by game and version. The feed must provide `game`, `version`, an official publisher `url`, `notes`, and a comma- or newline-separated `roster` string. Publisher-specific feed adapters and game telemetry are future work. Accuracy depends on the roster and evidence provided.

### Notifications and email

Notifications for comeback offers, referral progress, and accepted pro reviews appear in the fan’s Inbox. Live email delivery uses `RESEND_API_KEY`, `REPLAY_EMAIL_FROM` on a verified sending domain, and an HTTPS `PUBLIC_ORIGIN`. A fan with a verified Google account opts in from Inbox. The worker polls once a minute and sends at most one eligible update per fan in 24 hours. Demo profiles can preview the message. Every email has an unsubscribe link. [Resend email idempotency](https://resend.com/blog/engineering-idempotency-keys)

### Campaign rules

- Points have no cash value. Verified fans can earn five points per daily check-in, ten for daily archive trivia, 15 for a daily meta pick during the first 21 days, and 20 once for the walkthrough quiz. The Intel Pass costs 80 points. Eligible accepted reviews credit 25 points up to ten times per reviewer.
- Fans with no recorded activity start as New. A completed mission, match, review submission, or redemption marks the fan Active. After seven full days without activity they become Returning. The 30-point comeback has a 30-day cooldown, and the claim remains available for up to seven days after the offer is recorded. Viewing clips carries no points.
- The FaZe store handles real purchases on its site. Physical reward previews use demo points and have a two-reservation limit. A future live campaign needs funded inventory, landed product costs, and an identified fulfilment owner. Stock, spend and budget checks run in the same ledger transaction for eligible live rewards. The campaign starts with a zero merchandise budget unless funded at initialization.
- Live referrals remain pending for review until both accounts have distinct verified Google identities and the invited account is at least seven days old with missions on three distinct UTC days. Each approval earns 40 points for the inviter and 20 for the new fan. An inviter can earn rewards for up to five friends. Demo referrals approve after the new account’s first recorded mission.
- A creator code records one campaign entry. A qualifying live sponsored merchandise redemption would add five campaign points to the creator tally. The MVP uses a historical creator gallery and lets approved creators submit a specialty and short bio. Audience bands use YouTube subscriber counts when shared with consent.
- The app stores verified Google identity, display name, email, self-reported handles, linked YouTube channel metadata, and account activity. The YouTube connection requests read-only access and discards the provider token after reading channel metadata. Demo points and reservations do not consume live inventory or budget.

### Sign and check a devnet receipt

1. Redeem an eligible reward and copy its memo from **Redemptions & receipts**. A demo reward can be used for the proof on Devnet.
2. On the operator's machine, set `SOLANA_KEYPAIR_FILE` to the local Solana CLI keypair path and `SOLANA_RECEIPT_AUTHORITY` to its public address. The authority must match the one set on the server. Run `npm run receipt -- <memo>`.
3. Once finalized, paste the transaction signature into the order's receipt form. The verified signature opens in Solana Explorer.

The SQLite demo and regression tests run without provider credentials. Live Gemini, Google, YouTube, Solana, Tiger Cloud, and Vultr require their own credentials, services, or deployment.
