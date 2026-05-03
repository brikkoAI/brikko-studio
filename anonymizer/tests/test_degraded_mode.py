"""Tests for the CPU/RAM-driven degraded-mode state machine."""
from __future__ import annotations

from brikko_anonymizer import degraded_mode as dm


def test_initial_mode_is_full():
    assert dm.DegradedWatcher(probe=lambda: (10.0, 20.0)).current() == "full"


def test_degraded_when_cpu_high():
    """CPU >80% sustained (degraded_after_s=0 collapses sustain window) -> degraded."""
    w = dm.DegradedWatcher(
        probe=lambda: (85.0, 30.0),
        poll_interval_s=0,
        degraded_after_s=0,
        emergency_after_s=999,
        recover_after_s=60,
    )
    for _ in range(3):
        w.tick()
    assert w.current() == "degraded"


def test_emergency_when_ram_critical():
    """RAM >=95% with both timers=0 -> emergency on first tick."""
    w = dm.DegradedWatcher(
        probe=lambda: (20.0, 96.0),
        poll_interval_s=0,
        degraded_after_s=0,
        emergency_after_s=0,
        recover_after_s=60,
    )
    for _ in range(3):
        w.tick()
    assert w.current() == "emergency"


def test_recover_to_full_after_load_drops():
    """emergency -> full once load is sustained below 80% for recover_after_s."""
    states = iter([(95.0, 90.0)] * 5 + [(10.0, 10.0)] * 50)
    w = dm.DegradedWatcher(
        probe=lambda: next(states),
        poll_interval_s=0,
        degraded_after_s=0,
        emergency_after_s=0,
        recover_after_s=0,
    )
    for _ in range(5):
        w.tick()
    assert w.current() == "emergency"
    for _ in range(50):
        w.tick()
    assert w.current() == "full"
