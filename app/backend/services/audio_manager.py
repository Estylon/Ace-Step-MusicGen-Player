"""Audio file management — saving, peaks computation, cleanup."""

from __future__ import annotations

import json
import numpy as np
from pathlib import Path
from typing import Optional

from config import AUDIO_OUTPUT_DIR, STEMS_OUTPUT_DIR, UPLOADS_DIR


def get_audio_url(filename: str, subdir: str = "output") -> str:
    """Build the API URL for an audio file."""
    return f"/api/audio/{subdir}/{filename}"


def compute_peaks(audio_path: str, num_peaks: int = 200) -> list[float]:
    """Compute waveform peaks for visualization (fast, low-res)."""
    try:
        import librosa
        y, _sr = librosa.load(audio_path, sr=22050, mono=True, duration=600)
        if len(y) == 0:
            return [0.0] * num_peaks

        chunk_size = max(1, len(y) // num_peaks)
        peaks = []
        for i in range(num_peaks):
            start = i * chunk_size
            end = min(start + chunk_size, len(y))
            if start >= len(y):
                peaks.append(0.0)
            else:
                peaks.append(float(np.max(np.abs(y[start:end]))))

        # Normalize to 0-1
        max_peak = max(peaks) if peaks else 1.0
        if max_peak > 0:
            peaks = [p / max_peak for p in peaks]
        return peaks
    except Exception:
        return [0.0] * num_peaks


def get_audio_duration(audio_path: str) -> float:
    """Get audio duration in seconds."""
    try:
        import librosa
        return float(librosa.get_duration(path=audio_path))
    except Exception:
        return 0.0


def save_peaks(audio_path: str, peaks_path: Optional[str] = None) -> str:
    """Compute and save peaks as JSON sidecar file."""
    if peaks_path is None:
        p = Path(audio_path)
        peaks_path = str(p.with_suffix(".peaks.json"))

    peaks = compute_peaks(audio_path)
    with open(peaks_path, "w") as f:
        json.dump(peaks, f)
    return peaks_path


def load_peaks(audio_path: str) -> Optional[list[float]]:
    """Load pre-computed peaks from sidecar file."""
    p = Path(audio_path)
    peaks_path = p.with_suffix(".peaks.json")
    if peaks_path.exists():
        with open(peaks_path) as f:
            return json.load(f)
    return None


def ensure_output_dirs():
    """Create output directories if missing."""
    for d in (AUDIO_OUTPUT_DIR, STEMS_OUTPUT_DIR, UPLOADS_DIR):
        d.mkdir(parents=True, exist_ok=True)
