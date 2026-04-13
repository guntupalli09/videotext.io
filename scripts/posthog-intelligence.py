#!/usr/bin/env python3
"""
VideoText.io — PostHog Product Intelligence System
====================================================
Creates all dashboards, funnels, insights, feature flags, and cohorts
from scratch using the PostHog management API.

Usage:
    POSTHOG_PERSONAL_KEY=phx_xxxxx POSTHOG_PROJECT_ID=12345 python3 scripts/posthog-intelligence.py

How to get credentials:
    1. Personal API key  → PostHog → Settings → Personal API Keys → Create key (all scopes)
    2. Project ID        → any PostHog URL: app.posthog.com/project/XXXXX/...
    3. Host              → https://us.posthog.com  (US)  or  https://eu.posthog.com  (EU)

The script is fully idempotent: re-running it will skip items that already exist by name.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

# ─── Config ─────────────────────────────────────────────────────────────────

PERSONAL_KEY = os.environ.get("POSTHOG_PERSONAL_KEY", "").strip()
PROJECT_ID   = os.environ.get("POSTHOG_PROJECT_ID", "").strip()
HOST         = os.environ.get("POSTHOG_HOST", "https://us.posthog.com").rstrip("/")

if not PERSONAL_KEY or not PROJECT_ID:
    print("ERROR: Set POSTHOG_PERSONAL_KEY and POSTHOG_PROJECT_ID before running.")
    print("  export POSTHOG_PERSONAL_KEY=phx_xxxxxxxxx")
    print("  export POSTHOG_PROJECT_ID=12345")
    sys.exit(1)

BASE = f"{HOST}/api/projects/{PROJECT_ID}"
HEADERS = {
    "Authorization": f"Bearer {PERSONAL_KEY}",
    "Content-Type": "application/json",
}

# ─── HTTP helpers ────────────────────────────────────────────────────────────

def _req(method: str, path: str, body: dict | None = None, retries: int = 3) -> dict:
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            body_text = e.read().decode()
            if e.code == 429:
                wait = 2 ** attempt
                print(f"  Rate-limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            print(f"  HTTP {e.code} on {method} {path}: {body_text[:200]}")
            raise
        except urllib.error.URLError as e:
            print(f"  Network error on {method} {path}: {e.reason}")
            raise
    raise RuntimeError(f"Failed after {retries} retries: {method} {path}")

def get(path: str) -> dict:
    return _req("GET", path)

def post(path: str, body: dict) -> dict:
    return _req("POST", path, body)

def patch(path: str, body: dict) -> dict:
    return _req("PATCH", path, body)

def list_all(path: str) -> list:
    """Paginate through all results."""
    results = []
    url = path
    while url:
        data = _req("GET", url)
        results.extend(data.get("results", []))
        # next is a full URL; strip the base
        nxt = data.get("next")
        url = nxt.replace(f"{BASE}", "") if nxt else None
    return results

# ─── Idempotency helpers ─────────────────────────────────────────────────────

_existing_dashboards: dict[str, int] = {}
_existing_insights: dict[str, int] = {}
_existing_flags: dict[str, int] = {}
_existing_cohorts: dict[str, int] = {}

def _load_existing() -> None:
    global _existing_dashboards, _existing_insights, _existing_flags, _existing_cohorts
    print("Loading existing PostHog resources...")
    for d in list_all("/dashboards/"):
        _existing_dashboards[d["name"]] = d["id"]
    for i in list_all("/insights/"):
        _existing_insights[i["name"]] = i["id"]
    for f in list_all("/feature_flags/"):
        _existing_flags[f["key"]] = f["id"]
    for c in list_all("/cohorts/"):
        _existing_cohorts[c["name"]] = c["id"]
    print(f"  Found: {len(_existing_dashboards)} dashboards, "
          f"{len(_existing_insights)} insights, "
          f"{len(_existing_flags)} flags, "
          f"{len(_existing_cohorts)} cohorts")

def create_dashboard(name: str, description: str) -> int:
    if name in _existing_dashboards:
        print(f"  [skip] Dashboard already exists: {name!r}")
        return _existing_dashboards[name]
    resp = post("/dashboards/", {"name": name, "description": description})
    _id = resp["id"]
    _existing_dashboards[name] = _id
    print(f"  [+] Dashboard: {name!r} (id={_id})")
    return _id

def create_insight(name: str, filters: dict, dashboard_ids: list[int]) -> int:
    if name in _existing_insights:
        print(f"  [skip] Insight already exists: {name!r}")
        # Still make sure it's on the dashboard
        iid = _existing_insights[name]
        patch(f"/insights/{iid}/", {"dashboards": dashboard_ids})
        return iid
    resp = post("/insights/", {
        "name": name,
        "filters": filters,
        "dashboards": dashboard_ids,
        "saved": True,
    })
    _id = resp["id"]
    _existing_insights[name] = _id
    print(f"  [+] Insight: {name!r} (id={_id})")
    return _id

def create_flag(key: str, name: str, rollout_pct: int = 0, active: bool = False) -> int:
    if key in _existing_flags:
        print(f"  [skip] Flag already exists: {key!r}")
        return _existing_flags[key]
    resp = post("/feature_flags/", {
        "key": key,
        "name": name,
        "active": active,
        "filters": {
            "groups": [{"properties": [], "rollout_percentage": rollout_pct}],
            "multivariate": None,
        },
    })
    _id = resp["id"]
    _existing_flags[key] = _id
    print(f"  [+] Flag: {key!r}  rollout={rollout_pct}%  active={active} (id={_id})")
    return _id

def create_cohort(name: str, description: str, filters: dict) -> int:
    if name in _existing_cohorts:
        print(f"  [skip] Cohort already exists: {name!r}")
        return _existing_cohorts[name]
    resp = post("/cohorts/", {
        "name": name,
        "description": description,
        "is_static": False,
        "filters": filters,
    })
    _id = resp["id"]
    _existing_cohorts[name] = _id
    print(f"  [+] Cohort: {name!r} (id={_id})")
    return _id

# ─── Filter builders ─────────────────────────────────────────────────────────

DATE = "-30d"

def trend(*events, breakdown=None, breakdown_type="event", math="total") -> dict:
    """Build a TRENDS filter."""
    ev_list = []
    for i, e in enumerate(events):
        if isinstance(e, str):
            ev_list.append({"id": e, "name": e, "type": "events", "math": math, "order": i})
        else:
            ev_list.append({**{"type": "events", "order": i, "math": math}, **e})
    f: dict = {"insight": "TRENDS", "events": ev_list, "date_from": DATE}
    if breakdown:
        f["breakdown"] = breakdown
        f["breakdown_type"] = breakdown_type
    return f

def funnel(*steps, window_days: int = 14, breakdown=None) -> dict:
    """Build a FUNNELS filter."""
    ev_list = [
        {"id": s if isinstance(s, str) else s["id"],
         "name": s if isinstance(s, str) else s.get("name", s["id"]),
         "type": "events",
         "order": i}
        for i, s in enumerate(steps)
    ]
    f: dict = {
        "insight": "FUNNELS",
        "events": ev_list,
        "funnel_window_interval": window_days,
        "funnel_window_interval_unit": "day",
        "date_from": DATE,
    }
    if breakdown:
        f["breakdown"] = breakdown
        f["breakdown_type"] = "event"
    return f

def retention(start_event: str, return_event: str, period: str = "Week") -> dict:
    return {
        "insight": "RETENTION",
        "retention_type": "retention_first_time",
        "returning_entity": {"id": return_event, "name": return_event, "type": "events"},
        "target_entity": {"id": start_event, "name": start_event, "type": "events"},
        "period": period,
        "date_from": DATE,
    }

# ─── Main build ──────────────────────────────────────────────────────────────

def build() -> None:
    _load_existing()

    # ════════════════════════════════════════════════════════════════════
    # DASHBOARD 1 — PRODUCT TRUTH
    # "Open this first. Tells you if the product is alive today."
    # ════════════════════════════════════════════════════════════════════
    print("\n── Dashboard 1: Product Truth ──────────────────────────────")
    d_truth = create_dashboard(
        "Product Truth",
        "One-glance health: activation rate, conversion rate, error rate, daily users. "
        "Open this every morning.",
    )

    create_insight("Daily Active Users (DAU)", trend(
        {"id": "$pageview", "name": "Unique Users", "math": "dau"},
    ), [d_truth])

    create_insight("New Signups per Day", trend(
        {"id": "signup_completed", "name": "Email Signup", "math": "total"},
        {"id": "google_signup_completed", "name": "Google Signup", "math": "total"},
    ), [d_truth])

    create_insight("Activation Funnel: Signup → First Job", funnel(
        "signup_completed",
        "file_selected",
        "processing_started",
        "job_completed",
        window_days=7,
    ), [d_truth])

    create_insight("Free-to-Paid Conversion Funnel", funnel(
        "paywall_shown",
        "upgrade_clicked",
        "plan_upgraded",
        window_days=14,
    ), [d_truth])

    create_insight("Job Success Rate (completed vs failed)", trend(
        {"id": "processing_finished", "name": "Succeeded", "math": "total"},
        {"id": "processing_failed",   "name": "Failed",    "math": "total"},
    ), [d_truth])

    create_insight("Paid User Activation (plan_upgraded → first job)", funnel(
        "plan_upgraded",
        "first_paid_job_completed",
        window_days=7,
    ), [d_truth])

    create_insight("Weekly Retention (first job → returns)", retention(
        "job_completed", "job_completed", period="Week",
    ), [d_truth])

    # ════════════════════════════════════════════════════════════════════
    # DASHBOARD 2 — FRICTION MAP
    # "Where do users get stuck, fail, or give up?"
    # ════════════════════════════════════════════════════════════════════
    print("\n── Dashboard 2: Friction Map ───────────────────────────────")
    d_friction = create_dashboard(
        "Friction Map",
        "Every place users drop off, fail, or see an error. "
        "Check when support tickets spike or conversion drops.",
    )

    create_insight("OTP Signup Drop-off Funnel", funnel(
        "signup_started",
        "otp_requested",
        "otp_verified",
        "signup_completed",
        window_days=1,
    ), [d_friction])

    create_insight("OTP Failure Reasons Breakdown", trend(
        {"id": "otp_failed", "name": "OTP Failed", "math": "total"},
        breakdown="reason",
    ), [d_friction])

    create_insight("Upload-to-Result Funnel (full pipeline)", funnel(
        "file_selected",
        "processing_started",
        "job_completed",
        "result_downloaded",
        window_days=1,
    ), [d_friction])

    create_insight("Processing Error Rate by Tool", trend(
        {"id": "processing_failed", "name": "Processing Failed", "math": "total"},
        breakdown="tool_type",
    ), [d_friction])

    create_insight("File Validation Failures by Reason", trend(
        {"id": "file_validation_failed", "name": "Validation Failed", "math": "total"},
        breakdown="reason",
    ), [d_friction])

    create_insight("Daily Cap / Soft Cap Hits", trend(
        {"id": "daily_cap_hit",  "name": "Daily Cap Hit",  "math": "total"},
        {"id": "soft_cap_shown", "name": "Soft Cap Shown", "math": "total"},
    ), [d_friction])

    create_insight("Login Failures per Day", trend(
        {"id": "login_failed",       "name": "Login Failed",       "math": "total"},
        {"id": "magic_login_failed", "name": "Magic Link Failed",  "math": "total"},
    ), [d_friction])

    create_insight("Payment Failures by Error Code", trend(
        {"id": "payment_failed", "name": "Payment Failed", "math": "total"},
        breakdown="error_code",
    ), [d_friction])

    # ════════════════════════════════════════════════════════════════════
    # DASHBOARD 3 — CONVERSION DRIVERS
    # "What actions do users take before (and instead of) upgrading?"
    # ════════════════════════════════════════════════════════════════════
    print("\n── Dashboard 3: Conversion Drivers ────────────────────────")
    d_conv = create_dashboard(
        "Conversion Drivers",
        "Feature usage, paywall triggers, and copy-gate events that predict whether "
        "a free user upgrades. Use this to decide what to A/B test.",
    )

    create_insight("Copy Gate → Upgrade Funnel", funnel(
        "copy_gate_limit",
        "upgrade_clicked",
        "plan_upgraded",
        window_days=7,
    ), [d_conv])

    create_insight("Paywall Shown by Reason", trend(
        {"id": "paywall_shown", "name": "Paywall Shown", "math": "total"},
        breakdown="reason",
    ), [d_conv])

    create_insight("Upgrade Click Source Breakdown", trend(
        {"id": "upgrade_clicked", "name": "Upgrade Clicked", "math": "total"},
        breakdown="source",
    ), [d_conv])

    create_insight("Tool Usage Distribution (job_completed by tool)", trend(
        {"id": "job_completed", "name": "Jobs", "math": "total"},
        breakdown="tool_type",
    ), [d_conv])

    create_insight("Result Download Format Preferences", trend(
        {"id": "result_downloaded", "name": "Downloaded", "math": "total"},
        breakdown="format",
    ), [d_conv])

    create_insight("YouTube vs File Upload Split", trend(
        {"id": "file_selected", "name": "File Selected", "math": "total"},
        breakdown="source",
    ), [d_conv])

    create_insight("Billing Period Toggle (monthly vs annual)", trend(
        {"id": "billing_period_toggled", "name": "Billing Toggle", "math": "total"},
        breakdown="annual",
    ), [d_conv])

    create_insight("Plan Selection at Pricing Page", trend(
        {"id": "plan_clicked", "name": "Plan Clicked", "math": "total"},
        breakdown="plan",
    ), [d_conv])

    # ════════════════════════════════════════════════════════════════════
    # DASHBOARD 4 — CHURN INTELLIGENCE
    # "Who is leaving, why, and when?"
    # ════════════════════════════════════════════════════════════════════
    print("\n── Dashboard 4: Churn Intelligence ────────────────────────")
    d_churn = create_dashboard(
        "Churn Intelligence",
        "Subscription cancellations, payment failures, renewals, and MRR signals. "
        "Check weekly and after every pricing change.",
    )

    create_insight("Subscription Lifecycle (cancelled vs renewed vs deleted)", trend(
        {"id": "subscription_renewed",   "name": "Renewed",   "math": "total"},
        {"id": "subscription_cancelled", "name": "Cancelled", "math": "total"},
        {"id": "subscription_deleted",   "name": "Deleted",   "math": "total"},
    ), [d_churn])

    create_insight("Net MRR Signal (subscription_renewed sum mrr_cents)", trend(
        {"id": "subscription_renewed", "name": "MRR (cents)",
         "math": "sum", "math_property": "mrr_cents"},
    ), [d_churn])

    create_insight("Payment Failures per Day", trend(
        {"id": "payment_failed", "name": "Payment Failed", "math": "total"},
    ), [d_churn])

    create_insight("Paid Activation Funnel (churn-risk check)", funnel(
        "plan_upgraded",
        "first_paid_job_completed",
        window_days=30,
    ), [d_churn])

    create_insight("Cancellation Reversals vs Final Deletions", trend(
        {"id": "subscription_cancellation_reversed", "name": "Reversed (saved)",  "math": "total"},
        {"id": "subscription_cancelled",             "name": "Cancelled",          "math": "total"},
        {"id": "subscription_deleted",               "name": "Deleted (churned)",  "math": "total"},
    ), [d_churn])

    create_insight("Plan Upgraded by Plan Type", trend(
        {"id": "plan_upgraded", "name": "Upgraded", "math": "total"},
        breakdown="plan",
    ), [d_churn])

    # ════════════════════════════════════════════════════════════════════
    # FEATURE FLAGS (A/B experiments)
    # ════════════════════════════════════════════════════════════════════
    print("\n── Feature Flags ───────────────────────────────────────────")

    create_flag(
        key="paywall-copy-variant-b",
        name="Paywall: Copy-focused variant (stronger urgency headline)",
        rollout_pct=0,
        active=False,
    )

    create_flag(
        key="onboarding-tool-picker",
        name="Onboarding: Show tool picker after signup (vs. direct to transcript tool)",
        rollout_pct=0,
        active=False,
    )

    create_flag(
        key="pricing-annual-first",
        name="Pricing page: Show annual toggle selected by default (vs. monthly first)",
        rollout_pct=0,
        active=False,
    )

    create_flag(
        key="ai-summary-free-teaser",
        name="Free users: Visible (blurred) AI summary teaser — measure click-to-upgrade",
        rollout_pct=100,
        active=True,
    )

    create_flag(
        key="batch-upload-beta",
        name="Batch upload: Early access flag for Pro users in beta (set via Person properties)",
        rollout_pct=0,
        active=False,
    )

    # ════════════════════════════════════════════════════════════════════
    # COHORTS (behavioral segments)
    # ════════════════════════════════════════════════════════════════════
    print("\n── Cohorts ─────────────────────────────────────────────────")

    # PostHog behavioral cohort format (v3 API)
    create_cohort(
        name="Paid but Never Activated (Churn Risk)",
        description="Users who upgraded in the last 14 days but never completed their first job. "
                    "Highest churn risk — trigger in-app nudge or retention email.",
        filters={
            "properties": {
                "type": "AND",
                "values": [
                    {
                        "type": "OR",
                        "values": [{
                            "key": "plan_upgraded",
                            "event_type": "events",
                            "time_value": 14,
                            "time_interval": "day",
                            "value": "performed",
                            "type": "behavioral",
                        }],
                    },
                    {
                        "type": "OR",
                        "values": [{
                            "key": "first_paid_job_completed",
                            "event_type": "events",
                            "time_value": 14,
                            "time_interval": "day",
                            "value": "not_performed",
                            "type": "behavioral",
                        }],
                    },
                ],
            }
        },
    )

    create_cohort(
        name="Copy-Gate Bounced (Upgrade Candidates)",
        description="Hit the copy limit in last 7 days but didn't upgrade. "
                    "Show a targeted discount or follow-up — highest intent free users.",
        filters={
            "properties": {
                "type": "AND",
                "values": [
                    {
                        "type": "OR",
                        "values": [{
                            "key": "copy_gate_limit",
                            "event_type": "events",
                            "time_value": 7,
                            "time_interval": "day",
                            "value": "performed",
                            "type": "behavioral",
                        }],
                    },
                    {
                        "type": "OR",
                        "values": [{
                            "key": "plan_upgraded",
                            "event_type": "events",
                            "time_value": 7,
                            "time_interval": "day",
                            "value": "not_performed",
                            "type": "behavioral",
                        }],
                    },
                ],
            }
        },
    )

    create_cohort(
        name="Active Free Users (Conversion Targets)",
        description="Completed 3+ jobs in last 14 days on free plan. "
                    "These are your hottest leads — they love the product but haven't paid.",
        filters={
            "properties": {
                "type": "AND",
                "values": [
                    {
                        "type": "OR",
                        "values": [{
                            "key": "job_completed",
                            "event_type": "events",
                            "time_value": 14,
                            "time_interval": "day",
                            "value": "performed",
                            "operator": "gte",
                            "count_operator": "gte",
                            "count": 3,
                            "type": "behavioral",
                        }],
                    },
                    {
                        "type": "OR",
                        "values": [{
                            "key": "plan",
                            "value": "free",
                            "type": "person",
                            "operator": "exact",
                        }],
                    },
                ],
            }
        },
    )

    # ════════════════════════════════════════════════════════════════════
    # DONE
    # ════════════════════════════════════════════════════════════════════
    print("\n" + "═" * 60)
    print("DONE — PostHog Product Intelligence System is live.")
    print("═" * 60)
    print("\nNext manual steps in PostHog UI:")
    print("  1. Session Replay filters:")
    print("     • Filter: paywall_shown AND NOT plan_upgraded  → watch who bounces")
    print("     • Filter: payment_failed                       → watch checkout UX")
    print("     • Filter: otp_failed                           → watch signup friction")
    print("     • Enable: mask all inputs (PII protection)")
    print()
    print("  2. Stripe webhook (required for payment_failed):")
    print("     • Stripe Dashboard → Developers → Webhooks → Add event: invoice.payment_failed")
    print()
    print("  3. PostHog Actions → New Action → 'Churned paying user':")
    print("     • Trigger: subscription_cancelled fires")
    print("     • Webhook to Slack: ping #alerts when a paid user cancels")
    print()
    print("  4. Person properties to set on identify():")
    print("     • plan, email, signup_source, created_at")
    print("     • These enable breakdowns by plan across ALL insights")

if __name__ == "__main__":
    build()
