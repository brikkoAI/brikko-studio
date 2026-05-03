"""Unit tests for the PII masker (Sprint 4 Поток M).

Covers:

* Detection of each PII type (email, phone, passport, INN, СНИЛС, card, ФИО).
* Stable placeholder reuse across multiple occurrences in same text.
* Round-trip mask → unmask = original (when mapping is intact).
* Unmask is no-op when mapping is empty (Redis miss simulation).
* Multi-pattern overlap handling (card vs INN, passport vs INN).
* Message-level mask handles string + list-of-blocks content.
* Audit summary returns counts only, no plaintext PII.
* tool_calls.function.arguments masking.
"""

from __future__ import annotations

from brikko_anonymizer.pii.masker import (
    PiiMapping,
    audit_summary,
    detect_pii,
    mask_messages,
    mask_text,
    unmask_text,
)

# ---------- detection -----------------------------------------------------


def test_detect_email_phone_inn() -> None:
    # Use a valid 12-digit ИНН (физ.лицо, КС сходится) which can never be
    # confused with the 4+6 passport pattern. После Sprint 13 / Task 1.2
    # wire'ил inn12-валидатор — fixture обязан проходить КС.
    text = "Свяжитесь: ivan@example.ru, +7 (495) 123-45-67, ИНН 771871234539."
    found = detect_pii(text)
    types = [t for t, _ in found]
    assert "EMAIL" in types
    assert "PHONE" in types
    assert "INN" in types


def test_detect_passport_snils_card() -> None:
    # Все три fixture'а должны проходить КС (Sprint 13 / Task 1.2):
    # СНИЛС 112-233-445 95 — valid; карта 4532 0151 1283 0366 — Luhn-valid Visa.
    text = "Паспорт 4509 123456, СНИЛС 112-233-445 95, карта 4532 0151 1283 0366."
    found = detect_pii(text)
    types = [t for t, _ in found]
    assert "PASSPORT" in types
    assert "SNILS" in types
    assert "CARD" in types


def test_detect_full_russian_name() -> None:
    text = "Договор подписал Иванов Иван Иванович в 2026 году."
    found = detect_pii(text)
    assert any(t == "NAME" and "Иванов" in v for t, v in found)


def test_detect_two_word_name() -> None:
    text = "Звонил Петров Сергей по поводу договора."
    found = detect_pii(text)
    assert any(t == "NAME" and "Петров Сергей" in v for t, v in found)


def test_detect_no_pii() -> None:
    text = "Hello world, just a regular message."
    assert detect_pii(text) == []


# ---------- masking -------------------------------------------------------


def test_mask_replaces_email_and_phone() -> None:
    mapping = PiiMapping()
    masked = mask_text("Письмо на ivan@x.ru или звони +7 495 123 45 67.", mapping)
    assert "ivan@x.ru" not in masked
    assert "+7 495" not in masked
    assert "<EMAIL_1>" in masked
    assert "<PHONE_1>" in masked
    assert mapping.size == 2


def test_mask_stable_placeholder_for_repeated_entity() -> None:
    """Same original PII gets the SAME placeholder on repeat —
    critical for downstream model context (one entity, not two)."""
    mapping = PiiMapping()
    # Use email which has no surrounding-context ambiguity.
    text = "Email: ivan@x.io. Confirm: ivan@x.io please."
    masked = mask_text(text, mapping)
    assert masked.count("<EMAIL_1>") == 2
    assert "<EMAIL_2>" not in masked


def test_unmask_round_trip() -> None:
    mapping = PiiMapping()
    original = "Email: alice@test.io, телефон +79161234567."
    masked = mask_text(original, mapping)
    restored = unmask_text(masked, mapping)
    assert restored == original


def test_unmask_with_empty_mapping_is_noop() -> None:
    """Simulates Redis miss / TTL expiry — placeholders pass through unchanged
    instead of crashing the response."""
    text = "Hi <NAME_1>, your code is <PHONE_2>."
    assert unmask_text(text, PiiMapping()) == text


