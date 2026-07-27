# USER_TAXONOMY.md — VideoText Canonical User Model

Status: design only, not implemented. Companion to METRICS.md, ANALYTICS_ARCHITECTURE.md.

## 1. Purpose

Phase 1 found that four unreconciled populations (guest, demo, founder/internal, real
customer) flow through every KPI with no consistent inclusion/exclusion logic. This
document defines ONE canonical `user_class` enum that every metric, dashboard, and
report must filter through. No metric may query `User`/`business_users` without
declaring which classes it includes.

## 2. The `dim_user.user_class` enum

| Class | Definition | Identity mechanism | Gets a row in `business_users`? |
|---|---|---|---|
| `anonymous_visitor` | Any HTTP/browser hit with no persistent identifier at all (page view before any anonymous_id cookie is set) | none (edge/CDN log only) | No — lives only in web analytics, never in the user table |
| `guest` | Unauthenticated product usage (uploads a file, runs a tool) without signing up | persistent first-party `anonymous_id` (see §4) | Yes — a lightweight shadow row, NOT the legacy ephemeral `guest_<uuid>` |
| `registered` | Has completed identity creation (email captured, password or OAuth set, or converted from a Stripe checkout) | `business_users.id` | Yes |
| `verified` | Registered + confirmed ownership of contact channel (OTP-verified email, or OAuth-verified email) | subtype flag on `registered` | Yes (flag, not separate row) |
| `free` | Verified/registered, plan = free tier, no billing relationship | subtype flag | Yes |
| `trial` | On a time-boxed trial of a paid tier with no active payment method yet | subtype flag + `trial_ends_at` | Yes |
| `paying_customer` | Has a Stripe subscription in `active`/`trialing-converted`/`past_due` (within dunning) state | subtype flag, `stripe_subscription_id NOT NULL` | Yes |
| `enterprise_customer` | Paying customer on a negotiated/contract plan (custom pricing, SSO, dedicated support) | subtype flag + `contract_id` | Yes |
| `founder` | The product's own operator account(s), used for running the business, not for testing product usage | explicit allowlist (`is_founder=true`), config-driven, not hardcoded email | Yes, flagged |
| `internal` | Employee/contractor accounts used for legitimate internal work (support lookups, content ops) | domain allowlist + explicit flag | Yes, flagged |
| `developer` | Engineering accounts used to exercise the product while building features | explicit flag, ideally scoped to non-prod environment; if used in prod, always flagged | Yes, flagged |
| `qa` | Automated or manual QA accounts used for release testing | naming convention + explicit flag (never inferred from email pattern alone) | Yes, flagged |
| `demo` | Self-serve "try without signing up" sessions (today's `/api/auth/demo`) | explicit flag, `demo_session_id`, TTL-bound | Yes, flagged, TTL-enforced (see §5) |
| `bot` | Detected non-human traffic (scripted uploads, credential-stuffing probes, scraper hits) | bot-detection signal (rate pattern, UA, challenge failure) | Yes, flagged, quarantined |
| `deleted` | A user who has been account-deleted (GDPR/user request or internal cleanup) | tombstone row, PII scrubbed, `deleted_at` set | Yes — tombstone, not hard-deleted (see §6) |
| `suspended` | Account access revoked for policy violation, fraud, or chargeback | subtype flag + `suspended_at`, `suspension_reason` | Yes, flagged |

Every `business_users` row carries exactly one primary `user_class` plus zero or more
boolean **quality flags**: `is_founder`, `is_internal`, `is_developer`, `is_qa`,
`is_demo`, `is_bot`, `is_deleted`, `is_suspended`. A single derived column,
`include_in_business_metrics` (`NOT (is_founder OR is_internal OR is_developer OR
is_qa OR is_demo OR is_bot OR is_deleted)`), is precomputed once and is the ONLY
filter any downstream metric is allowed to apply — no metric re-implements this
exclusion logic itself (this is the direct fix for Phase 1 finding: "no metric
consistently excludes demo/test/internal users").

## 3. Contribution matrix

| Population | Audience / traffic metrics | Activation / engagement metrics | Revenue / subscriber metrics | Job / product-usage ops metrics | AI cost / infra metrics | Financial (investor) reporting |
|---|---|---|---|---|---|---|
| `anonymous_visitor` | ✅ (web analytics only) | ❌ | ❌ | ❌ | ❌ | ❌ |
| `guest` | ✅ | ✅ (as "guest activity", never merged into signup funnel counts) | ❌ | ✅ (counted, tagged `is_guest=true`) | ✅ (real compute cost, must be counted) | ❌ |
| `registered` / `verified` / `free` | ✅ | ✅ | ✅ (as free-tier population, $0 revenue) | ✅ | ✅ | ✅ (as non-revenue user base) |
| `trial` | ✅ | ✅ | ✅ (tracked separately from `paying_customer`, never summed into MRR until converted) | ✅ | ✅ | ✅ (trial conversion rate only) |
| `paying_customer` / `enterprise_customer` | ✅ | ✅ | ✅ (the only classes allowed into MRR/ARR/ARPU/ARPPU) | ✅ | ✅ | ✅ |
| `founder` | ❌ | ❌ | ❌ | ❌ (excluded from ops dashboards; visible only in a separate "internal usage" panel) | ✅ (still costs real money — tracked, but never in customer-facing cost-per-job) | ❌ |
| `internal` / `developer` / `qa` | ❌ | ❌ | ❌ | ❌ (same treatment as founder) | ✅ (tracked separately as "internal AI spend") | ❌ |
| `demo` | ✅ (as its own labeled bucket, e.g. "demo sessions started") | ❌ (never counted as activation or paid conversion — this directly fixes the Phase 1 bug where demo accounts inflated `paidConversionPct`) | ❌ | ✅ (tagged, capped, excluded from customer job stats) | ✅ (tracked, budget-capped) | ❌ |
| `bot` | ❌ (quarantined, reported separately as "suspected bot traffic") | ❌ | ❌ | ❌ | N/A (should be blocked before consuming compute) | ❌ |
| `deleted` | ❌ (tombstone excluded from all live counts) | ❌ | ❌ | Historical job facts retained **in aggregate only**, unlinked from PII, so historical totals don't silently shrink (fixes Phase 1 finding: "deletion doesn't retroactively correct historical rollups" — see §6) | ✅ (historical AI cost is a sunk cost, stays in historical cost totals) | ❌ prospectively; historical revenue already recognized stays in historical financials (revenue recognition is a point-in-time fact, not retroactively erased by a later account deletion) |
| `suspended` | ✅ (was real, stays counted historically) | frozen at time of suspension, no new activity counted | ❌ going forward from suspension date; historical revenue already booked stays booked | ❌ going forward | ❌ going forward | historical facts preserved, no new accrual |

## 4. Fixing guest identity (the DAU/MAU integrity fix)

Today: every unauthenticated upload mints a fresh `guest_<uuid>`, so one visitor
running three tools becomes three "active users." Design:

- Issue a **persistent first-party `anonymous_id`** (UUID) on first client load, stored
  in `localStorage` + a long-lived cookie fallback, sent as a header
  (`x-anonymous-id`) on every request, independent of login state.
- On signup/login, the `anonymous_id` is **merged** into the new `business_users`
  row (`business_users.first_anonymous_id`), exactly mirroring how PostHog's
  `identify()` merge works — so pre-signup guest activity becomes attributable
  history on the resulting account, not orphaned data.
- `guest` rows in `business_users` are keyed by `anonymous_id`, not by a
  per-request UUID. "Guest Users" and "Active Users" for guests are then genuinely
  unique-visitor counts.

## 5. Fixing demo-account growth (unbounded row creation)

- Demo sessions get a `demo_session` row in a **separate, TTL-partitioned table**
  (`business_demo_sessions`), not a full `business_users` row indistinguishable
  from a real signup. If product requirements need demo sessions to behave like a
  "pro" account operationally, that's a join-time capability grant, not an
  identity-table pollution.
- Auto-expire and hard-delete demo sessions after 24–72h (configurable), with a
  scheduled job — no more permanent, ever-growing `demo-user-###` rows.
- Any historical reporting period is computed with demo sessions excluded by
  construction (they're not in `business_users` at all), not by a `WHERE` clause
  someone has to remember to add.

## 6. Fixing deletion (retroactive rollup correctness)

- Deletion never hard-deletes the row outright as the *first* step. It:
  1. Scrubs PII (email → hash, name → null) and sets `is_deleted=true`,
     `deleted_at`.
  2. Leaves the row's historical foreign keys intact so historical `business_jobs`,
     `business_revenue`, and rollup facts remain internally consistent (a
     `DailyMetrics`-equivalent row from 2026-03-01 should still sum to the same
     total forever, regardless of what happens to an individual user later).
  3. Triggers a scoped **restatement** job (Part 8, governance) that recomputes
     only the specific rollup rows whose "current-state" metrics (e.g., "current
     total registered users") are affected, tagged as a restatement with a reason
     code — never a silent overwrite.
- Full hard-delete (GDPR erasure) is a separate, rarer path that only scrubs PII,
  never deletes aggregate historical fact rows — financial and usage history must
  survive a person exercising their right to erasure; only their personal
  identifiers do not.
