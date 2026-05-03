"""CPU/RAM-driven degraded-mode state machine (M1 Task 9).

Background thread polls CPU + RAM via :mod:`psutil` every ``poll_interval_s``
seconds and feeds the readings into a three-state machine:

* ``full`` — normal operation. Regex + checksum + Natasha all run.
* ``degraded`` — CPU OR RAM > 80 % sustained for ``degraded_after_s``.
  The :class:`Pipeline` skips the (heavy) Natasha NER pass.
* ``emergency`` — CPU OR RAM > 95 % sustained for ``emergency_after_s``.
  The :class:`Pipeline` skips both Natasha and the checksum validators
  (regex-only, max false-positive rate but minimum CPU).

Recovery is **fail-open into ``full``** (not stepwise back through
``degraded``): once the load drops below 80 % for ``recover_after_s``
seconds, jump straight to ``full``. This is intentional — going
``emergency`` → ``degraded`` → ``full`` would oscillate around the 80 %
boundary and produce unstable masking quality. Spec §4.7.

The watcher accepts a synchronous ``probe`` callable so tests inject
deterministic ``(cpu_percent, ram_percent)`` tuples and set the sustain
timers to 0 to collapse the state machine to "react on next tick".
"""
from __future__ import annotations

import threading
import time
from typing import Callable, Literal, Optional

import psutil

Mode = Literal["full", "degraded", "emergency"]

#: CPU OR RAM percentage above which we enter ``degraded``.
DEGRADED_THRESHOLD = 80.0

#: CPU OR RAM percentage above which we enter ``emergency``.
EMERGENCY_THRESHOLD = 95.0


def _default_probe() -> tuple[float, float]:
    """Return ``(cpu_percent, ram_percent)`` from the host.

    ``cpu_percent(interval=0.0)`` returns the value computed since the last
    call without blocking — perfect for a poll loop that already sleeps
    between ticks.
    """
    return (psutil.cpu_percent(interval=0.0), psutil.virtual_memory().percent)


class DegradedWatcher:
    """Background-poll CPU/RAM and expose the current degraded mode."""

    def __init__(
        self,
        probe: Optional[Callable[[], tuple[float, float]]] = None,
        poll_interval_s: float = 5.0,
        degraded_after_s: float = 30.0,
        emergency_after_s: float = 10.0,
        recover_after_s: float = 60.0,
    ) -> None:
        self._probe = probe or _default_probe
        self._poll_interval_s = poll_interval_s
        self._t_deg = degraded_after_s
        self._t_em = emergency_after_s
        self._t_rec = recover_after_s

        self._mode: Mode = "full"
        # monotonic markers — None means "not currently in this state-attempt"
        self._above_em_since: Optional[float] = None
        self._above_deg_since: Optional[float] = None
        self._below_since: Optional[float] = None

        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    # ----------------------------------------------------------------- query

    def current(self) -> Mode:
        """Return the current mode (cheap, lock-protected)."""
        with self._lock:
            return self._mode

    # --------------------------------------------------------- single tick

    def tick(self) -> None:
        """Sample the probe once and advance the state machine.

        Called from :meth:`start`'s background thread, or directly from
        tests with deterministic probe + zeroed timers.
        """
        cpu, ram = self._probe()
        peak = max(cpu, ram)
        now = time.monotonic()

        with self._lock:
            if peak >= EMERGENCY_THRESHOLD:
                # Above emergency threshold — clear recovery, set both
                # sustain markers if not already running.
                if self._above_em_since is None:
                    self._above_em_since = now
                if self._above_deg_since is None:
                    self._above_deg_since = now
                self._below_since = None
                if now - self._above_em_since >= self._t_em:
                    self._mode = "emergency"
            elif peak >= DEGRADED_THRESHOLD:
                # In the [80, 95) band — clear emergency sustain (we're not
                # critical right now) but keep degraded sustain running.
                self._above_em_since = None
                if self._above_deg_since is None:
                    self._above_deg_since = now
                self._below_since = None
                if (
                    now - self._above_deg_since >= self._t_deg
                    and self._mode != "emergency"
                ):
                    # Don't downgrade from emergency mid-tick — recovery
                    # below 80 % is the only path back. Avoids oscillation
                    # in the 80-95 band while load is still elevated.
                    self._mode = "degraded"
            else:
                # Below degraded threshold — reset both elevated markers
                # and start the recovery timer.
                self._above_em_since = None
                self._above_deg_since = None
                if self._below_since is None:
                    self._below_since = now
                if now - self._below_since >= self._t_rec:
                    self._mode = "full"

    # ----------------------------------------------------------- lifecycle

    def start(self) -> None:
        """Spawn the background poll thread. Idempotent."""
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop.clear()
        t = threading.Thread(
            target=self._run, name="brikko-degraded", daemon=True
        )
        self._thread = t
        t.start()

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                self.tick()
            except Exception:
                # Probe failures must not crash the watcher; degraded mode
                # is a best-effort signal — Pipeline still works in "full".
                pass
            # wait() returns True if stop was set during the wait window.
            if self._stop.wait(self._poll_interval_s):
                return

    def stop(self) -> None:
        """Signal the thread to exit and join with a short timeout."""
        self._stop.set()
        t = self._thread
        if t is not None:
            t.join(timeout=2.0)
        self._thread = None


__all__ = [
    "DEGRADED_THRESHOLD",
    "EMERGENCY_THRESHOLD",
    "DegradedWatcher",
    "Mode",
]
