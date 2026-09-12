"""Select a small pilot subset of LibriSpeech test-clean, convert to WAV,
and write a ground-truth manifest (id, text, audio_path, speaker, duration_sec).

LibriSpeech ground-truth transcripts are professionally aligned to public-domain
LibriVox audiobook readings — this is why it's a standard ASR benchmark corpus.
Caveats (documented on the research page too): read speech, single speaker per
clip, no background noise, no punctuation/casing in the reference text.
"""
import csv
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
LIBRISPEECH = DATA / "LibriSpeech" / "test-clean"
PILOT_WAV_DIR = DATA / "pilot_wav"
FILES_PER_CHAPTER = 5

PILOT_WAV_DIR.mkdir(parents=True, exist_ok=True)


def ffprobe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
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
            wav_path = PILOT_WAV_DIR / f"{utt_id}.wav"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(flac_path),
                 "-ar", "16000", "-ac", "1", str(wav_path)],
                check=True,
            )
            duration = ffprobe_duration(wav_path)
            manifest.append({
                "id": utt_id,
                "speaker_id": speaker_id,
                "chapter_id": chapter_id,
                "reference_text": text.strip(),
                "audio_path": str(wav_path.relative_to(ROOT)),
                "duration_sec": round(duration, 3),
            })

    manifest_path = DATA / "pilot_manifest.jsonl"
    with manifest_path.open("w") as f:
        for row in manifest:
            f.write(json.dumps(row) + "\n")

    total_dur = sum(r["duration_sec"] for r in manifest)
    print(f"Wrote {len(manifest)} utterances, {total_dur:.1f}s total audio, to {manifest_path}")


if __name__ == "__main__":
    main()
