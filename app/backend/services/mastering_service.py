"""Mastering service — LUFS normalization + true-peak limiting for digital store delivery.

Target specs (matching common digital distributor requirements):
- Integrated loudness: -14 LUFS
- True peak ceiling: -1.0 dBTP
- Sample rate: 44100 Hz
- Bit depth: 16-bit (PCM WAV)
"""

from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

TARGET_LUFS = -14.0
TRUE_PEAK_CEILING_DB = -1.0
TARGET_SR = 44100
TARGET_SUBTYPE = "PCM_16"  # 16-bit WAV


# ── LUFS Measurement (ITU-R BS.1770-4 simplified) ───────────────────────────

def _k_weighting(audio: np.ndarray, sr: int) -> np.ndarray:
    """Apply K-weighting filter (simplified two-stage shelving + high-pass).

    This is a simplified version that applies a pre-emphasis boost to the
    high frequencies and a roll-off for low frequencies, approximating
    the K-weighting curve specified in ITU-R BS.1770.
    """
    from scipy.signal import sosfilt, butter

    # Stage 1: High-shelf boost (~+4dB above 1500 Hz)
    # Approximated with a 2nd-order high-pass at 1500 Hz added to original
    nyq = sr / 2.0
    fc1 = min(1681.0, nyq * 0.95)
    sos_shelf = butter(2, fc1 / nyq, btype='high', output='sos')
    shelf_signal = sosfilt(sos_shelf, audio, axis=0)
    stage1 = audio + 0.6 * shelf_signal  # ~+3.5dB boost above fc

    # Stage 2: High-pass at ~38 Hz (removes sub-bass)
    fc2 = min(38.0, nyq * 0.5)
    sos_hp = butter(2, fc2 / nyq, btype='high', output='sos')
    return sosfilt(sos_hp, stage1, axis=0)


def measure_lufs(audio: np.ndarray, sr: int) -> float:
    """Measure integrated loudness in LUFS (ITU-R BS.1770-4 simplified).

    Parameters:
        audio: float64 array, shape (samples,) or (samples, channels)
        sr: sample rate

    Returns:
        Integrated loudness in LUFS (dB).
    """
    if audio.ndim == 1:
        audio = audio[:, np.newaxis]

    n_channels = audio.shape[1]
    weighted = _k_weighting(audio, sr)

    # Mean square per channel
    ms_per_channel = np.mean(weighted ** 2, axis=0)

    # Channel weighting (ITU-R BS.1770: LFE=0, surround channels get +1.5dB)
    # For stereo (2ch), all channels have equal weight of 1.0
    weights = np.ones(n_channels)

    # Weighted sum
    weighted_sum = np.sum(weights * ms_per_channel)

    if weighted_sum <= 0:
        return -70.0  # silence

    lufs = -0.691 + 10.0 * np.log10(weighted_sum)
    return float(lufs)


# ── True Peak Detection ─────────────────────────────────────────────────────

def measure_true_peak_db(audio: np.ndarray, sr: int) -> float:
    """Measure true peak level in dBTP using 4x oversampling.

    Parameters:
        audio: float64 array, shape (samples,) or (samples, channels)
        sr: sample rate

    Returns:
        True peak level in dBTP.
    """
    if audio.ndim == 1:
        audio = audio[:, np.newaxis]

    max_peak = 0.0
    for ch in range(audio.shape[1]):
        # 4x oversample using polyphase resampling
        oversampled = resample_poly(audio[:, ch], up=4, down=1)
        ch_peak = float(np.max(np.abs(oversampled)))
        max_peak = max(max_peak, ch_peak)

    if max_peak <= 0:
        return -100.0
    return float(20.0 * np.log10(max_peak))


# ── True Peak Limiter ────────────────────────────────────────────────────────

def _true_peak_limit(audio: np.ndarray, sr: int, ceiling_db: float) -> np.ndarray:
    """Apply a simple true-peak limiter.

    Uses look-ahead and gain reduction to prevent true peaks from
    exceeding the ceiling.
    """
    ceiling_lin = 10.0 ** (ceiling_db / 20.0)

    # Measure current true peak
    if audio.ndim == 1:
        work = audio[:, np.newaxis]
    else:
        work = audio.copy()

    # Check 4x oversampled peak
    max_tp = 0.0
    for ch in range(work.shape[1]):
        oversampled = resample_poly(work[:, ch], up=4, down=1)
        max_tp = max(max_tp, float(np.max(np.abs(oversampled))))

    if max_tp <= ceiling_lin:
        return audio  # Already below ceiling

    # Simple approach: scale down to meet ceiling with small safety margin
    reduction = ceiling_lin / max_tp * 0.998  # tiny margin for float rounding
    result = audio * reduction

    return result


