# Brikko Anonymizer — Storage & Key Management

**Version:** `0.2.0`

This document covers (1) where workspace state lives on disk, (2) where
the AES-256-GCM workspace keys live and how they get there, and (3) the
encrypted-backup blob format. Operators auditing for 152-ФЗ / GDPR
compliance should read all three sections.

---

## 1. Filesystem layout

The root path resolves from `$BRIKKO_HOME` if set, otherwise per-OS
defaults.

| Environment              | Default root                    |
|--------------------------|---------------------------------|
| Linux / macOS            | `~/.brikko/`                    |
| Windows                  | `%LOCALAPPDATA%\Brikko\`        |
| Official Docker image    | `/data/.brikko/` (mounted as named volume `brikko-state`) |

Tree:
```
$BRIKKO_HOME/
├── workspaces/
│   └── <workspace_id>/
│       ├── mappings.db          SQLite (encrypted ciphertext col)
│       ├── mappings.db-wal      SQLite WAL — see "Why WAL" below
│       ├── mappings.db-shm      SQLite shared-memory file
│       └── key.enc              ONLY when BRIKKO_KEY_FALLBACK=1
└── audit/
    ├── 2026-05-04.jsonl         today's events (uncompressed)
    ├── 2026-05-03.jsonl.gz      yesterday + older (gzipped on rotation)
    └── ...                      kept 90 days, then deleted
```

`mappings.db` schema (single table, three indexes):
```sql
CREATE TABLE mappings (
    placeholder  TEXT PRIMARY KEY,        -- e.g. "<NAME_1>"
    category     TEXT NOT NULL,           -- PERSON, INN, PHONE, ...
    session_id   TEXT NOT NULL,
    subject_hash TEXT NOT NULL,           -- HMAC-SHA256 prefix of original
    nonce        BLOB NOT NULL,           -- 12 B, fresh per row
    ciphertext   BLOB NOT NULL,           -- AES-256-GCM(original), AAD = placeholder
    created_at   TEXT NOT NULL            -- ISO-8601 UTC
);
CREATE INDEX idx_session  ON mappings(session_id);
CREATE INDEX idx_subject  ON mappings(subject_hash);
CREATE INDEX idx_category ON mappings(category);
```

**Why AAD = placeholder:** GCM tag-binds the ciphertext to its placeholder,
so a row cannot be transplanted under a different placeholder without the
tag rejecting on decrypt. Defence-in-depth against on-disk tampering.

**Why WAL + synchronous=FULL:** the SSE response stream needs to read while
the request handler writes. WAL gives lock-free readers; `synchronous=FULL`
keeps durability tight enough that we don't lose mappings on power loss
(a missing mapping = unrecoverable response = data loss for the user).

---

## 2. Key location matrix

Workspace AES-256 keys are 32 random bytes generated on first
`get_or_create(workspace_id)` and persisted via:

| Backend                         | When used                                                         | Module                       |
|---------------------------------|-------------------------------------------------------------------|------------------------------|
| OS keychain                     | Default. `BRIKKO_KEY_FALLBACK=0` (or unset).                      | `workspace_key.py`           |
| Argon2id-encrypted `key.enc`    | `BRIKKO_KEY_FALLBACK=1` AND `BRIKKO_KEY_PASSPHRASE` is set.       | `workspace_key_fallback.py`  |
| Decrypted-in-RAM-only           | After `MappingStore.__init__` succeeds. Cleared on process exit.  | `mapping_store.py`           |

**OS keychain backends** (chosen by the `keyring` lib at import time):
- Linux → freedesktop Secret Service (gnome-keyring, KWallet)
- macOS → Keychain Services
- Windows → Credential Manager

Service name: `brikko-anonymizer`. Username: the workspace_id.

**Fallback file format** (`key.enc`):
```
[16 B salt][12 B nonce][32 B ciphertext (= AES-GCM(key, AAD=workspace_id))][16 B tag]
```
The KEK derives from `BRIKKO_KEY_PASSPHRASE` via Argon2id (memory=64 MiB,
time=3, parallelism=1). If the passphrase env var is unset and the OS
keychain refuses, the sidecar returns `503 key_unavailable` — fail-closed
beats fail-open for a key store.

**Key never leaves the process boundary** in plaintext: not the
`/anonymize` response, not `/stats`, not the audit log, not `/backup`
(backup uses a separate Argon2id-derived key). Memory dump is the only
plaintext path — operators worried about that should run the sidecar in a
locked-down VM.

---

## 3. Backup blob format

Produced by `POST /workspaces/{ws_id}/backup`. The blob is one
self-contained file:

```
[16 B salt][12 B nonce][N B ciphertext][16 B GCM tag]
```

Decryption: derive a 32-byte key from `BRIKKO_KEY_PASSPHRASE` + salt via
Argon2id (same parameters as the fallback key file), then `AES-256-GCM`
decrypt. The plaintext is a ZIP containing:

- `mappings.db` — the workspace SQLite file (already AES-encrypted at the
  ciphertext column, but the backup adds a second layer keyed off the
  passphrase so a stolen backup is useless without it).
- `manifest.json` — `{"version": 1, "workspace_id": "...", "created_at":
  "...", "row_count": N, "anonymizer_version": "0.2.0"}`.

The restore CLI ships in **M3** — for now operators can decrypt manually
via the snippet in the M3 plan's "backup recovery" section.

---

## Privacy invariants

These three are tested as code, not vibes — links go to the test that
enforces each one.

| # | Invariant | Test |
|---|---|---|
| **P1** | Plaintext PII never leaves the sidecar process boundary except (a) in `/restore` responses to the calling client and (b) inside the restored `args` of an authorised `/tool_call/deanonymize`. | [`tests/test_pipeline.py`](../tests/test_pipeline.py) `test_anonymize_no_plaintext_in_audit` |
| **P2** | The mapping `placeholder → original` is never written to disk in plaintext. The on-disk column is AES-256-GCM ciphertext with the placeholder bound as AAD. | [`tests/test_mapping_store.py`](../tests/test_mapping_store.py) `test_ciphertext_not_plaintext_on_disk` |
| **P3** | Audit events contain placeholders and categories ONLY — never the original value, never the subject's name, never the digits of an INN. | [`tests/test_audit_log.py`](../tests/test_audit_log.py) `test_audit_event_contains_no_plaintext` |

Audit retention: today + 6 days uncompressed, then gzipped, then deleted
after 90 days total. Retention runs on boot and (M3) daily. Configure via
`BRIKKO_AUDIT_RETENTION_DAYS` (default 90).
