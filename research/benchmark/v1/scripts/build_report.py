"""Build the single aggregate report artifact
(results/aggregate/benchmark_v1_report.json) that the research page renders
from. This is the ONLY file the page reads numbers out of — no number in
the page's source code is manually typed.
"""
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULTS_AGGREGATE_DIR = ROOT / "results" / "aggregate"
RESULTS_RAW_DIR = ROOT / "results" / "raw"
PROTOCOL_PATH = ROOT / "protocol.json"
DATASET_HASH_PATH = ROOT / "datasets" / "dataset_hash.json"
OUT_PATH = RESULTS_AGGREGATE_DIR / "benchmark_v1_report.json"

ALL_SYSTEMS = [
    "videotext_production",
    "whisper_baseline_opensource",
    "openai_whisper_api",
    "deepgram",
    "assemblyai",
]


def system_status(system: str) -> dict:
    skipped_path = RESULTS_RAW_DIR / system / "SKIPPED.json"
    agg_path = RESULTS_AGGREGATE_DIR / f"{system}.json"
    if skipped_path.exists():
        return {"status": "not_evaluated", "reason": json.loads(skipped_path.read_text())["reason"]}
    if agg_path.exists():
        return {"status": "evaluated", "results": json.loads(agg_path.read_text())}
    return {"status": "not_evaluated", "reason": "no run recorded"}


def main():
    protocol = json.loads(PROTOCOL_PATH.read_text())
    dataset_hash = json.loads(DATASET_HASH_PATH.read_text())

    systems = {system: system_status(system) for system in ALL_SYSTEMS}
    n_evaluated = sum(1 for s in systems.values() if s["status"] == "evaluated")

    report = {
        "report_generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "protocol_version": protocol["protocol_version"],
        "protocol_git_tag": protocol["git_tag"],
        "dataset_hash": dataset_hash["dataset_hash"],
        "dataset_summary": {
            "n_files": dataset_hash["n_files"],
            "n_conditions": dataset_hash["n_conditions"],
            "conditions": dataset_hash["conditions"],
        },
        "systems_evaluated_count": n_evaluated,
        "systems_total_planned": len(ALL_SYSTEMS),
        "benchmark_complete": False,
        "completeness_note": (
            f"{n_evaluated} of {len(ALL_SYSTEMS)} planned systems evaluated across "
            f"{dataset_hash['n_conditions']} speech conditions. This benchmark is NOT "
            "complete and must not be cited as a finished multi-system comparison until "
            "more systems are executed."
        ),
        "systems": systems,
        "known_gaps_not_fabricated": protocol["known_gaps_not_fabricated"],
    }

    OUT_PATH.write_text(json.dumps(report, indent=2))
    print(f"Wrote {OUT_PATH}")
    print(f"Systems evaluated: {n_evaluated}/{len(ALL_SYSTEMS)}")


if __name__ == "__main__":
    main()
