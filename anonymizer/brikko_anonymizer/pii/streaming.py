"""Streaming unmasker for SSE chunks (Sprint 13 / Privacy v2 — Phase 3).

Lifts the V1.5 known-limitation: a placeholder like ``<NAME_1>`` split across
two SSE chunks (``chunk1='Привет <NAM' + chunk2='E_1>!'``) used to leak the
raw fragment to the client because per-chunk regex unmasking couldn't see
the full token.

Algorithm
---------
1. Maintain a small carry-over buffer of ≤ :data:`CARRY_BUFFER_SIZE` chars.
2. On each ``feed(chunk)``:

   * Concatenate ``carry + chunk``.
   * Locate the **last** ``<`` that could begin an *incomplete* placeholder.
     Search only the ``CARRY_BUFFER_SIZE``-char tail — anything earlier
     either has its closing ``>`` already inside the visible window or
     cannot be a placeholder (max length ≤ 18).
   * If that ``<`` is followed by ``>`` somewhere in the tail, the
     placeholder is *complete*: emit everything, reset carry.
   * Otherwise emit the prefix up to that ``<`` and carry the suffix.

3. ``flush()`` emits the remaining carry on end-of-stream.  A truncated
   stream that ended mid-placeholder (``<NAM``) is emitted as-is — no
   restoration is possible without the closing ``>``.

Guarantees
----------
* No raw placeholder reaches the client (provided the stream completes).
* Latency overhead ≤ :data:`CARRY_BUFFER_SIZE` chars per chunk vs. the
  V1.5 zero-buffer behaviour.
* Bare ``<`` characters from real text (math ``x < 5``, code) survive the
  round-trip unchanged.

Placeholder shape recap (see :func:`brikko_anonymizer.pii.masker._PLACEHOLDER_RE`):
``<TYPE_DIGITS>`` where ``TYPE`` ∈ {NAME, EMAIL, PHONE, PASSPORT, INN,
SNILS, CARD, OGRN, OGRNIP, BANK_ACCOUNT}.  Worst case
``<BANK_ACCOUNT_999>`` is 18 characters — the 32-char buffer leaves a
≥ 14-char safety margin for any future placeholder shapes.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from brikko_anonymizer.pii.masker import PiiMapping, unmask_text

# Worst case placeholder is ``<BANK_ACCOUNT_999>`` = 18 chars.  Use 32 to
# leave a generous margin for any future placeholder type names.
CARRY_BUFFER_SIZE: Final[int] = 32


@dataclass
class StreamUnmasker:
    """Stateful unmasker for SSE-style streaming chunks.

    Usage::

        unmasker = StreamUnmasker(mapping=pii_mapping)
        async for chunk in stream:
            yield unmasker.feed(chunk)
        tail = unmasker.flush()
        if tail:
            yield tail

    The instance is **not thread-safe** — each independent stream needs its
    own ``StreamUnmasker``.  Reuse across streams via :meth:`reset`.
    """

    mapping: PiiMapping
    _carry: str = ""

    def feed(self, chunk: str) -> str:
        """Process a single chunk; return text safe to emit (placeholders restored).

        The returned string has every fully-buffered placeholder substituted
        for its original surface form.  Anything that *might* be the prefix
        of a longer placeholder (a ``<`` whose closing ``>`` hasn't arrived
        yet) is held back until the next ``feed`` or ``flush``.
        """
        if not chunk:
            return ""

        combined = self._carry + chunk

        # Search for the last ``<`` only inside the buffer-sized tail.
        # Anything earlier either has its ``>`` already in the tail or is
        # too far back to ever be a real placeholder (max ≤ 18 chars).
        search_start = max(0, len(combined) - CARRY_BUFFER_SIZE)
        last_lt = combined.rfind("<", search_start)

        if last_lt == -1:
            # No potential placeholder start in tail — emit everything.
            emit_part = combined
            self._carry = ""
        else:
            tail = combined[last_lt:]
            if ">" in tail:
                # Complete placeholder (or stray ``<…>``) sits inside the
                # tail — emit everything, leave carry empty.  Any earlier
                # placeholder is also complete (otherwise it would have
                # been carried on a previous turn).
                emit_part = combined
                self._carry = ""
            else:
                # Potentially partial placeholder; hold it for next chunk.
                emit_part = combined[:last_lt]
                self._carry = tail

        return unmask_text(emit_part, self.mapping)

    def flush(self) -> str:
        """End-of-stream: emit any held-over text.

        If carry contains a complete placeholder it gets unmasked normally.
        If it contains a truncated fragment (``<NAM`` from a cancelled
        stream) it is emitted as-is — restoration without ``>`` is
        impossible and dropping the bytes would corrupt the visible output.
        """
        emit = self._carry
        self._carry = ""
        if not emit:
            return ""
        return unmask_text(emit, self.mapping)

    def reset(self) -> None:
        """Discard carry buffer between independent streams."""
        self._carry = ""


__all__ = ["CARRY_BUFFER_SIZE", "StreamUnmasker"]
