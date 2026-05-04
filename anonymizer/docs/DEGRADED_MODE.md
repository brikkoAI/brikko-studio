# Brikko Anonymizer — Degraded Mode

**Version:** `0.2.0`

The sidecar runs a background `psutil` watcher that polls CPU + RAM and
adjusts which detectors fire on each `/anonymize` request. The point is
to keep the request path responsive under host pressure — Natasha NER is
the most expensive stage by an order of magnitude — while preserving the
high-precision regex+checksum stages that catch the bulk of compliance-
critical PII (ИНН/СНИЛС/паспорт/email/phone).

---

## 1. Mode table

| Mode        | Trigger (sustained)              | What runs                              | What's skipped         |
|-------------|----------------------------------|----------------------------------------|------------------------|
| `full`      | CPU < 80% AND RAM < 80%          | regex + checksums + Natasha NER        | nothing                |
| `degraded`  | CPU OR RAM > 80% for 30 s        | regex + checksums                      | Natasha NER            |
| `emergency` | CPU OR RAM > 95% for 10 s        | regex only                             | checksums + Natasha    |

**Recovery:** drops to a lower mode after load < 80% sustained for 60 s.
The 60-second recovery vs 30-second escalation is intentional hysteresis —
prevents the watcher from oscillating between `full` and `degraded` when
load hovers around the threshold.

**Manual override:** set `BRIKKO_DEGRADED_MODE=disabled` and the watcher
still runs (so `/health` reports it) but the pipeline ignores its output
and stays in `full` forever. Use this when you need predictability — e.g.
during a compliance audit walkthrough where mode-switching would confuse
the auditor.

---

## 2. Observability

Every API response carries the current mode:
- `/health` → `"degraded_mode": "full"|"degraded"|"emergency"|"unknown"`
- `/anonymize`, `/stats` → `"degraded_mode": false|true` (true = anything other than `full`)
- audit events → `"degraded_mode": "full"|"degraded"|"emergency"`

The M2 web-ui dashboard surfaces this as a shield colour:

| Mode        | Shield colour | UI hint shown                                         |
|-------------|---------------|-------------------------------------------------------|
| `full`      | green         | (none)                                                |
| `degraded`  | yellow        | "Имена временно не маскируются"                       |
| `emergency` | red           | "Только базовая защита — высокий FP-риск"             |
| `unknown`   | grey          | "Не удалось проверить нагрузку"                       |

Operators querying the audit log can group-by `degraded_mode` to spot
periods where Natasha was off — useful when investigating a leaked-name
incident report.

---

## 3. Implications

`degraded` loses **Russian-name detection only** (ФИО → `<NAME_N>`). The
high-stakes formats stay protected:

| Category           | Detector                       | Affected by `degraded`? | Affected by `emergency`? |
|--------------------|--------------------------------|-------------------------|--------------------------|
| EMAIL              | regex                          | no                      | no                       |
| PHONE              | regex                          | no                      | no                       |
| PASSPORT           | regex                          | no                      | no                       |
| CARD               | regex + Luhn                   | no                      | **yes** (Luhn off → FP rises) |
| INN                | regex + INN-10/12 KS           | no                      | **yes** (KS off → FP rises) |
| SNILS              | regex + Mod-101 KS             | no                      | **yes** (KS off → FP rises) |
| OGRN / OGRNIP      | regex + KS                     | no                      | **yes** (KS off → FP rises) |
| PERSON (ФИО)       | Natasha NER                    | **yes** (skipped)       | **yes** (skipped)        |
| BANK_ACCOUNT       | regex                          | no                      | no                       |

**Bottom line:**
- `degraded`: ИНН/СНИЛС/паспорт remain reliable, names slip through.
- `emergency`: names slip through AND raw 10-/12-digit numbers can be
  false-positively flagged as INN (no checksum to disambiguate). Decide
  in your runbook whether to (a) reject requests in `emergency`, (b) warn
  the user, or (c) accept the FP cost. The default behaviour is to mask
  and let the user decide.

The Gateway/Studio integration can read `degraded_mode` from the
`/anonymize` response and refuse to forward to the LLM provider in
`emergency` mode — that's a policy choice on the caller side, not the
sidecar's. The sidecar always returns the best masking it can.
