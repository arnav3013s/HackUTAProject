# Implementation review

## Latest scoped update · 15 November 2026

Fan Lab now lives under More with four demo personas. The Home page no longer contains Fan Lab. The two requested Gallery cards were removed, leaving 24 photos. About leadership names and the CORSAIR partner replaced the corresponding placeholders. The existing player charts and a new sample Pro Streamer follower/viewer comparison render through Chart.js. The supplied brand kit has no member portraits, and the public FaZe team page uses initials for many roster entries; approved photos and a fully reconciled live roster remain outstanding. The item-by-item checklist below describes the earlier implementation pass.

## A. Bug audit before edits

The prior checkout had a homepage About link leaving the app, a banner in place of first visit signup, duplicate lower-page store/project content, a separate Fan Lab route, the old Clan page name, a Creators route, a narrower Esports page with a manually scrolled team row, an unrelated broken Smash image URL, gallery URLs that failed to load, player pages without the requested chart set, and no two-theme coverage for the new surfaces. Referral preview credited on signup before activity. The database in **this checkout** has three tables, so the request's 55-table premise refers to a different database not present here. The gallery audit found nine failed image URLs; see `ASSET-AUDIT.md` for each cause and action.

## B. Source

The edited source is in this repository. The main entry points are `public/clan.js`, `public/clan-features.css`, `public/club-pages.js`, `public/teams-data.js`, `public/teams-page.js`, `public/about-data.js`, `public/about-page.js`, `public/player-page.js`, `public/floating.js`, `public/rewards-ui.js`, and `server.mjs`. `README.md` and `AI-HANDOFF.md` explain data flow and live configuration. A complete copyable source bundle can be generated from the changed files without truncating a file in chat.

## C. Simplified database

See `DATABASE-MIGRATION.md`. Actual schema: three tables, with one of four account types stored on each user in the state JSON. Proposed normalized target: nine tables. Exact old-table deletion list: none verified, because the external 55-table schema was not supplied.

## D. Player photos

The 28-path table is in `PLAYER-PHOTO-CHECKLIST.md`. Every row is marked **needs photo**. No player photos were provided in the repository; the UI has fixed-size silhouette fallbacks.

## E. About placeholders

All are centralized in `public/about-data.js`: `[ADD FOUNDING YEAR AND FOUNDERS]`, `[ADD JOIN YEAR]`, `[ADD ACHIEVEMENT]`, `[ADD CHAMPIONSHIPS WON]`, `[ADD NAME]`, `[ADD TITLE]`, `[ADD PARTNER]`, and `[ADD PRESS CONTACT]`. Terms and Privacy placeholder pages also contain `[ADD TERMS OF SERVICE]` and `[ADD PRIVACY POLICY]` until actual policies are supplied.

## F. Item-by-item test checklist

