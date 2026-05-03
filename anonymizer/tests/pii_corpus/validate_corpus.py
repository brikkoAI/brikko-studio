"""Static validator for :file:`golden_corpus.jsonl`.

Sprint 13 / Privacy v2 — Phase 5, Task 5.1 (verification step).

Two invariants the benchmark relies on:

1. **Offset integrity** — for every annotation, ``text[start:end] == value``.
   Off-by-one errors silently inflate FN counts in `benchmark.py`.
2. **Checksum validity** — every ИНН / СНИЛС / ОГРН / ОГРНИП / CARD passes
   its checksum function. The recogniser correctly rejects KC-invalid IDs,
   so non-valid annotations would just look like FN to the benchmark.

Run as:

    python tests/pii_corpus/validate_corpus.py

Exits non-zero on any error, prints the offending document IDs.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from brikko_anonymizer.pii.checksums import (
    inn10,
    inn12,
    luhn,
    ogrn,
    ogrnip,
    snils,
)

_KC_REQUIRED = {"INN", "OGRN", "OGRNIP", "SNILS", "CARD"}


def _kc_valid(category: str, value: str) -> bool:
    if category == "INN":
        digits = "".join(c for c in value if c.isdigit())
        return inn10(value) if len(digits) == 10 else inn12(value)
    if category == "OGRN":
        return ogrn(value)
    if category == "OGRNIP":
        return ogrnip(value)
    if category == "SNILS":
        return snils(value)
    if category == "CARD":
        return luhn(value)
    return True


def validate(corpus_path: Path) -> list[str]:
    """Return list of error messages (empty list = corpus is clean)."""
    errors: list[str] = []
    with corpus_path.open(encoding="utf-8") as f:
        lines = [ln for ln in f.read().splitlines() if ln.strip()]

    seen_ids: set[str] = set()
    for ln_no, line in enumerate(lines, start=1):
        try:
            doc = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"line {ln_no}: invalid JSON ({exc})")
            continue

        doc_id = doc.get("id", f"<no-id>line{ln_no}")
        if doc_id in seen_ids:
            errors.append(f"{doc_id}: duplicate id")
        seen_ids.add(doc_id)

        text = doc.get("text", "")
        annotations = doc.get("annotations", [])
        for i, ann in enumerate(annotations):
            start = ann.get("start")
            end = ann.get("end")
            cat = ann.get("category")
            val = ann.get("value")

            if not isinstance(start, int) or not isinstance(end, int):
                errors.append(f"{doc_id} ann#{i}: non-integer offsets ({start!r},{end!r})")
                continue
            if start < 0 or end > len(text) or start >= end:
                errors.append(
                    f"{doc_id} ann#{i}: invalid range [{start},{end}) for text length {len(text)}"
                )
                continue

            sliced = text[start:end]
            if sliced != val:
                errors.append(
                    f"{doc_id} ann#{i} {cat}: text[{start}:{end}]={sliced!r} but value={val!r}"
                )
                continue

            if cat in _KC_REQUIRED and not _kc_valid(cat, val):
                errors.append(f"{doc_id} ann#{i} {cat}: checksum failed for {val!r}")

    return errors


def main() -> int:
    corpus = Path(__file__).parent / "golden_corpus.jsonl"
    if not corpus.exists():
        print(f"ERROR: corpus not found at {corpus}", file=sys.stderr)
        return 2

    errors = validate(corpus)
    n_lines = sum(1 for _ in corpus.open(encoding="utf-8"))
    if errors:
        print(f"FAIL — {len(errors)} error(s):", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        return 1

    print(f"{n_lines} docs validated, 0 errors")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
