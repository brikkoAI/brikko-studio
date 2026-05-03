"""Russian PERSON entity recognizer (Sprint 13 / Privacy v2 — Phase 2, Tasks 2.1–2.2).

The previous PII pipeline detected ФИО with a primitive regex
(«2-3 capitalized Cyrillic words»). Two production-grade gaps:

1. **Padezh / declension blindness.** «Передайте Иванову» didn't match because
   the heuristic looked for nominative-ish capitalization patterns. Russian
   names decline through six cases — a regex can't keep up.
2. **False positives on geographic / brand strings.** «Москва Россия Кремль»
   triggered a NAME mask, polluting prompts with `<NAME_1>` and breaking
   downstream model behaviour.

This module wraps `Natasha <https://natasha.github.io/>`_ (a pure-Python
Russian NLP toolkit, ~250 MB of pre-trained embeddings + a yargy rule-based
NamesExtractor on top of pymorphy2). Public surface intentionally tiny —
:pyfunc:`find_persons` returns plain :class:`PersonSpan` dataclasses with
character offsets so callers stay dependency-free.

Strategy ('hybrid' that the plan mentions):

* **Primary** — :class:`natasha.NewsNERTagger` (ML-based BiLSTM-CRF on
  navec embeddings). High precision, lower recall on isolated dative-case
  spans. Returns ``PER`` spans with start/stop offsets; ``span.normalize``
  uses the same MorphVocab to lemmatise tokens to nominative.
* **Fallback** — :class:`natasha.NamesExtractor` (yargy grammar over
  pymorphy2). Higher recall on declensions and initials; produces
  rule-based matches that include false positives on lowercase
  prepositions and verbs (`'с'`, `'в'`, `'сидит'`, etc.). We post-filter
  matches via :func:`_is_real_person_surface` and only emit ones that
  don't overlap with NER spans.

Out of scope (intentionally):

* Possessive adjectives («Ивановский», «Петровский») — those are derivatives,
  not entities. Both NER and yargy correctly skip them.
* Single first names in isolation («Иван») — too ambiguous, the regex
  pre-filter in `masker.py` (Task 2.3) will not surface single first names.
* Compound hyphenated surnames («Мамин-Сибиряк») — Natasha tokenises on the
  hyphen and emits the second half as the entity. Documented xfail.
* Non-Russian names — Natasha is monolingual; English/Chinese names are
  not detected. By design.

Performance:

* First call **cold-loads ~250 MB** of embeddings + pymorphy dictionaries
  (~1.5 s). Subsequent calls are 5–40 ms depending on text length.
* The module-level :class:`_NatashaModels` singleton is thread-safe via
  a lock — `find_persons` is safe to call from multiple FastAPI workers.
* The dependency `setuptools<81` is required (transitive via pymorphy2's
  `pkg_resources` import); pinned in :file:`pyproject.toml`.
"""

from __future__ import annotations

import contextlib
import re
from dataclasses import dataclass
from threading import Lock
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:  # pragma: no cover — type-checker only.
    from natasha import (
        MorphVocab,
        NamesExtractor,
        NewsMorphTagger,
        NewsNERTagger,
        Segmenter,
    )

# ---------- public types ------------------------------------------------------


@dataclass(frozen=True)
class PersonSpan:
    """One PERSON entity occurrence in text.

    Attributes
    ----------
    start, end
        Character offsets of the surface form, ``[start, end)`` half-open
        — the same convention as Python's ``str[start:end]``.
    surface
        Exact substring as it appears in the input (declined form
        preserved). Useful when callers need to know what the user typed
        in order to mask it byte-for-byte.
    normalized
        Nominative-case normalised form. For most callers this is what
        you'd pass to a downstream system that wants a canonical name
        (e.g. the audit trail). Falls back to ``surface`` when Natasha
        cannot inflect the token (rare, mostly initials).
    """

    start: int
    end: int
    surface: str
    normalized: str


# ---------- model singleton ---------------------------------------------------
#
# Natasha objects are heavy (~250 MB). We initialise once per process under
# a lock so concurrent first-callers don't double-init. The lock is released
# as soon as the singleton is populated; subsequent calls hit the fast path.

_INIT_LOCK: Final = Lock()
_models: _NatashaModels | None = None


@dataclass(frozen=True)
class _NatashaModels:
    """Bundle of pre-loaded Natasha components.

    Kept as a frozen dataclass (rather than module-level globals) so a unit
    test can substitute a fake bundle via :pyfunc:`_set_models_for_testing`
    without monkey-patching individual attributes.
    """

    segmenter: Segmenter
    morph_tagger: NewsMorphTagger
    ner_tagger: NewsNERTagger
    morph_vocab: MorphVocab
    names_extractor: NamesExtractor


