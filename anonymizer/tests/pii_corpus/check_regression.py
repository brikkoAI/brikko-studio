"""Compare a fresh benchmark against the frozen baseline.

Sprint 13 / Privacy v2 — Phase 5, Task 5.3.

CI's ``pii-benchmark`` job calls ``benchmark.py`` first to produce
``benchmark_results/YYYY-MM-DD.json``, then this script to compare. We
exit non-zero if **recall drops by more than the configured threshold**
on any category present in the baseline.

Why recall-only (not precision):

* Recall regression = a known PII type is no longer being masked.
  That's a privacy-leak class bug — the data we promised to redact is
  reaching the upstream provider unmasked. Hard fail.
* Precision regression = more false-positive masking. Annoying, breaks
  prompts, but it's not a leak. Treat it as a soft warning rather than a
  CI block — surfaced in stdout, doesn't ``sys.exit(1)``.

Usage::

    python tests/pii_corpus/check_regression.py \\
        --baseline tests/pii_corpus/baseline.json \\
        --current  tests/pii_corpus/benchmark_results/2026-05-03.json \\
        --max-recall-drop 0.005

Categories that exist only in the *current* run (new recognisers added
since the baseline was frozen) are reported but don't fail the gate.
Categories that exist only in the *baseline* (e.g. a recogniser was
removed) are treated as recall=0 and DO fail — that's exactly the
regression we want to catch.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _load(path: Path) -> dict[str, dict[str, float]]:
    if not path.exists():
        msg = f"file not found: {path}"
        raise FileNotFoundError(msg)
    data: dict[str, dict[str, float]] = json.loads(path.read_text(encoding="utf-8"))
    return data


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Block CI if PII recall regressed against baseline."
    )
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument(
        "--current",
        type=Path,
        required=True,
        help="Path to a single benchmark JSON result.",
    )
    parser.add_argument(
        "--max-recall-drop",
        type=float,
        default=0.005,
        help="Maximum allowed recall drop per category (default 0.5pp).",
    )
    args = parser.parse_args()

    baseline = _load(args.baseline)
    current = _load(args.current)

    failures: list[tuple[str, float, float, float]] = []
    new_categories: list[str] = []

    for cat, base_metrics in baseline.items():
        base_recall = float(base_metrics.get("recall", 0.0))
        cur_metrics = current.get(cat)
        if cur_metrics is None:
            # Missing category in current run = recall effectively 0.
            failures.append((cat, base_recall, 0.0, base_recall))
            continue
        cur_recall = float(cur_metrics.get("recall", 0.0))
        drop = base_recall - cur_recall
        if drop > args.max_recall_drop:
            failures.append((cat, base_recall, cur_recall, drop))

    for cat in current:
        if cat not in baseline:
            new_categories.append(cat)

    if new_categories:
        print(
            "Note: new categories in current run "
            f"(not in baseline): {', '.join(sorted(new_categories))}"
        )
        print("  These are not gated. Re-snapshot baseline.json to include them.")

    if failures:
        print(
            f"FAIL — recall regression on {len(failures)} category"
            f"({'ies' if len(failures) != 1 else 'y'}) "
            f"(max allowed drop: {args.max_recall_drop:.2%}):",
            file=sys.stderr,
        )
        for cat, base_r, cur_r, drop in failures:
            print(
                f"  {cat:<15s} {base_r:>7.2%} -> {cur_r:>7.2%}  (drop: {drop:.2%})",
                file=sys.stderr,
            )
        return 1

    print(
        f"OK — no recall regression. {len(baseline)} categor"
        f"{'ies' if len(baseline) != 1 else 'y'} checked "
        f"(threshold: {args.max_recall_drop:.2%})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
