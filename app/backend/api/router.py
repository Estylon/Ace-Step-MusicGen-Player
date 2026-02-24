"""Main API router — mounts all sub-routers."""

from __future__ import annotations

from fastapi import APIRouter

from api import generate, stems, models, lora, gpu, library, audio, settings, downloads

api_router = APIRouter()

api_router.include_router(generate.router)
api_router.include_router(stems.router)
api_router.include_router(models.router)
api_router.include_router(lora.router)
api_router.include_router(gpu.router)
api_router.include_router(library.router)
api_router.include_router(audio.router)
api_router.include_router(settings.router)
api_router.include_router(downloads.router)
