"""Patch vector_quantize_pytorch for transformers 5.x meta-tensor compatibility.

Transformers 5.x always initialises models on the 'meta' device before loading
weights.  vector_quantize_pytorch calls .item() / .all() on tensors inside
__init__, which crashes on meta tensors.  Additionally, computed attributes like
codebook_size and implicit_codebook are never reconstructed after the meta→real
device transition, leading to silent/zero audio output.

This script patches two files inside the installed package:
  1. residual_fsq.py   — meta guard on assert + lazy codebook rebuild
  2. finite_scalar_quantization.py — meta guard on .item() + lazy rebuild method

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
# Patch 1a: residual_fsq.py — guard the assert on meta tensors
# ---------------------------------------------------------------------------

RESIDUAL_ASSERT_OLD = """\
        levels_tensor = tensor(levels)
        assert (levels_tensor > 1).all()"""

RESIDUAL_ASSERT_NEW = """\
        levels_tensor = tensor(levels)
        if not levels_tensor.is_meta:
            assert (levels_tensor > 1).all()"""


# ---------------------------------------------------------------------------
# Patch 1b: residual_fsq.py — add lazy codebook rebuild to codebooks property
# ---------------------------------------------------------------------------

RESIDUAL_CODEBOOKS_OLD = """\
    @property
    def codebooks(self):
        codebooks = [layer.implicit_codebook for layer in self.layers]
        codebooks = torch.stack(codebooks, dim = 0)
        return codebooks"""

RESIDUAL_CODEBOOKS_NEW = """\
    def _rebuild_codebooks_if_needed(self):
        \"\"\"Trigger lazy codebook rebuild on all FSQ layers after meta→real.\"\"\"
        for layer in self.layers:
            layer._rebuild_codebook_if_needed()
        if self.codebook_size == 0 and len(self.layers) > 0:
            self.codebook_size = self.layers[0].codebook_size

    @property
    def codebooks(self):
        self._rebuild_codebooks_if_needed()
        codebooks = [layer.implicit_codebook for layer in self.layers]
        codebooks = torch.stack(codebooks, dim = 0)
        return codebooks"""


# ---------------------------------------------------------------------------
# Patch 1c: residual_fsq.py — add rebuild call to forward()
# ---------------------------------------------------------------------------

RESIDUAL_FORWARD_OLD = """\
    def forward(
        self,
        x,
        return_all_codes = False,
        rand_quantize_dropout_fixed_seed = None
    ):
        num_quant, quant_dropout_multiple_of, device = self.num_quantizers, self.quantize_dropout_multiple_of, x.device"""

RESIDUAL_FORWARD_NEW = """\
    def forward(
        self,
        x,
        return_all_codes = False,
        rand_quantize_dropout_fixed_seed = None
    ):
        self._rebuild_codebooks_if_needed()
        num_quant, quant_dropout_multiple_of, device = self.num_quantizers, self.quantize_dropout_multiple_of, x.device"""


# ---------------------------------------------------------------------------
# Patch 2a: finite_scalar_quantization.py — meta guard on .item()
# ---------------------------------------------------------------------------

FSQ_INIT_OLD = """\
        if return_indices:
            self.codebook_size = self._levels.prod().item()
            implicit_codebook = self._indices_to_codes(torch.arange(self.codebook_size))
            self.register_buffer('implicit_codebook', implicit_codebook, persistent = False)"""

FSQ_INIT_NEW = """\
        if return_indices:
            if self._levels.is_meta:
                self.codebook_size = 0  # placeholder — will be set when weights are loaded
            else:
                self.codebook_size = self._levels.prod().item()
                implicit_codebook = self._indices_to_codes(torch.arange(self.codebook_size))
                self.register_buffer('implicit_codebook', implicit_codebook, persistent = False)"""


# ---------------------------------------------------------------------------
# Patch 2b: finite_scalar_quantization.py — add _rebuild_codebook_if_needed
# ---------------------------------------------------------------------------

FSQ_REBUILD_OLD = """\
        self.allowed_dtypes = allowed_dtypes
        self.force_quantization_f32 = force_quantization_f32

        # allow for a hard clamp

        self.bound_hard_clamp = bound_hard_clamp

    def bound(self, z, eps = 1e-3, hard_clamp = False):"""

FSQ_REBUILD_NEW = """\
        self.allowed_dtypes = allowed_dtypes
        self.force_quantization_f32 = force_quantization_f32

        # allow for a hard clamp

        self.bound_hard_clamp = bound_hard_clamp

    def _rebuild_codebook_if_needed(self):
        \"\"\"Reconstruct codebook_size and implicit_codebook after meta→real transition.

        Transformers 5.x initialises all modules on the 'meta' device.  During
        __init__ we cannot call .item() on meta tensors, so we defer codebook
        construction.  This method is called lazily from forward() and
        indices_to_codes() to rebuild once _levels is on a real device.
        \"\"\"
        if not self.return_indices:
            return
        if self.codebook_size != 0:
            return  # already built
        if self._levels.is_meta:
            return  # still on meta device, nothing to do yet
        # _levels is now real — rebuild
        self.codebook_size = self._levels.prod().item()
        implicit_codebook = self._indices_to_codes(torch.arange(self.codebook_size, device=self._levels.device))
        self.register_buffer('implicit_codebook', implicit_codebook, persistent = False)

    def bound(self, z, eps = 1e-3, hard_clamp = False):"""


# ---------------------------------------------------------------------------
# Patch 2c: finite_scalar_quantization.py — add rebuild call to forward()
# ---------------------------------------------------------------------------

FSQ_FORWARD_OLD = """\
    def forward(self, z):
        \"\"\"
        einstein notation
        b - batch
        n - sequence (or flattened spatial dimensions)
        d - feature dimension
        c - number of codebook dim
        \"\"\"

        is_img_or_video = z.ndim >= 4"""

FSQ_FORWARD_NEW = """\
    def forward(self, z):
        \"\"\"
        einstein notation
        b - batch
        n - sequence (or flattened spatial dimensions)
        d - feature dimension
        c - number of codebook dim
        \"\"\"
        self._rebuild_codebook_if_needed()

        is_img_or_video = z.ndim >= 4"""


# ---------------------------------------------------------------------------
# Patch 2d: finite_scalar_quantization.py — add rebuild to indices_to_codes()
# ---------------------------------------------------------------------------

FSQ_I2C_OLD = """\
    def indices_to_codes(self, indices):
        \"\"\" Inverse of `codes_to_indices`. \"\"\"
        assert exists(indices)"""

FSQ_I2C_NEW = """\
    def indices_to_codes(self, indices):
        \"\"\" Inverse of `codes_to_indices`. \"\"\"
        self._rebuild_codebook_if_needed()
        assert exists(indices)"""


# ---------------------------------------------------------------------------
# Application logic
# ---------------------------------------------------------------------------

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

    # ── residual_fsq.py patches ──
    rf = pkg_dir / "residual_fsq.py"
    count += _apply_patch(rf, RESIDUAL_ASSERT_OLD, RESIDUAL_ASSERT_NEW,
                          "residual_fsq.py — meta tensor guard on assert")
    count += _apply_patch(rf, RESIDUAL_CODEBOOKS_OLD, RESIDUAL_CODEBOOKS_NEW,
                          "residual_fsq.py — lazy codebook rebuild in codebooks property")
    count += _apply_patch(rf, RESIDUAL_FORWARD_OLD, RESIDUAL_FORWARD_NEW,
                          "residual_fsq.py — rebuild call in forward()")

    # ── finite_scalar_quantization.py patches ──
    fsq = pkg_dir / "finite_scalar_quantization.py"
    count += _apply_patch(fsq, FSQ_INIT_OLD, FSQ_INIT_NEW,
                          "FSQ — meta tensor guard on .item() in __init__")
    count += _apply_patch(fsq, FSQ_REBUILD_OLD, FSQ_REBUILD_NEW,
                          "FSQ — _rebuild_codebook_if_needed method")
    count += _apply_patch(fsq, FSQ_FORWARD_OLD, FSQ_FORWARD_NEW,
                          "FSQ — rebuild call in forward()")
    count += _apply_patch(fsq, FSQ_I2C_OLD, FSQ_I2C_NEW,
                          "FSQ — rebuild call in indices_to_codes()")

    if count:
        print(f"[patch_vqvae] Done — {count} patch(es) applied.")
    else:
        print("[patch_vqvae] Done — no changes needed (all patches already applied).")


if __name__ == "__main__":
    main()
