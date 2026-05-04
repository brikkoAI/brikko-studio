# Brikko Anonymizer

On-prem PII anonymization sidecar — runs as a local FastAPI service on
`127.0.0.1:8403`, anonymizes Russian-language PII (ИНН/СНИЛС/паспорт/email/
phone/card/ФИО) before requests leave the host, restores placeholders in
LLM responses, and gates downstream tool calls (Bitrix24, Slack, etc.)
through a per-tool policy registry. Workspace state is encrypted with
AES-256-GCM keys held in the OS keychain (Linux Secret Service / macOS
Keychain / Windows Credential Manager). Read:

- [`docs/API.md`](docs/API.md) — the seven HTTP endpoints + error contract
- [`docs/STORAGE.md`](docs/STORAGE.md) — disk layout, key matrix, backup format, privacy invariants
- [`docs/DEGRADED_MODE.md`](docs/DEGRADED_MODE.md) — how the sidecar adapts to host load

---

## Out of scope (M1)

The following live in other milestones / repos — don't expect them here:

- Privacy plugin (Studio side) — **M2**
- MCP servers — **M2**
- Web-UI dashboard — **M2**
- Chat UI — **M2**
- OAuth flows — already shipped pre-M0
- OCR / vision PII — backlog v2
- RuBERT-class NER models — Enterprise tier

---

## Local dev quickstart

```bash
cd anonymizer
python -m venv .venv
source .venv/Scripts/activate          # bash on Windows; on Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
pip install -e .
uvicorn brikko_anonymizer.main:app --host 127.0.0.1 --port 8403
# in another shell:
curl http://127.0.0.1:8403/health
```

Expected: `{"status":"ok","version":"0.2.0","degraded_mode":"full"}`.

---

## Docker quickstart

```bash
# from brikko-studio repo root
docker compose up anonymizer -d
curl http://127.0.0.1:8403/health
```

The compose file binds the sidecar to `127.0.0.1:8403` only and mounts
the `brikko-state` named volume at `/data` so workspace keys + mappings
survive container restarts. See [`docs/STORAGE.md`](docs/STORAGE.md) §1.

---

## Tests

| Suite                                  | Command                                                             | Blocking? |
|----------------------------------------|---------------------------------------------------------------------|-----------|
| Full unit + API suite                  | `python -m pytest`                                                  | yes       |
| Inherited Gateway PII subset           | `python -m pytest tests/test_pii_*.py`                              | yes       |
| Property tests (hypothesis round-trip) | `python -m pytest tests/test_property_roundtrip.py --hypothesis-show-statistics` | yes       |
| Golden-corpus benchmark + gate         | `python tests/pii_corpus/benchmark.py --corpus tests/pii_corpus/golden_corpus.jsonl --out tests/pii_corpus/benchmark_results && python tests/pii_corpus/check_regression.py --baseline tests/pii_corpus/baseline.json --current tests/pii_corpus/benchmark_results/<latest>.json` | yes (CI: `.github/workflows/anonymizer-benchmark.yml`) |
| Adversarial corpus (50 examples)       | `python -m pytest tests/test_adversarial.py -v`                     | no (skip-not-fail) |
| Adversarial corpus (blocking mode)     | `BRIKKO_ADVERSARIAL_BLOCK=1 python -m pytest tests/test_adversarial.py -v` | yes (manual gate) |

Adversarial failures get triaged into `M1_FOLLOWUPS.md` — they are a
quality signal, not a release blocker.
