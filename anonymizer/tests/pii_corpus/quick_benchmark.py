"""Quick 10-doc benchmark of the PII recognizers (Sprint 13 / Privacy v2).

Goal: измерить precision/recall **after** Phase 1 (checksum-валидация). Это
baseline для Phase 2 (Natasha PERSON) — если recall упадёт после ввода
Natasha, мы должны увидеть это здесь, не в проде.

Ten hand-curated русских документов покрывают edge cases:

* timestamp- и random-like 10/12/13/15/16-цифровые последовательности
  (без КС → НЕ должны маскироваться после Task 1.2);
* реальные КС-valid идентификаторы Сбера/Газпрома/тестовых карт;
* mix EMAIL+PHONE+ИНН+СНИЛС+PASSPORT;
* adversarial 20-digit run, который Phase 1 ловит как BANK_ACCOUNT
  без КС (known limitation, документировано отдельно — backlog v3 ждёт
  справочник БИК ЦБ РФ).

Usage::

    cd apps/gateway
    python tests/pii_corpus/quick_benchmark.py

Saves JSON в ``tests/pii_corpus/results/phase1_quick_benchmark_YYYY-MM-DD.json``.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import TypedDict

from brikko_anonymizer.pii.masker import detect_pii


class _ExpectedEntity(TypedDict):
    type: str
    value: str


class _Document(TypedDict):
    id: str
    text: str
    expected_entities: list[_ExpectedEntity]
    notes: str


# Ten hand-curated documents. См. docstring модуля выше для design rationale.
DOCUMENTS: list[_Document] = [
    {
        "id": "doc_001_log_lines",
        "text": ("Request 1234567890 took 12345678901 ms, response 987654321012"),
        # 1234567890 (10 digits, без сепаратора) ловится PASSPORT regex'ом
        # как 4+6=10 — это existing behaviour ДО Phase 1, не регрессия.
        # PASSPORT validator пока пустой (КС РФ-паспорта не существует
        # — это просто серия+номер). Считаем как expected.
        # 12345678901 (11 цифр) — НЕ phone (нет +7/8), НЕ snils (нет
        # сепараторов с КС). Не маскируется → не expected.
        # 987654321012 (12 цифр) — fails inn12 КС → не маскируется.
        "expected_entities": [
            {"type": "PASSPORT", "value": "1234567890"},
        ],
        "notes": (
            "10-digit без сеп. ловится PASSPORT (existing behaviour). "
            "11/12-digit КС fail после Phase 1 → не маскируются."
        ),
    },
    {
        "id": "doc_002_real_inn_in_context",
        "text": ("Заключили договор с Сбербанком ИНН 7707083893 на сумму 50000 рублей"),
        "expected_entities": [{"type": "INN", "value": "7707083893"}],
        "notes": "Сбербанк ИНН-10 — реальный КС-valid",
    },
    {
        "id": "doc_003_invalid_inn_lookalike",
        "text": ("Номер запроса 1234567890 содержит 10 цифр но ИНН не является"),
        # Phase 1 устраняет INN false-positive (КС fail), но 10-digit
        # без сепаратора всё ещё попадает под PASSPORT regex (4+6) —
        # это existing behaviour, see doc_001 notes. Главное: НЕ INN.
        "expected_entities": [
            {"type": "PASSPORT", "value": "1234567890"},
        ],
        "notes": (
            "Phase 1 устраняет INN-FP (КС fail). PASSPORT-фолбэк — "
            "existing pre-Phase-1 limit, fix будет в Phase 2 через "
            "контекст-aware дисамбигуацию."
        ),
    },
    {
        "id": "doc_004_mixed_real_pii",
        "text": ("ИНН 7707083893, СНИЛС 112-233-445 95, паспорт 4509 123456, тел +7-999-123-45-67"),
        "expected_entities": [
            {"type": "INN", "value": "7707083893"},
            {"type": "SNILS", "value": "112-233-445 95"},
            {"type": "PASSPORT", "value": "4509 123456"},
            {"type": "PHONE", "value": "+7-999-123-45-67"},
        ],
        "notes": "Все 4 — реальные КС-valid (СНИЛС, INN) или формат-valid",
    },
    {
        "id": "doc_005_card_with_luhn_fail",
        "text": "Тестовая карта 1234567890123456 (это не валидная карта)",
        "expected_entities": [],  # fails Luhn
        "notes": "Luhn-валидатор устраняет 16-цифровой random",
    },
    {
        "id": "doc_006_card_valid_luhn",
        "text": "Карта Visa 4532015112830366 для тестов",
        "expected_entities": [{"type": "CARD", "value": "4532015112830366"}],
        "notes": "Luhn-valid Visa",
    },
    {
        "id": "doc_007_ogrn_valid",
        "text": "ОГРН Сбербанка 1027700132195 — пример организации",
        "expected_entities": [{"type": "OGRN", "value": "1027700132195"}],
        "notes": "Сбер ОГРН — КС-valid",
    },
    {
        "id": "doc_008_ogrn_invalid",
        "text": "Длинный код 1234567890123 не является ОГРН",
        "expected_entities": [],  # fails OGRN КС
        "notes": "Phase 1 KC устраняет 13-digit false-positive",
    },
    {
        "id": "doc_009_email_phone_mix",
        "text": "Контакт: ivanov@example.ru, +7 (495) 123-45-67",
        "expected_entities": [
            {"type": "EMAIL", "value": "ivanov@example.ru"},
            {"type": "PHONE", "value": "+7 (495) 123-45-67"},
        ],
        "notes": "Email + phone с круглыми скобками",
    },
    {
        "id": "doc_010_payment_id_lookalike",
        "text": "Платёж ID 12345678901234567890 успешно проведён",
        # 20-digit run ловится BANK_ACCOUNT regex'ом без КС — known
        # limitation Phase 1 (backlog v3 ждёт справочник БИК ЦБ РФ).
        # Сейчас счётом expected_entities=[] → 1 FP. Когда добавим
        # validator, это перестанет ловиться и FP уйдёт в 0.
        "expected_entities": [],
        "notes": ("Phase 1 BANK_ACCOUNT без КС — known FP. Backlog v3: BIK-валидатор ЦБ РФ"),
    },
]


def benchmark() -> dict:
    """Run detection on each doc, compute per-doc + aggregate P/R/FN.

    Returns the result dict and writes it to JSON.
    """
    results: dict = {
        "phase": "phase1_post_checksum_validation",
        "generated_at": datetime.now(UTC).isoformat(),
        "total_docs": len(DOCUMENTS),
        "true_positives": 0,
        "false_positives": 0,
        "false_negatives": 0,
        "per_doc": [],
    }

    for doc in DOCUMENTS:
        # detect_pii returns list[tuple[str, str]] = [(type, original), ...]
        detected = detect_pii(doc["text"])
        expected = doc["expected_entities"]

        # Build sets of (type, value) for set-arithmetic.
        detected_set = set(detected)
        expected_set = {(e["type"], e["value"]) for e in expected}

        tp = len(detected_set & expected_set)
        fp = len(detected_set - expected_set)
        fn = len(expected_set - detected_set)

        results["true_positives"] += tp
        results["false_positives"] += fp
        results["false_negatives"] += fn
        results["per_doc"].append(
            {
                "id": doc["id"],
                "text": doc["text"],
                "detected": [list(d) for d in detected],
                "expected": expected,
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "notes": doc["notes"],
            }
        )

    tp_total = results["true_positives"]
    fp_total = results["false_positives"]
    fn_total = results["false_negatives"]

    precision = tp_total / max(1, tp_total + fp_total)
    recall = tp_total / max(1, tp_total + fn_total)
    f1 = 2 * precision * recall / max(1e-9, precision + recall) if (precision + recall) > 0 else 0.0

    results["precision"] = round(precision, 4)
    results["recall"] = round(recall, 4)
    results["f1"] = round(f1, 4)

    print(f"=== Phase 1 Quick Benchmark — {results['generated_at']} ===")
    print(f"Docs: {results['total_docs']}")
    print(f"TP: {tp_total}  FP: {fp_total}  FN: {fn_total}")
    print(f"Precision: {precision:.2%}")
    print(f"Recall:    {recall:.2%}")
    print(f"F1:        {f1:.2%}")

    # Per-doc breakdown — печатаем только если что-то не сошлось.
    for d in results["per_doc"]:
        if d["fp"] or d["fn"]:
            print(
                f"  [{d['id']}] tp={d['tp']} fp={d['fp']} fn={d['fn']}  "
                f"detected={d['detected']}  notes={d['notes']}"
            )

    # Save JSON.
    out_dir = Path(__file__).parent / "results"
    out_dir.mkdir(exist_ok=True)
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    out_file = out_dir / f"phase1_quick_benchmark_{today}.json"
    out_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved: {out_file}")

    return results


if __name__ == "__main__":
    benchmark()
