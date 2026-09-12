"""Timestamp error scoring: mean absolute error between hypothesis and
reference word/segment start times, after aligning words via the same
edit-distance backtrace used for WER (so timestamps are only compared on
correctly-recognized words).

Not yet run against real data: this requires forced-alignment ground truth
(word-level timestamps), which LibriSpeech's default distribution does not
include. Options for Phase 2 are tracked in README.md (e.g. Montreal Forced
Aligner over LibriSpeech, or a corpus that ships word-level timestamps like
TIMIT or a forced-aligned LibriSpeech variant).
"""
from __future__ import annotations

import statistics
from dataclasses import dataclass


@dataclass
class TimedWord:
    word: str
    start: float


def timestamp_error(reference: list[TimedWord], hypothesis: list[TimedWord]) -> dict:
    """Aligns by word text in order (simple greedy match) and returns
    absolute start-time error stats in seconds, over matched words only."""
    errors = []
    hyp_pool = list(hypothesis)
    for ref_word in reference:
        for i, hyp_word in enumerate(hyp_pool):
            if hyp_word.word.lower() == ref_word.word.lower():
                errors.append(abs(hyp_word.start - ref_word.start))
                hyp_pool.pop(i)
                break

    if not errors:
        return {"matched_words": 0, "mean_abs_error_sec": None, "median_abs_error_sec": None}

    return {
        "matched_words": len(errors),
        "mean_abs_error_sec": round(statistics.mean(errors), 3),
        "median_abs_error_sec": round(statistics.median(errors), 3),
        "p90_abs_error_sec": round(sorted(errors)[int(0.9 * (len(errors) - 1))], 3),
    }


if __name__ == "__main__":
    ref = [TimedWord("hello", 0.0), TimedWord("world", 0.5)]
    hyp = [TimedWord("hello", 0.02), TimedWord("world", 0.61)]
    print(timestamp_error(ref, hyp))
