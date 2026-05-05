# 152-ФЗ — operator checklist (Brikko Studio M2)

Brikko Studio is a software tool. The user (operator) of the tool is the data
subject's controller under 152-ФЗ. This checklist helps an operator demonstrate
compliance.

> **Disclaimer.** This document is engineering guidance, not a legal opinion.
> Russian operators must verify the current 152-ФЗ text and Roskomnadzor
> guidance with counsel — both the law and Roskomnadzor's interpretive notes
> evolve.

## What Brikko Studio gives you out of the box

- ✅ **Local-only PII storage**: real PII never leaves the operator's machine —
  only placeholders go to LLMs. Implementation: M1 anonymizer sidecar + M2
  privacy-plugin pre_user_message hook.
- ✅ **AES-256-GCM encryption** of mappings. Per-workspace key in OS keychain
  (Linux Secret Service / macOS Keychain / Windows Credential Manager) with an
  Argon2id-encrypted file fallback for headless deployments
  (`BRIKKO_KEY_FALLBACK=1` + `BRIKKO_KEY_PASSPHRASE`).
- ✅ **Audit log** of every anonymize / restore / tool-call / memory-write event
  with `request_id` correlation. Stored at `~/.brikko/audit/YYYY-MM-DD.jsonl`.
- ✅ **Right-to-be-forgotten support**: `Privacy → Очистить все маппинги`
  (multi-step purge UI) deletes all mappings; per-subject purge via CLI:
  `brikko privacy purge --subject-hash=<sha256_of_normalised_name>`.
- ✅ **Policy profiles** (strict / balanced / permissive) configurable per
  workspace. Strict denies pass-through for any unrecognised category.
- ✅ **Three-touch disclaimer** acknowledged in onboarding step 6, persisted to
  `~/.brikko/disclaimer.json`. Version-bumped disclaimers re-prompt on next
  boot.
- ✅ **Tool policies** with deny-by-default for unknown MCP servers
  (`/etc/brikko/tool-policies.yaml`). Untrusted servers receive deanonymized
  arguments; trusted servers can bypass deanonymization on a per-arg basis.

## What the operator must do

- [ ] Register as a personal-data operator with Roskomnadzor (152-ФЗ §22),
      unless an exemption applies (e.g. processing only your own employees'
      labour data — §22 ч.2).
- [ ] Publish a Privacy Policy on your website that lists Brikko Studio as a
      processing tool.
- [ ] Obtain consent from data subjects (employees, clients) for the relevant
      processing purposes — including the fact that placeholder-only data is
      transmitted to a third-party LLM provider.
- [ ] Set retention period for the audit log (`BRIKKO_AUDIT_RETENTION_DAYS`,
      default 90 days). Configure `BRIKKO_AUDIT_AUTO_PURGE=1` to enforce
      automatic deletion.
- [ ] Make periodic backups of `~/.brikko/mappings.db` (or use
      `Settings → Workspace → Скачать резервную копию`). Store backups
      encrypted at rest.
- [ ] Restrict OS-level access to the machine running Brikko Studio (full-disk
      encryption + OS login + screen lock).
- [ ] If using **Brikko Gateway** as the LLM transport: review the Brikko
      Gateway processor agreement (УПД signed during account setup at
      brikko.ru). The Gateway acts as your processor; you remain controller.
- [ ] If using **BYO API keys** (OpenAI / Anthropic / Yandex / GigaChat):
      obtain or sign their respective DPA (data processing addendum). For
      OpenAI/Anthropic this means a cross-border transfer notification under
      152-ФЗ §12.

## Records to keep

- Audit log JSONL files (`~/.brikko/audit/YYYY-MM-DD.jsonl[.gz]`) for at least
  the legally required retention period (default 5 years for HR data, 3 years
  for general business — consult counsel for your sector).
- Policy YAML at `/etc/brikko/policy.yaml` — version-controlled in your
  operations repo so you can prove which profile was active on a given date.
- Tool policies YAML at `/etc/brikko/tool-policies.yaml` — same.
- Disclaimer ack file `~/.brikko/disclaimer.json` (proves the operator
  acknowledged the privacy boundaries on a given date).

## Subject access requests

- "What data do you have on me?" — query
  `brikko privacy query --subject-hash=<sha256_of_normalised_name>` to
  enumerate mappings linked to a subject. Run inside the anonymizer container:
  `docker compose exec anonymizer brikko privacy query --subject-hash=<h>`.
- "Delete my data." — `brikko privacy purge --subject-hash=<h>`. The audit log
  retains the deletion event itself (purge cannot be retroactive without
  destroying the operator's compliance trail).

## Feature → 152-ФЗ obligation mapping

| 152-ФЗ obligation                          | Brikko Studio mechanism                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| §6 — lawful basis tracked                  | Operator's privacy policy + consent records (out of Studio scope)      |
| §7 — confidentiality of personal data      | AES-256-GCM mapping store + OS keychain + non-loopback bind disabled   |
| §9 — informed consent                      | Three-touch disclaimer in onboarding step 6                            |
| §14 — subject access right                 | `brikko privacy query` CLI                                             |
| §14 — right to deletion                    | `Privacy → Purge` UI + `brikko privacy purge --subject-hash=<h>` CLI   |
| §18.1 — processing notification            | Audit log JSONL records every operation with `subject_hash` + category |
| §19 — security of processing               | AES-256-GCM at rest + TLS to Gateway + local-loopback anonymizer port  |
| §22 — operator registration                | Operator action — Roskomnadzor portal                                  |
| §22.1 — DPO designation                    | Operator action — internal organisational measure                      |
| §18.5 — incident notification (24 h / 72 h)| Audit log + Studio support runbook (out of Studio scope)               |

## Out of scope for M2

- ФСТЭК certification (separate compliance track — Brikko Enterprise Edition).
- Centralised audit aggregation across multiple operator workstations
  (Enterprise Edition).
- HSM/KMS-backed key custody (Enterprise Edition).
- Automated subject-access-request fulfilment with operator approval workflow
  (M3 candidate).

## References

- 152-ФЗ "О персональных данных" — current consolidated text on
  [pravo.gov.ru](http://pravo.gov.ru/proxy/ips/?docbody=&nd=102083704).
- Roskomnadzor operator registry —
  [pd.rkn.gov.ru](https://pd.rkn.gov.ru/operators-registry/).
- M1 anonymizer cryptography choices: see
  `anonymizer/docs/crypto-design.md`.
- M2 plugin architecture: see `docs/plugin-architecture.md`.