def test_unmask_unknown_placeholder_passes_through() -> None:
    """Stray placeholder not in mapping stays as-is rather than raising."""
    mapping = PiiMapping()
    mask_text("Email: a@b.io.", mapping)  # populates EMAIL_1
    # Mention NAME_99 which the mapping never saw.
    assert unmask_text("Hello <NAME_99>", mapping) == "Hello <NAME_99>"


# ---------- overlap / priority --------------------------------------------


def test_card_takes_priority_over_inn() -> None:
    """16-digit card must not be split into a 12-digit INN + 4 leftover.

    После Sprint 13 / Task 1.2 — карта проверяется Luhn'ом, поэтому
    fixture должен быть Luhn-valid (4532 0151 1283 0366 — test Visa).
    """
    mapping = PiiMapping()
    masked = mask_text("Карта 4532 0151 1283 0366 списана.", mapping)
    assert "<CARD_1>" in masked
    assert "<INN" not in masked


def test_passport_takes_priority_over_inn() -> None:
    """4+6=10 digits with a space matches as passport, not as INN-10.
    (The 10-digit INN format collides with passport without separator —
    we accept this; realistic passports come with space/dash.)"""
    mapping = PiiMapping()
    masked = mask_text("Паспорт 4509 123456 серия выдан.", mapping)
    assert "<PASSPORT_1>" in masked
    assert "<INN" not in masked


def test_phone_validator_rejects_short_runs() -> None:
    """A bare 12-digit run shouldn't match phone (which requires 11
    AND a +7/8 prefix). После Task 1.2 fixture обязан проходить inn12-КС.
    """
    mapping = PiiMapping()
    # 12-digit physical-person ИНН (КС-valid) — never matches passport (4+6)
    # or phone (11 with +7/8 prefix).
    text = "ИНН 771871234539 указан в документе."
    masked = mask_text(text, mapping)
    assert "<INN_1>" in masked
    assert "<PHONE" not in masked


# ---------- message-level -------------------------------------------------


def test_mask_messages_string_content() -> None:
    msgs = [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "My email is bob@example.com."},
    ]
    masked, mapping = mask_messages(msgs)
    assert "bob@example.com" not in masked[1]["content"]
    assert "<EMAIL_1>" in masked[1]["content"]
    assert mapping.size == 1


def test_mask_messages_list_content_blocks() -> None:
    """Vision-style messages with list-of-blocks content."""
    msgs = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Контакт: +79161234567"},
                {"type": "image_url", "image_url": {"url": "data:..."}},
            ],
        }
    ]
    masked, mapping = mask_messages(msgs)
    blocks = masked[0]["content"]
    assert "+79161234567" not in blocks[0]["text"]
    assert "<PHONE_1>" in blocks[0]["text"]
    # Image block left alone.
    assert blocks[1]["image_url"]["url"] == "data:..."


def test_mask_messages_preserves_tool_call_id() -> None:
    """Service fields must NOT be masked — only content/text."""
    msgs = [
        {
            "role": "tool",
            "tool_call_id": "Иванов_call_42",  # cyrillic in service field
            "content": "Иванов Иван Иванович подтвердил.",
        }
    ]
    masked, mapping = mask_messages(msgs)
    # Service field untouched even though it looks like a name.
    assert masked[0]["tool_call_id"] == "Иванов_call_42"
    # But content masked.
    assert "<NAME_1>" in masked[0]["content"]


def test_mask_tool_call_arguments() -> None:
    """JSON-string arguments inside tool_calls also masked."""
    msgs = [
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [
                {
                    "id": "call_1",
                    "type": "function",
                    "function": {
                        "name": "send_email",
                        "arguments": '{"to":"alice@x.io","body":"hi"}',
                    },
                }
            ],
        }
    ]
    masked, mapping = mask_messages(msgs)
    args = masked[0]["tool_calls"][0]["function"]["arguments"]
    assert "alice@x.io" not in args
    assert "<EMAIL_1>" in args


# ---------- audit ---------------------------------------------------------


