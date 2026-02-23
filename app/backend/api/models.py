"""Model management endpoints — load/switch models, GPU status."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models.schemas import LoadLMRequest, LoadModelRequest, ModelStatusResponse

router = APIRouter(prefix="/api/models", tags=["models"])


def _get_service():
    from main import inference_service
    return inference_service


@router.get("/status", response_model=ModelStatusResponse)
async def model_status():
    """Get full model + GPU + LM status."""
    return _get_service().get_model_status()


@router.post("/load")
async def load_model(request: LoadModelRequest):
    """Load or switch to a DiT model. Handles both first load and switching."""
    svc = _get_service()
    try:
        msg = svc.load_model(request.model_name, request.checkpoint_path)
        return {
            "status": "ok",
            "message": msg,
            "model": request.model_name,
            "initialized": svc._initialized,
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/load-lm")
async def load_lm(request: LoadLMRequest):
    """Load or switch the LM model."""
    svc = _get_service()
    try:
        if svc.llm_handler is None:
            raise HTTPException(400, "LLM handler not initialized")
        status, ok = svc.llm_handler.initialize(
            checkpoint_dir=svc.checkpoint_dir,
            lm_model_path=request.model_name,
            backend="pt",
            device="auto",
        )
        return {"status": "ok" if ok else "error", "message": status}
    except Exception as e:
        raise HTTPException(500, str(e))
