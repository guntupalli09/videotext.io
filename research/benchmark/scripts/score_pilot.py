"""Score Whisper-baseline outputs against LibriSpeech ground truth.

Writes:
  results/pilot_results.csv   - per-utterance scores (for the public CSV download)
  results/pilot_summary.json  - aggregate stats consumed by the research page
"""
import csv
import json
import statistics
from pathlib import Path

from wer import word_error_rate

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "pilot_manifest.jsonl"
OUTPUTS = ROOT / "results" / "whisper_baseline_outputs.jsonl"
CSV_OUT = ROOT / "results" / "pilot_results.csv"
SUMMARY_OUT = ROOT / "results" / "pilot_summary.json"


def load_jsonl(path: Path):
    return [json.loads(line) for line in path.read_text().splitlines()]


def main():
    refs = {r["id"]: r for r in load_jsonl(MANIFEST)}
    hyps = {h["id"]: h for h in load_jsonl(OUTPUTS)}

    rows = []
    for uid, ref in refs.items():
        hyp = hyps[uid]
        scored = word_error_rate(ref["reference_text"], hyp["hypothesis_text"])
        rows.append({
            "id": uid,
            "speaker_id": ref["speaker_id"],
            "duration_sec": ref["duration_sec"],
            "processing_sec": hyp["processing_sec"],
            "reference_words": scored.reference_words,
            "substitutions": scored.substitutions,
            "deletions": scored.deletions,
            "insertions": scored.insertions,
            "wer_pct": round(scored.wer * 100, 2),
            "reference_text": ref["reference_text"],
            "hypothesis_text": hyp["hypothesis_text"],
            "model": hyp["model"],
        })

    with CSV_OUT.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    wers = [r["wer_pct"] for r in rows]
    total_ref_words = sum(r["reference_words"] for r in rows)
    total_errors = sum(r["substitutions"] + r["deletions"] + r["insertions"] for r in rows)
    total_audio_sec = sum(r["duration_sec"] for r in rows)
    total_proc_sec = sum(r["processing_sec"] for r in rows)

    summary = {
        "condition": "clean_read_speech_single_speaker",
        "dataset": "LibriSpeech test-clean (public domain, professionally aligned)",
        "model": rows[0]["model"],
        "n_utterances": len(rows),
        "n_speakers": len(set(r["speaker_id"] for r in rows)),
        "total_audio_sec": round(total_audio_sec, 1),
        "corpus_wer_pct": round(100 * total_errors / total_ref_words, 2),
        "mean_utterance_wer_pct": round(statistics.mean(wers), 2),
        "median_utterance_wer_pct": round(statistics.median(wers), 2),
        "realtime_factor": round(total_audio_sec / total_proc_sec, 2),
    }

    with SUMMARY_OUT.open("w") as f:
        json.dump(summary, f, indent=2)

    print(json.dumps(summary, indent=2))
    print(f"\nPer-utterance CSV: {CSV_OUT}")


if __name__ == "__main__":
    main()