def test_audit_summary_counts_only_no_plaintext() -> None:
    mapping = PiiMapping()
    mask_text(
        "ivan@x.ru, alice@y.com, +79161234567, Иванов Иван Иванович.",
        mapping,
    )
    audit = audit_summary(mapping)
    # Find the email entry.
    email = next(e for e in audit if e.pii_type == "EMAIL")
    assert email.count == 2
    # Audit entries do NOT contain originals.
    for entry in audit:
        assert "@" not in entry.pii_type
        assert "+" not in entry.pii_type


def test_mask_empty_text_is_noop() -> None:
    mapping = PiiMapping()
    assert mask_text("", mapping) == ""
    assert mapping.is_empty()


def test_mapping_serialization_round_trip() -> None:
    """to_redis_dict / from_redis_dict preserves the reverse mapping."""
    m = PiiMapping()
    mask_text("Email a@b.io and +79161234567.", m)
    serialised = m.to_redis_dict()
    rebuilt = PiiMapping.from_redis_dict(serialised)
    # Use rebuilt for unmask — should still work.
    masked = mask_text("Same: a@b.io.", PiiMapping())
    # rebuilt won't have THIS new mask — the test is that rebuilt's reverse
    # is intact for the original mappings.
    for placeholder, original in m.reverse.items():
        assert rebuilt.reverse[placeholder] == original
    assert masked  # smoke


# =======================================================================
# Sprint 13 / Privacy v2 — Phase 1, Task 1.2
# Wire'ы checksums-валидаторов: invalid КС не маскируется (false-positive),
# valid — маскируется. Покрывает inn10/inn12/snils/luhn/ogrn/ogrnip.
# =======================================================================


def test_mask_filters_invalid_inn10_checksum() -> None:
    """ИНН-10 с invalid КС не должен маскироваться как INN — это просто
    10-digit случайная последовательность (timestamp, ID, hash).

    NB: 10-digit без сепаратора может матчиться как PASSPORT (4+6) — это
    existing behaviour, тест проверяет именно отсутствие INN-категории.
    """
    text = "Номер 7707083894 в системе."  # last digit broken vs Сбер
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    # Главное — не зафиксирован как ИНН.
    assert "<INN" not in masked


def test_mask_keeps_valid_inn10() -> None:
    """ИНН Сбербанка 7707083893 — valid КС, маскируется."""
    text = "ИНН Сбербанка 7707083893 проверен."
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "7707083893" not in masked
    assert "<INN_1>" in masked


def test_mask_filters_invalid_inn12_checksum() -> None:
    """ИНН-12 с broken КС не маскируется."""
    text = "ИНН ИП 123456789012 указан."  # КС fail
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "123456789012" in masked
    assert "<INN" not in masked


def test_mask_keeps_valid_inn12() -> None:
    """Valid ИНН-12 (КС сходится) — маскируется."""
    text = "ИНН ИП 771871234539 указан."  # generated valid
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "771871234539" not in masked
    assert "<INN_1>" in masked


def test_mask_filters_invalid_snils() -> None:
    """СНИЛС с broken КС не маскируется."""
    text = "СНИЛС 112-233-445 96 в карточке."  # КС fail
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "112-233-445 96" in masked
    assert "<SNILS" not in masked


def test_mask_keeps_valid_snils() -> None:
    """Valid СНИЛС 112-233-445 95 — маскируется."""
    text = "СНИЛС 112-233-445 95 в карточке."
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "112-233-445 95" not in masked
    assert "<SNILS_1>" in masked


def test_mask_filters_invalid_card_luhn() -> None:
    """Карта без Luhn-КС не маскируется (рандомные 16 цифр в логах)."""
    text = "Номер 1234 5678 9012 3456 не карта."  # Luhn fail
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "1234 5678 9012 3456" in masked
    assert "<CARD" not in masked


def test_mask_keeps_valid_card_luhn() -> None:
    """Luhn-valid карта маскируется."""
    text = "Карта 4532 0151 1283 0366 списана."
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "4532 0151 1283 0366" not in masked
    assert "<CARD_1>" in masked


def test_mask_keeps_valid_ogrn() -> None:
    """Valid ОГРН (Сбер 1027700132195) — маскируется как <OGRN_1>."""
    text = "ОГРН Сбера 1027700132195 в реестре."
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "1027700132195" not in masked
    assert "<OGRN_1>" in masked


