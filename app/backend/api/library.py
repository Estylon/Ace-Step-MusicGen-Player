"""Library CRUD endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from models.schemas import LibraryListResponse, TrackDetailResponse, TrackUpdateRequest
from services import library_service

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("", response_model=LibraryListResponse)
async def list_tracks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = "",
    sort: str = "created_at",
    order: str = "desc",
):
    """List tracks with pagination and search."""
    return await library_service.list_tracks(
        page=page, page_size=page_size, search=search, sort=sort, order=order
    )


@router.get("/{track_id}", response_model=TrackDetailResponse)
async def get_track(track_id: str):
    """Get track details including stems."""
    result = await library_service.get_track(track_id)
    if not result:
        raise HTTPException(404, "Track not found")
    return result


@router.patch("/{track_id}")
async def update_track(track_id: str, request: TrackUpdateRequest):
    """Update track metadata (title, tags)."""
    ok = await library_service.update_track(
        track_id, title=request.title, tags=request.tags
    )
    if not ok:
        raise HTTPException(404, "Track not found")
    return {"status": "ok"}


@router.delete("/{track_id}")
async def delete_track(track_id: str):
    """Delete a track and its files."""
    ok = await library_service.delete_track(track_id)
    if not ok:
        raise HTTPException(404, "Track not found")
    return {"status": "ok"}
