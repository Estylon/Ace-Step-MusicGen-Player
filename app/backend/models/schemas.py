"""Pydantic models for all API request/response types."""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Generation ────────────────────────────────────────────────────────────────


class GenerateRequest(BaseModel):
    """Full generation request mirroring ACE-Step GenerationParams."""

    # Text inputs
    caption: str = Field("", max_length=512, description="Short music description prompt")
    lyrics: str = Field("", max_length=4096, description="Full lyrics or [Instrumental]")
    instrumental: bool = False

    # Music metadata
    bpm: Optional[int] = Field(None, ge=30, le=300)
    keyscale: str = ""
    timesignature: str = ""
    vocal_language: str = "unknown"
    duration: float = Field(-1.0, description="10-600 seconds, -1 for auto")

    # Diffusion parameters
    inference_steps: int = Field(8, ge=1, le=100)
    guidance_scale: float = Field(7.0, ge=0.0, le=30.0)
    seed: int = Field(-1, description="-1 for random")
    use_adg: bool = False
    cfg_interval_start: float = 0.0
    cfg_interval_end: float = 1.0
    shift: float = Field(1.0, ge=0.1, le=10.0)
    infer_method: str = Field("ode", pattern="^(ode|sde)$")
    timesteps: Optional[str] = Field(None, description="Custom timestep list as comma-separated string")

    # Task
    task_type: str = Field("text2music")
    reference_audio: Optional[str] = None
    src_audio: Optional[str] = None
    repainting_start: float = 0.0
    repainting_end: float = -1.0
    audio_cover_strength: float = Field(1.0, ge=0.0, le=1.0)
    track_name: Optional[str] = Field(None, description="Track type for extract/lego tasks")

    # LM parameters
    thinking: bool = True
    lm_temperature: float = Field(0.85, ge=0.0, le=2.0)
    lm_cfg_scale: float = Field(2.0, ge=0.0, le=10.0)
    lm_top_k: int = Field(0, ge=0)
    lm_top_p: float = Field(0.9, ge=0.0, le=1.0)
    lm_negative_prompt: str = "NO USER INPUT"
    use_cot_metas: bool = True
    use_cot_caption: bool = True
    use_cot_language: bool = True
    use_constrained_decoding: bool = True

    # Batch
    batch_size: int = Field(1, ge=1, le=8)
    audio_format: str = Field("flac", pattern="^(flac|wav|mp3|opus|aac)$")


class GenerateResponse(BaseModel):
    job_id: str
    status: str = "queued"


class TrackInfo(BaseModel):
    id: str
    title: str = ""
    caption: str = ""
    lyrics: str = ""
    bpm: Optional[int] = None
    keyscale: str = ""
    timesignature: str = ""
    vocal_language: str = ""
    duration: float = 0.0
    audio_path: str = ""
    audio_url: str = ""
    audio_format: str = "flac"
    seed: int = -1
    model_name: str = ""
    adapter_name: Optional[str] = None
    adapter_scale: Optional[float] = None
    task_type: str = "text2music"
    params_json: str = "{}"
    favorite: bool = False
    rating: int = 0  # 0-5 stars
    created_at: str = ""
    peaks: Optional[list[float]] = None


class StemInfo(BaseModel):
    id: str
    track_id: str
    stem_type: str  # vocals, drums, bass, other, instrumental
    audio_path: str = ""
    audio_url: str = ""
    duration: float = 0.0


# ── Stem Separation ──────────────────────────────────────────────────────────


class StemSeparateRequest(BaseModel):
    source: str = Field(..., description="File path or library track ID")
    mode: str = Field("two-pass", pattern="^(vocals|multi|two-pass)$")


class StemSeparateResponse(BaseModel):
    job_id: str
    status: str = "queued"


# ── Models ───────────────────────────────────────────────────────────────────


class ModelCapabilities(BaseModel):
    task_types: list[str] = []
    cfg_support: bool = False
    max_steps: int = 100
    default_steps: int = 8
    shift_default: float = 1.0
    adg_support: bool = False
    infer_methods: list[str] = ["ode"]


class ModelInfo(BaseModel):
    name: str
    type: str  # turbo, base, sft, unknown
    path: str = ""
    loaded: bool = False
    capabilities: ModelCapabilities = ModelCapabilities()


class LMInfo(BaseModel):
    loaded: bool = False
    model: str = ""
    available_models: list[str] = []


