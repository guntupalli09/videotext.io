"""Runner: Deepgram (nova-2).

Requires DEEPGRAM_API_KEY. If absent, writes results/raw/deepgram/SKIPPED.json
and exits — never fabricates results.
"""
import time

import requests

from runner_common import (
    BENCHMARK_ROOT, load_manifest, require_env, write_raw_result, write_skipped, now_iso,
)

SYSTEM = "deepgram"
MODEL = "nova-2"
API_URL = "https://api.deepgram.com/v1/listen"


def main():
    api_key = require_env("DEEPGRAM_API_KEY")
    if not api_key:
        write_skipped(SYSTEM, "DEEPGRAM_API_KEY not set in environment")
        return

    manifest = load_manifest()
    params = {"model": MODEL, "punctuate": "true", "diarize": "true", "smart_format": "true", "language": "en"}
    for row in manifest:
        audio_path = BENCHMARK_ROOT / row["audio_path"]
        t0 = time.time()
        try:
            with audio_path.open("rb") as f:
                resp = requests.post(
                    API_URL,
                    headers={"Authorization": f"Token {api_key}", "Content-Type": "audio/wav"},
                    params=params,
                    data=f.read(),
                    timeout=120,
                )
            elapsed = time.time() - t0
            record = {
                "system": SYSTEM, "model": MODEL, "settings": params,
                "request_timestamp": now_iso(), "http_status": resp.status_code,
                "processing_sec": round(elapsed, 3),
            }
            if resp.status_code == 200:
                record["raw_response"] = resp.json()
            else:
                record["error"] = resp.text
        except Exception as e:
            record = {
                "system": SYSTEM, "model": MODEL, "settings": params,
                "request_timestamp": now_iso(), "http_status": None,
                "processing_sec": round(time.time() - t0, 3), "error": str(e),
            }
        write_raw_result(SYSTEM, row["condition"], row["id"], record)
        print(f"[{SYSTEM}] {row['id']}: status={record.get('http_status')}")


if __name__ == "__main__":
    main()