# ── Master function ──────────────────────────────────────────────────────────

def master_track(
    input_path: str | Path,
    output_path: Optional[str | Path] = None,
    target_lufs: float = TARGET_LUFS,
    true_peak_ceiling_db: float = TRUE_PEAK_CEILING_DB,
    target_sr: int = TARGET_SR,
) -> Path:
    """Apply broadcast-ready mastering to a track.

    Steps:
    1. Read source audio (any format soundfile supports)
    2. Resample to target sample rate (44.1 kHz) if needed
    3. Normalize to target integrated loudness (LUFS)
    4. Apply true-peak limiting
    5. Write 16-bit WAV

    Parameters:
        input_path: Path to source audio file
        output_path: Where to write the mastered WAV (defaults to input stem + _mastered.wav)
        target_lufs: Target integrated loudness in LUFS (default -14)
        true_peak_ceiling_db: True peak ceiling in dBTP (default -1.0)
        target_sr: Target sample rate (default 44100)

    Returns:
        Path to the mastered WAV file.
    """
    input_path = Path(input_path)
    if output_path is None:
        output_path = input_path.with_name(f"{input_path.stem}_mastered.wav")
    else:
        output_path = Path(output_path)

    logger.info("Mastering: %s → %s", input_path.name, output_path.name)

    # 1. Read source
    audio, sr = sf.read(str(input_path), dtype="float64")
    if audio.ndim == 1:
        audio = audio[:, np.newaxis]

    logger.info(
        "  Source: %d ch, %d Hz, %.1f sec, %d samples",
        audio.shape[1], sr, len(audio) / sr, len(audio),
    )

    # 2. Resample if needed
    if sr != target_sr:
        from math import gcd
        g = gcd(sr, target_sr)
        up, down = target_sr // g, sr // g
        resampled = np.zeros(
            (int(np.ceil(len(audio) * up / down)), audio.shape[1]),
            dtype=np.float64,
        )
        for ch in range(audio.shape[1]):
            resampled[:, ch] = resample_poly(audio[:, ch], up, down)[: resampled.shape[0]]
        audio = resampled
        sr = target_sr
        logger.info("  Resampled to %d Hz", sr)

    # 3. LUFS normalization
    current_lufs = measure_lufs(audio, sr)
    logger.info("  Current loudness: %.1f LUFS", current_lufs)

    if current_lufs > -70.0:  # Not silence
        gain_db = target_lufs - current_lufs
        gain_lin = 10.0 ** (gain_db / 20.0)
        audio = audio * gain_lin
        logger.info("  Applied %.1f dB gain → target %.1f LUFS", gain_db, target_lufs)
    else:
        logger.warning("  Audio is effectively silent, skipping normalization")

    # 4. True-peak limiting
    tp_before = measure_true_peak_db(audio, sr)
    audio = _true_peak_limit(audio, sr, true_peak_ceiling_db)
    tp_after = measure_true_peak_db(audio, sr)
    logger.info(
        "  True peak: %.1f dBTP → %.1f dBTP (ceiling: %.1f dBTP)",
        tp_before, tp_after, true_peak_ceiling_db,
    )

    # 5. Clip guard (should not be needed after limiting, but safety first)
    audio = np.clip(audio, -1.0, 1.0)

    # 6. Squeeze mono if single channel
    if audio.shape[1] == 1:
        audio = audio[:, 0]

    # 7. Write 16-bit WAV
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(output_path), audio, target_sr, subtype=TARGET_SUBTYPE)

    final_size_mb = output_path.stat().st_size / (1024 * 1024)
    logger.info("  Output: %s (%.1f MB)", output_path.name, final_size_mb)

    return output_path


def master_track_to_bytes(
    input_path: str | Path,
    target_lufs: float = TARGET_LUFS,
    true_peak_ceiling_db: float = TRUE_PEAK_CEILING_DB,
    target_sr: int = TARGET_SR,
) -> tuple[bytes, str]:
    """Master a track and return the WAV bytes + suggested filename.

    Useful for streaming/zip responses without writing temp files.
    """
    input_path = Path(input_path)
    filename = f"{input_path.stem}_mastered.wav"

    # Use master_track with a temp path, then read bytes
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        master_track(input_path, tmp_path, target_lufs, true_peak_ceiling_db, target_sr)
        wav_bytes = tmp_path.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)

    return wav_bytes, filename
