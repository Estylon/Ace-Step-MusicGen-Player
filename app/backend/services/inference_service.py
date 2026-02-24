"""Wraps ACE-Step inference engine (AceStepHandler + LLMHandler)."""

from __future__ import annotations

import json
import os
import re
import threading
import time
import traceback
from pathlib import Path
from typing import Any, Callable, Optional
from uuid import uuid4

import config
from models.schemas import (
    AdapterCurrent,
    AdapterInfo,
    GenerateRequest,
    GPUInfo,
    LMInfo,
    ModelCapabilities,
    ModelInfo,
    ModelStatusResponse,
    TrackInfo,
)
from services.audio_manager import compute_peaks, get_audio_url, get_audio_duration


# ── Post-load fix for transformers 5.x meta-device buffer corruption ─────
#
# Transformers 5.x creates models on the 'meta' device and then loads weights.
# Non-persistent buffers (registered with persistent=False) are NOT in the
# state_dict, so after loading they get replaced with torch.empty_like() —
# losing their computed values entirely.
#
# vector_quantize_pytorch's FSQ and ResidualFSQ have critical non-persistent
# buffers (_levels, _basis, scales, soft_clamp_input_value) that are computed
# from constructor args.  After the meta→real transition, these contain garbage.
#
# This function walks a loaded model and fixes all FSQ/ResidualFSQ instances.
# ──────────────────────────────────────────────────────────────────────────────

