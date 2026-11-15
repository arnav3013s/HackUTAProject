# FaZe Replay · HackUTA

FaZe Replay is a fan hub prototype built for HackUTA. The source directory and internal service name remain Patchline.

## Product recommendation

New fans choose their games, earn their first points, and get a link to invite a friend. Returning fans see their last activity, a personal match recap, and a bonus when eligible. A daily check-in, archive trivia, and a patch pick give fans a fresh reason to visit. Replay carries the points, videos, and notifications in the app.

Ship the responsive web app as the first release. The MVP covers the archive, dated rosters and tournament results, official store links, a 21-day points challenge, and a draft-to-reviewed weapon ranking. Counter-Strike 2 is the sample patch. The live import also accepts Warzone, Rainbow Six Siege, Valorant, Apex Legends and Fortnite with publisher notes and an explicit roster. Fan-submitted game handles can personalize offers. Tournament placements use published sources, and community standings accept operator-supplied results.

Use the FaZe store as the first revenue path. Fans discover authenticated product listings in the app and complete shopping at FaZe. Evaluate the pilot on seven-day return rate, archive-to-YouTube click-throughs, activated challenge users, and store outbound clicks. Measure actual sales attribution with the store team before claiming revenue. Sponsored challenges and approved merchandise campaigns are second-phase options with funded inventory and agreed costs.

Fan accounts can join challenges and record redemptions. Creators link YouTube and submit playtest observations after operator approval. Operators review referrals, approve rank edits, curate source links and publish league results. Expand to verified game stats, prize fulfilment and post-launch partner campaigns once publisher access and ownership are established.

## Run the demo

Use Node.js 24 or later. The local demo runs with built-in SQLite and needs neither dependencies nor credentials.

```sh
npm start
npm test
```

