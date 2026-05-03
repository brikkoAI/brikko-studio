"""Tests for the golden-corpus benchmark harness.

Sprint 13 / Privacy v2 — Phase 5, Task 5.2.

We don't run the *full* 50-document corpus from these unit tests — that
takes ~5–10 s with Natasha NER and is the job of CI's dedicated
``pii-benchmark`` job. Instead we feed the harness a tiny in-test corpus
and assert:

* It produces per-category metrics with the correct shape.
* Span-level scoring math is right (TP / FP / FN counted correctly).
* Output JSON is written and parses back.

The mini corpus uses Sber's real ИНН (КС-valid) so the regex+checksum
pipeline actually finds it. Without that the benchmark would just
report 0/0 across the board and trivially "pass".
"""

from __future__ import annotations

import json
from pathlib import Path

from brikko_anonymizer.pii.ru_person import warm_up


def _write_mini_corpus(path: Path) -> None:
    """Three-document mini corpus exercising span-scoring edge cases."""
    docs = [
        {
            "id": "mini_001_inn_only",
            "genre": "test",
            "source": "synthetic",
            "text": "Договор с ООО ИНН 7707083893 подписан.",
            "annotations": [
                {"start": 18, "end": 28, "category": "INN", "value": "7707083893"},
            ],
        },
        {
            "id": "mini_002_email_phone",
            "genre": "test",
            "source": "synthetic",
            "text": "Контакт: ivanov@example.ru, +7 495 123-45-67",
            "annotations": [
                {
                    "start": 9,
                    "end": 26,
                    "category": "EMAIL",
                    "value": "ivanov@example.ru",
                },
                {
                    "start": 28,
                    "end": 44,
                    "category": "PHONE",
                    "value": "+7 495 123-45-67",
                },
            ],
        },
        {
            "id": "mini_003_empty",
            "genre": "test",
            "source": "synthetic",
            "text": "Просто текст без PII.",
            "annotations": [],
        },
    ]
    # Verify offsets statically — same invariant as validate_corpus.
    for doc in docs:
        for ann in doc["annotations"]:
            sliced = doc["text"][ann["start"] : ann["end"]]
            assert sliced == ann["value"], (
                f"{doc['id']}: text[{ann['start']}:{ann['end']}]={sliced!r} != {ann['value']!r}"
            )
    with path.open("w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False))
            f.write("\n")


def test_benchmark_runs_on_mini_corpus(tmp_path: Path) -> None:
    """Smoke: run_benchmark should ingest a corpus and emit per-category metrics."""
    from tests.pii_corpus.benchmark import run_benchmark

    warm_up()  # one-time load so the test isn't dominated by Natasha cold-start
    corpus = tmp_path / "mini.jsonl"
    out_dir = tmp_path / "out"
    _write_mini_corpus(corpus)

    results = run_benchmark(corpus, out_dir)

    # Every annotated category must appear.
    assert "INN" in results
    assert "EMAIL" in results
    assert "PHONE" in results

    # Metrics shape.
    for cat, m in results.items():
        assert {"precision", "recall", "f1", "tp", "fp", "fn"} <= set(m.keys()), cat
        assert 0.0 <= m["precision"] <= 1.0, cat
        assert 0.0 <= m["recall"] <= 1.0, cat
        assert 0.0 <= m["f1"] <= 1.0, cat

    # On this trivial corpus we expect perfect recall on the three
    # checked categories — values are KC-valid and unambiguous.
    assert results["INN"]["recall"] == 1.0
    assert results["EMAIL"]["recall"] == 1.0
    assert results["PHONE"]["recall"] == 1.0

    # Output JSON should exist and parse back to the same dict.
    saved = list(out_dir.glob("*.json"))
    assert len(saved) == 1, saved
    reloaded = json.loads(saved[0].read_text(encoding="utf-8"))
    assert reloaded.keys() == results.keys()


def test_benchmark_span_scoring_counts_correctly() -> None:
    """Direct test of the per-doc scoring helper.

    Given a known set of (gold, predicted) span tuples, the scoring
    function must classify each pair as TP / FP / FN deterministically.
    """
    from tests.pii_corpus.benchmark import score_doc

    gold = {(0, 5, "EMAIL"), (10, 20, "PHONE"), (30, 40, "INN")}
    predicted = {
        (0, 5, "EMAIL"),  # exact match → TP
        (10, 20, "EMAIL"),  # category mismatch on overlapping span → FP + FN
        (50, 60, "NAME"),  # extra → FP
    }

    by_cat = score_doc(gold, predicted)
    # EMAIL: TP=1 (match at 0-5), FP=1 (10-20 wrong category)
    assert by_cat["EMAIL"]["tp"] == 1
    assert by_cat["EMAIL"]["fp"] == 1
    # PHONE: gold span 10-20 had no PHONE match → FN=1
    assert by_cat["PHONE"]["fn"] == 1
    # INN: gold span 30-40 had no match → FN=1
    assert by_cat["INN"]["fn"] == 1
    # NAME: extra span → FP=1
    assert by_cat["NAME"]["fp"] == 1
