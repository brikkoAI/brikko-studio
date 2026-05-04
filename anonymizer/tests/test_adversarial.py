"""Adversarial PII corpus — non-blocking quality signal (M1 Task 16).

Hand-curated examples of bypass attempts (zero-width chars, mixed-script,
OCR-noise, transliteration, etc.). Failures here do NOT fail CI by default
— they get triaged into the Gateway PII roadmap. Set
``BRIKKO_ADVERSARIAL_BLOCK=1`` in the environment to convert SKIPs to
FAILs (used by manual quality gates, never by the standard PR workflow).

The GOLDEN corpus (Task 17) is the blocking gate.

Detection contract:
    ``detect_pii(text)`` → ``list[tuple[type, surface]]``
    where ``type`` is the masker category string (``EMAIL``, ``PHONE``,
    ``PASSPORT``, ``INN``, ``SNILS``, ``CARD``, ``NAME``).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

from brikko_anonymizer.pii.masker import detect_pii

CORPUS = Path(__file__).parent / "pii_corpus" / "adversarial_corpus.jsonl"


def _load() -> list[dict]:
    return [
        json.loads(line)
        for line in CORPUS.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


@pytest.mark.parametrize("example", _load(), ids=lambda e: e["id"])
def test_adversarial_recall(example: dict) -> None:
    """Recall check — every expected category must appear in detections.

    Non-blocking unless ``BRIKKO_ADVERSARIAL_BLOCK=1``.

    For ``partial_match`` examples ``expected_categories == []`` — we
    additionally enforce that NOTHING was detected (false-positive trap).
    A false positive on this class is a regression even in non-blocking
    mode, so we always fail it.
    """
    detected = {t for t, _ in detect_pii(example["text"])}
    expected = set(example["expected_categories"])

    # partial_match is the false-positive trap: nothing should be detected.
    # Always enforce — a regex that flags 9-digit numbers as INN is broken.
    if example.get("attack_class") == "partial_match":
        unexpected = detected - expected
        if unexpected:
            pytest.fail(
                f"adversarial[{example['id']}] (partial_match) "
                f"false-positive detected {unexpected}"
            )
        return

    missing = expected - detected
    if missing:
        msg = (
            f"adversarial[{example['id']}] ({example['attack_class']}) "
            f"missed {missing} (got {detected})"
        )
        if os.environ.get("BRIKKO_ADVERSARIAL_BLOCK") == "1":
            pytest.fail(msg)
        else:
            pytest.skip(msg)