Open [localhost:4173](http://localhost:4173). The top bar opens Home, Missions, Invites, Watch, and Rewards. Hover over Watch, Rewards, or More for subpages. On a touchscreen, tap the arrow.

1. Choose **Start walkthrough → Start with a demo account**. That account starts at zero points. Pick your games and answer the first ILLCAMS question for 20 points.
2. Finish the walkthrough, claim the daily check-in for five points, and play archive trivia for ten. The mission board, wallet, and points history use the same record of each credit.
3. Copy your link from **Invites**. Open it in a private browser window, create a new demo account, and complete a mission. Refresh **Invites** as the original fan to see the approval and 40-point credit.
4. Open **More → Fan Lab**, choose **Returning fan**, and select **Use this demo account**. The dashboard and popup show why this fan is returning. Claim the 30-point bonus or open **Inbox** for the comeback notification and email preview.

**Watch** plays original uploads inside Replay. This week and All time rank unique Replay opens in their respective windows. The OG archive covers the early uploads. **Ask Replay** reads the signed-in fan’s wallet, missions, invite progress, and match history. It answers factual account questions directly. When Gemini is configured, it can summarize relevant public records, including weapon changes and roster or clip evidence.

**Fan Lab** contains 56 synthetic profiles in seven behavior groups. Selecting a fan opens that person's points ledger and play history. The preview button creates a personal copy for the current demo session. Choose **Return to my demo account** in Fan Lab or Account to restore your starting profile and wallet.

**More → Match activity** shows 30-day time played, average placement score, best finish, and rank within Replay. The main game uses time played over the last 30 days when available, followed by saved favorites and linked handles. **Project details** in the footer opens the integration guide.

Match rewards add one point per five minutes (up to ten) and up to 20 points for placement. Placement points scale from zero for last to 20 for first. Eligible matches are at least five minutes long, arrive within seven days, and count toward a 60-point daily match limit. Your performance score is the average normalized placement on a 0–100 scale. A game rank appears after three recorded matches in that game. Ranking ties use match count, and matching scores and counts share a rank.

To connect a live match source, set `MATCH_INGEST_TOKEN` on the server. Your trusted feed posts to `/api/matches/import` with `Authorization: Bearer <token>` and JSON containing `userId`, `handle`, `game`, `matchId`, `completedAt` (ISO 8601), `minutes`, `placement`, and `fieldSize`. The feed must verify the player’s publisher identity and match results before posting. The app checks the handle against the linked account and stores the match and points together. Live credits require a verified Replay account. A provider feed must be supplied for automatic reporting.

The **Try the demo** button on Account loads the 200-point rewards sandbox. Go to **More → Patch intel & pro reviews**. Submit an MP9 playtest and accept it as the demo operator to update the ranking and earn 25 points. Add a 15-point daily pick, apply the `VANTA` code in Creator gallery, and test a snapback reservation for 180 points. The wallet should show 240 credited, 180 redeemed, and 60 available. Other visitors keep the original sample rankings.

The FaZe logo, tiger camo, and local fonts come from the supplied brand kit. Replay’s generated art depicts an esports arena, a red-lit controller, and stacked invite passes. The timeline and roster cards cite source material. Product pages provide current stock and prices.

## Hackathon integrations

| Track | Implementation | Live setup |
| --- | --- | --- |
| Google Gemini | Answers fan questions with citations to selected records. It also drafts weapon tiers, rationales, and movement for each weapon on the submitted roster. | Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL`. Ask Replay a question. Import notes from the operator panel or configure the feed below. |
| Solana | Reads the finalized Devnet slot. A redemption memo binds the order and its point cost to a signed proof. The API checks finality, authorized signer, matching memo and transaction replay. | Set the receipt authority and fund the operator’s Devnet keypair. |
| Vultr | The container health check gates the Caddy HTTPS proxy. The track page can verify the configured instance through the Vultr API without returning its credentials. | Point DNS to a Vultr Cloud Compute Linux instance, allow TCP 80 and 443, and run the Compose deployment below. Set `VULTR_API_KEY` and `VULTR_INSTANCE_ID` for the status check. |
| Tiger Data | A transaction records ledger updates and activity events together. TimescaleDB hypertables hold patch snapshots, reward events, and clip opens. Weekly and all-time rankings are queried from those events. | Install dependencies and set `DATABASE_URL` to a Tiger Cloud database with TimescaleDB. To show synthetic accounts on a private judging instance, use a separate database with `DEMO_MODE=1`. |

Reference docs for [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Solana transaction verification](https://solana.com/docs/rpc/http/gettransaction), [Vultr Cloud Compute](https://docs.vultr.com/products/compute/cloud-compute), and [Tiger Data hypertables](https://www.tigerdata.com/docs/reference/timescaledb/hypertables/create_hypertable).

### Configure and deploy

1. Copy `.env.example` to `.env` and `content.example.json` to `content.json`. Set `DEMO_MODE=0`, `PUBLIC_ORIGIN` to your public HTTPS URL, and the provider settings from the table. Keep the demo and live databases separate. The optional SQLite fallback is suitable for local tests.
2. Create a Google OAuth web client with `<PUBLIC_ORIGIN>/auth/google/callback` as an authorized redirect URI. Enable the YouTube Data API for channel linking. Supply `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and comma-separated lists in `OPERATOR_EMAILS` and `REVIEWER_EMAILS`. Reviewer access requires a verified account and a linked YouTube channel. Operators approve surveys from other reviewers. The Account page lists outstanding surveys.
3. For a Vultr host with Docker Compose, set `CONTENT_FILE=/app/content.json` to load curated content and run `docker compose up -d --build`. Check `/health` for the connected database. Install the `pg` dependency with `npm install` when connecting to Tiger Cloud outside Docker.
4. For homepage footage, put an MP4 in `public/hero.mp4` and set `HERO_VIDEO_URL=/hero.mp4`, or set it to an HTTPS video URL. This adds a play control to the homepage. Use `MEMBER_VIDEO_URL` for the Intel Pass and the `rewinds` object in `content.json` for individual returning-player footage, keyed by verified email. Use access-controlled media URLs for private footage.
5. Add curated clips as objects with `title`, `game`, `creator` and `url`. Add standings as objects with `name`, `game`, `league` and numeric `score`. Private rows also use `"private": true` and a `members` array of lowercase verified email addresses.

### Patch ingestion

An allowlisted operator can enter publisher notes and a full weapon roster. To automate that import, configure `PATCH_FEED_URL` for a normalized JSON feed you control. Patchline checks it every two minutes and imports up to ten recent items per poll. It deduplicates by game and version. The feed must provide `game`, `version`, an official publisher `url`, `notes`, and a comma- or newline-separated `roster` string. Publisher-specific feed adapters and game telemetry are future work. Accuracy depends on the roster and evidence provided.

### Notifications and email

Notifications for comeback offers, referral progress, and accepted pro reviews appear in the fan’s Inbox. Live email delivery uses `RESEND_API_KEY`, `REPLAY_EMAIL_FROM` on a verified sending domain, and an HTTPS `PUBLIC_ORIGIN`. A fan with a verified Google account opts in from Inbox. The worker polls once a minute and sends at most one eligible update per fan in 24 hours. Demo profiles can preview the message. Every email has an unsubscribe link. [Resend email idempotency](https://resend.com/blog/engineering-idempotency-keys)

### Campaign rules

- Points have no cash value. Verified fans can earn five points per daily check-in, ten for daily archive trivia, 15 for a daily meta pick during the first 21 days, and 20 once for the walkthrough quiz. The Intel Pass costs 80 points. Eligible accepted reviews credit 25 points up to ten times per reviewer.
- Fans with no recorded activity start as New. A completed mission, match, review submission, or redemption marks the fan Active. After seven full days without activity they become Returning. The 30-point comeback has a 30-day cooldown, and the claim remains available for up to seven days after the offer is recorded. Viewing clips carries no points.
- The FaZe store handles real purchases on its site. Physical reward previews use demo points and have a two-reservation limit. A future live campaign needs funded inventory, landed product costs, and an identified fulfilment owner. Stock, spend and budget checks run in the same ledger transaction for eligible live rewards. The campaign starts with a zero merchandise budget unless funded at initialization.
- Live referrals remain pending for review until both accounts have distinct verified Google identities and the invited account is at least seven days old with missions on three distinct UTC days. Each approval earns 40 points, capped at five approvals. Demo referrals approve after the new account’s first recorded mission.
- A creator code records one campaign entry. A qualifying live sponsored merchandise redemption would add five campaign points to the creator tally. The MVP uses a historical creator gallery and lets approved creators submit a specialty and short bio. Audience bands use YouTube subscriber counts when shared with consent.
- The app stores verified Google identity, display name, email, self-reported handles, linked YouTube channel metadata, and account activity. The YouTube connection requests read-only access and discards the provider token after reading channel metadata. Demo points and reservations do not consume live inventory or budget.

### Sign and check a devnet receipt

1. Redeem an eligible reward and copy its memo from **Redemptions & receipts**. A demo reward can be used for the proof on Devnet.
2. On the operator's machine, set `SOLANA_KEYPAIR_FILE` to the local Solana CLI keypair path and `SOLANA_RECEIPT_AUTHORITY` to its public address. The authority must match the one set on the server. Run `npm run receipt -- <memo>`.
3. Once finalized, paste the transaction signature into the order's receipt form. The verified signature opens in Solana Explorer.

The SQLite demo and regression tests run without provider credentials. Live Gemini, Google, YouTube, Solana, Tiger Cloud, and Vultr require their own credentials, services, or deployment.
