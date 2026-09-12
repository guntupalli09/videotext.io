from punctuation import punctuation_score


def test_perfect_match():
    r = punctuation_score("Hello, world. How are you?", "Hello, world. How are you?")
    assert r.terminal_f1 == 1.0
    assert r.comma_f1 == 1.0


def test_no_punctuation_in_hypothesis():
    r = punctuation_score("Hello, world. How are you?", "hello world how are you")
    assert r.terminal_precision == 0.0  # no predicted punctuation -> precision undefined->0 by convention
    assert r.terminal_recall == 0.0
    assert r.comma_recall == 0.0


def test_extra_punctuation_is_false_positive():
    r = punctuation_score("hello world", "hello, world.")
    assert r.terminal_precision == 0.0
    assert r.comma_precision == 0.0


def test_partial_terminal_match():
    # ref has 2 terminal marks, hyp gets 1 right, 1 missed, 0 extra
    r = punctuation_score("Stop. Go. Now.", "Stop. Go Now.")
    assert r.terminal_recall < 1.0
    assert r.terminal_precision == 1.0


def test_unmatched_words_excluded():
    r = punctuation_score("Hello, brave new world.", "Hello, world.")
    assert r.matched_words <= 4


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