| Item | Local result | Remaining dependency or limit |
| --- | --- | --- |
| 1. Home About redirect | About links point to `/about`. | None found. |
| 2. Signup popup | First visit form, close memory, login switch, Google/Discord buttons. | OAuth buttons need credentials. |
| 3. Remove lower sections | Project Details and Official Store item strip removed from Home. | Shop remains as requested. |
| 4. Fan Lab placement | One Fan Lab section at the bottom of Home; separate route/nav removed. | Personas are synthetic. |
| 5. Clan rename | Page, route, files and app references use Clan. Text search for the old name should return no project source matches. | Historical Git branch names are outside page source. |
| 6. Creator code | Creators nav/page removed; Apply form at Rewards redeem returns success/error. | Giveaway drawing/funding is not implemented. |
| 7. Esports revamp | Hero, current team carousel, past results, schedule/standings panels, clips. | Upcoming fixtures and standings are visibly empty until a verified feed is connected. |
| 8. Team carousel | Continuous CSS marquee pauses on hover, focus and active touch; links to Teams. | Motion is disabled by reduced-motion setting. |
| 9. Smash image | Unrelated remote image replaced by a local FaZe-themed SVG fallback. | Actual approved game/player art can be added later. |
| 9A. Teams | Six supplied divisions and 28 people; search, selector, horizontal scroll, progress, keyboard/drag/swipe, placeholders and mobile layout. | All 28 approved portraits still need files. |
| 9B. Teams Smash | Same local Smash artwork and portrait convention used on Teams. | Sparg0 portrait still needs a file. |
| 10. Gallery | Audited all 30 original photos, fixed five URLs, removed four without safe replacements; 26 now pass. Local video has poster/fallback; YouTube thumbnails pass. | External publishers can later change image or embed availability. |
| 11. Player profiles | Profile route for every current member, five summary metrics and six Chart.js views, themed tooltips and labels. | All gameplay and streaming metrics are explicitly sample data. |
| 12. Database | Existing three-table store retained; four account types applied; proposed nine-table design and staged migration documented. | External 55-table schema was not supplied, so no table deletion or live migration was performed. |
| 13. Assistant | Fixed floating guide, source-aware `/api/ask`, server-only key, rate limit and fallback. | Live Gemini response needs a valid key and network access. |
| 14. Walkthrough | First visit eight-step tour, short returning tour and Replay tour menu action. | First visit flow starts on Home. |
| 15. Reward additions | Earn/redeem/history, daily completion and streak, weekly quests/chest, referrals, three leaderboard windows. | Leaderboard badge prizes are shown as pilot targets; automatic award/fulfillment is inactive. |
| 16. Nostalgia | Self reported era, recap, four era badges, OG quizzes, demo multiplier and squad invite link. | Verified history and funded retro merch are required for live OG perks. |
| 17. Redemption | Demo discount, merch reservations and gift card sample, ladder progress, expiry, caps and fraud checks. | Real gift cards and physical shipping need inventory, terms and funding. |
| 18. About | All requested sections, fact placeholders, filters, counters, contact form, footer paths, meta and JSON-LD. | Owner must replace bracketed facts, press/partner data, Terms and Privacy. |
| 19. Themes | Header/mobile toggle, prepaint system/default logic, CSS tokens, themed pages/charts and reduced motion. | Browser visual checks are not a formal WCAG audit of every state. |

The local browser review covered Home, About, Teams, Esports, Gallery, Player and Rewards routes, light and dark theme switching, a mobile width, and no observed JavaScript console errors on those paths. `npm test`, the asset audit, and syntax checks are separate gates. Real OAuth, email, Gemini, Solana, Vultr, Tiger Data and shipping need configured external services to validate end to end.

## G. Illustrative TAM / SAM / SOM

These are **planning assumptions**, not measured market data. Assume 20 million potentially interested fans worldwide and $12 annual program-attributable gross revenue per engaged fan. Narrow to 2 million serviceable fans in launch regions and channels, of whom 30% (600,000) are returning fans. That gives a hypothetical TAM of `20,000,000 × $12 = $240,000,000/year` and SAM of `2,000,000 × $12 = $24,000,000/year`.

| Scenario | Share of SAM reached | Engaged fans | Returning fans (30%) | Annual attributable gross at $12/fan |
| --- | ---: | ---: | ---: | ---: |
| Conservative | 0.5% | 10,000 | 3,000 | $120,000 |
| Base | 2% | 40,000 | 12,000 | $480,000 |
| Optimistic | 5% | 100,000 | 30,000 | $1,200,000 |

The revenue figure is **gross**, before merchandise costs, rewards, delivery, payment fees and marketing. A campaign should launch only with funded reward inventory and a positive contribution margin target. Validate the fan counts and $12 assumption with actual channel analytics and a short pilot before using these numbers in a pitch as forecasts.

Five further ideas: (1) shareable personal era cards after a verified quiz; (2) opt-in roster change alerts for a fan's favorite game; (3) a fan-curated clip playlist reviewed before publication; (4) time-limited watch-party quests with no random prize mechanics; (5) creator-hosted post-match recaps that link straight to a relevant team and reward task.
