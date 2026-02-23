"""LoRA/LoKr adapter management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models.schemas import (
    AdapterConfigUpdate,
    AdapterListResponse,
    AddSearchPathRequest,
    LoadAdapterRequest,
)

router = APIRouter(prefix="/api/lora", tags=["lora"])


def _get_service():
    from main import inference_service
    return inference_service


@router.get("/list", response_model=AdapterListResponse)
async def list_adapters():
    """List all available adapters with compatibility info."""
    svc = _get_service()
    adapters = svc.scan_adapters()
    current = svc.get_adapter_status()
    return AdapterListResponse(
        adapters=adapters,
        current=current,
        search_paths=svc._adapter_search_paths,
    )


@router.post("/load")
async def load_adapter(request: LoadAdapterRequest):
    """Load a LoRA/LoKr adapter."""
    svc = _get_service()
    try:
        msg = svc.load_adapter(request.path, request.scale)
        return {"status": "ok", "message": msg}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/unload")
async def unload_adapter():
    """Unload the current adapter."""
    svc = _get_service()
    try:
        msg = svc.unload_adapter()
        return {"status": "ok", "message": msg}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.patch("/config")
async def update_adapter_config(request: AdapterConfigUpdate):
    """Toggle active state or change scale without reloading."""
    svc = _get_service()
    try:
        msg = svc.set_adapter_config(active=request.active, scale=request.scale)
        return {"status": "ok", "message": msg}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/scan")
async def scan_adapters():
    """Re-scan all search paths for adapters."""
    svc = _get_service()
    adapters = svc.scan_adapters()
    return {"status": "ok", "count": len(adapters)}


@router.post("/add-path")
async def add_search_path(request: AddSearchPathRequest):
    """Add a folder to adapter search paths."""
    svc = _get_service()
    svc.add_search_path(request.path)
    return {"status": "ok", "search_paths": svc._adapter_search_paths}
