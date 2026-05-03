"""Unit tests for PII checksum validators (Sprint 13 / Privacy v2 — Phase 1, Task 1.1).

Per spec ``BRIKKO_SPEC_SUPER_APP.md`` § 2.3 — без КС-валидации regex даёт
~90 % false-positives на любых 12-цифрах в логах. Эти функции — pure
``str → bool``: strip non-digits → length check → checksum.

Ground-truth значения взяты из открытых источников / расчёт scratch-script:

* ИНН 7707083893 — Сбербанк (ЕГРЮЛ)
* ИНН 7736050003 — Газпром
* ИНН 7702070139 — ВТБ
* ИНН 7740000076 — МТС
* ИНН 7736207543 — Яндекс
* ОГРН 1027700132195 — Сбер
* ОГРН 1027700070518 — Газпром
* ОГРНИП 304500116000157 — реальный ИП
* СНИЛС 11223344595 — типовой пример
* Visa 4532015112830366, 4916338506082832 — валидные тест-Luhn

ИНН-12 генерируются скриптом из known первых 10 цифр (12-значный КС
вычисляется детерминированно).
"""

from __future__ import annotations

import pytest

from brikko_anonymizer.pii.checksums import (
    inn10,
    inn12,
    luhn,
    ogrn,
    ogrnip,
    snils,
)

# =======================================================================
# inn10 — ИНН юрлица
# =======================================================================


@pytest.mark.parametrize(
    "value",
    [
        "7707083893",  # Сбербанк
        "7736050003",  # Газпром
        "7702070139",  # ВТБ
        "7740000076",  # МТС
        "7736207543",  # Яндекс
    ],
)
def test_inn10_valid_examples(value: str) -> None:
    assert inn10(value) is True


def test_inn10_invalid_checksum() -> None:
    # Последняя цифра неправильная — структура ОК, КС нет.
    assert inn10("7707083894") is False
    assert inn10("7707083890") is False


def test_inn10_invalid_length() -> None:
    assert inn10("770708389") is False  # 9 digits
    assert inn10("77070838933") is False  # 11 digits
    assert inn10("") is False


def test_inn10_strips_separators() -> None:
    # Реальные документы могут разделять ИНН пробелами / дефисами.
    assert inn10("7707-08-3893") is True
    assert inn10("7707 08 3893") is True
    assert inn10("  7707083893  ") is True


def test_inn10_rejects_non_digits() -> None:
    assert inn10("770708389a") is False
    assert inn10("abcdefghij") is False
    # Underscore — non-digit, strip-then-validate = "7707083893" (10d) → True.
    # Это by-design: документы могут содержать любые разделители.
    assert inn10("770_708_3893") is True


def test_inn10_zero_padded_legitimate() -> None:
    # Структурно корректные 10-цифр с КС=0 — 0000000000 имеет КС 0, формально valid КС.
    # Но это spec edge — пропускаем (regex масковщик в любом случае фильтрует
    # 0000000000 как noise через context). Здесь — pure-checksum: проверяем
    # что мы НЕ ловим 0000000000 как «валидный» только из-за нулевого КС.
    # Согласно алгоритму (sum=0 % 11 % 10 == 0 == digit[9]) → True. Документируем.
    assert inn10("0000000000") is True


# =======================================================================
# inn12 — ИНН физлица
# =======================================================================


@pytest.mark.parametrize(
    "value",
    [
        "771871234539",  # сгенерён из first10=7718712345 (c11=3, c12=9)
        "500101234513",  # сгенерён из first10=5001012345 (c11=1, c12=3)
    ],
)
def test_inn12_valid_examples(value: str) -> None:
    assert inn12(value) is True


def test_inn12_invalid_first_checksum() -> None:
    # 11-я цифра неправильная (3 → 4); тогда и 12-я не сойдётся.
    assert inn12("771871234549") is False


def test_inn12_invalid_second_checksum() -> None:
    # 11-я правильная (3), 12-я подменена (9 → 8).
    assert inn12("771871234538") is False


def test_inn12_invalid_length() -> None:
    assert inn12("77187123453") is False  # 11 digits
    assert inn12("7718712345399") is False  # 13 digits
    assert inn12("") is False


def test_inn12_strips_separators() -> None:
    assert inn12("7718-7123-4539") is True
    assert inn12("7718 7123 4539") is True


def test_inn12_rejects_non_digits() -> None:
    assert inn12("77187123453a") is False
    assert inn12("abcdefghijkl") is False


# =======================================================================
# snils — СНИЛС
# =======================================================================


