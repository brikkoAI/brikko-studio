"""Build :file:`golden_corpus.jsonl` from declarative templates.

Sprint 13 / Privacy v2 — Phase 5, Task 5.1.

We *generate* the corpus rather than hand-write it for one reason: hand
annotation of 50 docs would mean computing 200+ character offsets by
hand. One typo → benchmark explodes with phantom mismatches. Templates
make offsets a build-time function — the validator (:file:`validate_corpus.py`)
later confirms every span text-slices back to the value it claims.

Each template is a list of segments::

    ("text", "Договор подписали ")
    ("pii", "NAME", "Иванов Иван Петрович")
    ("text", " (ИНН ")
    ("pii", "INN", "7707083893")
    ...

`build()` walks the segments, concatenates the surface forms, and emits
JSON-line documents with `(start, end, category, value)` annotations
whose offsets are exact.

All ИНН / СНИЛС / ОГРН / ОГРНИП values are checksum-valid by construction
(see :func:`_kc_check` for verification on save). Card numbers are real
test PANs (Visa 4532..., Mastercard 5555..., Amex 3782...) which all
satisfy Luhn.

Genre distribution (see Phase 5 plan):

* 10 contracts        — heavy on INN/OGRN/NAME/banking
* 10 business letters — NAME/PHONE/EMAIL
*  8 call transcripts — NAME/PASSPORT/SNILS in spoken form
*  8 bank statements  — INN/CARD/BANK_ACCOUNT
*  7 job applications — PASSPORT/SNILS/NAME/EMAIL
*  7 informal chats   — NAME/PHONE/EMAIL, short prompts

Total: 50 documents, 100% synthetic (no live scrape from
zakupki.gov.ru / sudact.ru — see README rationale).
"""

from __future__ import annotations

import json
from collections.abc import Sequence
from pathlib import Path
from typing import Literal, TypedDict

from brikko_anonymizer.pii.checksums import (
    inn10,
    inn12,
    luhn,
    ogrn,
    ogrnip,
    snils,
)

# ---------- segment types -----------------------------------------------------

TextSeg = tuple[Literal["text"], str]
PiiSeg = tuple[Literal["pii"], str, str]  # ("pii", category, surface)
Segment = TextSeg | PiiSeg


class Annotation(TypedDict):
    start: int
    end: int
    category: str
    value: str


class Document(TypedDict):
    id: str
    genre: str
    source: str
    text: str
    annotations: list[Annotation]


# ---------- KC-valid identifier pool ------------------------------------------
#
# Real-world identifiers from public registries (Сбер ИНН/ОГРН — публичная
# информация, не PII). Mixed with checksum-valid synthetic ones for variety.
# All have been verified via brikko_anonymizer.pii.checksums.

# ИНН-10 (юрлица) — public corporate identifiers.
_INN10_POOL = [
    "7707083893",  # Сбербанк
    "7736050003",  # Газпром
    "7708503727",  # РЖД
    "7706107510",  # Роснефть
    "7740000076",  # МТС
    "7812014560",  # МегаФон
    "7713076301",  # ВымпелКом (Билайн)
    "7708004767",  # ЛУКОЙЛ
    "7702070139",  # ВТБ
    "7712040126",  # Аэрофлот
    "7710140679",  # Тинькофф (ныне T-Bank)
    "7736207543",  # Яндекс
    "7743001840",  # Mail.ru
]

# ИНН-12 (физлица/ИП) — synthetic, all KC-valid.
_INN12_POOL = [
    "770700000017",
    "500200000001",
    "781100000020",
    "550400000089",
    "660300000077",
    "770100000079",
    "233100000090",
]

# ОГРН (13-digit) — real public corporate.
_OGRN_POOL = [
    "1027700132195",  # Сбер
    "1027700070518",  # Газпром
    "1037739877295",  # РЖД
    "1027700035769",  # ЛУКОЙЛ
    "1027739642281",  # Тинькофф
]

# ОГРНИП (15-digit) — synthetic KC-valid.
_OGRNIP_POOL = [
    "304500001234501",
    "315700002345608",
    "306777003456701",
    "321000000000074",
    "304987654321015",
]

# СНИЛС — synthetic KC-valid.
_SNILS_POOL = [
    "112-233-445 95",
    "987-654-321 83",
    "123-456-789 64",
    "555-666-777 50",
    "111-222-333 72",
    "777-888-999 39",
    "100-000-001 10",
]

# Bank cards — real test PANs (industry-standard, Luhn-valid).
_CARD_POOL = [
    "4532015112830366",  # Visa test
    "5555555555554444",  # Mastercard test
    "4111111111111111",  # Visa universal test
    "5105105105105100",  # Mastercard test #2
    "4242424242424242",  # Stripe test Visa
]

