"""In-memory rate limit for form-correction (one success per client per interval)."""

from __future__ import annotations

import time
from threading import Lock

_lock = Lock()
# monotonic timestamp of last successful annotation per key
_last_success_mono: dict[str, float] = {}
# request currently running for key (blocks concurrent duplicate HTTP requests)
_in_flight: dict[str, bool] = {}

FORM_CORRECTION_MIN_INTERVAL_SEC = 30.0


def form_correction_seconds_until_allowed(client_key: str) -> float:
    """Seconds to wait before another successful annotation is allowed (0 = allowed now)."""
    with _lock:
        now = time.monotonic()
        last = _last_success_mono.get(client_key)
        if last is None:
            return 0.0
        elapsed = now - last
        if elapsed >= FORM_CORRECTION_MIN_INTERVAL_SEC:
            return 0.0
        return FORM_CORRECTION_MIN_INTERVAL_SEC - elapsed


def form_correction_try_acquire(client_key: str) -> tuple[bool, float, str | None]:
    """
    Try to start one annotation for this client.

    Returns (ok, seconds_wait, reason_if_not_ok).
    reason: 'rate_limited' | 'in_flight' | None when ok.
    """
    with _lock:
        now = time.monotonic()
        last = _last_success_mono.get(client_key)
        if last is not None and (now - last) < FORM_CORRECTION_MIN_INTERVAL_SEC:
            wait = FORM_CORRECTION_MIN_INTERVAL_SEC - (now - last)
            return False, max(0.0, wait), "rate_limited"
        if _in_flight.get(client_key):
            return False, 0.0, "in_flight"
        _in_flight[client_key] = True
        return True, 0.0, None


def form_correction_release_in_flight(client_key: str) -> None:
    with _lock:
        _in_flight.pop(client_key, None)


def form_correction_record_success(client_key: str) -> None:
    with _lock:
        _in_flight.pop(client_key, None)
        _last_success_mono[client_key] = time.monotonic()
