"""In-memory budget guard. Resets per process/instance.

Note: on Cloud Run with multiple instances, each instance has its own counter.
The hard guarantee is the GCP Billing Budget at the project level.
This guard catches runaway usage in a single instance early.
"""

from __future__ import annotations
import os
import threading
from dataclasses import dataclass


# Pricing in USD per 1M tokens. Configurable via env.
DEFAULT_PRICING: dict[str, dict[str, float]] = {
    "gemini-3-flash-preview": {"input": 0.10, "output": 0.40},
    "gemini-3-pro-preview":   {"input": 1.25, "output": 5.00},
    "gemini-3.1-pro-preview": {"input": 1.25, "output": 5.00},
    "gemini-2.5-pro":         {"input": 1.25, "output": 5.00},
    "gemini-2.5-flash":       {"input": 0.075, "output": 0.30},
}


@dataclass
class BudgetState:
    cap_usd: float = 100.0
    threshold_pct: float = 0.80          # refuse at 80% by default
    accumulated_input_tokens: int = 0
    accumulated_output_tokens: int = 0
    accumulated_usd: float = 0.0
    calls: int = 0


_state = BudgetState(
    cap_usd=float(os.environ.get("GEMINI_BUDGET_USD", "100")),
    threshold_pct=float(os.environ.get("GEMINI_BUDGET_THRESHOLD_PCT", "0.80")),
)
_lock = threading.Lock()


class BudgetExceeded(Exception):
    """Raised when the cumulative cost is at or above the threshold of the cap."""

    def __init__(self, *, accumulated_usd: float, cap_usd: float, threshold_pct: float):
        self.accumulated_usd = accumulated_usd
        self.cap_usd = cap_usd
        self.threshold_pct = threshold_pct
        msg = (
            f"Gemini model budget limit hit "
            f"(used ${accumulated_usd:.2f} of ${cap_usd:.2f} cap, "
            f"threshold {int(threshold_pct * 100)}% triggered)"
        )
        super().__init__(msg)


def _price_for(model: str) -> dict[str, float]:
    # Best-match: exact, then prefix.
    if model in DEFAULT_PRICING:
        return DEFAULT_PRICING[model]
    for k, v in DEFAULT_PRICING.items():
        if model.startswith(k.rsplit("-", 1)[0]):
            return v
    # Conservative default if unknown model
    return {"input": 0.50, "output": 2.00}


def check() -> None:
    """Raise BudgetExceeded if we're over the threshold."""
    with _lock:
        if _state.accumulated_usd >= _state.cap_usd * _state.threshold_pct:
            raise BudgetExceeded(
                accumulated_usd=_state.accumulated_usd,
                cap_usd=_state.cap_usd,
                threshold_pct=_state.threshold_pct,
            )


def record(*, model: str, input_tokens: int, output_tokens: int) -> dict:
    """Add a call's usage to the cumulative total. Returns updated state snapshot."""
    p = _price_for(model)
    cost = (input_tokens / 1_000_000) * p["input"] + (output_tokens / 1_000_000) * p["output"]
    with _lock:
        _state.accumulated_input_tokens += input_tokens
        _state.accumulated_output_tokens += output_tokens
        _state.accumulated_usd += cost
        _state.calls += 1
        return {
            "calls": _state.calls,
            "input_tokens": _state.accumulated_input_tokens,
            "output_tokens": _state.accumulated_output_tokens,
            "usd": round(_state.accumulated_usd, 4),
            "cap_usd": _state.cap_usd,
            "threshold_pct": _state.threshold_pct,
        }


def snapshot() -> dict:
    with _lock:
        return {
            "calls": _state.calls,
            "input_tokens": _state.accumulated_input_tokens,
            "output_tokens": _state.accumulated_output_tokens,
            "usd": round(_state.accumulated_usd, 4),
            "cap_usd": _state.cap_usd,
            "threshold_pct": _state.threshold_pct,
        }
