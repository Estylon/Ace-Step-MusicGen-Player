"""GPU status endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from models.schemas import GPUInfo

router = APIRouter(prefix="/api/gpu", tags=["gpu"])


@router.get("/status", response_model=GPUInfo)
async def gpu_status():
    """Get current GPU info (VRAM, tier, etc.)."""
    try:
        import torch
        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            allocated = torch.cuda.memory_allocated(0)
            return GPUInfo(
                tier="",  # Will be filled from model status
                name=props.name,
                vram_total_gb=round(props.total_mem / (1024**3), 1),
                vram_free_gb=round((props.total_mem - allocated) / (1024**3), 1),
                compute_capability=f"{props.major}.{props.minor}",
            )
    except Exception:
        pass
    return GPUInfo()
