"""Audio file serving — static files + waveform peaks."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from config import AUDIO_OUTPUT_DIR, STEMS_OUTPUT_DIR
from services.audio_manager import compute_peaks, load_peaks, save_peaks

router = APIRouter(prefix="/api/audio", tags=["audio"])


@router.get("/output/{filename}")
async def serve_output_audio(filename: str):
    """Serve a generated audio file."""
    path = AUDIO_OUTPUT_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Audio file not found")
    media_type = _guess_media_type(filename)
    return FileResponse(str(path), media_type=media_type)


@router.get("/stems/{path:path}")
async def serve_stem_audio(path: str):
    """Serve a stem audio file (supports nested paths like job_id/filename)."""
    full_path = STEMS_OUTPUT_DIR / path
    if not full_path.exists():
        raise HTTPException(404, "Stem file not found")
    media_type = _guess_media_type(str(full_path))
    return FileResponse(str(full_path), media_type=media_type)


@router.get("/uploads/{filename}")
async def serve_upload(filename: str):
    """Serve an uploaded reference audio file."""
    from config import UPLOADS_DIR
    path = UPLOADS_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Upload not found")
    media_type = _guess_media_type(filename)
    return FileResponse(str(path), media_type=media_type)


@router.get("/peaks/{subdir}/{filename}")
async def get_peaks(subdir: str, filename: str):
    """Get waveform peak data for visualization."""
    if subdir == "output":
        audio_path = AUDIO_OUTPUT_DIR / filename
    elif subdir == "stems":
        audio_path = STEMS_OUTPUT_DIR / filename
    else:
        raise HTTPException(400, "Invalid subdir")

    if not audio_path.exists():
        raise HTTPException(404, "Audio file not found")

    # Try cached peaks first
    peaks = load_peaks(str(audio_path))
    if peaks is None:
        peaks = compute_peaks(str(audio_path))
        save_peaks(str(audio_path))

    return {"peaks": peaks}


def _guess_media_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return {
        ".flac": "audio/flac",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".opus": "audio/opus",
        ".aac": "audio/aac",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
    }.get(ext, "application/octet-stream")
