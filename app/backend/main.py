"""ACE-Step MusicGen Player — FastAPI backend entry point.

Usage:
    python main.py [--host HOST] [--port PORT] [--model MODEL] [--lm LM_MODEL]
    uvicorn main:app --reload --host 127.0.0.1 --port 3456
"""

from __future__ import annotations

import argparse
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure config runs first (sets up sys.path for ACE-Step imports)
import config

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.router import api_router
from api.settings import load_settings, apply_settings
from models.database import init_db
from services.inference_service import InferenceService
from services.stem_service import StemService

# ── Global singletons ────────────────────────────────────────────────────────

inference_service = InferenceService()
stem_service = StemService()


# ── Lifespan (startup / shutdown) ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown."""
    # Database
    await init_db()

    # Load user settings (persisted paths)
    user_settings = load_settings()
    print(f"[Backend] User settings loaded — trainer: {user_settings.trainer_path}")
    print(f"[Backend]   Checkpoint dir: {user_settings.checkpoint_dir}")
    print(f"[Backend]   LoRA paths: {user_settings.lora_search_paths}")

    # CLI args / env vars can override saved settings
    model = os.environ.get("ACESTEP_MODEL", "acestep-v15-turbo")
    lm_model = os.environ.get("ACESTEP_LM_MODEL", "")
    checkpoint_dir = os.environ.get("ACESTEP_CHECKPOINT_DIR", user_settings.checkpoint_dir)

    # Initialize inference engine
    print(f"[Backend] Initializing ACE-Step model: {model}")
    print(f"[Backend] Checkpoint dir: {checkpoint_dir}")
    try:
        status = inference_service.initialize(
            model_name=model,
            lm_model=lm_model or None,
            checkpoint_dir=checkpoint_dir,
        )
        # Apply user settings (adapter search paths, output dirs)
        apply_settings(user_settings)
        print(f"[Backend] Init complete: {status}")
    except Exception as e:
        print(f"[Backend] WARNING: Model init failed: {e}")
        print("[Backend] The server will start but generation will fail until a model is loaded.")
        # Still apply settings for paths
        try:
            apply_settings(user_settings)
        except Exception:
            pass

    yield

    # Cleanup
    print("[Backend] Shutting down...")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ACE-Step MusicGen Player",
    description="Premium music generation + stem separation API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3456"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(api_router)

# Serve built frontend (if exists)
static_dir = config.STATIC_DIR
if static_dir.exists() and (static_dir / "index.html").exists():
    # Serve at root — MUST be after API routes
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
else:
    @app.get("/")
    async def root():
        return {
            "name": "ACE-Step MusicGen Player API",
            "docs": "/docs",
            "status": "running",
            "note": "Frontend not built. Run 'npm run build' in app/frontend/ or use Vite dev server.",
        }


# ── CLI entry point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="ACE-Step MusicGen Player Backend")
    parser.add_argument("--host", default=config.DEFAULT_HOST, help="Bind host")
    parser.add_argument("--port", type=int, default=config.DEFAULT_PORT, help="Bind port")
    parser.add_argument("--model", default="acestep-v15-turbo", help="DiT model name")
    parser.add_argument("--lm", default="", help="LM model name (empty = no LM)")
    parser.add_argument("--checkpoint-dir", default=None, help="Checkpoint directory")
    args = parser.parse_args()

    # Set env vars for lifespan to pick up
    os.environ["ACESTEP_MODEL"] = args.model
    if args.lm:
        os.environ["ACESTEP_LM_MODEL"] = args.lm
    if args.checkpoint_dir:
        os.environ["ACESTEP_CHECKPOINT_DIR"] = args.checkpoint_dir

    print(f"[Backend] Starting on {args.host}:{args.port}")
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        workers=1,
        log_level="info",
    )
