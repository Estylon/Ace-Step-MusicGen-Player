"""Presets CRUD endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models.schemas import PresetCreateRequest, PresetInfo, PresetUpdateRequest
from services import preset_service

router = APIRouter(prefix="/api/presets", tags=["presets"])


@router.get("", response_model=list[PresetInfo])
async def list_presets():
    """List all saved presets."""
    rows = await preset_service.list_presets()
    return [PresetInfo(**r) for r in rows]


@router.get("/{preset_id}", response_model=PresetInfo)
async def get_preset(preset_id: str):
    """Get a single preset by ID."""
    row = await preset_service.get_preset(preset_id)
    if not row:
        raise HTTPException(404, "Preset not found")
    return PresetInfo(**row)


@router.post("", response_model=PresetInfo, status_code=201)
async def create_preset(request: PresetCreateRequest):
    """Create a new preset."""
    row = await preset_service.create_preset(request.name, request.params_json)
    return PresetInfo(**row)


@router.put("/{preset_id}")
async def update_preset(preset_id: str, request: PresetUpdateRequest):
    """Update an existing preset."""
    ok = await preset_service.update_preset(
        preset_id, name=request.name, params_json=request.params_json
    )
    if not ok:
        raise HTTPException(404, "Preset not found")
    return {"status": "ok"}


@router.delete("/{preset_id}")
async def delete_preset(preset_id: str):
    """Delete a preset."""
    ok = await preset_service.delete_preset(preset_id)
    if not ok:
        raise HTTPException(404, "Preset not found")
    return {"status": "ok"}
