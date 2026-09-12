"""Runner: OpenAI Whisper API (whisper-1).

Requires OPENAI_API_KEY. If absent, writes results/raw/openai_whisper_api/SKIPPED.json
and exits — never fabricates results.
"""
import time

import requests

from runner_common import (
    BENCHMARK_ROOT, load_manifest, require_env, write_raw_result, write_skipped, now_iso,
)

SYSTEM = "openai_whisper_api"
MODEL = "whisper-1"
API_URL = "https://api.openai.com/v1/audio/transcriptions"


def main():
    api_key = require_env("OPENAI_API_KEY")
    if not api_key:
        write_skipped(SYSTEM, "OPENAI_API_KEY not set in environment")
        return

    manifest = load_manifest()
    for row in manifest:
        audio_path = BENCHMARK_ROOT / row["audio_path"]
        settings = {"model": MODEL, "response_format": "verbose_json", "language": "en"}
        t0 = time.time()
        try:
            with audio_path.open("rb") as f:
                resp = requests.post(
                    API_URL,
                    headers={"Authorization": f"Bearer {api_key}"},
                    files={"file": (audio_path.name, f, "audio/wav")},
                    data=settings,
                    timeout=120,
                )
            elapsed = time.time() - t0
            record = {
                "system": SYSTEM,
                "model": MODEL,
                "settings": settings,
                "request_timestamp": now_iso(),
                "http_status": resp.status_code,
                "processing_sec": round(elapsed, 3),
            }
            if resp.status_code == 200:
                record["raw_response"] = resp.json()
            else:
                record["error"] = resp.text
        except Exception as e:
            record = {
                "system": SYSTEM, "model": MODEL, "settings": settings,
                "request_timestamp": now_iso(), "http_status": None,
                "processing_sec": round(time.time() - t0, 3), "error": str(e),
            }
        write_raw_result(SYSTEM, row["condition"], row["id"], record)
        print(f"[{SYSTEM}] {row['id']}: status={record.get('http_status')}")


if __name__ == "__main__":
    main()
