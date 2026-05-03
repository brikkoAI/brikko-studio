# Compliance — M0 scope statement

**M0 does NOT process user PII.** The Anonymizer container is a scaffold whose only endpoint is `/health` returning `{"pii_pipeline":"disabled"}`. Studio Core forwards no user content to anywhere — it only handles the OAuth handshake against api.brikko.ru.

Therefore in M0:
- No 152-ФЗ obligations apply to the Studio installation itself (no PII processing).
- The Brikko Gateway (api.brikko.ru) processes only OAuth metadata: account email, token timestamps. That data is governed by api.brikko.ru's Privacy Policy.
- M1 introduces the PII pipeline. The full 152-ФЗ checklist (per design spec §5.2.6) becomes relevant then. See `docs/compliance/152fz-checklist.md` (created in M1).

This file exists in M0 to make the scope statement explicit and to anchor the directory for future M1 docs.
