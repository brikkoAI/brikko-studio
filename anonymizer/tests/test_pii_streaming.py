"""Unit tests for :class:`StreamUnmasker` (Sprint 13 / Privacy v2 — Phase 3).

The class lifts the V1.5 known-limitation that placeholders split across SSE
chunks (``chunk1='Hello <NAM' + chunk2='E_1>!'``) leaked the raw placeholder
to the client.  Carry-buffer of 32 chars (≈2× the longest possible
placeholder ``<BANK_ACCOUNT_999>`` = 18 chars) buys atomic restoration with
≤32-char emit lag per chunk.

Property under test: feeding ANY chunking of a string ``s`` through
``StreamUnmasker`` and concatenating outputs (plus the final ``flush``)
yields ``unmask_text(s, mapping)``.
"""

from __future__ import annotations

import pytest

from brikko_anonymizer.pii.masker import PiiMapping, mask_text, unmask_text
from brikko_anonymizer.pii.streaming import CARRY_BUFFER_SIZE, StreamUnmasker

# ---------- fixtures ---------------------------------------------------------


@pytest.fixture
def mapping_with_name() -> PiiMapping:
    """Mapping with a single PERSON placeholder ``<NAME_1>`` → "Иванов Иван"."""
    mapping = PiiMapping()
    masked = mask_text("Иванов Иван", mapping)
    assert masked == "<NAME_1>", f"sanity: fixture expects <NAME_1>, got {masked!r}"
    return mapping


@pytest.fixture
def mapping_with_two_names() -> PiiMapping:
    """Mapping with two PERSON placeholders ``<NAME_1>``, ``<NAME_2>``."""
    mapping = PiiMapping()
    mask_text("Иванов Иван", mapping)
    mask_text("Петров Пётр", mapping)
    assert mapping.size == 2
    return mapping


# ---------- happy path -------------------------------------------------------


def test_complete_placeholder_in_one_chunk(mapping_with_name: PiiMapping) -> None:
    """Single chunk containing complete ``<NAME_1>`` → unmasked immediately."""
    u = StreamUnmasker(mapping=mapping_with_name)
    out = u.feed("Hello <NAME_1>!")
    tail = u.flush()
    assert out + tail == "Hello Иванов Иван!"


def test_no_placeholder_pass_through() -> None:
    """Plain text without placeholders or `<` — emitted verbatim."""
    mapping = PiiMapping()
    u = StreamUnmasker(mapping=mapping)
    assert u.feed("Hello, world!") == "Hello, world!"
    assert u.flush() == ""


# ---------- split-at-every-position covers the corner cases ------------------


def test_split_at_lt(mapping_with_name: PiiMapping) -> None:
    """Stream cuts immediately after ``<`` — buffer holds the rest."""
    u = StreamUnmasker(mapping=mapping_with_name)
    out1 = u.feed("Hello <")
    out2 = u.feed("NAME_1>!")
    tail = u.flush()
    assert out1 + out2 + tail == "Hello Иванов Иван!"


def test_split_in_middle(mapping_with_name: PiiMapping) -> None:
    u = StreamUnmasker(mapping=mapping_with_name)
    out1 = u.feed("Hello <NAM")
    out2 = u.feed("E_1>!")
    tail = u.flush()
    assert out1 + out2 + tail == "Hello Иванов Иван!"


def test_split_just_before_gt(mapping_with_name: PiiMapping) -> None:
    u = StreamUnmasker(mapping=mapping_with_name)
    out1 = u.feed("Hello <NAME_1")
    out2 = u.feed(">!")
    tail = u.flush()
    assert out1 + out2 + tail == "Hello Иванов Иван!"


def test_split_after_gt(mapping_with_name: PiiMapping) -> None:
    """Cut right after ``>`` — placeholder fully resolved on first chunk."""
    u = StreamUnmasker(mapping=mapping_with_name)
    out1 = u.feed("Hello <NAME_1>")
    out2 = u.feed("!")
    tail = u.flush()
    assert out1 + out2 + tail == "Hello Иванов Иван!"


def test_split_per_character(mapping_with_name: PiiMapping) -> None:
    """Worst case — one character per chunk — must still produce identical output."""
    u = StreamUnmasker(mapping=mapping_with_name)
    text = "Hi <NAME_1>!"
    output = ""
    for char in text:
        output += u.feed(char)
    output += u.flush()
    assert output == "Hi Иванов Иван!"


# ---------- multiple placeholders -------------------------------------------


def test_two_placeholders_clean_chunks(mapping_with_two_names: PiiMapping) -> None:
    u = StreamUnmasker(mapping=mapping_with_two_names)
    out = u.feed("<NAME_1> and <NAME_2>")
    tail = u.flush()
    assert out + tail == "Иванов Иван and Петров Пётр"


def test_two_placeholders_split_at_boundary(
    mapping_with_two_names: PiiMapping,
) -> None:
    """Two placeholders, split between them — both unmasked correctly."""
    u = StreamUnmasker(mapping=mapping_with_two_names)
    out1 = u.feed("Both <NAM")
    out2 = u.feed("E_1> and <")
    out3 = u.feed("NAME_2> are here")
    full = out1 + out2 + out3 + u.flush()
    assert full == "Both Иванов Иван and Петров Пётр are here"


def test_back_to_back_placeholders_split(
    mapping_with_two_names: PiiMapping,
) -> None:
    """Placeholders touching with no separator: ``<NAME_1><NAME_2>``."""
    u = StreamUnmasker(mapping=mapping_with_two_names)
    out1 = u.feed("<NAME_1><NAM")
    out2 = u.feed("E_2>")
    full = out1 + out2 + u.flush()
    assert full == "Иванов ИванПетров Пётр"


