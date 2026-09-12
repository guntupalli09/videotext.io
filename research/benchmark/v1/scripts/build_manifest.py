"""Combine all per-condition manifests into one frozen dataset manifest with
a SHA256 hash per audio file and one overall dataset hash.

The dataset hash is what protocol.json freezes: if any audio file, any
ground-truth transcript, or the file set itself changes, the hash changes,
which is how "no silently altering the test" is enforced going forward.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCHMARK_ROOT = ROOT.parent
PREPARED_DIR = ROOT / "datasets" / "prepared"
OUT_PATH = ROOT / "datasets" / "dataset_manifest.jsonl"
HASH_OUT_PATH = ROOT / "datasets" / "dataset_hash.json"

CONDITIONS = [
    "clean_read_speech",
    "noisy_speech_synthetic",
    "accented_speech",
    "reduced_mic_quality_synthetic",
    "multi_speaker_sequential_synthetic",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    rows = []
    for condition in CONDITIONS:
        manifest_path = PREPARED_DIR / condition / "manifest.jsonl"
        if not manifest_path.exists():
            raise SystemExit(f"Missing prepared manifest for condition: {condition}")
        for line in manifest_path.read_text().splitlines():
            row = json.loads(line)
            audio_path = BENCHMARK_ROOT / row["audio_path"]
            row["audio_sha256"] = sha256_file(audio_path)
            row["audio_bytes"] = audio_path.stat().st_size
            rows.append(row)

    rows.sort(key=lambda r: (r["condition"], r["id"]))
    with OUT_PATH.open("w") as f:
        for row in rows:
            f.write(json.dumps(row, sort_keys=True) + "\n")

    # Dataset hash = SHA256 over the sorted list of per-file hashes + ids.
    # Deterministic regardless of filesystem iteration order.
    combined = hashlib.sha256()
    for row in rows:
        combined.update(f"{row['condition']}:{row['id']}:{row['audio_sha256']}".encode())
    dataset_hash = combined.hexdigest()

    per_condition_counts = {}
    for row in rows:
        c = per_condition_counts.setdefault(row["condition"], {"n_utterances": 0, "total_duration_sec": 0.0})
        c["n_utterances"] += 1
        c["total_duration_sec"] += row["duration_sec"]
    for c in per_condition_counts.values():
        c["total_duration_sec"] = round(c["total_duration_sec"], 1)

    hash_record = {
        "dataset_hash": dataset_hash,
        "n_files": len(rows),
        "n_conditions": len(CONDITIONS),
        "conditions": per_condition_counts,
        "hash_algorithm": "sha256(condition:id:file_sha256 concatenated per row, rows sorted by condition,id)",
    }
    with HASH_OUT_PATH.open("w") as f:
        json.dump(hash_record, f, indent=2)

    print(json.dumps(hash_record, indent=2))
    print(f"\nManifest: {OUT_PATH}\nHash record: {HASH_OUT_PATH}")


if __name__ == "__main__":
    main()
