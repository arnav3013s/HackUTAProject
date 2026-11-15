# Database shape and migration plan

## What this checkout actually uses

The repository creates **three tables**, not 55. Local SQLite has `state`, `rank_events`, and `activity`. Tiger Data uses the equivalent `patchline_state`, `patchline_rank_events`, and `patchline_activity`; the two event tables are hypertables. `state.body` is a JSON document containing users, sessions, OAuth state, patches, referrals, redemptions, inventory, and campaign data. `store.mjs` writes state and events in one transaction. No unidentified external tables were deleted.

Each user now has one `accountType` value in the JSON user record. The server backfills it at startup and computes it again for `GET /api/state`:

| Type | Rule, evaluated in order |
| --- | --- |
| Streamer | Has a linked YouTube channel or approved creator profile. |
| Returning User | Engagement classifier finds seven full days without a qualifying action after prior activity. |
| New User | Account is less than 21 days old. |
| Normal User | Every remaining account. |

The values are exactly `Streamer`, `Returning User`, `New User`, and `Normal User`. The priority means a creator can still be old or inactive, but their single account type remains Streamer. `fanCategory` is separate behavior segmentation, and demo personas remain synthetic. Game handles are self reported; verified match data requires the trusted import endpoint.

## Target normalized schema, if the 55-table database exists elsewhere

Use nine tables. This is a **proposed migration target**, not a claim that these tables already exist or that the app has been switched to them.

| Table | Purpose and key fields |
| --- | --- |
| `users` | `id` primary key; unique email and provider IDs; `account_type` constrained to the four values above; created, last qualifying activity, consent timestamps, profile JSON. |
| `sessions` | Hashed token primary key, `user_id`, expiry. |
| `game_links` | `user_id`, game, self reported handle, verified source, linked timestamp; unique per user and game. |
| `point_ledger` | Immutable event ID primary key, user, signed points, reason, created, expiry, referral/quest/order reference. |
| `referrals` | Invite code, inviter, invitee, verification milestones, review status. |
| `rewards` | Reward SKU, points price, inventory, landed cost, live budget eligibility, expiry/cap policy. |
| `redemptions` | Order ID, user, reward, status, points spent, fulfilment owner, receipt proof. |
| `content` | Curated videos, gallery, patches, teams, announcements with source and verification state. |
| `activity_events` | Time, user or anonymous subject, event type, game/content reference, sample flag; hypertable on Tiger Data. |

`account_type` should be a constrained string or enum, not a separate table. Segments, wallet balance, weekly leaderboards, and task progress are computed views over `users`, `point_ledger`, and `activity_events`. Keep the ledger immutable; a reversal is a new event. Archive raw imported rows before transformation.

## Safe migration from an external 55-table database

1. Export the external schema and row counts. Identify every table's owner, foreign keys, write path, and whether it contains personal data. The 55-table schema was not supplied with this checkout.
2. Take a tested backup and restore it to an isolated staging database. Stop live writes or install a change capture feed for cutover.
3. Map legacy identities and provider IDs to `users`, retaining a legacy-ID mapping during import. Resolve duplicates and record consent and verification provenance.
4. Assign one account type using the ordered rule above. Compare counts by old status and new type; manually review ambiguous creators and returning fans.
5. Import game links with a `self_reported` verification source unless an official provider or trusted match import supplied evidence.
6. Translate every point grant and spend into an immutable ledger entry. Reconcile each user's balance and every redemption against the old system. Do not grant points merely for a view count imported without fraud checks.
7. Import inventory, rewards, referral state, and fulfilment ownership. Check that funded live rewards cannot overspend campaign budget or stock.
8. Import curated content and activity, with source URLs and sample flags. Build weekly and all-time views from events, then compare representative accounts and rankings.
9. Dual read or shadow the new database, run the API and regression suite against staging, and test replay/idempotency, login, referral approval, expiry, redemption, and rollback.
10. Cut over behind a feature flag. Keep the backup and a rollback window. Delete old tables only after reconciliation, retention review, and written ownership approval.

## Tables to delete

**Verified exact deletion list: none.** The current three tables are active and required. The external 55 tables have not been provided, so naming them would be guesswork. Once the external schema is inventoried, delete only tables that map to the nine targets, have zero remaining reads/writes, meet retention requirements, and have passed the staging reconciliation in step 9. This work does not drop data.
