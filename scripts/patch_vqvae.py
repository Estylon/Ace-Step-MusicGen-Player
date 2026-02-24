"""Patch vector_quantize_pytorch for transformers 5.x meta-tensor compatibility.

Transformers 5.x always initialises models on the 'meta' device before loading
weights.  vector_quantize_pytorch registers non-persistent buffers (_levels,
_basis, scales, soft_clamp_input_value) that are computed from constructor args.
After loading, transformers replaces them with torch.empty_like() — losing their
values completely.  Additionally, computed attributes (codebook_size,
implicit_codebook) are never reconstructed.

This script patches two files inside the installed package:
  1. finite_scalar_quantization.py — save init levels, restore buffers + codebook
  2. residual_fsq.py — meta guard on assert, restore scales/clamp, lazy rebuild

Safe to run multiple times — skips files that are already patched.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path


def _find_package_dir() -> Path:
    """Locate the installed vector_quantize_pytorch directory."""
    try:
        spec = importlib.util.find_spec("vector_quantize_pytorch")
        if spec and spec.submodule_search_locations:
            return Path(list(spec.submodule_search_locations)[0])
    except Exception:
        pass

    for p in sys.path:
        candidate = Path(p) / "vector_quantize_pytorch"
        if candidate.is_dir() and (candidate / "__init__.py").exists():
            return candidate

    raise FileNotFoundError(
        "Could not find vector_quantize_pytorch in the current environment. "
        "Make sure it's installed first."
    )


# ═══════════════════════════════════════════════════════════════════════════
# finite_scalar_quantization.py patches
# ═══════════════════════════════════════════════════════════════════════════

# Patch FSQ-1: Save original levels for post-meta reconstruction
FSQ_SAVE_OLD = """\
        if isinstance(levels, tuple):
            levels = list(levels)

        _levels = tensor(levels, dtype = int32)
        self.register_buffer('_levels', _levels, persistent = False)

        _basis = torch.cumprod(tensor([1] + levels[:-1]), dim = 0, dtype = int32)
        self.register_buffer('_basis', _basis, persistent = False)"""

FSQ_SAVE_NEW = """\
        if isinstance(levels, tuple):
            levels = list(levels)

        # Save original levels for post-meta-device reconstruction.
        # Non-persistent buffers get replaced with torch.empty_like() by
        # transformers 5.x after loading from meta device, losing their values.
        self._init_levels = list(levels)

        _levels = tensor(levels, dtype = int32)
        self.register_buffer('_levels', _levels, persistent = False)

        _basis = torch.cumprod(tensor([1] + levels[:-1]), dim = 0, dtype = int32)
        self.register_buffer('_basis', _basis, persistent = False)"""

# Patch FSQ-2: Meta guard on .item() in __init__
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

# Patch FSQ-3: Add _rebuild_codebook_if_needed method (with buffer restoration)
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
        \"\"\"Reconstruct non-persistent buffers and codebook after meta→real transition.

        Transformers 5.x initialises all modules on the 'meta' device.  During
        __init__ we cannot call .item() on meta tensors, so we defer codebook
        construction.  After loading, non-persistent buffers (_levels, _basis)
        are replaced with torch.empty_like() — losing their values.  This method
        restores them from self._init_levels and rebuilds the codebook.
        \"\"\"
        if not self.return_indices:
            return
        if self.codebook_size != 0:
            return  # already built
        if self._levels.is_meta:
            return  # still on meta device, nothing to do yet

        # Restore _levels and _basis from saved init values (non-persistent
        # buffers get garbage values from torch.empty_like after meta→real)
        device = self._levels.device
        correct_levels = tensor(self._init_levels, dtype=int32, device=device)
        self._levels.copy_(correct_levels)
        correct_basis = torch.cumprod(tensor([1] + self._init_levels[:-1], device=device), dim=0, dtype=int32)
        self._basis.copy_(correct_basis)

        # Now rebuild codebook
        self.codebook_size = self._levels.prod().item()
        implicit_codebook = self._indices_to_codes(torch.arange(self.codebook_size, device=device))
        self.register_buffer('implicit_codebook', implicit_codebook, persistent = False)

    def bound(self, z, eps = 1e-3, hard_clamp = False):"""

# Patch FSQ-4: Add rebuild call to forward()
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

# Patch FSQ-5: Add rebuild to indices_to_codes()
FSQ_I2C_OLD = """\
    def indices_to_codes(self, indices):
        \"\"\" Inverse of `codes_to_indices`. \"\"\"
        assert exists(indices)"""

FSQ_I2C_NEW = """\
    def indices_to_codes(self, indices):
        \"\"\" Inverse of `codes_to_indices`. \"\"\"
        self._rebuild_codebook_if_needed()
        assert exists(indices)"""


# ═══════════════════════════════════════════════════════════════════════════
# residual_fsq.py patches
# ═══════════════════════════════════════════════════════════════════════════

