from wer import word_error_rate, normalize_text


def test_identical():
    r = word_error_rate("the cat sat on the mat", "the cat sat on the mat")
    assert r.wer == 0.0


def test_single_substitution():
    r = word_error_rate("the cat sat on the mat", "the dog sat on the mat")
    assert r.substitutions == 1
    assert r.deletions == 0
    assert r.insertions == 0
    assert abs(r.wer - 1 / 6) < 1e-9


def test_deletion():
    r = word_error_rate("the cat sat on the mat", "the cat on the mat")
    assert r.deletions == 1


def test_insertion():
    r = word_error_rate("the cat sat on the mat", "the cat sat right on the mat")
    assert r.insertions == 1


def test_empty_hypothesis_is_100pct_deletions():
    r = word_error_rate("hello world", "")
    assert r.deletions == 2
    assert r.wer == 1.0


def test_normalize_strips_punctuation_and_case():
    assert normalize_text("Hello, World!") == "hello world"
    assert normalize_text("  multiple   spaces  ") == "multiple spaces"


if __name__ == "__main__":
    import sys
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"PASS {t.__name__}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL {t.__name__}: {e}")
    sys.exit(1 if failed else 0)
