"""Condition: accented_speech.
Source: VCTK Corpus v0.92 (CC BY 4.0, University of Edinburgh CSTR).
Ground truth: verbatim prompt text shipped with the corpus (txt/<speaker>/*.txt),
read from a small range-request subset (download_vctk_subset.py) rather than
the full 11GB archive. Accent labels are the corpus's own speaker-info.txt
tags, not our classification.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_ROOT = ROOT.parent
RAW_MANIFEST = ROOT / "datasets" / "raw" / "vctk" / "vctk_raw_manifest.jsonl"
OUT_DIR = ROOT / "datasets" / "prepared" / "accented_speech"
CONDITION = "accented_speech"

OUT_DIR.mkdir(parents=True, exist_ok=True)


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main():
    raw_rows = [json.loads(l) for l in RAW_MANIFEST.read_text().splitlines()]
    manifest = []
    for row in raw_rows:
        flac_path = ROOT / row["source_flac_path"]
        wav_path = OUT_DIR / f"{row['id']}.wav"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(flac_path), "-ar", "16000", "-ac", "1", str(wav_path)],
            check=True,
        )
        manifest.append({
            "id": row["id"],
            "condition": CONDITION,
            "speaker_id": row["speaker_id"],
            "accent": row["accent"],
            "region": row["region"],
            "reference_text": row["reference_text"],
            "audio_path": str(wav_path.relative_to(BENCHMARK_ROOT)),
            "duration_sec": round(ffprobe_duration(wav_path), 3),
            "source_dataset": "VCTK Corpus v0.92",
            "source_license": "CC BY 4.0 (University of Edinburgh, CSTR)",
            "source_url": "https://datashare.ed.ac.uk/handle/10283/3443",
            "ground_truth_provenance": "verbatim corpus prompt text (txt/<speaker>/*.txt)",
        })

    manifest_path = OUT_DIR / "manifest.jsonl"
    with manifest_path.open("w") as f:
        for r in manifest:
            f.write(json.dumps(r) + "\n")
    accents = sorted(set(r["accent"] for r in manifest))
    total_dur = sum(r["duration_sec"] for r in manifest)
    print(f"[{CONDITION}] {len(manifest)} utterances, {total_dur:.1f}s, accents={accents} -> {manifest_path}")


if __name__ == "__main__":
    main()