# Patch RFSQ-1: Meta guard on assert
RFSQ_ASSERT_OLD = """\
        levels_tensor = tensor(levels)
        assert (levels_tensor > 1).all()"""

RFSQ_ASSERT_NEW = """\
        levels_tensor = tensor(levels)
        if not levels_tensor.is_meta:
            assert (levels_tensor > 1).all()"""

# Patch RFSQ-2: Replace codebooks property with rebuild + restore
RFSQ_CODEBOOKS_OLD = """\
    @property
    def codebooks(self):
        codebooks = [layer.implicit_codebook for layer in self.layers]
        codebooks = torch.stack(codebooks, dim = 0)
        return codebooks"""

RFSQ_CODEBOOKS_NEW = """\
    def _rebuild_codebooks_if_needed(self):
        \"\"\"Restore all non-persistent buffers and rebuild codebooks after meta→real.

        Transformers 5.x replaces non-persistent buffers with torch.empty_like()
        after loading from meta device — losing their computed values.  This method
        restores ``scales``, ``soft_clamp_input_value``, and triggers FSQ-level
        buffer restoration + codebook rebuild.
        \"\"\"
        if self.codebook_size != 0:
            return  # already rebuilt

        # Check if we're still on meta device
        if self.scales.is_meta:
            return

        # Restore scales buffer from self.levels (Python list, always correct)
        device = self.scales.device
        levels_tensor = tensor(self.levels, device=device).float()
        correct_scales = []
        for ind in range(self.num_quantizers):
            correct_scales.append(levels_tensor ** -ind)
        self.scales.copy_(torch.stack(correct_scales))

        # Restore soft_clamp_input_value if it exists
        if exists(self.soft_clamp_input_value) and not self.soft_clamp_input_value.is_meta:
            correct_clamp = 1 + (1 / (levels_tensor - 1))
            self.soft_clamp_input_value.copy_(correct_clamp)

        # Trigger FSQ-level buffer restoration + codebook rebuild
        for layer in self.layers:
            layer._rebuild_codebook_if_needed()
        if len(self.layers) > 0:
            self.codebook_size = self.layers[0].codebook_size

    @property
    def codebooks(self):
        self._rebuild_codebooks_if_needed()
        codebooks = [layer.implicit_codebook for layer in self.layers]
        codebooks = torch.stack(codebooks, dim = 0)
        return codebooks"""

# Patch RFSQ-3: Add rebuild call to forward()
RFSQ_FORWARD_OLD = """\
    def forward(
        self,
        x,
        return_all_codes = False,
        rand_quantize_dropout_fixed_seed = None
    ):
        num_quant, quant_dropout_multiple_of, device = self.num_quantizers, self.quantize_dropout_multiple_of, x.device"""

RFSQ_FORWARD_NEW = """\
    def forward(
        self,
        x,
        return_all_codes = False,
        rand_quantize_dropout_fixed_seed = None
    ):
        self._rebuild_codebooks_if_needed()
        num_quant, quant_dropout_multiple_of, device = self.num_quantizers, self.quantize_dropout_multiple_of, x.device"""


# ═══════════════════════════════════════════════════════════════════════════
# Application logic
# ═══════════════════════════════════════════════════════════════════════════

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

    # ── finite_scalar_quantization.py patches ──
    fsq = pkg_dir / "finite_scalar_quantization.py"
    count += _apply_patch(fsq, FSQ_SAVE_OLD, FSQ_SAVE_NEW,
                          "FSQ — save _init_levels for reconstruction")
    count += _apply_patch(fsq, FSQ_INIT_OLD, FSQ_INIT_NEW,
                          "FSQ — meta tensor guard on .item() in __init__")
    count += _apply_patch(fsq, FSQ_REBUILD_OLD, FSQ_REBUILD_NEW,
                          "FSQ — _rebuild_codebook_if_needed with buffer restoration")
    count += _apply_patch(fsq, FSQ_FORWARD_OLD, FSQ_FORWARD_NEW,
                          "FSQ — rebuild call in forward()")
    count += _apply_patch(fsq, FSQ_I2C_OLD, FSQ_I2C_NEW,
                          "FSQ — rebuild call in indices_to_codes()")

    # ── residual_fsq.py patches ──
    rf = pkg_dir / "residual_fsq.py"
    count += _apply_patch(rf, RFSQ_ASSERT_OLD, RFSQ_ASSERT_NEW,
                          "ResidualFSQ — meta tensor guard on assert")
    count += _apply_patch(rf, RFSQ_CODEBOOKS_OLD, RFSQ_CODEBOOKS_NEW,
                          "ResidualFSQ — _rebuild with scales/clamp restoration")
    count += _apply_patch(rf, RFSQ_FORWARD_OLD, RFSQ_FORWARD_NEW,
                          "ResidualFSQ — rebuild call in forward()")

    if count:
        print(f"[patch_vqvae] Done — {count} patch(es) applied.")
    else:
        print("[patch_vqvae] Done — no changes needed (all patches already applied).")


if __name__ == "__main__":
    main()