def _fix_fsq_buffers_after_load(model) -> int:
    """Fix corrupted non-persistent buffers in all FSQ/ResidualFSQ modules.

    Transformers 5.x creates models on the 'meta' device and then loads state_dict.
    Non-persistent buffers (persistent=False) are NOT in the state_dict, so after
    loading they get replaced with torch.empty_like() — containing garbage values.

    This function reads the correct levels from model.config and force-fixes all
    FSQ and ResidualFSQ instances. It does NOT rely on any venv patches.

    Returns the number of modules fixed.
    """
    import torch
    from torch import tensor, int32

    # Read the authoritative levels from model config
    config = getattr(model, "config", None)
    if config is None:
        print("  [FSQ FIX] WARNING: model has no config, cannot fix FSQ buffers")
        return 0

    config_levels = getattr(config, "fsq_input_levels", None)
    config_num_quantizers = getattr(config, "fsq_input_num_quantizers", None)

    if config_levels is None:
        print("  [FSQ FIX] WARNING: config has no fsq_input_levels, cannot fix FSQ buffers")
        return 0

    print(f"  [FSQ FIX] Config: fsq_input_levels={config_levels}, "
          f"fsq_input_num_quantizers={config_num_quantizers}")

    fixed = 0

    for name, module in model.named_modules():
        cls_name = type(module).__name__

        # ── Fix FSQ modules ──────────────────────────────────────────────
        if cls_name == "FSQ":
            # Determine correct levels: prefer _init_levels (venv patch),
            # fall back to config, fall back to module.levels attribute
            init_levels = getattr(module, "_init_levels", None)
            if init_levels is None:
                init_levels = list(config_levels)

            _levels_buf = getattr(module, "_levels", None)
            if _levels_buf is None:
                continue
            if _levels_buf.is_meta:
                continue

            device = _levels_buf.device
            correct_levels = tensor(init_levels, dtype=int32, device=device)

            # Log current vs expected values
            levels_match = torch.equal(_levels_buf, correct_levels)
            print(f"  [FSQ FIX] {name}: current _levels={_levels_buf.tolist()}, "
                  f"expected={init_levels}, match={levels_match}")

            # Always force-restore (even if they look equal, rebuild codebook
            # if codebook_size is still 0)
            codebook_size = getattr(module, "codebook_size", -1)
            needs_fix = not levels_match or codebook_size == 0

            if needs_fix:
                _levels_buf.copy_(correct_levels)
                # Also save _init_levels for any future rebuild calls
                module._init_levels = init_levels

                # Restore _basis
                correct_basis = torch.cumprod(
                    tensor([1] + init_levels[:-1], device=device), dim=0, dtype=int32
                )
                _basis_buf = getattr(module, "_basis", None)
                if _basis_buf is not None:
                    _basis_buf.copy_(correct_basis)

                # Rebuild codebook
                if getattr(module, "return_indices", False):
                    module.codebook_size = correct_levels.prod().item()
                    implicit_codebook = module._indices_to_codes(
                        torch.arange(module.codebook_size, device=device)
                    )
                    module.register_buffer(
                        "implicit_codebook", implicit_codebook, persistent=False
                    )

                fixed += 1
                print(f"  [FSQ FIX] {name}: FIXED _levels={init_levels}, "
                      f"codebook_size={module.codebook_size}")

        # ── Fix ResidualFSQ modules ──────────────────────────────────────
        elif cls_name == "ResidualFSQ":
            # Use module.levels (Python list, always set in __init__)
            # or fall back to config
            levels = getattr(module, "levels", None)
            if levels is None:
                levels = list(config_levels)

            scales_buf = getattr(module, "scales", None)
            if scales_buf is None:
                continue
            if scales_buf.is_meta:
                continue

            device = scales_buf.device
            levels_t = tensor(levels, device=device).float()
            num_q = getattr(module, "num_quantizers", config_num_quantizers or 1)

            # Compute correct scales
            correct_scales = torch.stack(
                [levels_t ** -ind for ind in range(num_q)]
            )

            scales_match = torch.equal(scales_buf, correct_scales)
            rfsq_codebook_size = getattr(module, "codebook_size", -1)
            print(f"  [RFSQ FIX] {name}: scales_match={scales_match}, "
                  f"codebook_size={rfsq_codebook_size}")

            needs_fix = not scales_match or rfsq_codebook_size == 0

            if needs_fix:
                scales_buf.copy_(correct_scales)

                # Restore soft_clamp_input_value
                scv = getattr(module, "soft_clamp_input_value", None)
                if scv is not None and not scv.is_meta:
                    correct_clamp = 1 + (1 / (levels_t - 1))
                    scv.copy_(correct_clamp)

                # Update codebook_size from FSQ layers (already fixed above)
                layers = getattr(module, "layers", [])
                if len(layers) > 0:
                    first_cb = getattr(layers[0], "codebook_size", 0)
                    if first_cb > 0:
                        module.codebook_size = first_cb

                fixed += 1
                print(f"  [RFSQ FIX] {name}: FIXED scales, "
                      f"codebook_size={module.codebook_size}")

            # ── Fix dtype mismatch in get_output_from_indices ─────────
            # The codebook lookup produces float32, but project_out may be
            # bfloat16 (model loaded in bf16).  Monkeypatch to cast before
            # the linear projection so we don't get "mat1 and mat2 must
            # have the same dtype" errors.
            project_out = getattr(module, "project_out", None)
            if project_out is not None:
                proj_dtype = next(project_out.parameters()).dtype
                if proj_dtype != torch.float32:
                    _orig_get_output = module.get_output_from_indices

                    def _patched_get_output(indices, _mod=module, _orig=_orig_get_output):
                        codes = _mod.get_codes_from_indices(indices)
                        # reduce over quantizer dim (first dim)
                        from einops import reduce as einops_reduce
                        codes_summed = einops_reduce(codes, 'q ... -> ...', 'sum')
                        # Cast to project_out dtype before linear layer
                        proj_dt = next(_mod.project_out.parameters()).dtype
                        codes_summed = codes_summed.to(proj_dt)
                        return _mod.project_out(codes_summed)

                    module.get_output_from_indices = _patched_get_output
                    print(f"  [RFSQ FIX] {name}: patched get_output_from_indices "
                          f"for dtype cast (float32 → {proj_dtype})")

    return fixed


def _verify_fsq_health(model) -> bool:
    """Run a quick diagnostic to verify FSQ modules produce sensible output.

    Creates a dummy input, runs it through the audio tokenizer's quantizer,
    and checks the output is non-zero.
    """
    import torch

    config = getattr(model, "config", None)
    if config is None:
        return True  # can't verify

    # Find the audio tokenizer
    tokenizer = getattr(model, "tokenizer", None)
    if tokenizer is None:
        print("  [FSQ VERIFY] No tokenizer found in model, skipping health check")
        return True

    quantizer = getattr(tokenizer, "quantizer", None)
    if quantizer is None:
        print("  [FSQ VERIFY] No quantizer found in tokenizer, skipping health check")
        return True

    try:
        device = next(quantizer.parameters()).device
        dtype = next(quantizer.parameters()).dtype

        # Create a dummy input matching expected dimensions
        fsq_dim = getattr(config, "fsq_dim", 2048)
        dummy = torch.randn(1, 4, fsq_dim, device=device, dtype=dtype)

        with torch.no_grad():
            quantized, indices = quantizer(dummy)

        # Check output is non-zero
        q_abs_mean = quantized.abs().mean().item()
        idx_unique = indices.unique().numel()
        print(f"  [FSQ VERIFY] quantized abs_mean={q_abs_mean:.6f}, "
              f"indices unique={idx_unique}, shape={quantized.shape}")

        if q_abs_mean < 1e-6:
            print("  [FSQ VERIFY] WARNING: quantized output is near-zero!")
            return False
        return True
    except Exception as e:
        print(f"  [FSQ VERIFY] Health check failed with error: {e}")
        return False


