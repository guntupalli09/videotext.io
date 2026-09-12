"""Runner: AssemblyAI (default model, async upload -> transcript -> poll).

Requires ASSEMBLYAI_API_KEY. If absent, writes
results/raw/assemblyai/SKIPPED.json and exits — never fabricates results.
"""
import time

import requests

from runner_common import (
    BENCHMARK_ROOT, load_manifest, require_env, write_raw_result, write_skipped, now_iso,
)

SYSTEM = "assemblyai"
BASE_URL = "https://api.assemblyai.com/v2"
POLL_INTERVAL_SEC = 3
POLL_TIMEOUT_SEC = 180


def upload_file(api_key: str, audio_path) -> str:
    with audio_path.open("rb") as f:
        resp = requests.post(f"{BASE_URL}/upload", headers={"authorization": api_key}, data=f, timeout=120)
    resp.raise_for_status()
    return resp.json()["upload_url"]


def main():
    api_key = require_env("ASSEMBLYAI_API_KEY")
    if not api_key:
        write_skipped(SYSTEM, "ASSEMBLYAI_API_KEY not set in environment")
        return

    manifest = load_manifest()
    settings = {"punctuate": True, "speaker_labels": True, "language_code": "en"}
    for row in manifest:
        audio_path = BENCHMARK_ROOT / row["audio_path"]
        t0 = time.time()
        try:
            upload_url = upload_file(api_key, audio_path)
            create_resp = requests.post(
                f"{BASE_URL}/transcript",
                headers={"authorization": api_key},
                json={"audio_url": upload_url, **settings},
                timeout=60,
            )
            create_resp.raise_for_status()
            transcript_id = create_resp.json()["id"]

            status = "queued"
            result_json = None
            deadline = time.time() + POLL_TIMEOUT_SEC
            while status not in ("completed", "error") and time.time() < deadline:
                time.sleep(POLL_INTERVAL_SEC)
                poll_resp = requests.get(f"{BASE_URL}/transcript/{transcript_id}", headers={"authorization": api_key}, timeout=30)
                poll_resp.raise_for_status()
                result_json = poll_resp.json()
                status = result_json["status"]

            elapsed = time.time() - t0
            record = {
                "system": SYSTEM, "model": "default", "settings": settings,
                "request_timestamp": now_iso(), "http_status": 200 if status == "completed" else None,
                "processing_sec": round(elapsed, 3), "vendor_status": status,
            }
            if status == "completed":
                record["raw_response"] = result_json
            else:
                record["error"] = (result_json or {}).get("error", f"did not complete within {POLL_TIMEOUT_SEC}s (last status: {status})")
        except Exception as e:
            record = {
                "system": SYSTEM, "model": "default", "settings": settings,
                "request_timestamp": now_iso(), "http_status": None,
                "processing_sec": round(time.time() - t0, 3), "error": str(e),
            }
        write_raw_result(SYSTEM, row["condition"], row["id"], record)
        print(f"[{SYSTEM}] {row['id']}: status={record.get('vendor_status', record.get('http_status'))}")


if __name__ == "__main__":
    main()