def test_mask_filters_invalid_ogrn_checksum() -> None:
    """13-digit с broken КС не маскируется."""
    text = "Просто 1234567890123 в логе."  # КС fail
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "1234567890123" in masked
    assert "<OGRN" not in masked


def test_mask_keeps_valid_ogrnip() -> None:
    """Valid ОГРНИП 304500116000157 — маскируется."""
    text = "ИП ОГРНИП 304500116000157 зарегистрирован."
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "304500116000157" not in masked
    assert "<OGRNIP_1>" in masked


def test_mask_filters_invalid_ogrnip_checksum() -> None:
    text = "Просто 123456789012345 в логе."  # 15 digits, КС fail
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "123456789012345" in masked
    assert "<OGRNIP" not in masked


def test_mask_bank_account_regex_only() -> None:
    """20 цифр подряд → BANK_ACCOUNT (regex-only, без КС-валидации
    через ЦБ-регистр — known limitation, backlog v3).
    """
    text = "Расчётный счёт 40702810500000000017 в банке."
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "40702810500000000017" not in masked
    assert "<BANK_ACCOUNT_1>" in masked


def test_mask_bank_account_takes_priority_over_inn() -> None:
    """20-digit run не должен распадаться на части (ИНН + хвост)."""
    mapping = PiiMapping()
    masked = mask_text("Счёт 40702810500000000017 списан.", mapping)
    assert "<BANK_ACCOUNT_1>" in masked
    assert "<INN" not in masked
    assert "<OGRN" not in masked
    assert "<CARD" not in masked


def test_unmask_new_types_round_trip() -> None:
    """OGRN / OGRNIP / BANK_ACCOUNT — round-trip через unmask."""
    mapping = PiiMapping()
    text = (
        "ОГРН 1027700132195, ОГРНИП 304500116000157, "
        "счёт 40702810500000000017."
    )
    masked = mask_text(text, mapping)
    # Все три замаскированы.
    assert "<OGRN_1>" in masked
    assert "<OGRNIP_1>" in masked
    assert "<BANK_ACCOUNT_1>" in masked
    # Восстановили — original вернулся.
    restored = unmask_text(masked, mapping)
    assert restored == text


def test_neutralise_user_placeholders_covers_new_types() -> None:
    """Adversarial user-input типа '<OGRN_1>' / '<BANK_ACCOUNT_1>' должен
    обезвреживаться, иначе round-trip подменит чужой PII.
    """
    mapping = PiiMapping()
    # Маскируем реальный ОГРН под слот OGRN_1.
    real_text = "ОГРН 1027700132195"
    masked_real = mask_text(real_text, mapping)
    assert "<OGRN_1>" in masked_real
    # Adversarial: пользователь сам пишет литерал '<OGRN_1>'.
    adversarial = mask_text("Привет <OGRN_1>", mapping)
    # Литерал не должен матчиться через _PLACEHOLDER_RE → ＜ заменил <.
    restored = unmask_text(adversarial, mapping)
    # Адверсариальный плейсхолдер не подменился чужим ОГРН.
    assert "1027700132195" not in restored


def test_mask_inn10_and_inn12_share_inn_category() -> None:
    """Backward-compat: 10- и 12-digit ИНН маскируются под общим
    префиксом <INN_N>, без INN10_/INN12_ суффиксов.
    """
    mapping = PiiMapping()
    text = "Юр.лицо 7707083893, физик 771871234539."
    masked = mask_text(text, mapping)
    # Оба ИНН заменены, но категория одна — INN.
    assert "7707083893" not in masked
    assert "771871234539" not in masked
    assert "<INN_1>" in masked
    assert "<INN_2>" in masked
    # Никаких "<INN10" / "<INN12".
    assert "<INN10" not in masked
    assert "<INN12" not in masked


# =======================================================================
# Sprint 13 / Privacy v2 — Phase 2, Task 2.3 / 2.4
# Гибрид Natasha NER + regex-based recognizers.
# Spec §2.4 PERSON declensions, §3.4 surface-form matching при подмене,
# §3.5 cross-category collision (INN > NAME).
# =======================================================================


