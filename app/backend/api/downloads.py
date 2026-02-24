"""Download endpoints — list, start, progress SSE, cancel."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from models.schemas import StartDownloadRequest

router = APIRouter(prefix="/api/downloads", tags=["downloads"])


def _get_checkpoint_dir() -> str:
    from main import inference_service
    return str(inference_service.checkpoint_dir)


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/available")
async def list_downloadable():
    """List all downloadable models with install status."""
    from services.download_service import download_service

    return download_service.list_downloadable(_get_checkpoint_dir())


@router.post("/start")
async def start_download(request: StartDownloadRequest):
    """Start downloading a model from HuggingFace."""
    from services.download_service import download_service

    loop = asyncio.get_event_loop()
    job_id = download_service.start_download(
        repo_id=request.repo_id,
        checkpoint_dir=_get_checkpoint_dir(),
        loop=loop,
    )
    return {"job_id": job_id, "status": "downloading"}


@router.get("/{job_id}/progress")
async def download_progress(job_id: str):
    """SSE stream for download progress."""
    from services.download_service import download_service

    job = download_service.get_job(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found")

    queue: asyncio.Queue = job["queue"]

    async def event_generator():
        # If already complete/error, send immediately
        if job["status"] == "complete":
            yield {
                "event": "message",
                "data": json.dumps({"type": "complete", "message": "Download complete"}),
            }
            return
        if job["status"] in ("error", "cancelled"):
            yield {
                "event": "message",
                "data": json.dumps({
                    "type": "error",
                    "message": job.get("error", "Download failed"),
                }),
            }
            return

        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=30)
                yield {"event": "message", "data": json.dumps(msg)}
                if msg.get("type") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                # Keepalive
                yield {"event": "ping", "data": ""}

    return EventSourceResponse(event_generator())


@router.post("/{job_id}/cancel")
async def cancel_download(job_id: str):
    """Cancel an active download."""
    from services.download_service import download_service

    ok = download_service.cancel_download(job_id)
    if not ok:
        raise HTTPException(404, f"Job {job_id} not found or already finished")
    return {"status": "cancelled"}