# 20-digit расчётный счёт (no КС validator yet — backlog v3 ждёт справочник
# БИК ЦБ РФ). Pattern itself is real ru-bank format: 40702 (ОПФ) + ...
_BANK_ACCOUNT_POOL = [
    "40702810500000012345",
    "40702810700000067890",
    "40802810900000054321",
]

# Phones — RU formats, all 11 digits.
_PHONE_POOL = [
    "+7 (495) 123-45-67",
    "+7-916-555-12-34",
    "8 800 555 35 35",
    "+7 (812) 999-00-11",
    "+7 985 234 56 78",
]

# Emails — synthetic, plausible RU-domain.
_EMAIL_POOL = [
    "ivanov@example.ru",
    "petrov.a@company.ru",
    "info@sber-bank.ru",
    "hr@company.ru",
    "support@brikko.ru",
    "boss@firma.com",
]

# Passports — RU format 4+6.
_PASSPORT_POOL = [
    "4509 123456",
    "4012 987654",
    "4509 100200",
    "4607 555888",
    "4514 777999",
]

# ФИО — varied, declensions handled by Natasha при scoring; corpus
# интенсивно использует именительный для простоты разметки.
_NAME_POOL = [
    "Иванов Иван Петрович",
    "Петров Алексей Викторович",
    "Сидоров Михаил Александрович",
    "Кузнецова Анна Сергеевна",
    "Смирнов Дмитрий Олегович",
    "Попова Елена Юрьевна",
    "Новиков Сергей Андреевич",
    "Морозова Татьяна Игоревна",
    "Волков Андрей Николаевич",
    "Соколов Павел Викторович",
    "Лебедева Ольга Дмитриевна",
    "Козлов Николай Степанович",
]


# ---------- template definitions ----------------------------------------------
#
# Each template returns Segments. Variation comes from index-based pool
# selection so identical templates produce slightly different docs.


def _t_contract_simple(i: int) -> tuple[str, list[Segment]]:
    name1 = _NAME_POOL[i % len(_NAME_POOL)]
    name2 = _NAME_POOL[(i + 3) % len(_NAME_POOL)]
    inn = _INN10_POOL[i % len(_INN10_POOL)]
    ogrn_v = _OGRN_POOL[i % len(_OGRN_POOL)]
    return "contract", [
        ("text", "Договор № "),
        ("text", f"К-{2026000 + i}\n"),
        ("text", "Стороны:\n  Заказчик: ООО «Альфа», в лице директора "),
        ("pii", "NAME", name1),
        ("text", ", ИНН "),
        ("pii", "INN", inn),
        ("text", ", ОГРН "),
        ("pii", "OGRN", ogrn_v),
        ("text", ".\n  Исполнитель: ИП "),
        ("pii", "NAME", name2),
        ("text", ", ОГРНИП "),
        ("pii", "OGRNIP", _OGRNIP_POOL[i % len(_OGRNIP_POOL)]),
        ("text", ".\nПодписано 12 апреля 2026 года в г. Москва."),
    ]


def _t_contract_with_bank(i: int) -> tuple[str, list[Segment]]:
    name = _NAME_POOL[(i + 1) % len(_NAME_POOL)]
    inn = _INN10_POOL[(i + 2) % len(_INN10_POOL)]
    return "contract", [
        ("text", "Настоящий договор заключён "),
        ("pii", "NAME", name),
        ("text", " (ИНН "),
        ("pii", "INN", inn),
        ("text", ") на сумму 1 250 000 рублей.\n"),
        ("text", "Реквизиты для оплаты:\n  Расчётный счёт: "),
        ("pii", "BANK_ACCOUNT", _BANK_ACCOUNT_POOL[i % len(_BANK_ACCOUNT_POOL)]),
        ("text", "\n  БИК банка: 044525225\n"),
        ("text", "Контактный e-mail: "),
        ("pii", "EMAIL", _EMAIL_POOL[i % len(_EMAIL_POOL)]),
    ]


