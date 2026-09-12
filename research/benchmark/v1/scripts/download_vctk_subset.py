"""Download a small, accent-diverse subset of VCTK (CC BY 4.0, University of
Edinburgh) using range requests (remotezip) instead of the full 11GB archive.

Speaker -> accent mapping is taken verbatim from the corpus's own
speaker-info.txt (not our own labeling) — see PROTOCOL.md for the license
citation (license_text.txt fetched directly from the DataShare item page).
"""
import json
from pathlib import Path

from remotezip import RemoteZip

VCTK_URL = "https://datashare.ed.ac.uk/bitstreams/535f4286-e54c-4038-838c-a02285e32cb2/download"
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "datasets" / "raw" / "vctk"
UTTERANCES_PER_SPEAKER = 6

# speaker_id -> (accent label as given by VCTK speaker-info.txt, region)
SELECTED_SPEAKERS = {
    "p225": ("English", "Southern England"),
    "p234": ("Scottish", "West Dumfries"),
    "p238": ("NorthernIrish", "Belfast"),
    "p245": ("Irish", "Dublin"),
    "p248": ("Indian", ""),
    "p294": ("American", "San Francisco"),
    "p326": ("Australian", "Sydney"),
}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_rows = []

    with RemoteZip(VCTK_URL) as zf:
        names = zf.namelist()
        zf.extract("speaker-info.txt", OUT_DIR)

        for speaker_id, (accent, region) in SELECTED_SPEAKERS.items():
            txt_names = sorted(n for n in names if n.startswith(f"txt/{speaker_id}/"))
            picked = 0
            for txt_name in txt_names:
                if picked >= UTTERANCES_PER_SPEAKER:
                    break
                utt_id = Path(txt_name).stem  # e.g. p225_070
                wav_name = f"wav48_silence_trimmed/{speaker_id}/{utt_id}_mic1.flac"
                if wav_name not in names:
                    continue
                zf.extract(txt_name, OUT_DIR)
                zf.extract(wav_name, OUT_DIR)
                reference_text = (OUT_DIR / txt_name).read_text().strip()
                manifest_rows.append({
                    "id": utt_id,
                    "speaker_id": speaker_id,
                    "accent": accent,
                    "region": region,
                    "reference_text": reference_text,
                    "source_flac_path": str((OUT_DIR / wav_name).relative_to(ROOT)),
                })
                picked += 1
            print(f"{speaker_id} ({accent}): {picked} utterances")

    manifest_path = OUT_DIR / "vctk_raw_manifest.jsonl"
    with manifest_path.open("w") as f:
        for row in manifest_rows:
            f.write(json.dumps(row) + "\n")
    print(f"\nWrote {len(manifest_rows)} utterances to {manifest_path}")


if __name__ == "__main__":
    main()
