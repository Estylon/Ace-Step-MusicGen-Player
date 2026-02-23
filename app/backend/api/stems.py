"""Stem separation endpoints — POST to create + SSE for progress."""

from __future__ import annotations

import asyncio
import json
import traceback
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from models.schemas import StemSeparateRequest, StemSeparateResponse
from services import library_service

router = APIRouter(prefix="/api/stems", tags=["stems"])

_executor = ThreadPoolExecutor(max_workers=1)
_jobs: dict[str, dict[str, Any]] = {}


def _get_stem_service():
    from main import stem_service
    return stem_service


@router.post("/separate", response_model=StemSeparateResponse)
async def separate_stems(request: StemSeparateRequest):
    """Start a stem separation job."""
    job_id = str(uuid4())
    queue: asyncio.Queue = asyncio.Queue()

    _jobs[job_id] = {
        "status": "queued",
        "queue": queue,
        "stems": [],
        "error": None,
    }

    loop = asyncio.get_event_loop()

    def _run():
        try:
            _jobs[job_id]["status"] = "running"

            # Resolve source — could be a library track ID or direct path
            audio_path = request.source
            if not audio_path or not audio_path.strip():
                raise ValueError("No audio source provided")

            # Check if it's a track ID (UUID format)
            if len(audio_path) == 36 and "-" in audio_path:
                try:
                    detail = asyncio.run_coroutine_threadsafe(
                        library_service.get_track(audio_path), loop
                    ).result(timeout=5)
                    if detail and detail.track.audio_path:
                        audio_path = detail.track.audio_path
                except Exception:
                    pass

            def progress_cb(msg: str, percent: float):
                try:
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        {"type": "progress", "message": msg, "percent": percent},
                    )
                except Exception:
                    pass

            svc = _get_stem_service()
            stems = svc.separate(audio_path, mode=request.mode, progress_callback=progress_cb)

            _jobs[job_id]["stems"] = stems
            _jobs[job_id]["status"] = "complete"

            loop.call_soon_threadsafe(
                queue.put_nowait,
                {"type": "complete", "stems": [s.model_dump() for s in stems]},
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
    return StemSeparateResponse(job_id=job_id, status="queued")


@router.get("/{job_id}/progress")
async def stem_progress(job_id: str):
    """SSE stream for stem separation progress."""
    if job_id not in _jobs:
        raise HTTPException(404, f"Job {job_id} not found")

    job = _jobs[job_id]
    queue: asyncio.Queue = job["queue"]

    async def event_generator():
        if job["status"] == "complete":
            yield {
                "event": "message",
                "data": json.dumps({
                    "type": "complete",
                    "stems": [s.model_dump() for s in job["stems"]],
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
                yield {"event": "ping", "data": ""}

    return EventSourceResponse(event_generator())
