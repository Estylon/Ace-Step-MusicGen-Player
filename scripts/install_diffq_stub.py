"""
Install a stub 'diffq' package into the current environment's site-packages.

This is used when diffq-fixed cannot be compiled (Python 3.13+ / Windows
Cython issues).  The stub provides no-op replacements for DiffQuantizer,
UniformQuantizer, and restore_quantized_state — enough for Demucs inference
with non-quantized checkpoints (which is all audio-separator needs).
"""

import importlib
import site
import sys
from pathlib import Path

# ── Check if real diffq is already available ──────────────────────────
try:
    import diffq
    # Check if it's a real install (has bitpack) vs our stub
    spec = importlib.util.find_spec("diffq")
    if spec and spec.origin and "diffq.py" not in str(spec.origin):
        print("  diffq is already installed — skipping stub.")
        sys.exit(0)
except ImportError:
    pass

# ── Locate site-packages ─────────────────────────────────────────────
sp_dirs = site.getsitepackages()
if hasattr(sys, "real_prefix") or (hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix):
    # Inside a venv — use the venv's site-packages
    sp_dirs = [p for p in site.getsitepackages() if sys.prefix in p]

if not sp_dirs:
    print("  [ERROR] Could not determine site-packages directory.")
    sys.exit(1)

target = Path(sp_dirs[0]) / "diffq"
target.mkdir(parents=True, exist_ok=True)

# ── __init__.py ──────────────────────────────────────────────────────
init_py = target / "__init__.py"
init_py.write_text('''\
"""
Stub diffq package — provides no-op replacements for DiffQuantizer,
UniformQuantizer, and restore_quantized_state so that Demucs can be
imported on systems where diffq-fixed fails to compile (Python 3.13+ /
Windows Cython issues).

Quantization is only used for compressed model storage and training;
standard pretrained inference works fine with these stubs.
"""

from diffq.diffq import DiffQuantizer, UniformQuantizer, restore_quantized_state

__all__ = ["DiffQuantizer", "UniformQuantizer", "restore_quantized_state"]
''', encoding="utf-8")

# ── diffq.py (actual stub classes) ───────────────────────────────────
diffq_py = target / "diffq.py"
diffq_py.write_text('''\
"""
Stub implementations of diffq classes for inference-only use.

These provide the minimal interface that Demucs states.py, utils.py,
and pretrained.py expect, without the actual quantization logic
(which requires the native Cython extension bitpack.pyx).
"""

import torch


def restore_quantized_state(model, state):
    """
    Restore a quantized state dict into *model*.

    In the real diffq this unpacks bit-packed weights.  Here we attempt
    a best-effort ``load_state_dict`` so that non-quantized checkpoints
    still load.  If the state is genuinely bit-packed this will raise,
    which is the correct behaviour — the real diffq is needed for that.
    """
    if isinstance(state, dict) and "__quantized" not in state:
        model.load_state_dict(state, strict=False)
        return
    raise RuntimeError(
        "This checkpoint appears to use diffq quantization but the real "
        "diffq package is not installed (stub is active).  Install "
        "diffq-fixed or use a non-quantized checkpoint."
    )


class DiffQuantizer:
    """Stub DiffQuantizer — enough for Demucs model loading."""

    def __init__(self, model, min_size=0.01, group_size=8):
        self.model = model
        self.min_size = min_size
        self.group_size = group_size

    def setup_optimizer(self, optimizer):
        """No-op — optimizer hooks not needed for inference."""
        pass

    def get_quantized_state(self):
        """Return a plain state dict (no real quantization)."""
        state = self.model.state_dict()
        state["__quantized"] = True
        return state

    def restore_quantized_state(self, *args):
        """
        Attempt to restore state.  Accepts either (model, state) or
        (state,) to match the two call-sites in Demucs.
        """
        if len(args) == 2:
            model, state = args
        elif len(args) == 1:
            model, state = self.model, args[0]
        else:
            raise TypeError(f"Expected 1 or 2 arguments, got {len(args)}")

        if isinstance(state, dict):
            clean = {k: v for k, v in state.items() if k != "__quantized"}
            model.load_state_dict(clean, strict=False)
            return

        raise RuntimeError(
            "This checkpoint uses diffq quantization but the real diffq "
            "package is not installed (stub is active)."
        )

    def detach(self):
        """Release reference to model — no-op in stub."""
        self.model = None


class UniformQuantizer:
    """Stub UniformQuantizer — enough for Demucs QAT path."""

    def __init__(self, model, bits=8, min_size=0.01):
        self.model = model
        self.bits = bits
        self.min_size = min_size
''', encoding="utf-8")

print(f"  diffq stub installed to {target}")
