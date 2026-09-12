"""Condition: noisy_speech_synthetic.

Method: take each clean_read_speech utterance and additively mix it with a
real background-noise recording at a controlled SNR (10dB and 0dB), using
ffmpeg's `sidechaincompress`-free simple gain+mix approach. This is a
standard, well-precedented ASR-robustness evaluation technique (the same
idea used by MUSAN-augmentation and similar noise-robustness benchmarks) —
it is NOT invented ground truth: the reference transcript is identical to
the underlying clean utterance's real, corpus-provided transcript, because
the noise is additive and does not change what was said.

Noise source: RIRS_NOISES `pointsource_noises` subset (Apache 2.0,
https://www.openslr.org/28/) — real recorded noise clips (freesound.org
originals, redistributed under this license).
"""
import json
import math
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_ROOT = ROOT.parent
CLEAN_MANIFEST = ROOT / "datasets" / "prepared" / "clean_read_speech" / "manifest.jsonl"
NOISE_DIR = ROOT / "datasets" / "raw" / "rirs_noises" / "RIRS_NOISES" / "pointsource_noises"
OUT_DIR = ROOT / "datasets" / "prepared" / "noisy_speech_synthetic"
CONDITION = "noisy_speech_synthetic"
SNR_LEVELS_DB = [10, 0]  # moderate and severe noise

OUT_DIR.mkdir(parents=True, exist_ok=True)


def rms_db(path: Path) -> float:
    """Mean-square volume in dBFS via ffmpeg's volumedetect filter."""
    out = subprocess.run(
        ["ffmpeg", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    for line in out.stderr.splitlines():
        if "mean_volume" in line:
            return float(line.split(":")[1].strip().replace(" dB", ""))
    raise RuntimeError(f"could not parse mean_volume for {path}")


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def mix_at_snr(clean_path: Path, noise_path: Path, snr_db: float, out_path: Path, duration_sec: float):
    clean_db = rms_db(clean_path)
    noise_db = rms_db(noise_path)
    # gain (dB) to apply to noise so that clean_db - (noise_db + gain) == snr_db
    gain_db = clean_db - snr_db - noise_db
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(clean_path),
            "-stream_loop", "-1", "-i", str(noise_path),
            "-filter_complex",
            f"[1:a]atrim=0:{duration_sec},volume={gain_db}dB[noise];[0:a][noise]amix=inputs=2:duration=first:dropout_transition=0[out]",
            "-map", "[out]", "-ar", "16000", "-ac", "1", str(out_path),
        ],
        check=True,
    )


def main():
    clean_rows = [json.loads(l) for l in CLEAN_MANIFEST.read_text().splitlines()]
    noise_files = sorted(NOISE_DIR.glob("*.wav"))
    if not noise_files:
        raise SystemExit(f"No noise files found in {NOISE_DIR}")

    # Use a modest subset of clean utterances (2 per speaker) to keep the
    # condition's runtime reasonable while still covering every speaker.
    by_speaker: dict[str, list[dict]] = {}
    for row in clean_rows:
        by_speaker.setdefault(row["speaker_id"], []).append(row)
    selected = [row for rows in by_speaker.values() for row in rows[:2]]

    manifest = []
    for i, row in enumerate(selected):
        clean_path = BENCHMARK_ROOT / row["audio_path"]
        for snr in SNR_LEVELS_DB:
            noise_path = noise_files[i % len(noise_files)]
            out_id = f"{row['id']}_snr{snr}db"
            out_path = OUT_DIR / f"{out_id}.wav"
            mix_at_snr(clean_path, noise_path, snr, out_path, row["duration_sec"])
            manifest.append({
                "id": out_id,
                "condition": CONDITION,
                "speaker_id": row["speaker_id"],
                "reference_text": row["reference_text"],
                "audio_path": str(out_path.relative_to(BENCHMARK_ROOT)),
                "duration_sec": round(ffprobe_duration(out_path), 3),
                "source_dataset": "LibriSpeech test-clean + RIRS_NOISES pointsource_noises",
                "source_license": "CC BY 4.0 (speech) + Apache 2.0 (noise, https://www.openslr.org/28/)",
                "source_url": "https://www.openslr.org/12/ ; https://www.openslr.org/28/",
                "ground_truth_provenance": f"identical to clean_read_speech/{row['id']} (additive synthetic noise does not alter spoken content)",
                "synthetic_augmentation": {"method": "additive_noise_mix", "snr_db": snr, "noise_file": noise_path.name},
            })
        print(f"{row['id']}: mixed at {SNR_LEVELS_DB} dB SNR")

    manifest_path = OUT_DIR / "manifest.jsonl"
    with manifest_path.open("w") as f:
        for r in manifest:
            f.write(json.dumps(r) + "\n")
    total_dur = sum(r["duration_sec"] for r in manifest)
    print(f"[{CONDITION}] {len(manifest)} utterances, {total_dur:.1f}s -> {manifest_path}")


if __name__ == "__main__":
    main()
