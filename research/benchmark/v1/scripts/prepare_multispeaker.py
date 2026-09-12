"""Condition: multi_speaker_sequential_synthetic.

Method: concatenate two different LibriSpeech speakers' utterances back to
back (speaker A's clip, a 0.5s silence gap, speaker B's clip) into one audio
file. This is a SEQUENTIAL synthetic dialogue (non-overlapping turns), not a
natural conversation and not overlapping speech — both of those remain
unsourced gaps for v2 (see PROTOCOL.md limitations; a natural corpus like
AMI would need its NXT-format annotations parsed, which we did not do for
v1).

Ground truth for WER is the concatenation of both speakers' real corpus
transcripts, in order. Ground truth for diarization is derived exactly from
the known clip durations and the fixed gap we inserted — not manufactured,
since we control every second of the construction.
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_ROOT = ROOT.parent
CLEAN_MANIFEST = ROOT / "datasets" / "prepared" / "clean_read_speech" / "manifest.jsonl"
OUT_DIR = ROOT / "datasets" / "prepared" / "multi_speaker_sequential_synthetic"
CONDITION = "multi_speaker_sequential_synthetic"
GAP_SEC = 0.5
N_PAIRS = 6


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    clean_rows = [json.loads(l) for l in CLEAN_MANIFEST.read_text().splitlines()]
    by_speaker: dict[str, list[dict]] = {}
    for row in clean_rows:
        by_speaker.setdefault(row["speaker_id"], []).append(row)
    speakers = sorted(by_speaker.keys())

    manifest = []
    silence_path = OUT_DIR / "_silence.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"anullsrc=r=16000:cl=mono:d={GAP_SEC}", str(silence_path)],
        check=True,
    )

    for i in range(min(N_PAIRS, len(speakers) - 1)):
        spk_a, spk_b = speakers[i], speakers[(i + 1) % len(speakers)]
        row_a, row_b = by_speaker[spk_a][0], by_speaker[spk_b][1 if spk_b != spk_a else 0]
        path_a = BENCHMARK_ROOT / row_a["audio_path"]
        path_b = BENCHMARK_ROOT / row_b["audio_path"]

        out_id = f"mix_{row_a['id']}_{row_b['id']}"
        out_path = OUT_DIR / f"{out_id}.wav"
        concat_list = OUT_DIR / f"{out_id}_list.txt"
        concat_list.write_text(f"file '{path_a}'\nfile '{silence_path}'\nfile '{path_b}'\n")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat_list),
             "-ar", "16000", "-ac", "1", str(out_path)],
            check=True,
        )
        concat_list.unlink()

        dur_a, dur_b = row_a["duration_sec"], row_b["duration_sec"]
        diarization_reference = [
            {"speaker": "A", "start": 0.0, "end": dur_a},
            {"speaker": "B", "start": dur_a + GAP_SEC, "end": dur_a + GAP_SEC + dur_b},
        ]
        manifest.append({
            "id": out_id,
            "condition": CONDITION,
            "speaker_ids": [spk_a, spk_b],
            "reference_text": f"{row_a['reference_text']} {row_b['reference_text']}",
            "audio_path": str(out_path.relative_to(BENCHMARK_ROOT)),
            "duration_sec": round(ffprobe_duration(out_path), 3),
            "diarization_reference": diarization_reference,
            "source_dataset": "LibriSpeech test-clean (synthetically concatenated)",
            "source_license": "CC BY 4.0 (Vassil Panayotov, 2014)",
            "source_url": "https://www.openslr.org/12/",
            "ground_truth_provenance": (
                f"WER reference = verbatim concatenation of clean_read_speech/{row_a['id']} + "
                f"clean_read_speech/{row_b['id']}; diarization reference computed exactly from "
                f"known clip durations and the fixed {GAP_SEC}s gap we inserted"
            ),
            "synthetic_augmentation": {"method": "sequential_two_speaker_concatenation", "gap_sec": GAP_SEC},
        })

    silence_path.unlink()
    manifest_path = OUT_DIR / "manifest.jsonl"
    with manifest_path.open("w") as f:
        for r in manifest:
            f.write(json.dumps(r) + "\n")
    total_dur = sum(r["duration_sec"] for r in manifest)
    print(f"[{CONDITION}] {len(manifest)} utterances, {total_dur:.1f}s -> {manifest_path}")


if __name__ == "__main__":
    main()
