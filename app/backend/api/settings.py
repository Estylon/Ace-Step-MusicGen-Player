"""User-configurable settings endpoints — paths, directories."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import config

router = APIRouter(prefix="/api/settings", tags=["settings"])

SETTINGS_FILE = config.DATA_DIR / "user_settings.json"


# ── Schema ──────────────────────────────────────────────────────────────────


class UserSettings(BaseModel):
    """Persisted user-configurable paths and preferences."""

    trainer_path: str = str(config.TRAINER_PATH)
    checkpoint_dir: str = str(config.CHECKPOINT_DIR)
    lora_search_paths: list[str] = []
    output_dir: str = str(config.AUDIO_OUTPUT_DIR)
    stems_output_dir: str = str(config.STEMS_OUTPUT_DIR)


class UpdateSettingsRequest(BaseModel):
    trainer_path: Optional[str] = None
    checkpoint_dir: Optional[str] = None
    lora_search_paths: Optional[list[str]] = None
    output_dir: Optional[str] = None
    stems_output_dir: Optional[str] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def load_settings() -> UserSettings:
    """Load settings from disk, falling back to defaults."""
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            return UserSettings(**data)
        except Exception:
            pass

    # Build defaults from current config
    defaults = UserSettings(
        trainer_path=str(config.TRAINER_PATH),
        checkpoint_dir=str(config.CHECKPOINT_DIR),
        lora_search_paths=list(config.DEFAULT_ADAPTER_SEARCH_PATHS),
        output_dir=str(config.AUDIO_OUTPUT_DIR),
        stems_output_dir=str(config.STEMS_OUTPUT_DIR),
    )
    save_settings(defaults)
    return defaults


def save_settings(settings: UserSettings) -> None:
    """Persist settings to disk."""
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(
        json.dumps(settings.model_dump(), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def apply_settings(settings: UserSettings) -> None:
    """Apply settings to the running service (hot-reload paths)."""
    from main import inference_service

    # Update adapter search paths
    inference_service._adapter_search_paths = [
        p for p in settings.lora_search_paths if p
    ]

    # Update checkpoint dir
    inference_service.checkpoint_dir = settings.checkpoint_dir

    # Update output directories
    config.AUDIO_OUTPUT_DIR = Path(settings.output_dir)
    config.STEMS_OUTPUT_DIR = Path(settings.stems_output_dir)
    config.AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    config.STEMS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=UserSettings)
async def get_settings():
    """Get current user settings."""
    return load_settings()


@router.put("", response_model=UserSettings)
async def update_settings(request: UpdateSettingsRequest):
    """Update user settings. Only non-null fields are updated."""
    current = load_settings()

    if request.trainer_path is not None:
        # Validate path exists
        if not Path(request.trainer_path).exists():
            raise HTTPException(400, f"Trainer path does not exist: {request.trainer_path}")
        current.trainer_path = request.trainer_path

    if request.checkpoint_dir is not None:
        if not Path(request.checkpoint_dir).exists():
            raise HTTPException(400, f"Checkpoint directory does not exist: {request.checkpoint_dir}")
        current.checkpoint_dir = request.checkpoint_dir

    if request.lora_search_paths is not None:
        # Validate all paths exist
        for p in request.lora_search_paths:
            if p and not Path(p).exists():
                raise HTTPException(400, f"LoRA search path does not exist: {p}")
        current.lora_search_paths = request.lora_search_paths

    if request.output_dir is not None:
        current.output_dir = request.output_dir

    if request.stems_output_dir is not None:
        current.stems_output_dir = request.stems_output_dir

    save_settings(current)
    apply_settings(current)
    return current


@router.post("/validate-path")
async def validate_path(body: dict):
    """Check if a given path exists on the filesystem."""
    path_str = body.get("path", "")
    if not path_str:
        return {"valid": False, "message": "Empty path"}
    p = Path(path_str)
    exists = p.exists()
    is_dir = p.is_dir() if exists else False
    return {"valid": exists, "is_dir": is_dir, "path": str(p.resolve()) if exists else path_str}
