"""Download service — fetch official ACE-Step models from HuggingFace."""

from __future__ import annotations

import asyncio
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4


# ── Registry of official ACE-Step HuggingFace repos ─────────────────────────

DOWNLOADABLE_MODELS: list[dict[str, Any]] = [
    # ── Bundle (first-time setup) ──────────────────────────────────────
    {
        "repo_id": "ACE-Step/Ace-Step1.5",
        "name": "ACE-Step 1.5 Complete",
        "description": "Full package: turbo model + VAE + text encoder + LM 1.7B",
        "type": "bundle",
        "model_type": "",
        "size_gb": 10.1,
        "check_folders": ["acestep-v15-turbo", "vae", "Qwen3-Embedding-0.6B", "acestep-5Hz-lm-1.7B"],
    },
    # ── DiT models (standalone) ────────────────────────────────────────
    {
        "repo_id": "ACE-Step/acestep-v15-base",
        "name": "acestep-v15-base",
        "description": "Base model — 50 steps, CFG, ODE+SDE",
        "type": "dit",
        "model_type": "base",
        "size_gb": 4.8,
        "check_folders": ["acestep-v15-base"],
    },
    {
        "repo_id": "ACE-Step/acestep-v15-sft",
        "name": "acestep-v15-sft",
        "description": "SFT model — supervised fine-tuned",
        "type": "dit",
        "model_type": "sft",
        "size_gb": 4.8,
        "check_folders": ["acestep-v15-sft"],
    },
    {
        "repo_id": "ACE-Step/acestep-v15-turbo-shift1",
        "name": "acestep-v15-turbo-shift1",
        "description": "Turbo Shift-1 variant",
        "type": "dit",
        "model_type": "turbo",
        "size_gb": 4.8,
        "check_folders": ["acestep-v15-turbo-shift1"],
    },
    {
        "repo_id": "ACE-Step/acestep-v15-turbo-shift3",
        "name": "acestep-v15-turbo-shift3",
        "description": "Turbo Shift-3 variant",
        "type": "dit",
        "model_type": "turbo",
        "size_gb": 4.8,
        "check_folders": ["acestep-v15-turbo-shift3"],
    },
    {
        "repo_id": "ACE-Step/acestep-v15-turbo-continuous",
        "name": "acestep-v15-turbo-continuous",
        "description": "Turbo Continuous variant",
        "type": "dit",
        "model_type": "turbo",
        "size_gb": 4.8,
        "check_folders": ["acestep-v15-turbo-continuous"],
    },
    # ── Language models ────────────────────────────────────────────────
    {
        "repo_id": "ACE-Step/acestep-5Hz-lm-0.6B",
        "name": "acestep-5Hz-lm-0.6B",
        "description": "Lightweight LM — low VRAM usage",
        "type": "lm",
        "model_type": "",
        "size_gb": 1.2,
        "check_folders": ["acestep-5Hz-lm-0.6B"],
    },
    {
        "repo_id": "ACE-Step/acestep-5Hz-lm-4B",
        "name": "acestep-5Hz-lm-4B",
        "description": "Large LM — highest quality, needs ~10 GB VRAM",
        "type": "lm",
        "model_type": "",
        "size_gb": 8.0,
        "check_folders": ["acestep-5Hz-lm-4B"],
    },
]

# Essential folders that must exist for any model to work
_ESSENTIAL_FOLDERS = {"vae", "Qwen3-Embedding-0.6B"}


# ── Service ──────────────────────────────────────────────────────────────────


