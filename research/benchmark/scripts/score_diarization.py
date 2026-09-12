"""Diarization Error Rate (DER) scoring.

DER = (missed speech + false alarm speech + speaker confusion) / total reference speech time

Standard metric (used by NIST/pyannote) for "who spoke when." Segments are
compared on a shared timeline; for every reference speaker segment we check
whether the hypothesis assigns the same speaker label at that time (after
finding the best hypothesis->reference speaker label mapping, since diarizers
don't know real speaker names).

Not yet run against real data: this pilot (LibriSpeech test-clean) is single-
speaker read speech, so diarization accuracy isn't measurable here. Wiring
this scorer against a multi-speaker corpus (e.g. AMI Meeting Corpus, CALLHOME)
is tracked as Phase 2 in README.md.
"""
from __future__ import annotations

from dataclasses import dataclass
from itertools import permutations


@dataclass
class Segment:
    start: float
    end: float
    speaker: str


def _overlap(a: Segment, b: Segment) -> float:
    return max(0.0, min(a.end, b.end) - max(a.start, b.start))


def _best_speaker_mapping(reference: list[Segment], hypothesis: list[Segment]) -> dict[str, str]:
    """Find the hypothesis->reference speaker label mapping that maximizes total overlap."""
    ref_speakers = sorted({s.speaker for s in reference})
    hyp_speakers = sorted({s.speaker for s in hypothesis})

    overlap = {(r, h): 0.0 for r in ref_speakers for h in hyp_speakers}
    for r in reference:
        for h in hypothesis:
            ov = _overlap(r, h)
            if ov > 0:
                overlap[(r.speaker, h.speaker)] += ov

    best_mapping: dict[str, str] = {}
    best_score = -1.0
    n = min(len(ref_speakers), len(hyp_speakers))
    for ref_subset in permutations(ref_speakers, n):
        for hyp_perm in permutations(hyp_speakers, n):
            score = sum(overlap[(r, h)] for r, h in zip(ref_subset, hyp_perm))
            if score > best_score:
                best_score = score
                best_mapping = dict(zip(hyp_perm, ref_subset))
    return best_mapping


def diarization_error_rate(reference: list[Segment], hypothesis: list[Segment]) -> dict:
    mapping = _best_speaker_mapping(reference, hypothesis)
    total_ref_time = sum(s.end - s.start for s in reference)

    # Sample the timeline at fixed resolution and vote per frame (simple,
    # readable reference implementation; production-grade DER tools use
    # exact interval algebra, e.g. pyannote.metrics).
    resolution = 0.01
    t_end = max((s.end for s in reference + hypothesis), default=0.0)
    t = 0.0
    missed = false_alarm = confusion = 0.0
    while t < t_end:
        ref_speaker = next((s.speaker for s in reference if s.start <= t < s.end), None)
        hyp_speaker_raw = next((s.speaker for s in hypothesis if s.start <= t < s.end), None)
        hyp_speaker = mapping.get(hyp_speaker_raw) if hyp_speaker_raw else None

        if ref_speaker and not hyp_speaker:
            missed += resolution
        elif hyp_speaker and not ref_speaker:
            false_alarm += resolution
        elif ref_speaker and hyp_speaker and ref_speaker != hyp_speaker:
            confusion += resolution
        t += resolution

    der = (missed + false_alarm + confusion) / total_ref_time if total_ref_time else 0.0
    return {
        "missed_speech_sec": round(missed, 2),
        "false_alarm_sec": round(false_alarm, 2),
        "speaker_confusion_sec": round(confusion, 2),
        "total_reference_sec": round(total_ref_time, 2),
        "der": round(der, 4),
    }


if __name__ == "__main__":
    ref = [Segment(0, 5, "A"), Segment(5, 10, "B")]
    hyp = [Segment(0, 4.8, "spk0"), Segment(4.8, 10, "spk1")]
    print(diarization_error_rate(ref, hyp))