def test_snils_valid_example() -> None:
    assert snils("11223344595") is True


def test_snils_strips_separators() -> None:
    # Реальный формат — XXX-XXX-XXX YY с дефисами + пробел.
    assert snils("112-233-445 95") is True
    assert snils("112-233-445-95") is True
    assert snils("112 233 445 95") is True


def test_snils_invalid_checksum() -> None:
    assert snils("11223344596") is False  # КС fail
    assert snils("11223344500") is False


def test_snils_invalid_length() -> None:
    assert snils("1122334459") is False  # 10 digits
    assert snils("112233445950") is False  # 12 digits


def test_snils_low_number_special_case() -> None:
    # Per spec: первые 9 цифр <= "001001998" → КС всегда "00".
    # 001001998 -> last 2 == "00"
    assert snils("00100199800") is True
    # 001001998 c КС=01 -> invalid (special case требует 00)
    assert snils("00100199801") is False


def test_snils_rejects_non_digits() -> None:
    assert snils("1122334459a") is False
    assert snils("") is False


# =======================================================================
# ogrn — ОГРН юрлица
# =======================================================================


@pytest.mark.parametrize(
    "value",
    [
        "1027700132195",  # Сбер
        "1027700070518",  # Газпром
    ],
)
def test_ogrn_valid_examples(value: str) -> None:
    assert ogrn(value) is True


def test_ogrn_invalid_checksum() -> None:
    assert ogrn("1027700132196") is False
    assert ogrn("1027700132100") is False


def test_ogrn_invalid_length() -> None:
    assert ogrn("102770013219") is False  # 12 digits
    assert ogrn("10277001321955") is False  # 14 digits
    assert ogrn("") is False


def test_ogrn_strips_separators() -> None:
    assert ogrn("1-027-700-132-195") is True
    assert ogrn("1 027 700 132 195") is True


def test_ogrn_rejects_non_digits() -> None:
    assert ogrn("102770013219a") is False


# =======================================================================
# ogrnip — ОГРНИП ИП
# =======================================================================


def test_ogrnip_valid_example() -> None:
    assert ogrnip("304500116000157") is True


def test_ogrnip_invalid_checksum() -> None:
    assert ogrnip("304500116000158") is False
    assert ogrnip("304500116000150") is False


def test_ogrnip_invalid_length() -> None:
    assert ogrnip("30450011600015") is False  # 14 digits
    assert ogrnip("3045001160001577") is False  # 16 digits
    assert ogrnip("") is False


def test_ogrnip_strips_separators() -> None:
    assert ogrnip("304-500-116-000-157") is True


def test_ogrnip_rejects_non_digits() -> None:
    assert ogrnip("30450011600015a") is False


# =======================================================================
# luhn — карты (Visa/Mastercard/...)
# =======================================================================


@pytest.mark.parametrize(
    "value",
    [
        "4532015112830366",  # Visa 16-digit
        "4916338506082832",  # Visa 16-digit
        "5555555555554444",  # Mastercard test
        "378282246310005",  # AmEx 15-digit
    ],
)
def test_luhn_valid_examples(value: str) -> None:
    assert luhn(value) is True


def test_luhn_invalid_checksum() -> None:
    assert luhn("4532015112830367") is False
    assert luhn("1234567890123456") is False


def test_luhn_invalid_length() -> None:
    # Min 13 digits, max 19.
    assert luhn("123456789012") is False  # 12 digits
    assert luhn("12345678901234567890") is False  # 20 digits
    assert luhn("") is False


def test_luhn_strips_separators() -> None:
    # Карта в реальных документах — пробелы / дефисы.
    assert luhn("4532 0151 1283 0366") is True
    assert luhn("4532-0151-1283-0366") is True
    assert luhn("4532  0151  1283  0366") is True


def test_luhn_rejects_non_digits() -> None:
    # 12 digit + 'abc' → strip non-digits = 12 digits → False (length).
    assert luhn("453201511283abc") is False
    # Pure-letters → 0 digits → False.
    assert luhn("abcdefghijklmnop") is False
    # Buchstaben unter Ziffern, после strip 13 цифр которые НЕ luhn-valid.
    assert luhn("1234567890123abc") is False


def test_luhn_13_digit_card() -> None:
    # 13-цифровые карты были у старых Visa.
    # 4222222222222 — известный test card (Visa).
    assert luhn("4222222222222") is True


def test_luhn_19_digit_card() -> None:
    # Maestro может быть до 19 цифр. Computed via scratch: prefix
    # '601100000000000000' + check digit '1' → Luhn-valid.
    assert luhn("6011000000000000001") is True
