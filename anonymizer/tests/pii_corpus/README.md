# PII Golden Corpus Benchmark

Sprint 13 / Privacy v2 — Phase 5. Regression-protection layer for the PII
recognizer pipeline (`voltari_gateway.pii.masker._collect_detections`).

## Files

| File | Purpose |
|---|---|
| `golden_corpus.jsonl` | 50 hand-annotated documents with character-offset spans. |
| `build_corpus.py` | Deterministic builder for the corpus. Re-run after editing templates. |
| `validate_corpus.py` | Static check: every annotation slices back to its value, every checksum-bearing identifier passes its KC. |
| `benchmark.py` | Runs the recognizer on the corpus, computes per-category P/R/F1, dumps a JSON snapshot under `benchmark_results/`. |
| `baseline.json` | Frozen snapshot of acceptable metrics. CI compares fresh runs against this file. |
| `check_regression.py` | CI gate — exits non-zero if recall on any category drops by more than `--max-recall-drop` (default 0.5 pp). |
| `quick_benchmark.py` | Phase 1 hand-curated 10-doc smoke (kept for historical reasons; not part of CI gate). |

## How to run locally

```bash
cd apps/gateway

# Validate corpus integrity (no recogniser invocation).
python tests/pii_corpus/validate_corpus.py
# Expected: "50 docs validated, 0 errors"

# Run the benchmark (loads Natasha; ~5-10s).
python tests/pii_corpus/benchmark.py

# Compare against frozen baseline.
python tests/pii_corpus/check_regression.py \
    --baseline tests/pii_corpus/baseline.json \
    --current  tests/pii_corpus/benchmark_results/$(date -u +%Y-%m-%d).json
```

## Corpus composition

50 documents, 100% synthetic (templated). Genre distribution:

| Genre | Count |
|---|---|
| `contract` | 10 |
| `business_letter` | 10 |
| `call_transcript` | 8 |
| `bank_statement` | 8 |
| `job_application` | 7 |
| `informal_chat` | 7 |

**Why 100% synthetic?** The original Phase 5 plan called for 30 synthetic +
20 real-obfuscated samples from `zakupki.gov.ru` / `sudact.ru` /
public-AO annual reports. We dropped the real-data slice for two reasons:

1. **Annotation accuracy.** Hand-annotating 20 freshly-scraped HTMLs with
   exact character offsets across paragraph breaks, hyphens, and
   non-breaking spaces is error-prone. Templated synthetic gives
   build-time correct offsets — `validate_corpus.py` verifies them.
2. **CI determinism.** A live scrape from `zakupki.gov.ru` would tie
   benchmark stability to upstream availability and HTML-structure
   stability — both controlled by third parties.

**Trade-off:** the upper bound on real-world recall may differ from what
this corpus reports. The benchmark is therefore a **regression detector**,
not an absolute quality measurement. When a future change wants to claim
"recall improved from X to Y on real data", that claim needs a separate
study; this corpus only guarantees "no worse than the day baseline was
frozen on synthetic data".

The corpus uses real-public corporate identifiers from the Russian
state registries (Сбербанк ИНН/ОГРН etc.) mixed with synthetic
KC-valid IDs for variety. All ИНН / СНИЛС / ОГРН / ОГРНИП / CARD values
satisfy their checksums (verified by `validate_corpus.py`). All ФИО /
телефоны / email / паспорта are synthetic.

## Baseline metrics (frozen 2026-05-03)

Per-category, on the full 50-doc corpus, after Phase 1-4 of Privacy v2.

```
Category               P        R       F1     TP     FP     FN
----------------------------------------------------------------
BANK_ACCOUNT    100.00% 100.00% 100.00%      7      0      0
CARD            100.00% 100.00% 100.00%      4      0      0
EMAIL           100.00% 100.00% 100.00%     24      0      0
INN             100.00% 100.00% 100.00%     21      0      0
NAME             36.72%  88.68%  51.93%     47     81      6
OGRN            100.00% 100.00% 100.00%      5      0      0
OGRNIP          100.00% 100.00% 100.00%      3      0      0
PASSPORT        100.00% 100.00% 100.00%     13      0      0
PHONE           100.00% 100.00% 100.00%     27      0      0
SNILS           100.00% 100.00% 100.00%     15      0      0
```

NAME's lower precision is expected: Natasha's yargy fallback over-generates
on common Cyrillic words ("ИНН", "Оператор", "Здравствуйте") whose lemmas
collide with personal-name forms. We accept over-masking on NAME because
the spec (§ 2.4) prefers false-positive masks to leaked names. Tightening
this is backlog v3 work — it requires either a custom POS filter or a
model upgrade to Slovnet, not a corpus change.

NAME recall of 88.68% reflects two known limitations:

* "Лебедева Ольга Дмитриевна" is sometimes split into ("Лебедева", "Ольга
  Дмитриевна") by Natasha — counted as 2 spans, not 1 (gold has 1).
* Greeting-prefix gluing — yargy occasionally emits "Уважаемый Сидоров"
  which doesn't match the gold span starting at "Сидоров".

## Re-snapshotting the baseline

The baseline is intentionally hard to update — it's the regression-protection
contract. To re-snapshot:

1. Run the benchmark.
2. Manually inspect the diff vs. previous baseline (`git diff baseline.json`).
3. If the change is intentional (recogniser improvement, corpus expansion):
   ```bash
   cp tests/pii_corpus/benchmark_results/$(date -u +%Y-%m-%d).json \
      tests/pii_corpus/baseline.json
   ```
4. Commit with a message explaining what changed and why.

A drop in recall against the previous baseline should always be justified
in the commit message — accidental regressions are precisely what this gate
exists to catch.

## CI integration

See `.github/workflows/ci.yml`, job `gateway-pii-benchmark`. Runs on every
PR; failure blocks merge via the `quality-gate` aggregator.
