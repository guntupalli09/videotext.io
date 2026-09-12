"""Runner: open-source Whisper baseline (faster-whisper), across every
condition in the frozen dataset manifest. Not VideoText's production output
— see PROTOCOL.md section 6.
"""
import platform
import subprocess
import sys
import time

import ctranslate2
import faster_whisper
from faster_whisper import WhisperModel

from runner_common import BENCHMARK_ROOT, load_manifest, write_raw_result, now_iso, ROOT

SYSTEM = "whisper_baseline_opensource"
MODEL_SIZE = "small"
DEVICE = "cpu"
COMPUTE_TYPE = "int8"
BEAM_SIZE = 5
LANGUAGE = "en"


def git_commit() -> str:
    try:
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return "unknown"


def main():
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    settings = {
        "model_size": MODEL_SIZE, "device": DEVICE, "compute_type": COMPUTE_TYPE,
        "beam_size": BEAM_SIZE, "language": LANGUAGE,
        "faster_whisper_version": faster_whisper.__version__,
        "ctranslate2_version": ctranslate2.__version__,
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
        "git_commit": git_commit(),
    }

    manifest = load_manifest()
    for row in manifest:
        audio_path = BENCHMARK_ROOT / row["audio_path"]
        t0 = time.time()
        segments, info = model.transcribe(str(audio_path), language=LANGUAGE, beam_size=BEAM_SIZE)
        segments = list(segments)
        elapsed = time.time() - t0
        hypothesis_text = " ".join(s.text.strip() for s in segments).strip()

        record = {
            "system": SYSTEM,
            "model": f"whisper-{MODEL_SIZE} (faster-whisper, int8, CPU)",
            "settings": settings,
            "request_timestamp": now_iso(),
            "http_status": 200,
            "processing_sec": round(elapsed, 3),
            "raw_response": {
                "text": hypothesis_text,
                "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in segments],
                "language": info.language,
            },
        }
        write_raw_result(SYSTEM, row["condition"], row["id"], record)
        print(f"[{SYSTEM}] {row['condition']}/{row['id']}: {elapsed:.2f}s -> {hypothesis_text[:70]}")


if __name__ == "__main__":
    main()