# ---------- edge cases -------------------------------------------------------


def test_unknown_placeholder_passes_through() -> None:
    """Placeholder shape but not in mapping (LLM hallucination) — kept as-is."""
    mapping = PiiMapping()
    u = StreamUnmasker(mapping=mapping)
    out = u.feed("Hello <NAME_99>!")
    full = out + u.flush()
    assert full == "Hello <NAME_99>!"


def test_lt_without_placeholder_not_lost() -> None:
    """Bare ``<`` from math/code text is NOT consumed by the buffer."""
    mapping = PiiMapping()
    u = StreamUnmasker(mapping=mapping)
    out1 = u.feed("If x < 5")
    out2 = u.feed(" then y > 0")
    tail = u.flush()
    assert out1 + out2 + tail == "If x < 5 then y > 0"


def test_lt_at_end_of_chunk_preserved_after_flush() -> None:
    """Trailing bare ``<`` (truncated stream) is emitted by flush as-is."""
    mapping = PiiMapping()
    u = StreamUnmasker(mapping=mapping)
    out1 = u.feed("Hello <")
    tail = u.flush()
    assert out1 + tail == "Hello <"


def test_truncated_partial_placeholder_emitted_by_flush(
    mapping_with_name: PiiMapping,
) -> None:
    """Stream cancelled mid-placeholder: flush emits the partial fragment unchanged.

    Documented limitation — we cannot unmask without the closing ``>``.
    """
    u = StreamUnmasker(mapping=mapping_with_name)
    out1 = u.feed("Hello <NAM")
    tail = u.flush()
    assert out1 + tail == "Hello <NAM"


def test_empty_chunk() -> None:
    """Empty string chunk is a no-op."""
    mapping = PiiMapping()
    u = StreamUnmasker(mapping=mapping)
    assert u.feed("") == ""
    assert u.flush() == ""


def test_reset_between_streams(mapping_with_name: PiiMapping) -> None:
    """``reset()`` discards carry buffer between independent streams."""
    u = StreamUnmasker(mapping=mapping_with_name)
    u.feed("Hello <NAM")  # leaves "<NAM" in carry
    assert u._carry == "<NAM"
    u.reset()
    assert u._carry == ""
    out = u.feed("World!")
    assert out == "World!"


# ---------- non-NAME categories (regression: not just NAME paths) ------------


def test_email_split_across_chunks() -> None:
    """``<EMAIL_1>`` split across chunks restores correctly."""
    mapping = PiiMapping()
    masked = mask_text("contact me at ivan@example.ru tomorrow", mapping)
    assert "<EMAIL_1>" in masked

    u = StreamUnmasker(mapping=mapping)
    # Simulate provider sending the masked text back, split at ``<EMA``.
    chunks = ["See ", "<EMA", "IL_1>", " thanks"]
    out = "".join(u.feed(c) for c in chunks) + u.flush()
    assert out == "See ivan@example.ru thanks"


def test_bank_account_long_placeholder() -> None:
    """``<BANK_ACCOUNT_1>`` — the longest placeholder shape — round-trips when
    split inside the type tag (worst case for buffer size)."""
    mapping = PiiMapping()
    # Build mapping by direct insertion (no need to mask a real RS).
    mapping.forward["40702810500000001234"] = "<BANK_ACCOUNT_1>"
    mapping.reverse["<BANK_ACCOUNT_1>"] = "40702810500000001234"

    u = StreamUnmasker(mapping=mapping)
    chunks = ["account: <BANK_ACCO", "UNT_1> ok"]
    out = "".join(u.feed(c) for c in chunks) + u.flush()
    assert out == "account: 40702810500000001234 ok"


# ---------- structural invariant ---------------------------------------------


def test_carry_buffer_size_constant_sufficient() -> None:
    """Sanity: ``CARRY_BUFFER_SIZE`` ≥ longest possible placeholder length.

    Longest is ``<BANK_ACCOUNT_999>`` = 18 chars; 32 leaves ≥14 char margin.
    """
    longest_placeholder = len("<BANK_ACCOUNT_999>")
    assert longest_placeholder <= CARRY_BUFFER_SIZE


# ---------- equivalence with non-streaming unmask ----------------------------


@pytest.mark.parametrize(
    "split_at",
    [1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
)
def test_equivalence_with_unmask_text(
    split_at: int, mapping_with_name: PiiMapping
) -> None:
    """For every split position, streamed output equals ``unmask_text``."""
    text = "Привет, <NAME_1>! Это тест."
    expected = unmask_text(text, mapping_with_name)

    u = StreamUnmasker(mapping=mapping_with_name)
    a, b = text[:split_at], text[split_at:]
    out = u.feed(a) + u.feed(b) + u.flush()
    assert out == expected, f"split_at={split_at}: {out!r} != {expected!r}"


def test_equivalence_with_unmask_text_three_chunks(
    mapping_with_two_names: PiiMapping,
) -> None:
    text = "<NAME_1> works with <NAME_2> on the project."
    expected = unmask_text(text, mapping_with_two_names)

    # Try three splits: in middle of first PH, between PHs, in middle of second
    u = StreamUnmasker(mapping=mapping_with_two_names)
    chunks = [
        text[:5],   # "<NAME"
        text[5:25], # "_1> works with <NAME"
        text[25:],  # "_2> on the project."
    ]
    out = "".join(u.feed(c) for c in chunks) + u.flush()
    assert out == expected