class InferenceService:
    """Singleton that manages ACE-Step model lifecycle + generation."""

    def __init__(self):
        self.dit_handler = None
        self.llm_handler = None
        self.gpu_config = None
        self.current_model_name: str = ""
        self.current_model_type: str = "unknown"
        self.checkpoint_dir: str = str(config.CHECKPOINT_DIR)
        self._initialized = False
        self._lock = threading.Lock()

        # Adapter state
        self._adapter_search_paths: list[str] = list(config.DEFAULT_ADAPTER_SEARCH_PATHS)
        self._cached_adapters: list[AdapterInfo] = []

        # LM model name tracking (LLMHandler doesn't store this itself)
        self._lm_model_name: str = ""

    # ── GPU Detection (lightweight, no model download) ──────────────────

    def detect_gpu(self):
        """Detect GPU capabilities without loading any model."""
        try:
            from acestep.gpu_config import get_gpu_config
            self.gpu_config = get_gpu_config()
        except Exception as e:
            print(f"[InferenceService] GPU detection failed: {e}")

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _resolve_checkpoint_root(self) -> Path:
        """Return the real checkpoints root directory.

        If ``self.checkpoint_dir`` accidentally points to a single model folder
        (i.e. it directly contains ``config.json`` and model weight files), return
        the *parent* directory instead so that ``initialize_service`` can locate
        sibling models correctly.
        """
        cp = Path(self.checkpoint_dir)
        if not cp.exists():
            return cp

        # A model folder has config.json + weight files (safetensors or bin)
        has_config = (cp / "config.json").exists()
        has_weights = (
            any(cp.glob("*.safetensors"))
            or any(cp.glob("model.safetensors.*"))  # sharded
            or (cp / "pytorch_model.bin").exists()
        )
        # Also check: if the name looks like a model name (e.g. "acestep-v15-turbo")
        # and the parent contains sibling model folders
        looks_like_model = has_config and (
            has_weights
            or "acestep" in cp.name.lower()
        )

        if looks_like_model:
            return cp.parent
        return cp

    # ── Initialization ────────────────────────────────────────────────────

    def initialize(
        self,
        model_name: str = "acestep-v15-turbo",
        lm_model: Optional[str] = None,
        checkpoint_dir: Optional[str] = None,
    ) -> str:
        """Initialize the inference engine with a specific model."""
        if checkpoint_dir:
            self.checkpoint_dir = checkpoint_dir

        # Import ACE-Step modules (trainer must be in sys.path via config.py)
        from acestep.handler import AceStepHandler
        from acestep.llm_inference import LLMHandler
        from acestep.gpu_config import get_gpu_config, get_gpu_memory_gb

        # Detect GPU if not done yet
        if not self.gpu_config:
            self.gpu_config = get_gpu_config()
        gpu_mem = get_gpu_memory_gb()

        # Resolve the true checkpoints root (handles user pointing to a model subfolder)
        cp_root = str(self._resolve_checkpoint_root())

        # Unload current adapter if switching models
        if self.dit_handler and hasattr(self.dit_handler, 'lora_loaded') and self.dit_handler.lora_loaded:
            self.dit_handler.unload_lora()

        # Initialize DiT handler
        # NOTE: The handler's _get_project_root() always returns the trainer dir
        # (based on handler.py file location), so we pass the user's checkpoints
        # root via custom_checkpoint_dir to override where models are loaded from.
        self.dit_handler = AceStepHandler()
        status_msg, _ok = self.dit_handler.initialize_service(
            project_root=cp_root,
            config_path=model_name,
            device="auto",
            lazy=True,  # Defer actual weight loading until first generation
            custom_checkpoint_dir=cp_root,
        )
        # Wrap ensure_models_loaded to fix FSQ buffers after loading
        self._wrap_ensure_models_loaded()
        self.current_model_name = model_name
        self.current_model_type = config.detect_model_type(model_name)

        # Initialize LLM handler (always create it, conditionally load model)
        if not self.llm_handler:
            self.llm_handler = LLMHandler()
        if lm_model and gpu_mem and gpu_mem >= 8:
            try:
                lm_status, lm_ok = self.llm_handler.initialize(
                    checkpoint_dir=cp_root,
                    lm_model_path=lm_model,
                    backend="pt",
                    device="auto",
                )
                if lm_ok:
                    self._lm_model_name = lm_model
                status_msg += f" | LM: {lm_status}"
            except Exception as e:
                status_msg += f" | LM failed: {e}"

        self._initialized = True
        return status_msg

    def _wrap_ensure_models_loaded(self):
        """Wrap the handler's ensure_models_loaded to fix FSQ buffers after loading.

        Transformers 5.x corrupts non-persistent buffers in FSQ/ResidualFSQ
        modules.  This wrapper runs _fix_fsq_buffers_after_load on the DiT model
        right after the original ensure_models_loaded completes, then verifies
        the quantizer produces sensible output.
        """
        handler = self.dit_handler
        if handler is None:
            return

        original_fn = handler.ensure_models_loaded

        def _patched_ensure_models_loaded():
            was_loaded = handler._models_loaded
            original_fn()
            if not was_loaded and handler._models_loaded and handler.model is not None:
                print("=" * 60)
                print("[InferenceService] Post-load FSQ buffer fix starting...")
                print(f"  Model type: {type(handler.model).__name__}")
                print(f"  Model config class: {type(handler.model.config).__name__}")

                n = _fix_fsq_buffers_after_load(handler.model)
                if n:
                    print(f"[InferenceService] Fixed {n} FSQ/ResidualFSQ module(s)")
                else:
                    print("[InferenceService] No FSQ modules needed fixing")

                # Verify the quantizer works
                ok = _verify_fsq_health(handler.model)
                if ok:
                    print("[InferenceService] FSQ health check PASSED")
                else:
                    print("[InferenceService] FSQ health check FAILED — audio may be silent!")

                # ── Promote VAE to float32 for better decode quality ──────
                # bfloat16 VAE produces extremely quiet output (rms ~0.001)
                # that requires 300x+ gain, amplifying quantization noise.
                # float32 preserves precision at low amplitudes.
                import torch
                vae = getattr(handler, "vae", None)
                if vae is not None:
                    vae_dtype = next(vae.parameters()).dtype
                    if vae_dtype != torch.float32:
                        handler.vae = vae.float()
                        print(f"[InferenceService] VAE promoted to float32 "
                              f"(was {vae_dtype}) for better audio quality")
                    else:
                        print(f"[InferenceService] VAE already float32")

                print("=" * 60)

        handler.ensure_models_loaded = _patched_ensure_models_loaded

    # ── Model Management ──────────────────────────────────────────────────

    def _detect_and_get_lm_model(self) -> str:
        """Auto-detect the best LM model from the checkpoint directory.

        Uses the resolved checkpoint root and available VRAM to pick
        the largest LM model that fits.  Returns the model folder name
        or ``""`` if none found.
        """
        cp_root = self._resolve_checkpoint_root()
        available_vram = 0.0
        try:
            from acestep.gpu_config import get_gpu_memory_gb
            available_vram = get_gpu_memory_gb() or 0.0
        except Exception:
            pass
        return config.detect_best_lm_model(cp_root, available_vram)

    def _ensure_lm_loaded(self) -> str:
        """Make sure the LLM is loaded.  If not, auto-detect and load it.

        Returns a status string describing what happened.
        """
        # Already loaded?
        if self.llm_handler and getattr(self.llm_handler, "llm_initialized", False):
            return f"LM already loaded: {self._lm_model_name}"

        lm_model = self._detect_and_get_lm_model()
        if not lm_model:
            return "No LM model found in checkpoint directory"

        cp_root = str(self._resolve_checkpoint_root())

        from acestep.llm_inference import LLMHandler
        if not self.llm_handler:
            self.llm_handler = LLMHandler()

        try:
            print(f"[InferenceService] Auto-loading LM model: {lm_model}")
            lm_status, lm_ok = self.llm_handler.initialize(
                checkpoint_dir=cp_root,
                lm_model_path=lm_model,
                backend="pt",
                device="auto",
            )
            if lm_ok:
                self._lm_model_name = lm_model
                print(f"[InferenceService] LM loaded successfully: {lm_model}")
                return f"LM loaded: {lm_status}"
            else:
                print(f"[InferenceService] LM load failed: {lm_status}")
                return f"LM failed: {lm_status}"
        except Exception as e:
            print(f"[InferenceService] LM load exception: {e}")
            return f"LM exception: {e}"

    def load_model(self, model_name: str, checkpoint_path: Optional[str] = None) -> str:
        """Load or switch to a DiT model. Works for first load and switching.

        Also auto-loads the LLM if not already loaded (required for quality
        audio generation).
        """
        if checkpoint_path:
            self.checkpoint_dir = checkpoint_path

        cp_root = str(self._resolve_checkpoint_root())

        # If not yet initialized, do a full initialize WITH LM auto-detect
        if not self._initialized:
            lm_model = self._detect_and_get_lm_model()
            return self.initialize(
                model_name=model_name,
                lm_model=lm_model or None,
                checkpoint_dir=self.checkpoint_dir,
            )

        # Already initialized — switch model
        if self.dit_handler and hasattr(self.dit_handler, 'lora_loaded') and self.dit_handler.lora_loaded:
            self.dit_handler.unload_lora()

        status_msg, _ok = self.dit_handler.initialize_service(
            project_root=cp_root,
            config_path=model_name,
            device="auto",
            lazy=True,
            custom_checkpoint_dir=cp_root,
        )
        self._wrap_ensure_models_loaded()
        self.current_model_name = model_name
        self.current_model_type = config.detect_model_type(model_name)

        # Also ensure LM is loaded (auto-detect if needed)
        lm_status = self._ensure_lm_loaded()
        status_msg += f" | {lm_status}"

        return status_msg

    def get_model_status(self) -> ModelStatusResponse:
        """Return full model/GPU/LM status for the frontend."""
        # Current model (None if not initialized)
        current = None
        if self._initialized and self.current_model_name:
            caps = config.MODEL_CAPABILITIES.get(
                self.current_model_type,
                config.MODEL_CAPABILITIES["unknown"],
            )
            current = ModelInfo(
                name=self.current_model_name,
                type=self.current_model_type,
                path=self.checkpoint_dir,
                loaded=True,
                capabilities=ModelCapabilities(**caps),
            )

        # Scan for available models in the checkpoint directory
        available: list[ModelInfo] = []
        cp = Path(self.checkpoint_dir)
        if cp.exists():
            # Use the same resolution logic to find the real checkpoints root
            scan_dir = self._resolve_checkpoint_root()

            for d in scan_dir.iterdir():
                if d.is_dir() and (d / "config.json").exists():
                    # Skip non-DiT folders (LM, VAE, captioner, embeddings)
                    skip_keywords = ("lm-", "vae", "captioner", "embedding", "qwen")
                    if any(kw in d.name.lower() for kw in skip_keywords):
                        continue
                    mtype = config.detect_model_type(d.name)
                    mcaps = config.MODEL_CAPABILITIES.get(mtype, config.MODEL_CAPABILITIES["unknown"])
                    available.append(
                        ModelInfo(
                            name=d.name,
                            type=mtype,
                            path=str(d),
                            loaded=(self._initialized and d.name == self.current_model_name),
                            capabilities=ModelCapabilities(**mcaps),
                        )
                    )

        # GPU info
        gpu_info = GPUInfo()
        try:
            import torch
            if torch.cuda.is_available():
                props = torch.cuda.get_device_properties(0)
                # PyTorch 2.7+ renamed total_mem → total_memory
                total_mem = getattr(props, "total_memory", None) or getattr(props, "total_mem", 0)
                gpu_info = GPUInfo(
                    tier=self.gpu_config.tier if self.gpu_config else "unknown",
                    name=props.name,
                    vram_total_gb=round(total_mem / (1024**3), 1),
                    vram_free_gb=round(
                        (total_mem - torch.cuda.memory_allocated(0)) / (1024**3), 1
                    ),
                    compute_capability=f"{props.major}.{props.minor}",
                )
            else:
                gpu_info = GPUInfo(name="No CUDA GPU")
        except Exception as e:
            print(f"[InferenceService] GPU status query failed: {e}")
            import traceback; traceback.print_exc()
            gpu_info = GPUInfo(name=f"Error: {type(e).__name__}")

        # LM info — LLMHandler doesn't store model name, so we track it ourselves
        lm_info = LMInfo(
            loaded=bool(self.llm_handler and getattr(self.llm_handler, "llm_initialized", False)),
            model=self._lm_model_name,
        )
        # Populate available LM models from gpu_config or by scanning checkpoints
        if self.gpu_config:
            lm_info.available_models = getattr(self.gpu_config, "available_lm_models", [])
        if not lm_info.available_models:
            # Fallback: scan checkpoint directory for LM folders
            scan_dir = self._resolve_checkpoint_root()
            if scan_dir.exists():
                for d in scan_dir.iterdir():
                    if d.is_dir() and "lm" in d.name.lower() and "5hz" in d.name.lower():
                        lm_info.available_models.append(d.name)

        return ModelStatusResponse(
            current_model=current,
            available_models=available,
            gpu=gpu_info,
            lm=lm_info,
            initialized=self._initialized,
        )

    # ── Adapter Management ────────────────────────────────────────────────

    def scan_adapters(self) -> list[AdapterInfo]:
        """Scan all search paths for LoRA/LoKr adapters."""
        adapters: list[AdapterInfo] = []
        seen_paths: set[str] = set()

        for search_dir in self._adapter_search_paths:
            sp = Path(search_dir)
            if not sp.exists():
                continue

            for candidate in sp.iterdir():
                if not candidate.is_dir():
                    continue
                cpath = str(candidate.resolve())
                if cpath in seen_paths:
                    continue
                seen_paths.add(cpath)

                info = self._detect_adapter(candidate)
                if info:
                    adapters.append(info)

        self._cached_adapters = adapters
        return adapters

    def _detect_adapter(self, adapter_dir: Path) -> Optional[AdapterInfo]:
        """Detect adapter type and metadata from a directory.

        Supports two layouts:
          1. Flat:   adapter_dir/adapter_config.json  (or lokr_weights.safetensors)
          2. Nested: adapter_dir/adapter/adapter_config.json  (common training output)

        In both cases, the display name is ``adapter_dir.name`` (e.g. "Linkin Park").
        """
        # Resolve the actual directory containing adapter files.
        # Check flat first, then nested "adapter/" subfolder.
        files_dir = adapter_dir
        nested = adapter_dir / "adapter"
        if not (files_dir / "adapter_config.json").exists() and not (files_dir / "lokr_weights.safetensors").exists():
            if nested.is_dir():
                files_dir = nested
            else:
                return None

        display_name = adapter_dir.name

        # LoKr detection
        lokr_weights = files_dir / "lokr_weights.safetensors"
        if lokr_weights.exists():
            meta = {}
            lokr_cfg = files_dir / "lokr_config.json"
            if lokr_cfg.exists():
                try:
                    meta = json.loads(lokr_cfg.read_text())
                except Exception:
                    pass
            base_model = meta.get("base_model", "unknown")
            return AdapterInfo(
                name=display_name,
                path=str(files_dir),
                type="lokr",
                base_model=self._infer_base_model_type(base_model),
                description=meta.get("description", ""),
                compatible_with_current=(
                    self._infer_base_model_type(base_model) == self.current_model_type
                    or self._infer_base_model_type(base_model) == "unknown"
                ),
            )

        # LoRA (PEFT) detection
        peft_cfg = files_dir / "adapter_config.json"
        if peft_cfg.exists():
            try:
                cfg = json.loads(peft_cfg.read_text())
            except Exception:
                cfg = {}
            base_path = cfg.get("base_model_name_or_path", "")
            base_type = self._infer_base_model_type(base_path)
            rank = cfg.get("r")
            alpha = cfg.get("lora_alpha")
            return AdapterInfo(
                name=display_name,
                path=str(files_dir),
                type="lora",
                base_model=base_type,
                rank=rank,
                alpha=alpha,
                compatible_with_current=(
                    base_type == self.current_model_type or base_type == "unknown"
                ),
            )

        return None

    def _infer_base_model_type(self, model_ref: Optional[str]) -> str:
        """Infer the model type from a reference string (path or name)."""
        if not model_ref:
            return "unknown"
        ref_lower = model_ref.lower()
        if "turbo" in ref_lower:
            return "turbo"
        if "sft" in ref_lower:
            return "sft"
        if "base" in ref_lower:
            return "base"
        return "unknown"

    def load_adapter(self, path: str, scale: float = 1.0) -> str:
        """Load a LoRA/LoKr adapter.

        Automatically triggers lazy model loading if needed (the model is
        initialized with lazy=True and weights haven't been loaded yet).
        """
        if not self.dit_handler:
            raise RuntimeError("Model handler not initialised — load a model first")

        # Ensure the DiT model weights are actually loaded (lazy init).
        # load_lora needs self.model to be non-None.
        if not getattr(self.dit_handler, '_models_loaded', False):
            print("[InferenceService] Model weights not yet loaded — triggering lazy load for adapter...")
            self.dit_handler.ensure_models_loaded()

        result = self.dit_handler.load_lora(path)

        # Raise on error so the HTTP endpoint can return a proper status code
        if result and ("❌" in result or "error" in result.lower() or "failed" in result.lower()):
            raise RuntimeError(result)

        if scale != 1.0:
            self.dit_handler.set_lora_scale(scale)
        return result

    def unload_adapter(self) -> str:
        """Unload current adapter."""
        if not self.dit_handler:
            return "Model not loaded"
        return self.dit_handler.unload_lora()

    def set_adapter_config(self, active: Optional[bool] = None, scale: Optional[float] = None) -> str:
        """Update adapter toggle/scale without reloading."""
        if not self.dit_handler:
            return "Model not loaded"
        msgs = []
        if active is not None:
            msgs.append(self.dit_handler.set_use_lora(active))
        if scale is not None:
            msgs.append(self.dit_handler.set_lora_scale(scale))
        return " | ".join(msgs) if msgs else "No changes"

    def get_adapter_status(self) -> AdapterCurrent:
        """Get current adapter status."""
        if not self.dit_handler:
            return AdapterCurrent()
        status = self.dit_handler.get_lora_status()
        raw_path = status.get("path") or ""  # guard against None values
        return AdapterCurrent(
            loaded=status.get("loaded", False),
            name=Path(raw_path).name if raw_path else "",
            path=raw_path,
            type="lora",  # handler doesn't distinguish type in status
            scale=status.get("scale", 1.0),
            active=status.get("enabled", False),
        )

    def add_search_path(self, path: str):
        """Add a folder to adapter search paths."""
        if path not in self._adapter_search_paths:
            self._adapter_search_paths.append(path)

    # ── Generation ────────────────────────────────────────────────────────

    def generate(
        self,
        request: GenerateRequest,
        progress_callback: Optional[Callable] = None,
    ) -> list[TrackInfo]:
        """Run music generation (blocking — call from thread pool)."""
        from acestep.inference import GenerationParams, GenerationConfig, generate_music

        # Map request to ACE-Step params
        timesteps_list = None
        if request.timesteps:
            try:
                timesteps_list = [float(x.strip()) for x in request.timesteps.split(",")]
            except ValueError:
                pass

        # Apply model-specific defaults for shift if the request uses the
        # generic default (1.0).  Turbo models REQUIRE shift=3.0.
        effective_shift = request.shift
        if effective_shift == 1.0 and self.current_model_type == "turbo":
            caps = config.MODEL_CAPABILITIES.get("turbo", {})
            effective_shift = caps.get("shift_default", 3.0)
            print(f"[InferenceService] Auto-applied turbo shift: {effective_shift}")

        params = GenerationParams(
            caption=request.caption,
            lyrics=request.lyrics,
            instrumental=request.instrumental,
            bpm=request.bpm,
            keyscale=request.keyscale,
            timesignature=request.timesignature,
            vocal_language=request.vocal_language,
            duration=request.duration,
            inference_steps=request.inference_steps,
            guidance_scale=request.guidance_scale,
            seed=request.seed,
            use_adg=request.use_adg,
            cfg_interval_start=request.cfg_interval_start,
            cfg_interval_end=request.cfg_interval_end,
            shift=effective_shift,
            infer_method=request.infer_method,
            timesteps=timesteps_list,
            task_type=request.task_type,
            reference_audio=request.reference_audio,
            src_audio=request.src_audio,
            repainting_start=request.repainting_start,
            repainting_end=request.repainting_end,
            audio_cover_strength=request.audio_cover_strength,
            thinking=request.thinking,
            lm_temperature=request.lm_temperature,
            lm_cfg_scale=request.lm_cfg_scale,
            lm_top_k=request.lm_top_k,
            lm_top_p=request.lm_top_p,
            lm_negative_prompt=request.lm_negative_prompt,
            use_cot_metas=request.use_cot_metas,
            use_cot_caption=request.use_cot_caption,
            use_cot_language=request.use_cot_language,
            use_constrained_decoding=request.use_constrained_decoding,
        )

        gen_config = GenerationConfig(
            batch_size=request.batch_size,
            audio_format=request.audio_format,
        )

        result = generate_music(
            dit_handler=self.dit_handler,
            llm_handler=self.llm_handler,
            params=params,
            config=gen_config,
            save_dir=str(config.AUDIO_OUTPUT_DIR),
            progress=progress_callback,
        )

        if not result.success:
            raise RuntimeError(result.error or "Generation failed")

        # ── Audio diagnostics ───────────────────────────────────────
        print("=" * 60)
        print(f"[AUDIO DIAG] Generation complete, {len(result.audios)} audio(s)")
        for i, audio in enumerate(result.audios):
            audio_path = audio.get("path", "")
            if audio_path:
                try:
                    import soundfile as sf
                    import numpy as np
                    data, sr = sf.read(audio_path)
                    rms = np.sqrt(np.mean(data ** 2))
                    peak = np.max(np.abs(data))
                    print(f"  Audio {i}: sr={sr}, shape={data.shape}, "
                          f"rms={rms:.6f}, peak={peak:.6f}, "
                          f"dtype={data.dtype}")
                    if rms < 1e-4:
                        print(f"  WARNING: Audio {i} is near-silent (RMS={rms:.8f})")
                except Exception as e:
                    print(f"  Audio {i}: couldn't analyze: {e}")
        print("=" * 60)

        # Convert to TrackInfo objects
        tracks: list[TrackInfo] = []
        adapter_status = self.get_adapter_status()
        for i, audio in enumerate(result.audios):
            track_id = str(uuid4())
            orig_audio_path = audio.get("path", "")
            title = request.caption[:80] or f"Track {track_id[:8]}"

            # Rename audio file to use the track title
            audio_path = orig_audio_path
            if orig_audio_path and os.path.isfile(orig_audio_path):
                audio_path = _rename_audio_to_title(
                    orig_audio_path, title, track_id[:8],
                    suffix_index=i if len(result.audios) > 1 else None,
                )

            filename = Path(audio_path).name if audio_path else ""
            duration = get_audio_duration(audio_path) if audio_path else 0.0
            peaks = compute_peaks(audio_path) if audio_path else None

            track = TrackInfo(
                id=track_id,
                title=title,
                caption=request.caption,
                lyrics=request.lyrics,
                bpm=request.bpm,
                keyscale=request.keyscale,
                timesignature=request.timesignature,
                vocal_language=request.vocal_language,
                duration=duration,
                audio_path=audio_path,
                audio_url=get_audio_url(filename, "output"),
                audio_format=request.audio_format,
                seed=audio.get("params", {}).get("seed", request.seed),
                model_name=self.current_model_name,
                adapter_name=adapter_status.name if adapter_status.loaded else None,
                adapter_scale=adapter_status.scale if adapter_status.loaded else None,
                task_type=request.task_type,
                params_json=json.dumps(request.model_dump()),
                peaks=peaks,
            )
            tracks.append(track)

        return tracks


