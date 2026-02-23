"""Application configuration — paths, GPU detection, environment."""

from __future__ import annotations

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Trainer import path
# ---------------------------------------------------------------------------
TRAINER_PATH = Path(os.environ.get("ACESTEP_TRAINER_PATH", "D:/ace-lora-trainer"))

# Inject trainer into sys.path so `from acestep.* import ...` works
if str(TRAINER_PATH) not in sys.path:
    sys.path.insert(0, str(TRAINER_PATH))

# ---------------------------------------------------------------------------
# Checkpoint / model directories
# ---------------------------------------------------------------------------
CHECKPOINT_DIR = Path(
    os.environ.get(
        "ACESTEP_CHECKPOINT_DIR",
        str(TRAINER_PATH / "checkpoints"),
    )
)

# ---------------------------------------------------------------------------
# LoRA / LoKr adapter search paths
# ---------------------------------------------------------------------------
DEFAULT_ADAPTER_SEARCH_PATHS: list[str] = [
    str(TRAINER_PATH / "output"),
    os.environ.get("ACESTEP_LORA_DIR", ""),
]
# Filter out empty strings
DEFAULT_ADAPTER_SEARCH_PATHS = [p for p in DEFAULT_ADAPTER_SEARCH_PATHS if p]

# ---------------------------------------------------------------------------
# Audio output
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
AUDIO_OUTPUT_DIR = BASE_DIR / "audio_output"
STEMS_OUTPUT_DIR = BASE_DIR / "stems_output"
UPLOADS_DIR = BASE_DIR / "uploads"
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"  # Built frontend assets

# Ensure directories exist
for d in (AUDIO_OUTPUT_DIR, STEMS_OUTPUT_DIR, UPLOADS_DIR, DATA_DIR):
    d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Server defaults
# ---------------------------------------------------------------------------
DEFAULT_HOST = os.environ.get("HOST", "127.0.0.1")
DEFAULT_PORT = int(os.environ.get("PORT", "3456"))

# ---------------------------------------------------------------------------
# Model type mapping
# ---------------------------------------------------------------------------
MODEL_TYPES: dict[str, str] = {
    "acestep-v15-turbo": "turbo",
    "acestep-v15-turbo-shift3": "turbo",
    "acestep-v15-base": "base",
    "acestep-v15-sft": "sft",
}

# Model capabilities per type
MODEL_CAPABILITIES: dict[str, dict] = {
    "turbo": {
        "task_types": ["text2music", "cover", "repaint"],
        "cfg_support": False,
        "max_steps": 8,
        "default_steps": 8,
        "shift_default": 3.0,
        "adg_support": False,
        "infer_methods": ["ode"],
    },
    "base": {
        "task_types": ["text2music", "cover", "repaint", "extract", "lego", "complete"],
        "cfg_support": True,
        "max_steps": 100,
        "default_steps": 50,
        "shift_default": 1.0,
        "adg_support": True,
        "infer_methods": ["ode", "sde"],
    },
    "sft": {
        "task_types": ["text2music", "cover", "repaint", "extract", "lego", "complete"],
        "cfg_support": True,
        "max_steps": 100,
        "default_steps": 50,
        "shift_default": 1.0,
        "adg_support": True,
        "infer_methods": ["ode", "sde"],
    },
    "unknown": {
        "task_types": ["text2music", "cover", "repaint"],
        "cfg_support": True,
        "max_steps": 100,
        "default_steps": 32,
        "shift_default": 1.0,
        "adg_support": False,
        "infer_methods": ["ode", "sde"],
    },
}


def detect_model_type(model_name: str) -> str:
    """Infer model type from its name."""
    name_lower = model_name.lower()
    if "turbo" in name_lower:
        return "turbo"
    if "sft" in name_lower:
        return "sft"
    if "base" in name_lower:
        return "base"
    return MODEL_TYPES.get(model_name, "unknown")