def test_natasha_consistent_placeholders_across_declensions() -> None:
    """Spec §3.4 — Surface-form matching при подмене.

    Разные склонения одного человека (именительный / винительный /
    дательный) должны получать ОДИН placeholder <NAME_1>, потому что
    для LLM это одна и та же сущность. Cache key — normalized lemma.
    """
    text = "Иванов сказал Иванову, чтобы Иванов передал Иванову."
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    # Все четыре формы одного человека → один placeholder.
    assert masked.count("<NAME_1>") == 4, masked
    # Не должно быть отдельных placeholder'ов для других склонений.
    assert "<NAME_2>" not in masked
    assert "<NAME_3>" not in masked
    assert "<NAME_4>" not in masked
    # Original surface (любая форма «Иванов*») удалён.
    assert "Иванов" not in masked.replace("<NAME_1>", "")


def test_natasha_detects_dative_case_single_surname() -> None:
    """Падежные формы — Natasha обязана найти 'Иванову' (дательный).
    Старый regex такое не ловил."""
    text = "Передайте Иванову документ"
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    assert "Иванову" not in masked
    assert "<NAME_1>" in masked


def test_natasha_does_not_overmask_geo_and_brand() -> None:
    """Старый regex'овый heuristic мог триггерить на 'Москва Россия Кремль'.
    Natasha NER корректно скипает гео/бренды.
    """
    text = "Москва Россия Кремль — это столица России."
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    # Никаких NAME placeholder'ов на гео-токенах.
    assert "<NAME_" not in masked


def test_inn_priority_over_name_when_overlap() -> None:
    """Spec §3.5 — cross-category collision. ИНН с КС-проверкой имеет
    приоритет над NAME (Natasha может ошибочно подсветить организацию
    рядом с цифрами как PER).
    """
    text = "Сбербанк ИНН 7707083893"
    mapping = PiiMapping()
    masked = mask_text(text, mapping)
    # ИНН-10 валидный — должен маскироваться.
    assert "<INN_1>" in masked
    assert "7707083893" not in masked


def test_natasha_unmask_round_trip() -> None:
    """Round-trip: declined surface form → placeholder → восстанавливается
    в исходную форму (первая встреченная)."""
    mapping = PiiMapping()
    original = "Иванов сообщил, что задача выполнена."
    masked = mask_text(original, mapping)
    assert "<NAME_1>" in masked
    restored = unmask_text(masked, mapping)
    assert restored == original


def test_natasha_full_triplet_masked() -> None:
    """Полное ФИО (Иванов Иван Иванович) маскируется одним span'ом."""
    mapping = PiiMapping()
    text = "Договор подписал Иванов Иван Иванович в 2026 году."
    masked = mask_text(text, mapping)
    assert "Иванов Иван Иванович" not in masked
    assert "<NAME_1>" in masked


def test_natasha_distinct_persons_get_distinct_placeholders() -> None:
    """Разные люди (разные normalized) получают разные placeholder'ы."""
    mapping = PiiMapping()
    text = "Иванов и Петров работают вместе."
    masked = mask_text(text, mapping)
    assert "<NAME_1>" in masked
    assert "<NAME_2>" in masked
    assert "Иванов" not in masked
    assert "Петров" not in masked


def test_natasha_warm_call_latency() -> None:
    """После warm_up() — find_persons на 1KB текста < 200ms.

    Bench-проверка, не блокирует на CI (warm-cache); защищает от
    регрессии случайной перезагрузки моделей на каждый вызов.
    """
    import time

    from brikko_anonymizer.pii.ru_person import find_persons, warm_up

    warm_up()  # одноразово — kthx-no-op, если уже загружено

    text = "Передайте Иванову Ивану Петровичу" * 10

    t0 = time.perf_counter()
    spans = find_persons(text)
    t1 = time.perf_counter()

    elapsed_ms = (t1 - t0) * 1000
    assert spans, "should detect at least one PERSON in 30 repetitions"
    assert elapsed_ms < 200, f"warm find_persons() took {elapsed_ms:.0f}ms"
