"""Exception hierarchy for Brikko Anonymizer.

All anonymizer-raised exceptions inherit from :class:`BrikkoAnonymizerError`
so callers can catch the whole family with a single ``except``.
"""
from __future__ import annotations


class BrikkoAnonymizerError(Exception):
    """Base for every exception raised by the anonymizer package."""


class KeyringUnavailableError(BrikkoAnonymizerError):
    """OS keychain is not reachable AND fallback is not enabled."""


class WorkspaceKeyMissingError(BrikkoAnonymizerError):
    """Workspace key cannot be read or decrypted (missing file, wrong passphrase)."""


class MappingDecryptError(BrikkoAnonymizerError):
    """SQLCipher mapping DB cannot be decrypted with the provided key."""


class TrustViolationError(BrikkoAnonymizerError):
    """Server attempted an action that violates the trust contract (e.g. de-anonymising)."""


class StreamProtocolError(BrikkoAnonymizerError):
    """SSE/streaming framing was malformed or violated the protocol."""
