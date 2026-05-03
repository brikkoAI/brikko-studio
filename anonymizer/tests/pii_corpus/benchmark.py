"""Run the golden corpus through the PII detector, measure per-category metrics.

Sprint 13 / Privacy v2 — Phase 5, Task 5.2.

The goal of this script is **regression protection**, not absolute quality
benchmarking. We compute precision / recall / F1 per category against the
hand-annotated golden corpus and dump the results as JSON. CI compares
the JSON to a frozen baseline (:file:`baseline.json`) and fails the build
if recall on any category drops by more than the configured threshold
(see :file:`check_regression.py`).

Scoring conventions
-------------------

* A *gold span* is the triple ``(start, end, category)`` from the
  annotation file. Spans are tracked at the **span level** rather than
  the **value level** so we can detect missed occurrences in repeated
  PII (a doc with two ИНН but the recogniser only finds one is a real
  recall hit).
* A *predicted span* comes from
  :func:`brikko_anonymizer.pii.masker._collect_detections` — same shape
  ``(start, end, category)``.
* A *match* requires byte-exact span equality AND category equality.
  This is strict — partial-overlap matches would inflate scores. If
  the recogniser matches the right substring under the wrong category,
  it counts as one FP (in the predicted category) plus one FN (in the
  gold category).

Usage
-----

::

    cd apps/gateway
    python tests/pii_corpus/benchmark.py
    python tests/pii_corpus/benchmark.py --corpus PATH --out DIR

Stdout is a per-category P/R/F1 table; the JSON file lands in
``--out`` (default ``benchmark_results/``) keyed by today's ISO date.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import TypedDict


class CategoryStats(TypedDict):
    """Per-category aggregate counters + derived metrics."""

    precision: float
    recall: float
    f1: float
    tp: int
    fp: int
    fn: int


SpanKey = tuple[int, int, str]


def _detect_spans(text: str) -> set[SpanKey]:
    """Return the set of (start, end, category) spans the recogniser produces.

    Lazy-imports masker so test-only code paths (which monkeypatch
    `find_persons` etc.) don't pay the full Natasha cold-start before
    the test even calls into the real benchmark.
    """
    from brikko_anonymizer.pii.masker import _collect_detections

    return {(s, e, t) for s, e, t, _surface, _normalized in _collect_detections(text)}


def score_doc(gold: set[SpanKey], predicted: set[SpanKey]) -> dict[str, dict[str, int]]:
    """Score a single document at the span level.

    Returns a dict ``{category: {tp, fp, fn}}`` covering every category
    that appears in either set. Categories not in either set are absent
    (the caller aggregates by union of all docs).

    Edge cases:

    * Identical (start, end) but mismatched category — counts as FP for
      predicted and FN for gold. This is the cleanest signal that the
      recogniser confused two categories.
    * Overlapping but non-identical spans — both treated as independent
      FP / FN. We don't try to align partial overlaps (the masker uses
      strict spans internally so partial overlap should never happen
      against a well-formed gold set).
    """
    by_cat: dict[str, dict[str, int]] = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})

    tp_pairs = gold & predicted
    fn_pairs = gold - predicted
    fp_pairs = predicted - gold

    for _s, _e, cat in tp_pairs:
        by_cat[cat]["tp"] += 1
    for _s, _e, cat in fn_pairs:
        by_cat[cat]["fn"] += 1
    for _s, _e, cat in fp_pairs:
        by_cat[cat]["fp"] += 1

    return dict(by_cat)


def _compute_metrics(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
    """Standard precision / recall / F1 with safe-divide on empty denominators."""
    p = tp / (tp + fp) if (tp + fp) else 0.0
    r = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * p * r / (p + r) if (p + r) else 0.0
    return p, r, f1


def _print_table(results: dict[str, CategoryStats]) -> None:
    """Pretty-print a fixed-width per-category table."""
    print(f"{'Category':<15} {'P':>8} {'R':>8} {'F1':>8} {'TP':>6} {'FP':>6} {'FN':>6}")
    print("-" * 64)
    # Sort by category name for stable ordering across runs.
    for cat in sorted(results):
        m = results[cat]
        print(
            f"{cat:<15} {m['precision']:>7.2%} {m['recall']:>7.2%} {m['f1']:>7.2%} "
            f"{m['tp']:>6} {m['fp']:>6} {m['fn']:>6}"
        )


def run_benchmark(corpus_path: Path, out_dir: Path) -> dict[str, CategoryStats]:
    """Score the corpus, write a JSON snapshot, return the in-memory results.

    Parameters
    ----------
    corpus_path
        Path to the JSONL golden corpus.
    out_dir
        Directory for the dated JSON dump. Created if missing.

    Returns
    -------
    dict[str, CategoryStats]
        Per-category metrics. Keys = every category appearing in either
        the gold annotations or the recogniser predictions across the
        whole corpus.
    """
    if not corpus_path.exists():
        msg = f"corpus not found: {corpus_path}"
        raise FileNotFoundError(msg)

    # Warm Natasha once so per-doc timings reflect steady state.
    from brikko_anonymizer.pii.ru_person import warm_up

    warm_up()

    aggregate: dict[str, dict[str, int]] = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})

    with corpus_path.open(encoding="utf-8") as f:
        lines = [ln for ln in f.read().splitlines() if ln.strip()]

    n_docs = 0
    for line in lines:
        doc = json.loads(line)
        text = doc["text"]
        gold: set[SpanKey] = {(a["start"], a["end"], a["category"]) for a in doc["annotations"]}
        predicted = _detect_spans(text)
        per_doc = score_doc(gold, predicted)
        for cat, counts in per_doc.items():
            for k in ("tp", "fp", "fn"):
                aggregate[cat][k] += counts[k]
        n_docs += 1

    results: dict[str, CategoryStats] = {}
    for cat, counts in aggregate.items():
        p, r, f1 = _compute_metrics(counts["tp"], counts["fp"], counts["fn"])
        results[cat] = {
            "precision": round(p, 4),
            "recall": round(r, 4),
            "f1": round(f1, 4),
            "tp": counts["tp"],
            "fp": counts["fp"],
            "fn": counts["fn"],
        }

    # Stdout table.
    print(f"Corpus: {corpus_path} ({n_docs} docs)")
    _print_table(results)

    # Persist.
    out_dir.mkdir(parents=True, exist_ok=True)
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    out_file = out_dir / f"{today}.json"
    out_file.write_text(
        json.dumps(results, ensure_ascii=False, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    print(f"\nSaved: {out_file}")

    return results


def _parse_args() -> argparse.Namespace:
    here = Path(__file__).parent
    p = argparse.ArgumentParser(description="Run PII golden-corpus benchmark.")
    p.add_argument(
        "--corpus",
        type=Path,
        default=here / "golden_corpus.jsonl",
        help="Path to the golden corpus JSONL.",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=here / "benchmark_results",
        help="Directory for dated JSON results.",
    )
    return p.parse_args()


def main() -> None:
    args = _parse_args()
    run_benchmark(args.corpus, args.out)


if __name__ == "__main__":
    main()
