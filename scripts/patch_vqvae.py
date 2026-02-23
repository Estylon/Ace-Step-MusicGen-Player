"""Patch vector_quantize_pytorch for transformers 5.x meta-tensor compatibility.

Transformers 5.x always initialises models on the 'meta' device before loading
weights.  vector_quantize_pytorch calls .item() / .all() on tensors inside
__init__, which crashes on meta tensors.  This script patches two files inside
the installed package to add `is_meta` guards so __init__ completes successfully.

Safe to run multiple times — skips files that are already patched.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path


def _find_package_dir() -> Path:
    """Locate the installed vector_quantize_pytorch directory."""
    # Try importlib first (works even if not on sys.path yet)
    try:
        spec = importlib.util.find_spec("vector_quantize_pytorch")
        if spec and spec.submodule_search_locations:
            return Path(list(spec.submodule_search_locations)[0])
    except Exception:
        pass

    # Fallback: scan site-packages in the current venv
    for p in sys.path:
        candidate = Path(p) / "vector_quantize_pytorch"
        if candidate.is_dir() and (candidate / "__init__.py").exists():
            return candidate

    raise FileNotFoundError(
        "Could not find vector_quantize_pytorch in the current environment. "
        "Make sure it's installed first."
    )


# ---------------------------------------------------------------------------
# Patch 1: residual_fsq.py
#   Guard the `assert (levels_tensor > 1).all()` line
# ---------------------------------------------------------------------------

RESIDUAL_OLD = """\
        levels_tensor = tensor(levels)
        assert (levels_tensor > 1).all()"""

RESIDUAL_NEW = """\
        levels_tensor = tensor(levels)
        if not levels_tensor.is_meta:
            assert (levels_tensor > 1).all()"""


# ---------------------------------------------------------------------------
# Patch 2: finite_scalar_quantization.py
#   Guard the `self._levels.prod().item()` and implicit_codebook creation
# ---------------------------------------------------------------------------

FSQ_OLD = """\
        if return_indices:
            self.codebook_size = self._levels.prod().item()
            implicit_codebook = self._indices_to_codes(torch.arange(self.codebook_size))
            self.register_buffer('implicit_codebook', implicit_codebook, persistent = False)"""

FSQ_NEW = """\
        if return_indices:
            if self._levels.is_meta:
                self.codebook_size = 0  # placeholder — will be set when weights are loaded
            else:
                self.codebook_size = self._levels.prod().item()
                implicit_codebook = self._indices_to_codes(torch.arange(self.codebook_size))
                self.register_buffer('implicit_codebook', implicit_codebook, persistent = False)"""


def _apply_patch(filepath: Path, old: str, new: str, label: str) -> bool:
    """Replace *old* with *new* in *filepath*.  Returns True if patched."""
    text = filepath.read_text(encoding="utf-8")

    if new in text:
        print(f"  [SKIP] {label} — already patched")
        return False

    if old not in text:
        print(f"  [WARN] {label} — expected code block not found, skipping")
        print(f"         File: {filepath}")
        return False

    text = text.replace(old, new, 1)
    filepath.write_text(text, encoding="utf-8")
    print(f"  [OK]   {label} — patched successfully")
    return True


def main() -> None:
    print("[patch_vqvae] Patching vector_quantize_pytorch for transformers 5.x compatibility...")

    try:
        pkg_dir = _find_package_dir()
    except FileNotFoundError as e:
        print(f"  [SKIP] {e}")
        return

    print(f"  Package dir: {pkg_dir}")

    count = 0
    count += _apply_patch(
        pkg_dir / "residual_fsq.py",
        RESIDUAL_OLD,
        RESIDUAL_NEW,
        "residual_fsq.py — meta tensor guard on assert",
    )
    count += _apply_patch(
        pkg_dir / "finite_scalar_quantization.py",
        FSQ_OLD,
        FSQ_NEW,
        "finite_scalar_quantization.py — meta tensor guard on .item()",
    )

    if count:
        print(f"[patch_vqvae] Done — {count} file(s) patched.")
    else:
        print("[patch_vqvae] Done — no changes needed.")


if __name__ == "__main__":
    main()
