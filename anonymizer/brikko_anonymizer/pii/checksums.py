"""Контрольные суммы для российских идентификаторов и Luhn для карт.

Sprint 13 / Privacy v2 — Phase 1, Task 1.1. Спека:
``BRIKKO_SPEC_SUPER_APP.md`` § 2.3.

Каждая функция:

1. **Strip non-digits** — на входе допустимы разделители (пробел, дефис,
   underscore и т.п.), формат документов не контролируем.
2. **Length-check** — длина после strip должна точно совпадать.
3. **Checksum** — алгоритм per-identifier (см. ниже).
4. Возврат ``bool``. На любой invalid input → ``False``, **без** raise.

Pure stdlib, no dependencies. Используется в ``masker.py`` как ``validator=``
callback в существующем ``_PATTERNS``-pipeline (Task 1.2 wires).

Зачем эти КС: regex без проверки даёт ~90 % ложных срабатываний на любых
длинных цифровых последовательностях в логах (timestamps, ID-шники, hashes).
КС-валидация устраняет проблему почти бесплатно — несколько умножений на
запрос.
"""

from __future__ import annotations

import re
from typing import Final

_NON_DIGIT_RE: Final = re.compile(r"\D")


def _digits(s: str) -> str:
    """Вырезать всё, кроме цифр."""
    return _NON_DIGIT_RE.sub("", s)


# ---------- ИНН ---------------------------------------------------------------


_INN10_WEIGHTS: Final = (2, 4, 10, 3, 5, 9, 4, 6, 8)
_INN12_WEIGHTS_11: Final = (7, 2, 4, 10, 3, 5, 9, 4, 6, 8)
_INN12_WEIGHTS_12: Final = (3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8)


def inn10(s: str) -> bool:
    """ИНН юрлица: 10 цифр, 1 контрольный разряд.

    Алгоритм: ``sum(digit[i] * weight[i] for i in 0..8) % 11 % 10`` ==
    ``digit[9]``. Веса: ``[2,4,10,3,5,9,4,6,8]``.
    """
    d = _digits(s)
    if len(d) != 10:
        return False
    checksum = sum(int(d[i]) * _INN10_WEIGHTS[i] for i in range(9)) % 11 % 10
    return checksum == int(d[9])


def inn12(s: str) -> bool:
    """ИНН физлица / ИП: 12 цифр, 2 контрольных разряда.

    11-я цифра считается из первых 10 с весами ``[7,2,4,10,3,5,9,4,6,8]``.
    12-я цифра — из первых 11 с весами ``[3,7,2,4,10,3,5,9,4,6,8]``.
    Обе должны совпасть.
    """
    d = _digits(s)
    if len(d) != 12:
        return False
    c11 = sum(int(d[i]) * _INN12_WEIGHTS_11[i] for i in range(10)) % 11 % 10
    if c11 != int(d[10]):
        return False
    c12 = sum(int(d[i]) * _INN12_WEIGHTS_12[i] for i in range(11)) % 11 % 10
    return c12 == int(d[11])


# ---------- СНИЛС -------------------------------------------------------------


def snils(s: str) -> bool:
    """СНИЛС: 11 цифр, 2 контрольных разряда (последние).

    Если первые 9 цифр <= ``001001998`` (ранние выпуски), КС всегда ``00``.
    Иначе:

    * ``S = sum(digit[i] * (9 - i) for i in 0..8)`` (веса 9..1).
    * ``S < 100`` → КС = ``S``.
    * ``S in (100, 101)`` → КС = ``00``.
    * ``S > 101`` → ``r = S % 101``; если ``r in (100, 101)`` — КС = ``00``,
      иначе КС = ``r``.

    Сравниваем КС с ``int(digit[9:11])``.
    """
    d = _digits(s)
    if len(d) != 11:
        return False
    first9 = d[:9]
    given = int(d[9:11])

    # Special case: ранние СНИЛС (<= 001-001-998) — КС всегда "00".
    if int(first9) <= 1001998:
        return given == 0

    s_sum = sum(int(first9[i]) * (9 - i) for i in range(9))
    if s_sum < 100:
        expected = s_sum
    elif s_sum in (100, 101):
        expected = 0
    else:
        r = s_sum % 101
        expected = 0 if r in (100, 101) else r
    return expected == given


# ---------- ОГРН / ОГРНИП ----------------------------------------------------


def ogrn(s: str) -> bool:
    """ОГРН (юрлицо): 13 цифр.

    Алгоритм: ``int(first_12) % 11 % 10 == digit[12]``.
    """
    d = _digits(s)
    if len(d) != 13:
        return False
    return (int(d[:12]) % 11) % 10 == int(d[12])


def ogrnip(s: str) -> bool:
    """ОГРНИП (ИП): 15 цифр.

    Алгоритм: ``int(first_14) % 13 % 10 == digit[14]``.
    """
    d = _digits(s)
    if len(d) != 15:
        return False
    return (int(d[:14]) % 13) % 10 == int(d[14])


# ---------- Luhn (банковские карты) ------------------------------------------


def luhn(s: str) -> bool:
    """Алгоритм Луна для PAN: 13–19 цифр.

    С конца удваиваем каждую вторую цифру; если результат >9 — вычитаем 9
    (эквивалентно ``divmod(x*2, 10) → суммируем``). Сумма всех цифр
    должна быть кратна 10.
    """
    d = _digits(s)
    if not 13 <= len(d) <= 19:
        return False
    digs = [int(c) for c in reversed(d)]
    total = 0
    for i, x in enumerate(digs):
        if i % 2 == 1:
            doubled = x * 2
            total += doubled - 9 if doubled > 9 else doubled
        else:
            total += x
    return total % 10 == 0
