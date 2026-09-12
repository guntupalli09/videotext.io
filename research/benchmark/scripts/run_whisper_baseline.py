"""Transcribe the pilot manifest with an open-source Whisper model (faster-whisper).

This is labeled "Whisper baseline (open-source, local)" on the research page,
not "VideoText" — VideoText's production pipeline calls OpenAI's hosted Whisper
API plus its own chunking/post-processing, which requires an OPENAI_API_KEY we
did not have available when this pilot was run. Swap in real provider API
calls (Deepgram, AssemblyAI, OpenAI Whisper, VideoText's own endpoint) here
once credentials are supplied — see README.md.
"""
import json
import time
from pathlib import Path

from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "data" / "pilot_manifest.jsonl"
OUT_PATH = ROOT / "results" / "whisper_baseline_outputs.jsonl"
MODEL_SIZE = "small"  # CPU-friendly; note the tradeoff on the research page

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)


def main():
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

    rows = [json.loads(line) for line in MANIFEST.read_text().splitlines()]
    results = []
    for row in rows:
        audio_path = ROOT / row["audio_path"]
        t0 = time.time()
        segments, info = model.transcribe(str(audio_path), language="en", beam_size=5)
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


if __name__ == "__main__":
    main()