def _sanitize_filename(name: str, max_len: int = 80) -> str:
    """Produce a filesystem-safe filename from a track title."""
    # Replace slashes & other invalid chars with underscore
    safe = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)
    # Collapse multiple underscores/spaces
    safe = re.sub(r'[\s_]+', '_', safe).strip('_. ')
    # Truncate
    if len(safe) > max_len:
        safe = safe[:max_len].rstrip('_. ')
    return safe or "track"


def _rename_audio_to_title(
    orig_path: str,
    title: str,
    short_id: str,
    suffix_index: int | None = None,
) -> str:
    """Rename an audio file to use the track title. Returns the new path."""
    p = Path(orig_path)
    ext = p.suffix  # e.g. ".flac"
    parent = p.parent

    base = _sanitize_filename(title)
    # Append batch index if multiple outputs
    if suffix_index is not None:
        base = f"{base}_{suffix_index + 1}"

    new_path = parent / f"{base}{ext}"

    # Handle collision: append short ID
    if new_path.exists() and new_path != p:
        new_path = parent / f"{base}_{short_id}{ext}"

    try:
        p.rename(new_path)
        # Also rename .peaks.json sidecar if it exists
        old_peaks = p.with_suffix(".peaks.json")
        if old_peaks.exists():
            old_peaks.rename(new_path.with_suffix(".peaks.json"))
        return str(new_path)
    except OSError as e:
        print(f"Warning: could not rename {p.name} → {new_path.name}: {e}")
        return orig_path
