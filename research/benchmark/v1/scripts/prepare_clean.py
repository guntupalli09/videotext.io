"""Condition: clean_read_speech.
Source: LibriSpeech test-clean (CC BY 4.0, Vassil Panayotov 2014).
Ground truth: verbatim from the corpus's own .trans.txt files (not manufactured).
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_ROOT = ROOT.parent
LIBRISPEECH = BENCHMARK_ROOT / "data" / "LibriSpeech" / "test-clean"
OUT_DIR = ROOT / "datasets" / "prepared" / "clean_read_speech"
FILES_PER_CHAPTER = 5
CONDITION = "clean_read_speech"

OUT_DIR.mkdir(parents=True, exist_ok=True)


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main():
    manifest = []
    trans_files = sorted(LIBRISPEECH.glob("*/*/*.trans.txt"))
    for trans_file in trans_files:
        speaker_id, chapter_id = trans_file.parent.parts[-2:]
        lines = trans_file.read_text().splitlines()[:FILES_PER_CHAPTER]
        for line in lines:
            utt_id, text = line.split(" ", 1)
            flac_path = trans_file.parent / f"{utt_id}.flac"
            wav_path = OUT_DIR / f"{utt_id}.wav"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(flac_path), "-ar", "16000", "-ac", "1", str(wav_path)],
                check=True,
            )
            manifest.append({
                "id": utt_id,
                "condition": CONDITION,
                "speaker_id": speaker_id,
                "reference_text": text.strip(),
                "audio_path": str(wav_path.relative_to(BENCHMARK_ROOT)),
                "duration_sec": round(ffprobe_duration(wav_path), 3),
                "source_dataset": "LibriSpeech test-clean",
                "source_license": "CC BY 4.0 (Vassil Panayotov, 2014)",
                "source_url": "https://www.openslr.org/12/",
                "ground_truth_provenance": "verbatim from corpus .trans.txt",
            })

    manifest_path = OUT_DIR / "manifest.jsonl"
    with manifest_path.open("w") as f:
        for row in manifest:
            f.write(json.dumps(row) + "\n")
    total_dur = sum(r["duration_sec"] for r in manifest)
    print(f"[{CONDITION}] {len(manifest)} utterances, {total_dur:.1f}s, {len(set(r['speaker_id'] for r in manifest))} speakers -> {manifest_path}")


if __name__ == "__main__":
    main()
