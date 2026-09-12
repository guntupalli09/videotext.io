"""Punctuation restoration metric.

Only meaningful on ground truth that itself carries real punctuation (e.g.
CMU ARCTIC prompts, which are proper sentences) — LibriSpeech's default
transcripts are uppercase with no punctuation at all, so this metric is not
computed on LibriSpeech-derived conditions (documented in PROTOCOL.md).

Method: align hypothesis and reference at the word level (case/punctuation
stripped, same alignment approach as wer.py), then for every matched word
pair, compare whether a sentence-final mark (. ? !) or a comma immediately
follows the reference word vs. the hypothesis word. Reports precision/
recall/F1 separately for terminal punctuation and commas, over matched
words only (an unmatched word has no punctuation attribution).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

PUNCTUATION_IMPL_VERSION = "1.0.0"


def _tokenize_with_punct(text: str) -> list[tuple[str, str]]:
    """Returns [(word_lower, trailing_punct_class)] where trailing_punct_class
    is 'terminal' (.?!), 'comma' (,), or '' (none)."""
    tokens = re.findall(r"[A-Za-z0-9']+[.,?!]?", text)
    result = []
    for tok in tokens:
        m = re.match(r"([A-Za-z0-9']+)([.,?!]?)$", tok)
        if not m:
            continue
        word, punct = m.group(1).lower(), m.group(2)
        cls = "terminal" if punct in (".", "?", "!") else ("comma" if punct == "," else "")
        result.append((word, cls))
    return result


def _align_words(ref_words: list[str], hyp_words: list[str]) -> list[tuple[int | None, int | None]]:
    """Same Levenshtein alignment as wer.py, returns list of (ref_idx, hyp_idx)
    pairs (None where one side has no counterpart)."""
    n, m = len(ref_words), len(hyp_words)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if ref_words[i - 1] == hyp_words[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    i, j = n, m
    pairs: list[tuple[int | None, int | None]] = []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and ref_words[i - 1] == hyp_words[j - 1]:
            pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            pairs.append((i - 1, j - 1))  # substitution: still a matched position
            i, j = i - 1, j - 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            pairs.append((i - 1, None))
            i -= 1
        else:
            pairs.append((None, j - 1))
            j -= 1
    pairs.reverse()
    return pairs


@dataclass
class PunctuationResult:
    matched_words: int
    terminal_precision: float
    terminal_recall: float
    terminal_f1: float
    comma_precision: float
    comma_recall: float
    comma_f1: float


def _prf1(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    return precision, recall, f1


def punctuation_score(reference: str, hypothesis: str) -> PunctuationResult:
    ref_tok = _tokenize_with_punct(reference)
    hyp_tok = _tokenize_with_punct(hypothesis)
    ref_words = [w for w, _ in ref_tok]
    hyp_words = [w for w, _ in hyp_tok]

    pairs = _align_words(ref_words, hyp_words)

    term_tp = term_fp = term_fn = 0
    comma_tp = comma_fp = comma_fn = 0
    matched = 0
    for ref_idx, hyp_idx in pairs:
        if ref_idx is None or hyp_idx is None:
            continue
        matched += 1
        ref_cls = ref_tok[ref_idx][1]
        hyp_cls = hyp_tok[hyp_idx][1]
        ref_terminal, hyp_terminal = ref_cls == "terminal", hyp_cls == "terminal"
        ref_comma, hyp_comma = ref_cls == "comma", hyp_cls == "comma"

        if ref_terminal and hyp_terminal:
            term_tp += 1
        elif hyp_terminal and not ref_terminal:
            term_fp += 1
        elif ref_terminal and not hyp_terminal:
            term_fn += 1

        if ref_comma and hyp_comma:
            comma_tp += 1
        elif hyp_comma and not ref_comma:
            comma_fp += 1
        elif ref_comma and not hyp_comma:
            comma_fn += 1

    tp, tr, tf = _prf1(term_tp, term_fp, term_fn)
    cp, cr, cf = _prf1(comma_tp, comma_fp, comma_fn)
    return PunctuationResult(
        matched_words=matched,
        terminal_precision=round(tp, 4),
        terminal_recall=round(tr, 4),
        terminal_f1=round(tf, 4),
        comma_precision=round(cp, 4),
        comma_recall=round(cr, 4),
        comma_f1=round(cf, 4),
    )


if __name__ == "__main__":
    ref = "Hello, world. How are you?"
    hyp = "hello world how are you"
    print(punctuation_score(ref, hyp))
