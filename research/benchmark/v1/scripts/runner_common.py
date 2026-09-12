"""Shared helpers for all system runners.

Every runner follows the same contract:
  - Read datasets/dataset_manifest.jsonl (the frozen, hashed manifest).
  - For each utterance, either write results/raw/<system>/<condition>/<id>.json
    (raw vendor response + settings + timestamp + model version) or record a
    failure — never fabricate a result.
  - If credentials are missing, write results/raw/<system>/SKIPPED.json once
    and exit without touching any utterance — no partial/fake run.
"""
import json
import os
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_ROOT = ROOT.parent
MANIFEST_PATH = ROOT / "datasets" / "dataset_manifest.jsonl"
RESULTS_RAW_DIR = ROOT / "results" / "raw"


def load_manifest() -> list[dict]:
    return [json.loads(line) for line in MANIFEST_PATH.read_text().splitlines()]


def write_skipped(system: str, reason: str):
    out_dir = RESULTS_RAW_DIR / system
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "SKIPPED.json").write_text(json.dumps({
        "system": system,
        "status": "skipped",
        "reason": reason,
        "recorded_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }, indent=2))
    print(f"[{system}] SKIPPED: {reason}")


def write_raw_result(system: str, condition: str, utt_id: str, record: dict):
    out_dir = RESULTS_RAW_DIR / system / condition
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"{utt_id}.json").write_text(json.dumps(record, indent=2))


def require_env(var_name: str) -> str | None:
    return os.environ.get(var_name) or None


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
