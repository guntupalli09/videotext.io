"""Runner: VideoText's own production transcription pipeline.

Calls the real /api/v1/transcriptions endpoint documented in
docs/API_PRIVATE_BETA.md — the exact same pipeline the web app's
Video-to-Transcript page uses (no internal shortcut, no second pipeline).

Requires VIDEOTEXT_API_KEY (a vt_live_... key from
https://videotext.io/settings/api-keys) and, optionally, VIDEOTEXT_BASE_URL
(defaults to production). If the key is absent, writes
results/raw/videotext_production/SKIPPED.json and exits — never fabricates
results, and never substitutes the open-source Whisper baseline for
VideoText's actual output.
"""
import time

import requests

from runner_common import (
    BENCHMARK_ROOT, load_manifest, require_env, write_raw_result, write_skipped, now_iso,
)

SYSTEM = "videotext_production"
POLL_INTERVAL_SEC = 3
POLL_TIMEOUT_SEC = 180


def main():
    api_key = require_env("VIDEOTEXT_API_KEY")
    if not api_key:
        write_skipped(SYSTEM, "VIDEOTEXT_API_KEY not set in environment (see docs/API_PRIVATE_BETA.md)")
        return

    base_url = require_env("VIDEOTEXT_BASE_URL") or "https://videotext.io"
    headers = {"Authorization": f"Bearer {api_key}"}

    manifest = load_manifest()
    for row in manifest:
        audio_path = BENCHMARK_ROOT / row["audio_path"]
        t0 = time.time()
        try:
            with audio_path.open("rb") as f:
                create_resp = requests.post(
                    f"{base_url}/api/v1/transcriptions",
                    headers=headers,
                    files={"file": (audio_path.name, f, "audio/wav")},
                    timeout=120,
                )
            create_resp.raise_for_status()
            job = create_resp.json()
            job_id = job["id"]

            status = job.get("status", "queued")
            result_json = job
            deadline = time.time() + POLL_TIMEOUT_SEC
            while status not in ("completed", "failed") and time.time() < deadline:
                time.sleep(POLL_INTERVAL_SEC)
                poll_resp = requests.get(f"{base_url}/api/v1/transcriptions/{job_id}", headers=headers, timeout=30)
                poll_resp.raise_for_status()
                result_json = poll_resp.json()
                status = result_json["status"]

            elapsed = time.time() - t0
            record = {
                "system": SYSTEM, "model": "videotext_production_pipeline", "settings": {"endpoint": "/api/v1/transcriptions"},
                "request_timestamp": now_iso(), "http_status": 200 if status == "completed" else None,
                "processing_sec": round(elapsed, 3), "vendor_status": status,
            }
            if status == "completed":
                txt_url = result_json.get("txt_url")
                transcript_text = None
                if txt_url:
                    dl = requests.get(f"{base_url}{txt_url}" if txt_url.startswith("/") else txt_url, timeout=60)
                    if dl.status_code == 200:
                        transcript_text = dl.text
                record["raw_response"] = result_json
                record["transcript_text"] = transcript_text
            else:
                record["error"] = result_json.get("failure_reason", f"did not complete within {POLL_TIMEOUT_SEC}s (last status: {status})")
        except Exception as e:
            record = {
                "system": SYSTEM, "model": "videotext_production_pipeline", "settings": {"endpoint": "/api/v1/transcriptions"},
                "request_timestamp": now_iso(), "http_status": None,
                "processing_sec": round(time.time() - t0, 3), "error": str(e),
            }
        write_raw_result(SYSTEM, row["condition"], row["id"], record)
        print(f"[{SYSTEM}] {row['id']}: status={record.get('vendor_status', record.get('http_status'))}")


if __name__ == "__main__":
    main()
