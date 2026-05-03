"""Tests for the Natasha-based PERSON recognizer (Sprint 13 / Privacy v2 Phase 2).

These tests describe the contract of :pyfunc:`brikko_anonymizer.pii.ru_person.find_persons`:

* Returns ``list[PersonSpan]`` sorted by start offset, no overlaps.
* ``surface`` is the exact substring as it appears in the input text (declined form).
* ``normalized`` is the nominative-case form (e.g. "Иванову Ивану" → "Иванов Иван").
* Empty input or text without persons → ``[]``.

Several Natasha limitations are documented as ``xfail`` — see comments below.
The hybrid (regex pre-filter + Natasha confirmation) lives in ``masker.py`` and
is the responsibility of Task 2.3, not this module.
"""

from __future__ import annotations

import pytest

from brikko_anonymizer.pii.ru_person import PersonSpan, find_persons

# ---------- triplets ----------------------------------------------------------


class TestBasicTriplets:
    def test_simple_triplet_nominative(self) -> None:
        spans = find_persons("Сегодня встреча с Иванов Иван Петрович в 10:00")
        assert len(spans) == 1
        assert spans[0].surface == "Иванов Иван Петрович"
        assert spans[0].normalized == "Иванов Иван Петрович"

    def test_triplet_genitive_case(self) -> None:
        spans = find_persons("Документ от Иванова Ивана Петровича")
        assert len(spans) == 1
        assert spans[0].surface == "Иванова Ивана Петровича"
        # Normalized → nominative.
        assert spans[0].normalized == "Иванов Иван Петрович"

    def test_triplet_instrumental_case(self) -> None:
        spans = find_persons("Обсудили с Ивановым Иваном Петровичем")
        assert len(spans) == 1
        assert spans[0].surface == "Ивановым Иваном Петровичем"
        assert spans[0].normalized == "Иванов Иван Петрович"

    def test_triplet_dative_case(self) -> None:
        # Natasha's NER misses isolated dative-case ФИО without surrounding
        # context; the yargy fallback (NamesExtractor) catches it.
        spans = find_persons("Передайте Иванову Ивану Петровичу")
        assert len(spans) == 1
        assert spans[0].surface == "Иванову Ивану Петровичу"
        assert "Иванов" in spans[0].normalized
        assert "Иван" in spans[0].normalized

    def test_classic_russian_writer(self) -> None:
        spans = find_persons("Толстой Лев Николаевич родился в 1828 году")
        assert len(spans) == 1
        assert spans[0].surface == "Толстой Лев Николаевич"


# ---------- doublets ----------------------------------------------------------


class TestDoublets:
    def test_first_then_last(self) -> None:
        spans = find_persons("Иван Иванов отправил отчёт")
        assert len(spans) == 1
        assert spans[0].surface == "Иван Иванов"
        assert spans[0].normalized == "Иван Иванов"

    def test_last_then_first(self) -> None:
        spans = find_persons("Иванов Иван написал письмо")
        assert len(spans) == 1
        assert spans[0].surface == "Иванов Иван"
        assert spans[0].normalized == "Иванов Иван"

    def test_female_dative(self) -> None:
        # NER catches this — both tokens are flexed, but pretty common shape.
        spans = find_persons("Передайте Ольге Ивановой документы")
        assert len(spans) == 1
        assert spans[0].surface == "Ольге Ивановой"
        assert spans[0].normalized == "Ольга Иванова"


# ---------- initials ----------------------------------------------------------


class TestInitials:
    def test_full_initials_then_surname(self) -> None:
        spans = find_persons("Документ подписал И. И. Иванов")
        assert len(spans) == 1
        # Surface comes from input verbatim — preserves dot-spacing.
        assert "Иванов" in spans[0].surface
        assert "И." in spans[0].surface

    def test_surname_then_initials(self) -> None:
        spans = find_persons("Контактное лицо: Иванов И.И.")
        assert len(spans) == 1
        assert "Иванов" in spans[0].surface


# ---------- single surnames ---------------------------------------------------


class TestSingleSurnames:
    def test_single_surname_strong_context(self) -> None:
        spans = find_persons("Иванов сообщил, что задача выполнена.")
        assert len(spans) == 1
        assert spans[0].surface == "Иванов"


# ---------- not-persons / negative cases --------------------------------------


