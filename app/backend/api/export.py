"""Batch export endpoint — mastered WAV / MP3 files for digital store delivery."""

from __future__ import annotations

import io
import logging
import tempfile
import zipfile
from pathlib import Path

import soundfile as sf
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from models.schemas import BatchExportRequest
from services import library_service
from services.mastering_service import master_track, encode_mp3

router = APIRouter(prefix="/api/export", tags=["export"])

logger = logging.getLogger(__name__)


@router.post("/batch")
async def batch_export(request: BatchExportRequest):
    """Export multiple tracks as mastered WAV or MP3 files in a ZIP archive.

    Each track is:
    - Resampled to the target sample rate (default 44.1 kHz)
    - Normalized to the target integrated loudness (default -14 LUFS)
    - True-peak limited (default -1.0 dBTP)
    - Written as 16-bit PCM WAV or encoded as MP3

    Returns a ZIP file containing all mastered tracks.
    """
    track_ids = request.track_ids
    out_format = request.format  # "wav" or "mp3"
    ext = f".{out_format}"

    if not track_ids:
        raise HTTPException(400, "No track IDs provided")

    # Resolve tracks from the database
    tracks = []
    for tid in track_ids:
        detail = await library_service.get_track(tid)
        if not detail:
            raise HTTPException(404, f"Track not found: {tid}")
        tracks.append(detail.track)

    # Verify all audio files exist
    missing = [t.title or t.id for t in tracks if not Path(t.audio_path).is_file()]
    if missing:
        raise HTTPException(
            404,
            f"Audio files not found for: {', '.join(missing)}",
        )

    logger.info(
        "Batch export (%s): %d tracks, target %.1f LUFS, %.1f dBTP, %d Hz%s",
        out_format.upper(),
        len(tracks), request.target_lufs, request.true_peak_db, request.sample_rate,
        f", {request.mp3_bitrate} kbps" if out_format == "mp3" else "",
    )

    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        used_names: set[str] = set()

        for track in tracks:
            # Determine output filename
            base_name = _safe_filename(track.title or track.id)
            out_name = f"{base_name}{ext}"

            # Avoid duplicates
            counter = 1
            while out_name in used_names:
                out_name = f"{base_name}_{counter}{ext}"
                counter += 1
            used_names.add(out_name)

            try:
                # Master to a temp WAV file
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp_path = Path(tmp.name)

                master_track(
                    input_path=track.audio_path,
                    output_path=tmp_path,
                    target_lufs=request.target_lufs,
                    true_peak_ceiling_db=request.true_peak_db,
                    target_sr=request.sample_rate,
                )

                if out_format == "mp3":
                    # Read mastered WAV → encode to MP3
                    audio, sr = sf.read(str(tmp_path), dtype="float64")
                    mp3_bytes = encode_mp3(audio, sr, bitrate=request.mp3_bitrate)
                    zf.writestr(out_name, mp3_bytes)
                else:
                    # Add WAV directly to ZIP
                    zf.write(str(tmp_path), out_name)

                # Cleanup temp WAV
                tmp_path.unlink(missing_ok=True)

                logger.info("  Mastered: %s → %s", track.title, out_name)

            except Exception as e:
                # Cleanup on error
                if 'tmp_path' in dir() and tmp_path.exists():
                    tmp_path.unlink(missing_ok=True)
                logger.error("  Failed to master %s: %s", track.title, e)
                raise HTTPException(
                    500,
                    f"Failed to master track '{track.title or track.id}': {str(e)}",
                )

    zip_buffer.seek(0)
    size = zip_buffer.getbuffer().nbytes

    zip_filename = f"{'mp3' if out_format == 'mp3' else 'mastered'}_export.zip"

    logger.info("Batch export complete: %d tracks, %.1f MB", len(tracks), size / (1024 * 1024))

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_filename}"',
            "Content-Length": str(size),
        },
    )


def _safe_filename(name: str, max_len: int = 80) -> str:
    """Produce a filesystem-safe filename."""
    import re
    safe = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)
    safe = re.sub(r'[\s_]+', '_', safe).strip('_. ')
    if len(safe) > max_len:
        safe = safe[:max_len].rstrip('_. ')
    return safe or "track"
