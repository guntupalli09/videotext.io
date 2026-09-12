"""Bootstrap confidence intervals for corpus-level metrics.

Standard percentile bootstrap: resample utterances with replacement N times,
recompute the corpus-level metric on each resample, report the [2.5, 97.5]
percentile interval as the 95% CI. This is the right way to express
uncertainty on a metric computed over a fixed, non-random sample of
utterances (as opposed to treating the point estimate as exact).
"""
from __future__ import annotations

import random
import statistics
from dataclasses import dataclass
from typing import Callable, Sequence


@dataclass
class BootstrapResult:
    point_estimate: float
    ci_low: float
    ci_high: float
    n_resamples: int
    n_utterances: int


def bootstrap_ci(
    utterance_values: Sequence[tuple[float, float]],
    n_resamples: int = 2000,
    confidence: float = 0.95,
    seed: int = 42,
) -> BootstrapResult:
    """Bootstrap CI for a ratio metric aggregated as sum(numerator)/sum(denominator)
    across utterances — this is how corpus-level WER/DER are defined (NOT the
    mean of per-utterance ratios, which over-weights short utterances).

    utterance_values: list of (numerator, denominator) pairs, e.g.
      (errors, reference_word_count) per utterance for WER.
    """
    n = len(utterance_values)
    if n == 0:
        raise ValueError("Cannot bootstrap an empty sample")

    def corpus_ratio(sample: Sequence[tuple[float, float]]) -> float:
        num = sum(x[0] for x in sample)
        den = sum(x[1] for x in sample)
        return num / den if den else 0.0

    point_estimate = corpus_ratio(utterance_values)

    rng = random.Random(seed)
    resample_stats = []
    for _ in range(n_resamples):
        sample = [utterance_values[rng.randrange(n)] for _ in range(n)]
        resample_stats.append(corpus_ratio(sample))

    resample_stats.sort()
    alpha = 1 - confidence
    lo_idx = int((alpha / 2) * n_resamples)
    hi_idx = int((1 - alpha / 2) * n_resamples) - 1
    hi_idx = min(hi_idx, n_resamples - 1)

    return BootstrapResult(
        point_estimate=point_estimate,
        ci_low=resample_stats[lo_idx],
        ci_high=resample_stats[hi_idx],
        n_resamples=n_resamples,
        n_utterances=n,
    )


if __name__ == "__main__":
    # errors, ref_words per utterance
    data = [(1, 10), (0, 8), (2, 12), (0, 9), (1, 11)]
    result = bootstrap_ci(data, n_resamples=2000)
    print(result)
