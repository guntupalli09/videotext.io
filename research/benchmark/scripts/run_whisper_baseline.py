"""Transcribe the pilot manifest with an open-source Whisper model (faster-whisper).

This is labeled "Whisper baseline (open-source, local)" on the research page,
not "VideoText" — VideoText's production pipeline calls OpenAI's hosted Whisper
API plus its own chunking/post-processing, which requires an OPENAI_API_KEY we
did not have available when this pilot was run. Swap in real provider API
calls (Deepgram, AssemblyAI, OpenAI Whisper, VideoText's own endpoint) here
once credentials are supplied — see README.md.
"""
import json
import platform
import subprocess
import sys
import time
from pathlib import Path

import ctranslate2
import faster_whisper
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "pilot_manifest.jsonl"
OUT_PATH = ROOT / "results" / "whisper_baseline_outputs.jsonl"
METADATA_PATH = ROOT / "results" / "experiment_metadata.json"
MODEL_SIZE = "small"  # CPU-friendly; note the tradeoff on the research page
DEVICE = "cpu"
COMPUTE_TYPE = "int8"
BEAM_SIZE = 5
LANGUAGE = "en"

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)


def git_commit() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
    except Exception:
        return "unknown"


def ffmpeg_version() -> str:
    try:
        out = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, check=True)
        return out.stdout.splitlines()[0]
    except Exception:
        return "unknown"


def main():
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)

    rows = [json.loads(line) for line in MANIFEST.read_text().splitlines()]
    results = []
    run_started_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for row in rows:
        audio_path = ROOT / row["audio_path"]
        t0 = time.time()
        segments, info = model.transcribe(str(audio_path), language=LANGUAGE, beam_size=BEAM_SIZE)
        segments = list(segments)
        elapsed = time.time() - t0
        hypothesis_text = " ".join(s.text.strip() for s in segments).strip()
        results.append({
            "id": row["id"],
            "hypothesis_text": hypothesis_text,
            "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in segments],
            "processing_sec": round(elapsed, 3),
            "model": f"whisper-{MODEL_SIZE} (faster-whisper, int8, CPU)",
        })
        print(f"{row['id']}: {elapsed:.2f}s  ->  {hypothesis_text[:80]}")

    with OUT_PATH.open("w") as f:
        for r in results:
            f.write(json.dumps(r) + "\n")
    print(f"\nWrote {len(results)} outputs to {OUT_PATH}")

    metadata = {
        "run_started_at_utc": run_started_at,
        "git_commit": git_commit(),
        "tool": {
            "name": "Whisper baseline (open-source)",
            "model_size": MODEL_SIZE,
            "device": DEVICE,
            "compute_type": COMPUTE_TYPE,
            "beam_size": BEAM_SIZE,
            "language": LANGUAGE,
            "faster_whisper_version": faster_whisper.__version__,
            "ctranslate2_version": ctranslate2.__version__,
        },
        "environment": {
            "python_version": sys.version.split()[0],
            "platform": platform.platform(),
            "ffmpeg_version": ffmpeg_version(),
        },
        "dataset": {
            "name": "LibriSpeech test-clean",
            "source_url": "https://www.openslr.org/12/",
            "license": "CC BY 4.0 (Vassil Panayotov, 2014)",
        },
        "note": (
            "This is an open-source Whisper baseline, not VideoText's production "
            "pipeline. VideoText calls OpenAI's hosted Whisper API "
            "(server/src/services/transcription.ts); no OPENAI_API_KEY was "
            "available when this run was executed."
        ),
    }
    with METADATA_PATH.open("w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Wrote experiment metadata to {METADATA_PATH}")


if __name__ == "__main__":
    main()
