#!/usr/bin/env python3
"""
VideoText.io — PostHog Product Intelligence System
====================================================
Creates all dashboards, funnels, insights, feature flags, and cohorts
using the PostHog HogQL Query API (v3+, the only format still accepted).

Usage (Windows):
    set POSTHOG_PERSONAL_KEY=phx_xxxxx && set POSTHOG_PROJECT_ID=307684 && python scripts\\posthog-intelligence.py

Usage (Mac/Linux):
    POSTHOG_PERSONAL_KEY=phx_xxxxx POSTHOG_PROJECT_ID=307684 python3 scripts/posthog-intelligence.py

How to get credentials:
    1. Personal API key  → PostHog → Settings → Personal API Keys → Create key (all scopes)
    2. Project ID        → any PostHog URL: app.posthog.com/project/XXXXX/...
    3. Host              → https://us.posthog.com  (US)  or  https://eu.posthog.com  (EU)

Idempotent: re-running skips anything already created by name.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

# ─── Config ──────────────────────────────────────────────────────────────────

PERSONAL_KEY = os.environ.get("POSTHOG_PERSONAL_KEY", "").strip()
PROJECT_ID   = os.environ.get("POSTHOG_PROJECT_ID", "").strip()
HOST         = os.environ.get("POSTHOG_HOST", "https://us.posthog.com").rstrip("/")

if not PERSONAL_KEY or not PROJECT_ID:
    print("ERROR: Set POSTHOG_PERSONAL_KEY and POSTHOG_PROJECT_ID before running.")
    print()
    print("  Windows:   set POSTHOG_PERSONAL_KEY=phx_xxx && set POSTHOG_PROJECT_ID=12345")
    print("  Mac/Linux: export POSTHOG_PERSONAL_KEY=phx_xxx POSTHOG_PROJECT_ID=12345")
    sys.exit(1)

BASE = f"{HOST}/api/projects/{PROJECT_ID}"
HEADERS = {
    "Authorization": f"Bearer {PERSONAL_KEY}",
    "Content-Type": "application/json",
}

# ─── HTTP helpers ─────────────────────────────────────────────────────────────

def _req(method: str, path: str, body: dict | None = None, retries: int = 3) -> dict:
    # path may be absolute (pagination) or relative
    url = path if path.startswith("http") else f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            body_bytes = e.read()
            body_text = body_bytes.decode(errors="replace")
            if e.code == 429:
                wait = 2 ** (attempt + 1)
                print(f"    Rate-limited — waiting {wait}s ...")
                time.sleep(wait)
                continue
            print(f"    HTTP {e.code} on {method} {url}")
            print(f"    Response: {body_text[:400]}")
            raise
        except urllib.error.URLError as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
    raise RuntimeError(f"Failed after {retries} retries: {method} {url}")

def get(path: str)                   -> dict: return _req("GET",   path)
def post(path: str, body: dict)      -> dict: return _req("POST",  path, body)
def patch(path: str, body: dict)     -> dict: return _req("PATCH", path, body)

def list_all(path: str) -> list:
    results, url = [], path
    while url:
        data = _req("GET", url)
        results.extend(data.get("results", []))
        nxt = data.get("next")
        url = nxt if nxt else None
    return results

# ─── Idempotency ─────────────────────────────────────────────────────────────

_dash:    dict[str, int] = {}
_insight: dict[str, int] = {}
_flag:    dict[str, int] = {}
_cohort:  dict[str, int] = {}

def _load_existing() -> None:
    print("Loading existing PostHog resources ...")
    for d in list_all("/dashboards/"):
        _dash[d["name"]] = d["id"]
    for i in list_all("/insights/?saved=true"):
        _insight[i["name"]] = i["id"]
    for f in list_all("/feature_flags/"):
        _flag[f["key"]] = f["id"]
    for c in list_all("/cohorts/"):
        _cohort[c["name"]] = c["id"]
    print(f"  Found: {len(_dash)} dashboards, {len(_insight)} insights, "
          f"{len(_flag)} flags, {len(_cohort)} cohorts\n")

def make_dashboard(name: str, description: str) -> int:
    if name in _dash:
        print(f"  [skip] Dashboard: {name!r}  (id={_dash[name]})")
        return _dash[name]
    resp = post("/dashboards/", {"name": name, "description": description})
    _id = resp["id"]
    _dash[name] = _id
    print(f"  [+]   Dashboard: {name!r}  (id={_id})")
    return _id

def make_insight(name: str, query: dict, dash_ids: list[int]) -> int:
    if name in _insight:
        iid = _insight[name]
        print(f"  [skip] Insight:   {name!r}  (id={iid})")
        # Best-effort: attach to dashboard in case it's missing
        try:
            patch(f"/insights/{iid}/", {"dashboards": dash_ids})
        except Exception:
            pass
        return iid
    resp = post("/insights/", {
        "name":       name,
        "query":      query,
        "dashboards": dash_ids,
        "saved":      True,
    })
    _id = resp["id"]
    _insight[name] = _id
    print(f"  [+]   Insight:   {name!r}  (id={_id})")
    return _id

def make_flag(key: str, name: str, rollout: int = 0, active: bool = False) -> int:
    if key in _flag:
        print(f"  [skip] Flag:      {key!r}")
        return _flag[key]
    resp = post("/feature_flags/", {
        "key": key, "name": name, "active": active,
        "filters": {"groups": [{"properties": [], "rollout_percentage": rollout}]},
    })
    _id = resp["id"]
    _flag[key] = _id
    print(f"  [+]   Flag:      {key!r}  rollout={rollout}%  active={active}")
    return _id

def make_cohort(name: str, description: str, filters: dict) -> int:
    if name in _cohort:
        print(f"  [skip] Cohort:    {name!r}")
        return _cohort[name]
    resp = post("/cohorts/", {
        "name": name, "description": description,
        "is_static": False, "filters": filters,
    })
    _id = resp["id"]
    _cohort[name] = _id
    print(f"  [+]   Cohort:    {name!r}  (id={_id})")
    return _id

# ─── HogQL Query builders (v3+ format) ───────────────────────────────────────
# PostHog deprecated the legacy "filters" field. All insights must use "query".

DATE = "-30d"

def _event_node(e: str | dict, math: str = "total", math_property: str | None = None) -> dict:
    if isinstance(e, str):
        node: dict = {"kind": "EventsNode", "event": e, "name": e, "math": math}
    else:
        node = {
            "kind":  "EventsNode",
            "event": e.get("id", e.get("event", "")),
            "name":  e.get("name", e.get("id", e.get("event", ""))),
            "math":  e.get("math", math),
        }
        if e.get("math_property"):
            node["math_property"] = e["math_property"]
        elif math_property:
            node["math_property"] = math_property
    return node

def trend(*events, breakdown: str | None = None, breakdown_type: str = "event",
          date_from: str = DATE) -> dict:
    """TRENDS InsightVizNode."""
    series = [_event_node(e) for e in events]
    source: dict = {
        "kind":      "TrendsQuery",
        "series":    series,
        "dateRange": {"date_from": date_from},
    }
    if breakdown:
        source["breakdownFilter"] = {
            "breakdown":      breakdown,
            "breakdown_type": breakdown_type,
        }
    return {"kind": "InsightVizNode", "source": source}

def funnel(*steps, window_days: int = 14, date_from: str = DATE) -> dict:
    """FUNNELS InsightVizNode."""
    series = []
    for s in steps:
        if isinstance(s, str):
            series.append({"kind": "EventsNode", "event": s, "name": s})
        else:
            series.append({
                "kind":  "EventsNode",
                "event": s.get("id", s.get("event", "")),
                "name":  s.get("name", s.get("id", "")),
            })
    return {
        "kind": "InsightVizNode",
        "source": {
            "kind":      "FunnelsQuery",
            "series":    series,
            "dateRange": {"date_from": date_from},
            "funnelsFilter": {
                "funnelWindowInterval":     window_days,
                "funnelWindowIntervalUnit": "day",
            },
        },
    }

def retention(start: str, returning: str, period: str = "Week",
              date_from: str = DATE) -> dict:
    """RETENTION InsightVizNode."""
    return {
        "kind": "InsightVizNode",
        "source": {
            "kind":      "RetentionQuery",
            "dateRange": {"date_from": date_from},
            "retentionFilter": {
                "retentionType":    "retention_first_time",
                "period":           period,
                "targetEntity":     {"id": start,     "name": start,     "type": "events"},
                "returningEntity":  {"id": returning,  "name": returning,  "type": "events"},
                "totalIntervals":   8,
            },
        },
    }

# ─── Build ────────────────────────────────────────────────────────────────────

def build() -> None:
    _load_existing()

    # ══════════════════════════════════════════════════════════════════
    # DASHBOARD 1 — PRODUCT TRUTH
    # Open this every morning to see if the product is alive.
    # ══════════════════════════════════════════════════════════════════
    print("── Dashboard 1: Product Truth ──────────────────────────────")
    d1 = make_dashboard(
        "Product Truth",
        "One-glance health: DAU, activation rate, conversion rate, job success rate. "
        "Open every morning. If one number is wrong, something broke.",
    )

    make_insight("DAU — Unique users per day", trend(
        {"id": "$pageview", "name": "Unique Users", "math": "dau"},
    ), [d1])

    make_insight("New signups per day (email + Google)", trend(
        {"id": "signup_completed",        "name": "Email signup",  "math": "total"},
        {"id": "google_signup_completed", "name": "Google signup", "math": "total"},
    ), [d1])

    make_insight("Activation funnel: signup → file → job done", funnel(
        "signup_completed",
        "file_selected",
        "processing_started",
        "job_completed",
        window_days=7,
    ), [d1])

    make_insight("Free-to-paid conversion funnel", funnel(
        "paywall_shown",
        "upgrade_clicked",
        "plan_upgraded",
        window_days=14,
    ), [d1])

    make_insight("Job success vs failure rate", trend(
        {"id": "processing_finished", "name": "Succeeded", "math": "total"},
        {"id": "processing_failed",   "name": "Failed",    "math": "total"},
    ), [d1])

    make_insight("Paid user activation (plan_upgraded → first job)", funnel(
        "plan_upgraded",
        "first_paid_job_completed",
        window_days=7,
    ), [d1])

    make_insight("Weekly retention after first job", retention(
        "job_completed", "job_completed", period="Week",
    ), [d1])

    # ══════════════════════════════════════════════════════════════════
    # DASHBOARD 2 — FRICTION MAP
    # Where do users get stuck, fail, or give up?
    # ══════════════════════════════════════════════════════════════════
    print("\n── Dashboard 2: Friction Map ───────────────────────────────")
    d2 = make_dashboard(
        "Friction Map",
        "Every place users drop off, fail, or see an error. "
        "Check when support tickets spike or conversion drops unexpectedly.",
    )

    make_insight("OTP signup drop-off funnel", funnel(
        "signup_started",
        "otp_requested",
        "otp_verified",
        "signup_completed",
        window_days=1,
    ), [d2])

    make_insight("OTP failure reasons breakdown", trend(
        {"id": "otp_failed", "name": "OTP Failed", "math": "total"},
        breakdown="reason",
    ), [d2])

    make_insight("Upload-to-result pipeline funnel", funnel(
        "file_selected",
        "processing_started",
        "job_completed",
        "result_downloaded",
        window_days=1,
    ), [d2])

    make_insight("Processing failures by tool type", trend(
        {"id": "processing_failed", "name": "Failed jobs", "math": "total"},
        breakdown="tool_type",
    ), [d2])

    make_insight("File validation failures by reason", trend(
        {"id": "file_validation_failed", "name": "Validation Failed", "math": "total"},
        breakdown="reason",
    ), [d2])

    make_insight("Daily cap + soft cap hits", trend(
        {"id": "daily_cap_hit",  "name": "Daily cap hit",  "math": "total"},
        {"id": "soft_cap_shown", "name": "Soft cap shown", "math": "total"},
    ), [d2])

    make_insight("Login and magic link failures", trend(
        {"id": "login_failed",       "name": "Login failed",       "math": "total"},
        {"id": "magic_login_failed", "name": "Magic link failed",  "math": "total"},
    ), [d2])

    make_insight("Payment failures by Stripe error code", trend(
        {"id": "payment_failed", "name": "Payment Failed", "math": "total"},
        breakdown="error_code",
    ), [d2])

    # ══════════════════════════════════════════════════════════════════
    # DASHBOARD 3 — CONVERSION DRIVERS
    # What actions predict or cause upgrades?
    # ══════════════════════════════════════════════════════════════════
    print("\n── Dashboard 3: Conversion Drivers ────────────────────────")
    d3 = make_dashboard(
        "Conversion Drivers",
        "Feature usage, paywall triggers, and copy-gate events that predict upgrade. "
        "Use this to decide what to A/B test next.",
    )

    make_insight("Copy gate → upgrade funnel", funnel(
        "copy_gate_limit",
        "upgrade_clicked",
        "plan_upgraded",
        window_days=7,
    ), [d3])

    make_insight("Paywall shown by trigger reason", trend(
        {"id": "paywall_shown", "name": "Paywall Shown", "math": "total"},
        breakdown="reason",
    ), [d3])

    make_insight("Upgrade click source breakdown", trend(
        {"id": "upgrade_clicked", "name": "Upgrade Clicked", "math": "total"},
        breakdown="source",
    ), [d3])

    make_insight("Tool usage distribution (jobs by tool)", trend(
        {"id": "job_completed", "name": "Jobs Completed", "math": "total"},
        breakdown="tool_type",
    ), [d3])

    make_insight("Download format preferences", trend(
        {"id": "result_downloaded", "name": "Downloads", "math": "total"},
        breakdown="format",
    ), [d3])

    make_insight("YouTube URL vs file upload split", trend(
        {"id": "file_selected", "name": "File Selected", "math": "total"},
        breakdown="source",
    ), [d3])

    make_insight("Monthly vs annual billing toggle", trend(
        {"id": "billing_period_toggled", "name": "Billing Toggle", "math": "total"},
        breakdown="annual",
    ), [d3])

    make_insight("Plan card clicks at pricing page", trend(
        {"id": "plan_clicked", "name": "Plan Clicked", "math": "total"},
        breakdown="plan",
    ), [d3])

    # ══════════════════════════════════════════════════════════════════
    # DASHBOARD 4 — CHURN INTELLIGENCE
    # Who is leaving, why, and when?
    # ══════════════════════════════════════════════════════════════════
    print("\n── Dashboard 4: Churn Intelligence ────────────────────────")
    d4 = make_dashboard(
        "Churn Intelligence",
        "Cancellations, payment failures, renewals, MRR signal. "
        "Check weekly and immediately after any pricing change.",
    )

    make_insight("Subscription lifecycle (renewed vs cancelled vs deleted)", trend(
        {"id": "subscription_renewed",   "name": "Renewed",   "math": "total"},
        {"id": "subscription_cancelled", "name": "Cancelled", "math": "total"},
        {"id": "subscription_deleted",   "name": "Deleted",   "math": "total"},
    ), [d4])

    make_insight("MRR signal — sum of mrr_cents on renewals", trend(
        {"id": "subscription_renewed", "name": "MRR (cents)", "math": "sum",
         "math_property": "mrr_cents"},
    ), [d4])

    make_insight("Payment failures per day", trend(
        {"id": "payment_failed", "name": "Payment Failed", "math": "total"},
    ), [d4])

    make_insight("Churn risk: paid activation funnel (30d window)", funnel(
        "plan_upgraded",
        "first_paid_job_completed",
        window_days=30,
    ), [d4])

    make_insight("Cancellation reversals vs final churn", trend(
        {"id": "subscription_cancellation_reversed", "name": "Reversed (saved)", "math": "total"},
        {"id": "subscription_cancelled",             "name": "Cancelled",         "math": "total"},
        {"id": "subscription_deleted",               "name": "Churned",           "math": "total"},
    ), [d4])

    make_insight("Upgrades by plan tier", trend(
        {"id": "plan_upgraded", "name": "Upgraded", "math": "total"},
        breakdown="plan",
    ), [d4])

    # ══════════════════════════════════════════════════════════════════
    # FEATURE FLAGS
    # ══════════════════════════════════════════════════════════════════
    print("\n── Feature Flags ───────────────────────────────────────────")

    make_flag(
        key="paywall-copy-variant-b",
        name="Paywall: Variant B — stronger urgency headline (A/B test vs default)",
        rollout=0, active=False,
    )
    make_flag(
        key="onboarding-tool-picker",
        name="Onboarding: Show tool picker after signup instead of landing on transcript tool",
        rollout=0, active=False,
    )
    make_flag(
        key="pricing-annual-first",
        name="Pricing page: Default to annual toggle selected (vs monthly first)",
        rollout=0, active=False,
    )
    make_flag(
        key="ai-summary-free-teaser",
        name="Free users: Show blurred AI summary teaser — measures click-to-upgrade intent",
        rollout=100, active=True,
    )
    make_flag(
        key="batch-upload-beta",
        name="Batch upload: Early access for Pro users in beta (enable via Person properties)",
        rollout=0, active=False,
    )

    # ══════════════════════════════════════════════════════════════════
    # BEHAVIORAL COHORTS
    # ══════════════════════════════════════════════════════════════════
    print("\n── Cohorts ─────────────────────────────────────────────────")

    make_cohort(
        name="Paid but Never Activated — Churn Risk",
        description="Upgraded in last 14 days but never completed their first paid job. "
                    "These users are most likely to cancel. Trigger a nudge email or in-app prompt.",
        filters={
            "properties": {
                "type": "AND",
                "values": [
                    {"type": "OR", "values": [{
                        "key": "plan_upgraded", "event_type": "events",
                        "time_value": 14, "time_interval": "day",
                        "value": "performed", "type": "behavioral",
                    }]},
                    {"type": "OR", "values": [{
                        "key": "first_paid_job_completed", "event_type": "events",
                        "time_value": 14, "time_interval": "day",
                        "value": "not_performed", "type": "behavioral",
                    }]},
                ],
            }
        },
    )

    make_cohort(
        name="Copy-Gate Bounced — Upgrade Candidates",
        description="Hit the free copy limit in last 7 days but didn't upgrade. "
                    "Highest-intent free users. Show a targeted discount or follow-up message.",
        filters={
            "properties": {
                "type": "AND",
                "values": [
                    {"type": "OR", "values": [{
                        "key": "copy_gate_limit", "event_type": "events",
                        "time_value": 7, "time_interval": "day",
                        "value": "performed", "type": "behavioral",
                    }]},
                    {"type": "OR", "values": [{
                        "key": "plan_upgraded", "event_type": "events",
                        "time_value": 7, "time_interval": "day",
                        "value": "not_performed", "type": "behavioral",
                    }]},
                ],
            }
        },
    )

    make_cohort(
        name="Active Free Users — Hot Conversion Targets",
        description="Completed 3+ jobs in last 14 days on the free plan. "
                    "They love the product but haven't paid. Best candidates for upgrade nudges.",
        filters={
            "properties": {
                "type": "AND",
                "values": [
                    {"type": "OR", "values": [{
                        "key": "job_completed", "event_type": "events",
                        "time_value": 14, "time_interval": "day",
                        "value": "performed",
                        "type": "behavioral",
                    }]},
                    {"type": "OR", "values": [{
                        "key": "plan", "value": ["free"],
                        "type": "person", "operator": "exact",
                    }]},
                ],
            }
        },
    )

    # ══════════════════════════════════════════════════════════════════
    print("\n" + "═" * 62)
    print("  DONE — PostHog Product Intelligence System is live.")
    print("═" * 62)
    print("""
Manual steps remaining in PostHog UI:
──────────────────────────────────────
1. Session Replay filters (PostHog → Session Replay → Filters):
   • paywall_shown AND NOT plan_upgraded  → watch who bounces at paywall
   • payment_failed                       → watch checkout failure UX
   • otp_failed                           → watch signup drop-off
   → Enable: Mask all text inputs (PII protection)

2. Stripe webhook (required for payment_failed events):
   → Stripe Dashboard → Developers → Webhooks → your endpoint
   → Add event: invoice.payment_failed

3. Slack alert for churned paying users:
   → PostHog → Data Management → Actions → New Action
   → Trigger: subscription_cancelled event fires
   → Notification: POST to Slack #alerts webhook

4. Verify POSTHOG_KEY is set in production env:
   Key: phc_XukQF4dDye0jwY78pl6H7w0xQPUqWJWsHrlXaJP9LEA
   Without this, no events flow and all dashboards stay at zero.
""")

if __name__ == "__main__":
    build()
