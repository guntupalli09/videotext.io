from bootstrap import bootstrap_ci


def test_point_estimate_matches_corpus_ratio():
    data = [(1, 10), (0, 8), (2, 12), (0, 9), (1, 11)]
    result = bootstrap_ci(data, n_resamples=1000)
    expected = sum(x[0] for x in data) / sum(x[1] for x in data)
    assert abs(result.point_estimate - expected) < 1e-9


def test_ci_contains_point_estimate():
    data = [(1, 10), (0, 8), (2, 12), (0, 9), (1, 11), (3, 15), (0, 7)]
    result = bootstrap_ci(data, n_resamples=2000)
    assert result.ci_low <= result.point_estimate <= result.ci_high


def test_zero_errors_gives_zero_width_ci():
    data = [(0, 10)] * 20
    result = bootstrap_ci(data, n_resamples=500)
    assert result.point_estimate == 0.0
    assert result.ci_low == 0.0
    assert result.ci_high == 0.0


def test_larger_sample_gives_narrower_ci():
    small = [(1, 10), (0, 8), (2, 12)]
    large = small * 20  # same ratio, 20x the data -> narrower CI
    small_result = bootstrap_ci(small, n_resamples=2000, seed=1)
    large_result = bootstrap_ci(large, n_resamples=2000, seed=1)
    small_width = small_result.ci_high - small_result.ci_low
    large_width = large_result.ci_high - large_result.ci_low
    assert large_width < small_width


def test_empty_raises():
    try:
        bootstrap_ci([])
        assert False, "expected ValueError"
    except ValueError:
        pass


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
