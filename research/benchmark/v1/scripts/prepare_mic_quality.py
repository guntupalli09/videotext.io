"""Condition: reduced_mic_quality_synthetic.

Method: take clean_read_speech utterances and apply a documented, deterministic
degradation simulating a low-quality phone/headset mic: downsample to 8kHz
(narrowband telephony bandwidth), apply a bandpass filter (300-3400Hz, the
standard telephony passband), then upsample back to 16kHz so all conditions
share a sample rate for scoring. This is a standard technique for simulating
reduced microphone/channel quality (not a real diverse-device recording set —
documented explicitly as synthetic, a v2 goal is a device-recorded corpus).

Ground truth is identical to the source clean_read_speech utterance (the
degradation is a channel effect, not a change in spoken content).
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_ROOT = ROOT.parent
CLEAN_MANIFEST = ROOT / "datasets" / "prepared" / "clean_read_speech" / "manifest.jsonl"
OUT_DIR = ROOT / "datasets" / "prepared" / "reduced_mic_quality_synthetic"
CONDITION = "reduced_mic_quality_synthetic"

OUT_DIR.mkdir(parents=True, exist_ok=True)


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main():
    clean_rows = [json.loads(l) for l in CLEAN_MANIFEST.read_text().splitlines()]
    by_speaker: dict[str, list[dict]] = {}
    for row in clean_rows:
        by_speaker.setdefault(row["speaker_id"], []).append(row)
    selected = [row for rows in by_speaker.values() for row in rows[:2]]

    manifest = []
    for row in selected:
        clean_path = BENCHMARK_ROOT / row["audio_path"]
        out_id = f"{row['id']}_micdegraded"
        out_path = OUT_DIR / f"{out_id}.wav"
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(clean_path),
                "-af", "highpass=f=300,lowpass=f=3400,aresample=8000,aresample=16000",
                "-ar", "16000", "-ac", "1", str(out_path),
            ],
            check=True,
        )
        manifest.append({
            "id": out_id,
            "condition": CONDITION,
            "speaker_id": row["speaker_id"],
            "reference_text": row["reference_text"],
            "audio_path": str(out_path.relative_to(BENCHMARK_ROOT)),
            "duration_sec": round(ffprobe_duration(out_path), 3),
            "source_dataset": "LibriSpeech test-clean (synthetically degraded)",
            "source_license": "CC BY 4.0 (Vassil Panayotov, 2014)",
            "source_url": "https://www.openslr.org/12/",
            "ground_truth_provenance": f"identical to clean_read_speech/{row['id']} (channel degradation does not alter spoken content)",
            "synthetic_augmentation": {"method": "telephony_bandpass_300_3400hz_plus_8khz_resample"},
        })

    manifest_path = OUT_DIR / "manifest.jsonl"
    with manifest_path.open("w") as f:
        for r in manifest:
            f.write(json.dumps(r) + "\n")
    total_dur = sum(r["duration_sec"] for r in manifest)
    print(f"[{CONDITION}] {len(manifest)} utterances, {total_dur:.1f}s -> {manifest_path}")


if __name__ == "__main__":
    main()