def _load_models() -> _NatashaModels:
    """Construct the Natasha model bundle. Slow — ~1.5 s cold."""
    # Local import to keep top-level module lazy: callers that don't use
    # PERSON detection (e.g. raw JSON endpoints) should not pay the import
    # cost. The first call from `find_persons` triggers the heavy load.
    from natasha import (
        MorphVocab,
        NamesExtractor,
        NewsEmbedding,
        NewsMorphTagger,
        NewsNERTagger,
        Segmenter,
    )

    embedding = NewsEmbedding()
    return _NatashaModels(
        segmenter=Segmenter(),
        morph_tagger=NewsMorphTagger(embedding),
        ner_tagger=NewsNERTagger(embedding),
        morph_vocab=(morph_vocab := MorphVocab()),
        names_extractor=NamesExtractor(morph_vocab),
    )


def _get_models() -> _NatashaModels:
    """Return the process-wide Natasha bundle, loading on first call."""
    global _models
    if _models is not None:
        return _models
    with _INIT_LOCK:
        if _models is None:
            _models = _load_models()
    return _models


def warm_up() -> None:
    """Eagerly initialise the Natasha bundle.

    Optional — call from `app.lifespan` if you want to amortise the
    ~1.5 s cold start outside the first user request. Idempotent.
    """
    _get_models()


# ---------- yargy fallback filter ---------------------------------------------
#
# yargy NamesExtractor over-generates: any lowercase Cyrillic token whose
# lemma matches a name-shaped form may surface (the rule has wide
# coverage by design). We're stricter than the rule because masker.py
# uses these spans verbatim — a span on «сидит» would mask the verb.
#
# Filter rules (cheap, in this order):
#   1. Surface must start with an uppercase Cyrillic letter.
#   2. Lowercase 1-3 char prepositions/conjunctions are dropped.
#   3. Surfaces leading with known verb/preposition forms are dropped
#      (the actual surname token is usually emitted as a separate match
#      by yargy when the rule splits on the verb).
#   4. Fact must populate at least one of (first / last / middle).

_VALID_LEAD: Final = re.compile(r"^[А-ЯЁ]")

# Lowercase tokens yargy classifies as Name due to wide pattern coverage.
# Most of these are 1-2 char prepositions/conjunctions; «мир» appears
# because pymorphy2 has a personal-name lexeme for the lemma.
_LOWERCASE_NOISE: Final = frozenset({
    "с", "в", "и", "к", "у", "о", "а", "я", "не", "ни",
    "на", "от", "по", "до", "из", "за", "со", "во", "ко",
    "для", "над", "под", "при", "перед",
    "мир", "был", "была", "было", "были",
})

# Verbs / sentence-leading words yargy occasionally glues onto an actual
# name. When the surface starts with one of these, we drop the entire
# match — yargy normally emits the surname as a separate match anyway.
_BLACKLIST_LEAD: Final = frozenset({
    "Передайте", "Передал", "Передала",
    "Подписано", "Подписал", "Подписала",
    "Заключили", "Заключил", "Заключила",
    "Сообщил", "Сообщила",
    "Сегодня", "Завтра", "Вчера",
    "Привет", "Здравствуйте", "Доброе", "Добрый",
    "Контактное", "Контакт",
})


def _is_real_person_surface(
    surface: str, fact: object, morph_vocab: MorphVocab,
) -> bool:
    """Return True if a yargy match looks like an actual person reference.

    `fact` is a `natasha.fact.Name` namedtuple-like with `.first / .last /
    .middle` slots — we accept it as opaque to avoid coupling to Natasha's
    internal type.

    Notable rejection: possessive adjectives («Ивановскую» — `pos=ADJ`,
    lemma `ивановский`) are filtered out because real surnames lemmatise
    to `pos=NOUN`. The check looks at every non-initials token and
    requires at least one non-adjective.
    """
    if not surface:
        return False
    if surface.lower() in _LOWERCASE_NOISE:
        return False
    if not _VALID_LEAD.match(surface):
        return False
    tokens = surface.split()
    if tokens and tokens[0] in _BLACKLIST_LEAD:
        return False
    # At least one fact slot must be populated.
    has_slot = any(
        getattr(fact, attr, None) for attr in ("first", "last", "middle")
    )
    if not has_slot:
        return False

    # POS check: require at least one non-adjective token (otherwise the
    # match is on a possessive adjective form like «Ивановскую»). Initials
    # — tokens ending in "." — are skipped because pymorphy2 parses single
    # letters as conjunctions / particles. If after skipping initials no
    # tokens remain, fall through to accept (the slot check above already
    # confirmed yargy thinks this is a name).
    has_non_adjective = False
    saw_real_token = False
    for tok in tokens:
        if tok.endswith("."):
            continue
        saw_real_token = True
        forms = morph_vocab.parse(tok)
        if not forms:
            # Unknown to pymorphy2 — keep cautiously, treat as non-adjective.
            has_non_adjective = True
            break
        if forms[0].pos != "ADJ":
            has_non_adjective = True
            break
    return not (saw_real_token and not has_non_adjective)