def _t_contract_supply(i: int) -> tuple[str, list[Segment]]:
    return "contract", [
        ("text", "Договор поставки № П-"),
        ("text", f"{1000 + i}/2026 от 14.05.2026\n"),
        ("text", "Поставщик: АО «БетаКорп», ИНН "),
        ("pii", "INN", _INN10_POOL[(i + 4) % len(_INN10_POOL)]),
        ("text", ", ОГРН "),
        ("pii", "OGRN", _OGRN_POOL[(i + 1) % len(_OGRN_POOL)]),
        ("text", ".\nПокупатель: "),
        ("pii", "NAME", _NAME_POOL[(i + 2) % len(_NAME_POOL)]),
        ("text", ".\nКонтактный телефон: "),
        ("pii", "PHONE", _PHONE_POOL[i % len(_PHONE_POOL)]),
        ("text", ".\nЭлектронная почта: "),
        ("pii", "EMAIL", _EMAIL_POOL[(i + 1) % len(_EMAIL_POOL)]),
    ]


def _t_contract_nda(i: int) -> tuple[str, list[Segment]]:
    return "contract", [
        ("text", "Соглашение о неразглашении (NDA)\n"),
        ("text", "Сторона 1: "),
        ("pii", "NAME", _NAME_POOL[(i + 5) % len(_NAME_POOL)]),
        ("text", ", паспорт "),
        ("pii", "PASSPORT", _PASSPORT_POOL[i % len(_PASSPORT_POOL)]),
        ("text", ", выдан ОВД района Тверской г. Москва.\n"),
        ("text", "Сторона 2: ООО «Гамма», ИНН "),
        ("pii", "INN", _INN10_POOL[(i + 6) % len(_INN10_POOL)]),
        ("text", ".\nКонтакт по вопросам соглашения: "),
        ("pii", "EMAIL", _EMAIL_POOL[(i + 2) % len(_EMAIL_POOL)]),
    ]


def _t_business_letter(i: int) -> tuple[str, list[Segment]]:
    return "business_letter", [
        ("text", "Уважаемый "),
        ("pii", "NAME", _NAME_POOL[i % len(_NAME_POOL)]),
        ("text", "!\n\n"),
        ("text", "Прошу подтвердить готовность к встрече 18.05.2026.\n"),
        ("text", "Связаться со мной можно по телефону "),
        ("pii", "PHONE", _PHONE_POOL[(i + 1) % len(_PHONE_POOL)]),
        ("text", " или по e-mail "),
        ("pii", "EMAIL", _EMAIL_POOL[(i + 3) % len(_EMAIL_POOL)]),
        ("text", ".\n\nС уважением,\n"),
        ("pii", "NAME", _NAME_POOL[(i + 7) % len(_NAME_POOL)]),
    ]


def _t_business_letter_invoice(i: int) -> tuple[str, list[Segment]]:
    return "business_letter", [
        ("text", "Здравствуйте,\n\n"),
        ("text", "Направляю счёт № С-"),
        ("text", f"{500 + i}/2026 для оплаты на сумму 87 500 ₽.\n"),
        ("text", "Реквизиты получателя: ООО «Дельта», ИНН "),
        ("pii", "INN", _INN10_POOL[(i + 8) % len(_INN10_POOL)]),
        ("text", ".\nПо всем вопросам — "),
        ("pii", "NAME", _NAME_POOL[(i + 4) % len(_NAME_POOL)]),
        ("text", ", тел. "),
        ("pii", "PHONE", _PHONE_POOL[(i + 2) % len(_PHONE_POOL)]),
        ("text", "."),
    ]


def _t_business_letter_intro(i: int) -> tuple[str, list[Segment]]:
    return "business_letter", [
        ("text", "Добрый день, коллеги!\n\n"),
        ("text", "Меня зовут "),
        ("pii", "NAME", _NAME_POOL[(i + 6) % len(_NAME_POOL)]),
        ("text", ", я новый менеджер по продажам.\n"),
        ("text", "Мой рабочий e-mail: "),
        ("pii", "EMAIL", _EMAIL_POOL[(i + 4) % len(_EMAIL_POOL)]),
        ("text", ", мобильный: "),
        ("pii", "PHONE", _PHONE_POOL[(i + 3) % len(_PHONE_POOL)]),
        ("text", ".\nБуду рад знакомству!"),
    ]


def _t_call_transcript(i: int) -> tuple[str, list[Segment]]:
    return "call_transcript", [
        ("text", "[00:00:12] Оператор: Здравствуйте, чем могу помочь?\n"),
        ("text", "[00:00:18] Клиент: Здравствуйте, меня зовут "),
        ("pii", "NAME", _NAME_POOL[(i + 2) % len(_NAME_POOL)]),
        ("text", ", у меня вопрос по договору.\n"),
        ("text", "[00:00:34] Оператор: Назовите, пожалуйста, СНИЛС.\n"),
        ("text", "[00:00:41] Клиент: Да, конечно — "),
        ("pii", "SNILS", _SNILS_POOL[i % len(_SNILS_POOL)]),
        ("text", ".\n[00:00:55] Оператор: Спасибо, и паспортные данные?\n"),
        ("text", "[00:01:02] Клиент: Серия и номер "),
        ("pii", "PASSPORT", _PASSPORT_POOL[(i + 1) % len(_PASSPORT_POOL)]),
        ("text", ".\n[00:01:18] Оператор: Принято, минуту."),
    ]


