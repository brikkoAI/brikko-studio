"""Shared test fixtures for the FastAPI API tests (M1 tasks 12-15).

Why a conftest: the API tests all need the same isolation (tmp ``~/.brikko``,
in-memory keychain) plus a freshly-rebuilt ``app.state`` (pipeline + watcher
+ tool_policies) per test — otherwise test order leaks workspace mappings
across tests via the module-level ``app`` singleton.

The fixture is autouse but **gated on the test module name** — only the
``test_api_*.py`` files trigger the heavy setup. Other test modules
(``test_paths``, ``test_health``, etc.) bring their own monkeypatches and
must not have ours fight them.

The API-level fixture rebuilds ``app.state.pipeline`` per test so the
in-memory ``MappingStore`` cache inside the pipeline is empty between
tests — without that, ``test_purge_all_clears_mappings`` would see rows
from earlier tests.
"""
from __future__ import annotations

import secrets
from typing import Iterator

import pytest

from brikko_anonymizer import (
    degraded_mode,
    mapping_store,
    paths,
    pipeline as pipeline_mod,
    policy as policy_mod,
    workspace_key,
)
from brikko_anonymizer.main import app


@pytest.fixture(autouse=True)
def api_isolate(request, monkeypatch, tmp_path) -> Iterator[None]:
    """Per-test isolation: tmp BRIKKO_HOME + fake keychain + fresh app.state.

    Gated to test files whose module name starts with ``test_api_`` —
    everything else (paths, mapping_store, pipeline unit tests) carries its
    own isolation and would clash with ours.
    """
    module_name = request.node.module.__name__.rsplit(".", 1)[-1]
    if not module_name.startswith("test_api_"):
        yield
        return
    fake_root = tmp_path / ".brikko"
    monkeypatch.setattr(paths, "brikko_root", lambda: fake_root)

    # Fake keychain — same pattern as test_pipeline.py.
    keys: dict[str, bytes] = {}

    def _get(ws_id: str) -> bytes | None:
        return keys.get(ws_id)

    def _get_or_create(ws_id: str) -> bytes:
        if ws_id not in keys:
            keys[ws_id] = secrets.token_bytes(32)
        return keys[ws_id]

    monkeypatch.setattr(workspace_key, "get", _get)
    monkeypatch.setattr(workspace_key, "get_or_create", _get_or_create)
    monkeypatch.setattr(mapping_store, "_TEST_KEYS", keys, raising=False)

    # Build a fresh pipeline + fake watcher for this test and push to app.state.
    # We don't start the real DegradedWatcher thread (psutil polling adds
    # noise + slowness in unit tests). Instead a tiny stub exposes a
    # constant ``current()`` returning "full".
    class _StubWatcher:
        def current(self) -> str:
            return "full"

        def start(self) -> None:
            return None

        def stop(self) -> None:
            return None

    watcher = _StubWatcher()
    tool_policies = policy_mod.ToolPolicies.load(
        paths.brikko_root().parent / "this_path_does_not_exist.yaml"
    ) if False else _load_default_tool_policies()
    pipe = pipeline_mod.Pipeline(
        degraded_mode_provider=watcher.current,
        tool_policies=tool_policies,
    )
    app.state.watcher = watcher
    app.state.pipeline = pipe
    app.state.tool_policies = tool_policies

    try:
        yield
    finally:
        pipe.close()
        # Defensive: clear app.state so a missed teardown can't leak across.
        for attr in ("watcher", "pipeline", "tool_policies"):
            if hasattr(app.state, attr):
                delattr(app.state, attr)


def _load_default_tool_policies() -> policy_mod.ToolPolicies:
    """Load the bundled ``default_tool_policies.yaml`` for tests.

    Same path resolution as the production lifespan in ``main.py`` so the
    same policies (forbid third_party_ai.send, deanonymize bitrix24.*) apply.
    """
    from pathlib import Path

    bundled = Path(policy_mod.__file__).parent / "default_tool_policies.yaml"
    if bundled.exists():
        return policy_mod.ToolPolicies.load(bundled)
    return policy_mod.ToolPolicies.default()
