"""Word Error Rate (WER) scoring.

WER = (Substitutions + Deletions + Insertions) / (Words in reference)

This is the standard ASR accuracy metric: it aligns a hypothesis transcript
against a reference transcript using edit distance and counts the word-level
edits needed to turn one into the other.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

WER_IMPL_VERSION = "1.0.0"


def normalize_text(text: str) -> str:
    """Lowercase, strip punctuation, collapse whitespace.

    WER is normally reported on normalized text so that punctuation and
    casing differences (which some ASR engines don't even attempt) don't
    get counted as transcription errors.
    """
    text = text.lower()
    text = re.sub(r"[^\w\s']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


@dataclass
class WerResult:
    reference_words: int
    substitutions: int
    deletions: int
    insertions: int

    @property
    def errors(self) -> int:
        return self.substitutions + self.deletions + self.insertions

    @property
    def wer(self) -> float:
        if self.reference_words == 0:
            return 0.0 if self.errors == 0 else 1.0
        return self.errors / self.reference_words


def word_error_rate(reference: str, hypothesis: str) -> WerResult:
    ref = normalize_text(reference).split()
    hyp = normalize_text(hypothesis).split()

    n, m = len(ref), len(hyp)
    # dp[i][j] = edit distance between ref[:i] and hyp[:j]
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref[i - 1] == hyp[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j],      # deletion
                    dp[i][j - 1],      # insertion
                    dp[i - 1][j - 1],  # substitution
                )

    # Backtrack to classify edits.
    i, j = n, m
    subs = dele = ins = 0
    while i > 0 or j > 0:
        if i > 0 and j > 0 and ref[i - 1] == hyp[j - 1]:
            i, j = i - 1, j - 1
            continue
        if i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            subs += 1
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            dele += 1
            i -= 1
        else:
            ins += 1
            j -= 1

    return WerResult(reference_words=n, substitutions=subs, deletions=dele, insertions=ins)


if __name__ == "__main__":
    ref = "the quick brown fox jumps over the lazy dog"
    hyp = "the quick brown fox jump over the lazy dog"
    result = word_error_rate(ref, hyp)
    print(result, f"WER={result.wer:.3%}")
