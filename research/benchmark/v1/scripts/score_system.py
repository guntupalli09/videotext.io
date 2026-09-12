"""Score one system's raw outputs against the frozen dataset manifest,
applying the frozen metric implementations (PROTOCOL.md). Writes:
  results/scored/<system>.csv        - per-utterance scores, all metrics that apply
  results/aggregate/<system>.json    - per-condition aggregates with bootstrap CIs
"""
import csv
import json
import sys
from pathlib import Path

from wer import word_error_rate
from score_diarization import Segment, diarization_error_rate
from punctuation import punctuation_score
from bootstrap import bootstrap_ci

ROOT = Path(__file__).resolve().parent.parent
RESULTS_RAW_DIR = ROOT / "results" / "raw"
RESULTS_SCORED_DIR = ROOT / "results" / "scored"
RESULTS_AGGREGATE_DIR = ROOT / "results" / "aggregate"
MANIFEST_PATH = ROOT / "datasets" / "dataset_manifest.jsonl"

PUNCTUATION_CONDITIONS = {"accented_speech"}
DIARIZATION_CONDITIONS = {"multi_speaker_sequential_synthetic"}

RESULTS_SCORED_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_AGGREGATE_DIR.mkdir(parents=True, exist_ok=True)


def load_manifest_by_id() -> dict[str, dict]:
    rows = [json.loads(l) for l in MANIFEST_PATH.read_text().splitlines()]
    return {r["id"]: r for r in rows}


def extract_hypothesis_text(raw_record: dict, system: str) -> str | None:
    if raw_record.get("http_status") != 200 and raw_record.get("vendor_status") not in (None, "completed"):
        return None
    resp = raw_record.get("raw_response")
    if resp is None:
        return raw_record.get("transcript_text")  # videotext_production fallback
    if isinstance(resp, dict):
        if "text" in resp:  # whisper baseline / openai
            return resp["text"]
        if "results" in resp:  # deepgram shape
            try:
                return resp["results"]["channels"][0]["alternatives"][0]["transcript"]
            except (KeyError, IndexError):
                return None
        if "text" in resp.get("data", {}):  # generic fallback
            return resp["data"]["text"]
    return None


def score_system(system: str):
    manifest = load_manifest_by_id()
    raw_dir = RESULTS_RAW_DIR / system
    if not raw_dir.exists() or (raw_dir / "SKIPPED.json").exists():
        print(f"[{system}] not evaluated (skipped or no raw output present)")
        return

    rows = []
    failures = []
    for condition_dir in sorted(p for p in raw_dir.iterdir() if p.is_dir()):
        condition = condition_dir.name
        for raw_file in sorted(condition_dir.glob("*.json")):
            utt_id = raw_file.stem
            ref_row = manifest.get(utt_id)
            if ref_row is None:
                continue
            raw_record = json.loads(raw_file.read_text())
            hypothesis_text = extract_hypothesis_text(raw_record, system)
            if hypothesis_text is None:
                failures.append({"id": utt_id, "condition": condition, "error": raw_record.get("error", "no hypothesis text extracted")})
                continue

            reference_text = ref_row["reference_text"]
            wer_result = word_error_rate(reference_text, hypothesis_text)

            row = {
                "system": system,
                "condition": condition,
                "id": utt_id,
                "reference_words": wer_result.reference_words,
                "wer_errors": wer_result.errors,
                "wer_pct": round(wer_result.wer * 100, 2),
                "duration_sec": ref_row["duration_sec"],
                "processing_sec": raw_record.get("processing_sec"),
                "rtf": round(ref_row["duration_sec"] / raw_record["processing_sec"], 3) if raw_record.get("processing_sec") else None,
                "punctuation_terminal_f1": None,
                "punctuation_comma_f1": None,
            }

            if condition in PUNCTUATION_CONDITIONS:
                punct = punctuation_score(reference_text, hypothesis_text)
                row["punctuation_terminal_f1"] = punct.terminal_f1
                row["punctuation_comma_f1"] = punct.comma_f1

            rows.append(row)

    if not rows:
        print(f"[{system}] no scoreable rows")
        return

    csv_path = RESULTS_SCORED_DIR / f"{system}.csv"
    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    # Aggregate per condition.
    by_condition: dict[str, list[dict]] = {}
    for r in rows:
        by_condition.setdefault(r["condition"], []).append(r)

    condition_aggregates = {}
    for condition, crows in by_condition.items():
        wer_pairs = [(r["wer_errors"], r["reference_words"]) for r in crows]
        wer_ci = bootstrap_ci(wer_pairs, n_resamples=2000)
        rtfs = [r["rtf"] for r in crows if r["rtf"]]

        agg = {
            "n_utterances": len(crows),
            "total_audio_sec": round(sum(r["duration_sec"] for r in crows), 1),
            "wer": {
                "corpus_pct": round(wer_ci.point_estimate * 100, 2),
                "ci95_low_pct": round(wer_ci.ci_low * 100, 2),
                "ci95_high_pct": round(wer_ci.ci_high * 100, 2),
                "mean_utterance_pct": round(sum(r["wer_pct"] for r in crows) / len(crows), 2),
                "median_utterance_pct": sorted(r["wer_pct"] for r in crows)[len(crows) // 2],
            },
            "rtf_mean": round(sum(rtfs) / len(rtfs), 2) if rtfs else None,
            "punctuation": "not_applicable",
            "diarization": "not_applicable",
            "timestamp_error": "not_applicable (no word-level forced-alignment ground truth in v1 dataset)",
            "cost_per_audio_hour_usd": "not_applicable (local open-source model, no per-minute vendor price)" if system == "whisper_baseline_opensource" else "not_yet_evaluated",
        }
        if condition in PUNCTUATION_CONDITIONS:
            p_f1s = [r["punctuation_terminal_f1"] for r in crows if r["punctuation_terminal_f1"] is not None]
            agg["punctuation"] = {
                "terminal_f1_mean": round(sum(p_f1s) / len(p_f1s), 3) if p_f1s else None,
            }
        condition_aggregates[condition] = agg

    failures_path = RESULTS_RAW_DIR / system / "failures.json"
    failures_path.write_text(json.dumps(failures, indent=2))

    aggregate_record = {
        "system": system,
        "n_scored_utterances": len(rows),
        "n_failures": len(failures),
        "conditions": condition_aggregates,
    }
    (RESULTS_AGGREGATE_DIR / f"{system}.json").write_text(json.dumps(aggregate_record, indent=2))
    print(f"[{system}] scored {len(rows)} utterances, {len(failures)} failures -> {csv_path}")
    print(json.dumps(condition_aggregates, indent=2))


if __name__ == "__main__":
    systems = sys.argv[1:] or [d.name for d in RESULTS_RAW_DIR.iterdir() if d.is_dir()]
    for system in systems:
        score_system(system)
