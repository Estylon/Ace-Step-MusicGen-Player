"""Generation endpoints — POST to create + SSE for progress."""

from __future__ import annotations

import asyncio
import json
import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException, UploadFile, File
from sse_starlette.sse import EventSourceResponse

from config import UPLOADS_DIR
from models.schemas import GenerateRequest, GenerateResponse, TrackInfo
from services import library_service

router = APIRouter(prefix="/api/generate", tags=["generate"])

# ── State ─────────────────────────────────────────────────────────────────────

_executor = ThreadPoolExecutor(max_workers=1)  # Sequential generation
_jobs: dict[str, dict[str, Any]] = {}


def _get_inference_service():
    """Import lazily to avoid circular imports."""
    from main import inference_service
    return inference_service


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("", response_model=GenerateResponse)
async def create_generation(request: GenerateRequest):
    """Start a music generation job."""
    job_id = str(uuid4())
    queue: asyncio.Queue = asyncio.Queue()

    _jobs[job_id] = {
        "status": "queued",
        "queue": queue,
        "tracks": [],
        "error": None,
    }

    loop = asyncio.get_event_loop()

    def _run():
        try:
            _jobs[job_id]["status"] = "running"

            def progress_cb(*args, **kwargs):
                """Forward progress to SSE queue."""
                # ACE-Step progress callback format varies
                msg = str(args[0]) if args else ""
                try:
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        {"type": "progress", "message": msg},
                    )
                except Exception:
                    pass

            svc = _get_inference_service()
            tracks = svc.generate(request, progress_callback=progress_cb)

            # Save to library
            for track in tracks:
                try:
                    asyncio.run_coroutine_threadsafe(
                        library_service.insert_track(track), loop
                    ).result(timeout=5)
                except Exception:
                    pass

            _jobs[job_id]["tracks"] = tracks
            _jobs[job_id]["status"] = "complete"

            loop.call_soon_threadsafe(
                queue.put_nowait,
                {
                    "type": "complete",
                    "tracks": [t.model_dump() for t in tracks],
                },
            )
        except Exception as e:
            _jobs[job_id]["status"] = "error"
            _jobs[job_id]["error"] = str(e)
            traceback.print_exc()
            try:
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    {"type": "error", "message": str(e)},
                )
            except Exception:
                pass

    _executor.submit(_run)
    return GenerateResponse(job_id=job_id, status="queued")


@router.get("/{job_id}/progress")
async def generation_progress(job_id: str):
    """SSE stream for generation progress."""
    if job_id not in _jobs:
        raise HTTPException(404, f"Job {job_id} not found")

    job = _jobs[job_id]
    queue: asyncio.Queue = job["queue"]

    async def event_generator():
        # If already complete/error, send immediately
        if job["status"] == "complete":
            yield {
                "event": "message",
                "data": json.dumps({
                    "type": "complete",
                    "tracks": [t.model_dump() for t in job["tracks"]],
                }),
            }
            return
        if job["status"] == "error":
            yield {
                "event": "message",
                "data": json.dumps({"type": "error", "message": job["error"]}),
            }
            return

        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=30)
                yield {"event": "message", "data": json.dumps(msg)}
                if msg.get("type") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                # Send keepalive
                yield {"event": "ping", "data": ""}

    return EventSourceResponse(event_generator())


@router.post("/upload")
async def upload_reference(file: UploadFile = File(...)):
    """Upload a reference audio file for cover/repaint tasks."""
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "wav"
    dest = UPLOADS_DIR / f"{uuid4()}.{ext}"

    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)

    duration = None
    try:
        from services.audio_manager import get_audio_duration
        duration = get_audio_duration(str(dest))
    except Exception:
        pass

    return {
        "path": str(dest),
        "filename": file.filename,
        "duration": duration,
    }