def _t_call_short(i: int) -> tuple[str, list[Segment]]:
    return "call_transcript", [
        ("text", "Клиент представился как "),
        ("pii", "NAME", _NAME_POOL[(i + 8) % len(_NAME_POOL)]),
        ("text", ". Контактный номер для связи — "),
        ("pii", "PHONE", _PHONE_POOL[(i + 4) % len(_PHONE_POOL)]),
        ("text", ". СНИЛС "),
        ("pii", "SNILS", _SNILS_POOL[(i + 1) % len(_SNILS_POOL)]),
        ("text", " назван корректно."),
    ]


def _t_bank_statement(i: int) -> tuple[str, list[Segment]]:
    return "bank_statement", [
        ("text", "Выписка по счёту за период 01.04.2026 — 30.04.2026\n"),
        ("text", "Владелец: "),
        ("pii", "NAME", _NAME_POOL[(i + 3) % len(_NAME_POOL)]),
        ("text", "\nИНН: "),
        ("pii", "INN", _INN12_POOL[i % len(_INN12_POOL)]),
        ("text", "\nКарта *"),
        ("pii", "CARD", _CARD_POOL[i % len(_CARD_POOL)]),
        ("text", "\n\nОстаток на конец периода: 1 234 567,89 ₽"),
    ]


def _t_bank_payment(i: int) -> tuple[str, list[Segment]]:
    return "bank_statement", [
        ("text", "Платёжное поручение № "),
        ("text", f"П{2000 + i}\n"),
        ("text", "Получатель: ООО «Эпсилон», ИНН "),
        ("pii", "INN", _INN10_POOL[(i + 9) % len(_INN10_POOL)]),
        ("text", "\nР/с получателя: "),
        ("pii", "BANK_ACCOUNT", _BANK_ACCOUNT_POOL[(i + 1) % len(_BANK_ACCOUNT_POOL)]),
        ("text", "\nНазначение: оплата по договору № "),
        ("text", f"К-{2026100 + i}"),
    ]


def _t_job_application(i: int) -> tuple[str, list[Segment]]:
    return "job_application", [
        ("text", "Заявление о приёме на работу\n\n"),
        ("text", "Я, "),
        ("pii", "NAME", _NAME_POOL[(i + 9) % len(_NAME_POOL)]),
        ("text", ", прошу принять меня на должность "),
        ("text", "ведущего инженера в ваш отдел.\n\n"),
        ("text", "Паспорт: "),
        ("pii", "PASSPORT", _PASSPORT_POOL[(i + 2) % len(_PASSPORT_POOL)]),
        ("text", ", выдан 14.06.2018.\nСНИЛС: "),
        ("pii", "SNILS", _SNILS_POOL[(i + 2) % len(_SNILS_POOL)]),
        ("text", ".\nE-mail для связи: "),
        ("pii", "EMAIL", _EMAIL_POOL[(i + 5) % len(_EMAIL_POOL)]),
        ("text", "\nТелефон: "),
        ("pii", "PHONE", _PHONE_POOL[i % len(_PHONE_POOL)]),
    ]


def _t_chat_short(i: int) -> tuple[str, list[Segment]]:
    return "informal_chat", [
        ("text", "Привет, скажи "),
        ("pii", "NAME", _NAME_POOL[(i + 10) % len(_NAME_POOL)]),
        ("text", ", чтобы перезвонил мне на "),
        ("pii", "PHONE", _PHONE_POOL[(i + 4) % len(_PHONE_POOL)]),
    ]


def _t_chat_email(i: int) -> tuple[str, list[Segment]]:
    return "informal_chat", [
        ("text", "Скинь, пожалуйста, "),
        ("pii", "NAME", _NAME_POOL[(i + 11) % len(_NAME_POOL)]),
        ("text", " на "),
        ("pii", "EMAIL", _EMAIL_POOL[(i + 1) % len(_EMAIL_POOL)]),
        ("text", " копию договора"),
    ]


# ---------- assembly ----------------------------------------------------------