def _lemmatise_to_nominative(surface: str, morph_vocab: MorphVocab) -> str:
    """Token-by-token lemmatisation for yargy fallback spans.

    Natasha's NER pipeline has a `span.normalize(morph_vocab)` helper that
    walks the *parsed* tokens and inflects them to nominative. The yargy
    NamesExtractor doesn't expose those tokens, so we re-parse each
    whitespace-separated word here.

    Token strategies:
    * Token ending in `.` (e.g. `И.`) — kept verbatim (initials don't decline).
    * Otherwise: take the first morphological parse and use its `.normal`
      (the lemma). Capitalise the first character because pymorphy2 normalises
      to lowercase.
    * Token without a parse (foreign words, numbers) — kept verbatim.

    `MorphVocab` is the natasha wrapper around pymorphy2; not annotated as
    runtime import to keep the module lazy at import time.
    """
    out: list[str] = []
    for tok in surface.split():
        if tok.endswith("."):
            out.append(tok)
            continue
        # `parse()` returns a list of `MorphForm` (highest score first).
        forms = morph_vocab.parse(tok)
        if forms and forms[0].normal:
            normal = forms[0].normal
            # pymorphy2 lowercases lemmas; restore initial-cap for
            # proper-noun appearance ("иванов" → "Иванов").
            out.append(normal[:1].upper() + normal[1:])
        else:
            out.append(tok)
    return " ".join(out)


# ---------- public API --------------------------------------------------------


def find_persons(text: str) -> list[PersonSpan]:
    """Find all PERSON entities in ``text`` via Natasha morphological NER.

    Parameters
    ----------
    text
        Russian (or mixed Russian/Latin/punctuation) input. Empty / non-
        Russian text returns ``[]``.

    Returns
    -------
    list[PersonSpan]
        Spans sorted by ``start`` ascending, no overlapping ranges.
        Empty list when no person entity is detected.

    Notes
    -----
    * Cold first call ~1.5 s due to Natasha model load. Subsequent calls
      ~5–40 ms. Use :func:`warm_up` to pre-load.
    * The function is safe to call concurrently from multiple async tasks
      — model loading is guarded by a lock; per-call computation reuses
      shared models read-only (Natasha objects are stateless after init).
    """
    if not text:
        return []

    from natasha import Doc

    models = _get_models()
    spans: list[PersonSpan] = []
    consumed: list[tuple[int, int]] = []

    def _overlaps(start: int, end: int) -> bool:
        return any(start < ce and end > cs for cs, ce in consumed)

    # 1. Primary — NER pass.
    #
    # We *also* consume LOC/ORG spans (without emitting them) so the
    # yargy fallback below cannot upgrade a Natasha-classified location
    # into a personal-name match. Without this guard «Москва» / «Кремль»
    # leak through as `Name(last=...)` from the rule-based extractor.
    doc = Doc(text)
    doc.segment(models.segmenter)
    doc.tag_morph(models.morph_tagger)
    doc.tag_ner(models.ner_tagger)
    for span in doc.spans:
        if span.type != "PER":
            # Reserve the span so yargy can't claim it as a person.
            consumed.append((span.start, span.stop))
            continue
        # Natasha occasionally fails to normalise on degenerate spans
        # (e.g. punctuation-only). Keep surface-as-normalised in that case.
        with contextlib.suppress(Exception):
            span.normalize(models.morph_vocab)
        start, end = span.start, span.stop
        surface = text[start:end]
        normalized = span.normal or surface
        spans.append(PersonSpan(
            start=start, end=end, surface=surface, normalized=normalized,
        ))
        consumed.append((start, end))

    # 2. Fallback — yargy NamesExtractor for cases NER missed.
    for match in models.names_extractor(text):
        start, end = match.start, match.stop
        if _overlaps(start, end):
            continue
        surface = text[start:end]
        if not _is_real_person_surface(surface, match.fact, models.morph_vocab):
            continue
        normalized = _lemmatise_to_nominative(surface, models.morph_vocab)
        spans.append(PersonSpan(
            start=start, end=end, surface=surface, normalized=normalized,
        ))
        consumed.append((start, end))

    # 3. Sort + dedupe by (start, end).
    spans.sort(key=lambda s: (s.start, s.end))
    deduped: list[PersonSpan] = []
    seen: set[tuple[int, int]] = set()
    for s in spans:
        key = (s.start, s.end)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(s)
    return deduped


# ---------- testing helpers ---------------------------------------------------


def _set_models_for_testing(models: _NatashaModels | None) -> None:
    """Override the singleton (or reset to None to force a reload).

    Internal — used by tests only. Module-private name (single underscore)
    plus the explicit ``_for_testing`` suffix make the contract explicit.
    """
    global _models
    _models = models


__all__ = [
    "PersonSpan",
    "find_persons",
    "warm_up",
]
