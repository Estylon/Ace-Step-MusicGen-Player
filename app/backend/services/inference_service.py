"""Wraps ACE-Step inference engine (AceStepHandler + LLMHandler)."""

from __future__ import annotations

import json
import os
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
        (i.e. it directly contains ``config.json`` + ``*.safetensors``), return
        the *parent* directory instead so that ``initialize_service`` can locate
        sibling models correctly.
        """
        cp = Path(self.checkpoint_dir)
        if (cp / "config.json").exists() and any(cp.glob("*.safetensors")):
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
        self.dit_handler = AceStepHandler()
        status_msg, _ok = self.dit_handler.initialize_service(
            project_root=cp_root,
            config_path=model_name,
            device="auto",
            lazy=True,  # Defer actual weight loading until first generation
        )
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
                status_msg += f" | LM: {lm_status}"
            except Exception as e:
                status_msg += f" | LM failed: {e}"

        self._initialized = True
        return status_msg

    # ── Model Management ──────────────────────────────────────────────────

    def load_model(self, model_name: str, checkpoint_path: Optional[str] = None) -> str:
        """Load or switch to a DiT model. Works for first load and switching."""
        if checkpoint_path:
            self.checkpoint_dir = checkpoint_path

        cp_root = str(self._resolve_checkpoint_root())

        # If not yet initialized, do a full initialize
        if not self._initialized:
            return self.initialize(
                model_name=model_name,
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
        )
        self.current_model_name = model_name
        self.current_model_type = config.detect_model_type(model_name)
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
            # Determine the real scan directory.
            # If checkpoint_dir itself IS a model folder (has config.json + model files),
            # scan the parent instead so all sibling models are discovered.
            scan_dir = cp
            if (cp / "config.json").exists() and any(cp.glob("*.safetensors")):
                scan_dir = cp.parent

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
                gpu_info = GPUInfo(
                    tier=self.gpu_config.tier if self.gpu_config else "unknown",
                    name=props.name,
                    vram_total_gb=round(props.total_mem / (1024**3), 1),
                    vram_free_gb=round(
                        (props.total_mem - torch.cuda.memory_allocated(0)) / (1024**3), 1
                    ),
                    compute_capability=f"{props.major}.{props.minor}",
                )
        except Exception:
            pass

        # LM info
        lm_info = LMInfo(
            loaded=bool(self.llm_handler and self.llm_handler.llm_initialized),
            model=getattr(self.llm_handler, "_model_name", "") if self.llm_handler else "",
        )
        if self.gpu_config:
            lm_info.available_models = getattr(self.gpu_config, "available_lm_models", [])

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

    def _infer_base_model_type(self, model_ref: str) -> str:
        """Infer the model type from a reference string (path or name)."""
        ref_lower = model_ref.lower()
        if "turbo" in ref_lower:
            return "turbo"
        if "sft" in ref_lower:
            return "sft"
        if "base" in ref_lower:
            return "base"
        return "unknown"

    def load_adapter(self, path: str, scale: float = 1.0) -> str:
        """Load a LoRA/LoKr adapter."""
        if not self.dit_handler:
            return "Model not loaded"
        result = self.dit_handler.load_lora(path)
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
        return AdapterCurrent(
            loaded=status.get("loaded", False),
            name=Path(status.get("path", "")).name if status.get("path") else "",
            path=status.get("path", ""),
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
            shift=request.shift,
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

        # Convert to TrackInfo objects
        tracks: list[TrackInfo] = []
        adapter_status = self.get_adapter_status()
        for audio in result.audios:
            track_id = str(uuid4())
            audio_path = audio.get("path", "")
            filename = Path(audio_path).name if audio_path else ""
            duration = get_audio_duration(audio_path) if audio_path else 0.0
            peaks = compute_peaks(audio_path) if audio_path else None

            track = TrackInfo(
                id=track_id,
                title=request.caption[:80] or f"Track {track_id[:8]}",
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