def _assemble(segments: Sequence[Segment]) -> tuple[str, list[Annotation]]:
    """Walk segments, build text + offsets-correct annotations."""
    parts: list[str] = []
    annotations: list[Annotation] = []
    cursor = 0
    for seg in segments:
        # Discriminate by tuple length — TextSeg has 2 slots, PiiSeg has 3.
        # mypy can't narrow on the literal-tag discriminant in older
        # versions, so we do it structurally.
        if len(seg) == 2:
            chunk = seg[1]
            parts.append(chunk)
            cursor += len(chunk)
        elif len(seg) == 3:
            category = seg[1]
            value = seg[2]
            parts.append(value)
            annotations.append(
                {
                    "start": cursor,
                    "end": cursor + len(value),
                    "category": category,
                    "value": value,
                }
            )
            cursor += len(value)
        else:
            msg = f"unknown segment kind: {seg[0]!r}"
            raise ValueError(msg)
    return "".join(parts), annotations


def _build_genre(name: str, factory, count: int, start_index: int = 0) -> list[Document]:
    """Generate `count` docs from the given factory, indexed for variety."""
    out: list[Document] = []
    for i in range(count):
        genre, segments = factory(start_index + i)
        text, anns = _assemble(segments)
        doc: Document = {
            "id": f"{name}_{i + 1:03d}",
            "genre": genre,
            "source": "synthetic",
            "text": text,
            "annotations": anns,
        }
        out.append(doc)
    return out


def build_corpus() -> list[Document]:
    """Assemble the 50-doc corpus."""
    docs: list[Document] = []

    # Contracts (10): rotate through 4 contract templates.
    docs += _build_genre("contract_simple", _t_contract_simple, 3)
    docs += _build_genre("contract_with_bank", _t_contract_with_bank, 3)
    docs += _build_genre("contract_supply", _t_contract_supply, 2)
    docs += _build_genre("contract_nda", _t_contract_nda, 2)

    # Business letters (10): 3 templates.
    docs += _build_genre("letter_meeting", _t_business_letter, 4)
    docs += _build_genre("letter_invoice", _t_business_letter_invoice, 3)
    docs += _build_genre("letter_intro", _t_business_letter_intro, 3)

    # Call transcripts (8).
    docs += _build_genre("call_full", _t_call_transcript, 4)
    docs += _build_genre("call_short", _t_call_short, 4)

    # Bank statements (8).
    docs += _build_genre("bank_statement", _t_bank_statement, 4)
    docs += _build_genre("bank_payment", _t_bank_payment, 4)

    # Job applications (7).
    docs += _build_genre("job_app", _t_job_application, 7)

    # Informal chats (7).
    docs += _build_genre("chat_call_request", _t_chat_short, 4)
    docs += _build_genre("chat_email_request", _t_chat_email, 3)

    return docs


def _kc_check(docs: list[Document]) -> list[str]:
    """Verify every annotation's checksum-applicable value passes its KC."""
    errors: list[str] = []
    for doc in docs:
        for ann in doc["annotations"]:
            cat = ann["category"]
            val = ann["value"]
            ok = True
            if cat == "INN":
                d = "".join(c for c in val if c.isdigit())
                ok = inn10(val) if len(d) == 10 else inn12(val)
            elif cat == "OGRN":
                ok = ogrn(val)
            elif cat == "OGRNIP":
                ok = ogrnip(val)
            elif cat == "SNILS":
                ok = snils(val)
            elif cat == "CARD":
                ok = luhn(val)
            if not ok:
                errors.append(f"{doc['id']}: KC failed for {cat}={val!r}")
    return errors


def main() -> None:
    docs = build_corpus()
    if len(docs) != 50:
        msg = f"expected 50 docs, got {len(docs)}"
        raise AssertionError(msg)

    errors = _kc_check(docs)
    if errors:
        msg = "Checksum failures:\n" + "\n".join(errors)
        raise AssertionError(msg)

    out_path = Path(__file__).parent / "golden_corpus.jsonl"
    with out_path.open("w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False))
            f.write("\n")

    # Stats
    by_genre: dict[str, int] = {}
    by_cat: dict[str, int] = {}
    for d in docs:
        by_genre[d["genre"]] = by_genre.get(d["genre"], 0) + 1
        for a in d["annotations"]:
            by_cat[a["category"]] = by_cat.get(a["category"], 0) + 1

    print(f"Wrote {len(docs)} documents to {out_path}")
    print(f"Total annotations: {sum(by_cat.values())}")
    print("\nBy genre:")
    for g, n in sorted(by_genre.items()):
        print(f"  {g:<20s} {n:>3d}")
    print("\nBy category:")
    for c, n in sorted(by_cat.items()):
        print(f"  {c:<15s} {n:>3d}")


if __name__ == "__main__":
    main()