class GPUInfo(BaseModel):
    tier: str = "unknown"
    name: str = ""
    vram_total_gb: float = 0.0
    vram_free_gb: float = 0.0
    compute_capability: str = ""


class ModelStatusResponse(BaseModel):
    current_model: Optional[ModelInfo] = None
    available_models: list[ModelInfo] = []
    gpu: GPUInfo = GPUInfo()
    lm: LMInfo = LMInfo()
    initialized: bool = False  # True once a model has been loaded


class LoadModelRequest(BaseModel):
    model_name: str
    checkpoint_path: Optional[str] = None


class LoadLMRequest(BaseModel):
    model_name: str


# ── Adapters (LoRA/LoKr) ────────────────────────────────────────────────────


class AdapterInfo(BaseModel):
    name: str
    path: str
    type: str  # "lora" or "lokr"
    base_model: str = "unknown"  # turbo, base, sft, unknown
    rank: Optional[int] = None
    alpha: Optional[float] = None
    description: str = ""
    compatible_with_current: bool = False


class AdapterCurrent(BaseModel):
    loaded: bool = False
    name: str = ""
    path: str = ""
    type: str = ""
    scale: float = 1.0
    active: bool = True


class AdapterListResponse(BaseModel):
    adapters: list[AdapterInfo] = []
    current: AdapterCurrent = AdapterCurrent()
    search_paths: list[str] = []


class LoadAdapterRequest(BaseModel):
    path: str
    scale: float = Field(1.0, ge=0.0, le=2.0)


class AdapterConfigUpdate(BaseModel):
    active: Optional[bool] = None
    scale: Optional[float] = Field(None, ge=0.0, le=2.0)


class AddSearchPathRequest(BaseModel):
    path: str


# ── Library ──────────────────────────────────────────────────────────────────


class LibraryListResponse(BaseModel):
    tracks: list[TrackInfo] = []
    total: int = 0
    page: int = 1
    page_size: int = 20


class TrackDetailResponse(BaseModel):
    track: TrackInfo
    stems: list[StemInfo] = []


class TrackUpdateRequest(BaseModel):
    title: Optional[str] = None
    tags: Optional[str] = None
    favorite: Optional[bool] = None
    rating: Optional[int] = Field(None, ge=0, le=5)


# ── Upload ───────────────────────────────────────────────────────────────────


class UploadResponse(BaseModel):
    path: str
    filename: str
    duration: Optional[float] = None


# ── SSE Events ───────────────────────────────────────────────────────────────


class SSEProgress(BaseModel):
    type: str = "progress"
    step: int = 0
    total: int = 0
    message: str = ""
    percent: float = 0.0


class SSEComplete(BaseModel):
    type: str = "complete"
    tracks: list[TrackInfo] = []


class SSEStemComplete(BaseModel):
    type: str = "complete"
    stems: list[StemInfo] = []


class SSEError(BaseModel):
    type: str = "error"
    message: str = ""


# ── Downloads ───────────────────────────────────────────────────────────────


class DownloadableModel(BaseModel):
    repo_id: str
    name: str
    description: str
    type: str = ""           # "dit", "lm", "bundle"
    model_type: str = ""     # "turbo", "base", "sft"
    size_gb: float = 0.0
    installed: bool = False


class DownloadableListResponse(BaseModel):
    models: list[DownloadableModel] = []
    checkpoint_dir: str = ""
    has_essential: bool = False


class StartDownloadRequest(BaseModel):
    repo_id: str


# ── Presets ─────────────────────────────────────────────────────────────────


class PresetInfo(BaseModel):
    id: str
    name: str
    params_json: str = "{}"
    created_at: str = ""
    updated_at: str = ""


class PresetCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    params_json: str = "{}"


class PresetUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    params_json: Optional[str] = None


# ── Batch Export ────────────────────────────────────────────────────────────


class BatchExportRequest(BaseModel):
    track_ids: list[str] = Field(..., min_length=1, max_length=50)
    target_lufs: float = Field(-14.0, ge=-30.0, le=0.0)
    true_peak_db: float = Field(-1.0, ge=-6.0, le=0.0)
    sample_rate: int = Field(44100, ge=22050, le=96000)
    format: str = Field("wav", pattern=r"^(wav|mp3)$")
    mp3_bitrate: int = Field(320, ge=128, le=320)