class TestNotPersons:
    def test_empty_text(self) -> None:
        assert find_persons("") == []

    def test_no_persons(self) -> None:
        assert find_persons("Привет, мир! Как дела?") == []

    def test_english_text(self) -> None:
        # Natasha is Russian-specific — English names should not surface.
        assert find_persons("Hello John Smith, how are you?") == []

    def test_possessive_form(self) -> None:
        # «Ивановскую» — adjective derivative, not a person entity.
        # Natasha NER correctly skips it; yargy fallback may match the
        # adjective lemma → filter must drop it.
        spans = find_persons("Передали Ивановскую коллекцию")
        # Adjective forms don't have a personal-name fact — must be empty.
        assert spans == []

    def test_organization_quoted_name(self) -> None:
        # «ООО "Иванов и партнёры"» — quotes + ORG context.
        # NER skips it. Yargy may pick up "Иванов" as standalone surname.
        # Acceptable behaviour: either 0 spans (preferred) or 1 span on
        # «Иванов» — both are reasonable outcomes for this ambiguous input.
        # We assert no false-positive on «партнёры» / «ООО».
        spans = find_persons('Заключили договор с ООО "Иванов и партнёры"')
        for s in spans:
            assert s.surface == "Иванов", (
                f"unexpected span surface inside ORG context: {s.surface!r}"
            )


# ---------- spans / offsets ---------------------------------------------------


class TestSpansAndOffsets:
    def test_offsets_match_substring(self) -> None:
        text = "Документ от Иванова Ивана Петровича"
        spans = find_persons(text)
        assert len(spans) == 1
        s = spans[0]
        assert text[s.start : s.end] == s.surface

    def test_no_overlapping_spans(self) -> None:
        text = "Иванов Иван и Петров Пётр работают вместе"
        spans = find_persons(text)
        assert len(spans) == 2
        assert spans[0].start < spans[1].start
        for i in range(len(spans) - 1):
            assert spans[i].end <= spans[i + 1].start, (
                f"overlap: {spans[i]} vs {spans[i + 1]}"
            )

    def test_spans_sorted_by_start(self) -> None:
        text = (
            "В заседании участвовали: "
            "Иванов Иван Петрович (директор), "
            "Петров Пётр Сергеевич (главбух), "
            "Сидоров Сидор Сидорович (юрист)."
        )
        spans = find_persons(text)
        assert len(spans) == 3
        # Each span must be at strictly increasing start offset.
        starts = [s.start for s in spans]
        assert starts == sorted(starts)

    def test_returns_personspan_dataclass(self) -> None:
        spans = find_persons("Иванов Иван написал письмо")
        assert all(isinstance(s, PersonSpan) for s in spans)
        # Frozen dataclass — must reject mutation.
        with pytest.raises(Exception):
            spans[0].start = 999  # type: ignore[misc]


# ---------- edge cases --------------------------------------------------------


class TestEdgeCases:
    def test_multiple_persons_in_long_text(self) -> None:
        text = (
            "В заседании участвовали:\n"
            "- Иванов Иван Петрович (директор)\n"
            "- Петров Пётр Сергеевич (главбух)\n"
            "- Сидоров Сидор Сидорович (юрист)\n"
        )
        spans = find_persons(text)
        assert len(spans) == 3
        # All three triplets recognised.
        surnames_found = {s.normalized.split()[0] for s in spans}
        assert surnames_found == {"Иванов", "Петров", "Сидоров"}

    def test_idempotent_repeated_call(self) -> None:
        text = "Иванов Иван Петрович подписал."
        a = find_persons(text)
        b = find_persons(text)
        assert a == b

    def test_only_punctuation_and_digits(self) -> None:
        assert find_persons("12345 !@#$%^&*()") == []

    def test_long_text_no_crash(self) -> None:
        # Defensive: a moderate paragraph with mixed entities.
        text = (
            "Как сообщил Иванов, в адрес ООО «Заря» поступили средства "
            "по договору №123-А от 01.05.2026. Получатель: ИП Петрова, "
            "ИНН 781301002323. Контактное лицо — И. И. Сидоров."
        )
        spans = find_persons(text)
        # Must include at least Иванов and Сидоров. Petrov(a) optional —
        # context inside ИП may be tagged ORG by Natasha.
        normals = {s.normalized for s in spans}
        assert any("Иванов" in n for n in normals), normals
        assert any("Сидоров" in n for n in normals), normals


# ---------- known limitations (xfail) ----------------------------------------


class TestKnownLimitations:
    """Cases that Natasha mishandles. Documented here so regressions are
    caught explicitly. Promote to passing tests when an upstream Natasha
    upgrade or the Task 2.3 hybrid (regex pre-filter) closes the gap.
    """

    @pytest.mark.xfail(
        reason="Natasha NER glues leading verb 'Подписано' into the PER span",
        strict=False,
    )
    def test_surname_after_passive_verb(self) -> None:
        # «Подписано И.И. Ивановым» — NER greedily includes «Подписано».
        spans = find_persons("Подписано И.И. Ивановым")
        assert len(spans) == 1
        assert "Подписано" not in spans[0].surface

    @pytest.mark.xfail(
        reason="Natasha splits compound surnames like 'Мамин-Сибиряк'",
        strict=False,
    )
    def test_compound_hyphenated_surname(self) -> None:
        spans = find_persons("Мамин-Сибиряк Дмитрий Наркисович написал")
        # Ideal: 1 span covering full hyphenated surname.
        assert len(spans) == 1
        assert spans[0].surface.startswith("Мамин-Сибиряк")