class DownloadService:
    """Manages HuggingFace model downloads with progress tracking."""

    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._jobs: dict[str, dict[str, Any]] = {}
        self._cancel_flags: dict[str, threading.Event] = {}

    # ── Public API ───────────────────────────────────────────────────────

    def list_downloadable(self, checkpoint_dir: str) -> dict[str, Any]:
        """Return all known models with their install status."""
        cp = Path(checkpoint_dir)
        models = []

        for entry in DOWNLOADABLE_MODELS:
            installed = all(
                (cp / folder).is_dir() and (cp / folder / "config.json").exists()
                for folder in entry["check_folders"]
            )
            models.append({
                "repo_id": entry["repo_id"],
                "name": entry["name"],
                "description": entry["description"],
                "type": entry["type"],
                "model_type": entry.get("model_type", ""),
                "size_gb": entry["size_gb"],
                "installed": installed,
            })

        # Check essential infrastructure
        has_essential = (
            (cp / "vae" / "config.json").exists()
            and (cp / "Qwen3-Embedding-0.6B" / "config.json").exists()
            and any(
                (cp / f).is_dir() and (cp / f / "config.json").exists()
                for entry in DOWNLOADABLE_MODELS
                if entry["type"] == "dit"
                for f in entry["check_folders"]
            )
        )

        return {
            "models": models,
            "checkpoint_dir": str(cp),
            "has_essential": has_essential,
        }

    def start_download(
        self,
        repo_id: str,
        checkpoint_dir: str,
        loop: asyncio.AbstractEventLoop,
    ) -> str:
        """Start a background download job.  Returns job_id."""
        job_id = str(uuid4())
        queue: asyncio.Queue = asyncio.Queue()
        cancel_event = threading.Event()

        self._jobs[job_id] = {
            "status": "downloading",
            "queue": queue,
            "repo_id": repo_id,
            "error": None,
        }
        self._cancel_flags[job_id] = cancel_event

        self._executor.submit(
            self._run_download,
            job_id,
            repo_id,
            checkpoint_dir,
            queue,
            loop,
            cancel_event,
        )
        return job_id

    def get_job(self, job_id: str) -> Optional[dict[str, Any]]:
        return self._jobs.get(job_id)

    def cancel_download(self, job_id: str) -> bool:
        flag = self._cancel_flags.get(job_id)
        if flag:
            flag.set()
            return True
        return False

    # ── Internal ─────────────────────────────────────────────────────────

    def _find_entry(self, repo_id: str) -> Optional[dict[str, Any]]:
        for e in DOWNLOADABLE_MODELS:
            if e["repo_id"] == repo_id:
                return e
        return None

    def _emit(
        self,
        loop: asyncio.AbstractEventLoop,
        queue: asyncio.Queue,
        data: dict,
    ) -> None:
        try:
            loop.call_soon_threadsafe(queue.put_nowait, data)
        except Exception:
            pass

    def _dir_size_bytes(self, path: Path) -> int:
        """Recursively compute directory size in bytes."""
        total = 0
        try:
            for f in path.rglob("*"):
                if f.is_file():
                    total += f.stat().st_size
        except Exception:
            pass
        return total

    def _run_download(
        self,
        job_id: str,
        repo_id: str,
        checkpoint_dir: str,
        queue: asyncio.Queue,
        loop: asyncio.AbstractEventLoop,
        cancel_event: threading.Event,
    ) -> None:
        """Blocking download executed in thread pool."""
        try:
            from huggingface_hub import snapshot_download

            entry = self._find_entry(repo_id)
            total_gb = entry["size_gb"] if entry else 5.0
            total_bytes = total_gb * 1_073_741_824  # approx
            name = entry["name"] if entry else repo_id
            is_bundle = entry and entry["type"] == "bundle"

            cp = Path(checkpoint_dir)
            cp.mkdir(parents=True, exist_ok=True)

            self._emit(loop, queue, {
                "type": "progress",
                "percent": 0,
                "downloaded_gb": 0,
                "total_gb": total_gb,
                "message": f"Starting download of {name}...",
            })

            if is_bundle:
                # Download directly into checkpoint_dir — subfolders match expected layout
                local_dir = str(cp)
            else:
                # Standalone repo → create subfolder named after model
                model_name = repo_id.split("/")[-1]
                local_dir = str(cp / model_name)

            # Start a monitor thread for progress polling
            monitor_stop = threading.Event()
            target_path = Path(local_dir)

            def _monitor():
                while not monitor_stop.is_set():
                    time.sleep(2)
                    if monitor_stop.is_set():
                        break
                    downloaded = self._dir_size_bytes(target_path)
                    pct = min(99.0, (downloaded / total_bytes) * 100) if total_bytes > 0 else 0
                    self._emit(loop, queue, {
                        "type": "progress",
                        "percent": round(pct, 1),
                        "downloaded_gb": round(downloaded / 1_073_741_824, 2),
                        "total_gb": total_gb,
                        "message": f"Downloading {name}...",
                    })

            monitor_thread = threading.Thread(target=_monitor, daemon=True)
            monitor_thread.start()

            try:
                # Check cancellation before starting
                if cancel_event.is_set():
                    raise InterruptedError("Download cancelled")

                snapshot_download(
                    repo_id,
                    local_dir=local_dir,
                    local_dir_use_symlinks=False,
                )

                # Check cancellation after download
                if cancel_event.is_set():
                    raise InterruptedError("Download cancelled")

            finally:
                monitor_stop.set()
                monitor_thread.join(timeout=5)

            # Success
            self._jobs[job_id]["status"] = "complete"
            self._emit(loop, queue, {
                "type": "complete",
                "message": f"{name} downloaded successfully",
            })

        except InterruptedError:
            self._jobs[job_id]["status"] = "cancelled"
            self._emit(loop, queue, {
                "type": "error",
                "message": "Download cancelled",
            })

        except Exception as e:
            self._jobs[job_id]["status"] = "error"
            self._jobs[job_id]["error"] = str(e)
            import traceback
            traceback.print_exc()
            self._emit(loop, queue, {
                "type": "error",
                "message": str(e),
            })

        finally:
            # Clean up cancel flag
            self._cancel_flags.pop(job_id, None)


# ── Singleton ────────────────────────────────────────────────────────────────

download_service = DownloadService()
