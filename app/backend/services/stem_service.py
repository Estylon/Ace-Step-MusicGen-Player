"""Stem separation service — wraps audio-separator with lazy model loading."""

from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Callable, Optional
from uuid import uuid4

from config import STEMS_OUTPUT_DIR
from models.schemas import StemInfo
from services.audio_manager import get_audio_url, get_audio_duration


class StemService:
    """Singleton for audio stem separation.

    Models are downloaded on first use (~1.8GB total):
      - BS-RoFormer for vocals/instrumental (SDR 12.97)
      - Demucs htdemucs_ft for multi-stem (SDR 9.2)
    """

    ROFORMER_MODEL = "model_bs_roformer_ep_317_sdr_12.9755.ckpt"
    DEMUCS_MODEL = "htdemucs_ft.yaml"

    def __init__(self):
        self._separator = None
        self._lock = threading.Lock()

    def _get_separator(self):
        """Lazy-init audio-separator."""
        if self._separator is None:
            with self._lock:
                if self._separator is None:
                    from audio_separator.separator import Separator
                    self._separator = Separator()
        return self._separator

    def separate(
        self,
        audio_path: str,
        mode: str = "two-pass",
        progress_callback: Optional[Callable] = None,
    ) -> list[StemInfo]:
        """Separate audio into stems.

        Modes:
          - "vocals":   BS-RoFormer → 2 stems (vocals + instrumental)
          - "multi":    Demucs htdemucs_ft → 4 stems (vocals, drums, bass, other)
          - "two-pass": BS-RoFormer → vocals, then Demucs on instrumental → 4+ stems
        """
        job_id = str(uuid4())
        output_dir = STEMS_OUTPUT_DIR / job_id
        output_dir.mkdir(parents=True, exist_ok=True)

        separator = self._get_separator()

        if mode == "vocals":
            return self._separate_vocals(separator, audio_path, output_dir, progress_callback)
        elif mode == "multi":
            return self._separate_multi(separator, audio_path, output_dir, progress_callback)
        elif mode == "two-pass":
            return self._separate_two_pass(separator, audio_path, output_dir, progress_callback)
        else:
            raise ValueError(f"Unknown mode: {mode}")

    @staticmethod
    def _resolve_output(fpath: str, output_dir: Path) -> Path:
        """Ensure a separator output path is absolute (resolve against output_dir)."""
        p = Path(fpath)
        if not p.is_absolute():
            p = output_dir / p
        return p

    def _separate_vocals(self, separator, audio_path, output_dir, cb) -> list[StemInfo]:
        """BS-RoFormer: best vocal isolation (SDR 12.97)."""
        if cb:
            cb("Loading BS-RoFormer model...", 0.1)

        separator.output_dir = str(output_dir)
        separator.output_format = "flac"
        separator.load_model(model_filename=self.ROFORMER_MODEL)

        if cb:
            cb("Separating vocals...", 0.3)

        output_files = separator.separate(audio_path)

        stems = []
        for fpath in output_files:
            fpath = self._resolve_output(str(fpath), output_dir)
            fname = fpath.stem.lower()
            stem_type = "vocals" if "vocal" in fname else "instrumental"
            stems.append(StemInfo(
                id=str(uuid4()),
                track_id="",
                stem_type=stem_type,
                audio_path=str(fpath),
                audio_url=get_audio_url(fpath.name, f"stems/{output_dir.name}"),
                duration=get_audio_duration(str(fpath)),
            ))

        if cb:
            cb("Vocal separation complete", 1.0)
        return stems

    def _separate_multi(self, separator, audio_path, output_dir, cb) -> list[StemInfo]:
        """Demucs htdemucs_ft: 4-stem separation."""
        if cb:
            cb("Loading Demucs model...", 0.1)

        separator.output_dir = str(output_dir)
        separator.output_format = "flac"
        separator.load_model(model_filename=self.DEMUCS_MODEL)

        if cb:
            cb("Separating stems...", 0.3)

        output_files = separator.separate(audio_path)

        stems = []
        for fpath in output_files:
            fpath = self._resolve_output(str(fpath), output_dir)
            fname = fpath.stem.lower()
            # Demucs names: vocals, drums, bass, other
            stem_type = "other"
            for st in ("vocals", "drums", "bass", "other"):
                if st in fname:
                    stem_type = st
                    break
            stems.append(StemInfo(
                id=str(uuid4()),
                track_id="",
                stem_type=stem_type,
                audio_path=str(fpath),
                audio_url=get_audio_url(fpath.name, f"stems/{output_dir.name}"),
                duration=get_audio_duration(str(fpath)),
            ))

        if cb:
            cb("Multi-stem separation complete", 1.0)
        return stems

    def _separate_two_pass(self, separator, audio_path, output_dir, cb) -> list[StemInfo]:
        """Two-pass: RoFormer for vocals, then Demucs on instrumental."""
        # Pass 1: BS-RoFormer → vocals + instrumental
        if cb:
            cb("Pass 1: Isolating vocals with BS-RoFormer...", 0.1)

        separator.output_dir = str(output_dir)
        separator.output_format = "flac"
        separator.load_model(model_filename=self.ROFORMER_MODEL)

        if cb:
            cb("Pass 1: Separating...", 0.2)

        pass1_files = separator.separate(audio_path)

        # Find the instrumental file
        instrumental_path = None
        vocals_path = None
        for fpath in pass1_files:
            fpath = str(self._resolve_output(str(fpath), output_dir))
            fname = Path(fpath).stem.lower()
            if "vocal" in fname and "instrument" not in fname:
                vocals_path = fpath
            else:
                instrumental_path = fpath

        if not instrumental_path:
            # Fallback: use all pass1 results
            if cb:
                cb("Could not find instrumental, returning 2-stem result", 1.0)
            return self._separate_vocals(separator, audio_path, output_dir, cb)

        # Pass 2: Demucs on instrumental → drums + bass + other
        if cb:
            cb("Pass 2: Splitting instrumental with Demucs...", 0.5)

        pass2_dir = output_dir / "pass2"
        pass2_dir.mkdir(exist_ok=True)
        separator.output_dir = str(pass2_dir)
        separator.load_model(model_filename=self.DEMUCS_MODEL)

        if cb:
            cb("Pass 2: Separating...", 0.6)

        pass2_files = separator.separate(instrumental_path)

        # Combine results
        stems = []

        # Vocals from pass 1 (highest quality)
        if vocals_path:
            stems.append(StemInfo(
                id=str(uuid4()),
                track_id="",
                stem_type="vocals",
                audio_path=vocals_path,
                audio_url=get_audio_url(Path(vocals_path).name, f"stems/{output_dir.name}"),
                duration=get_audio_duration(vocals_path),
            ))

        # Drums, bass, other from pass 2
        for fpath in pass2_files:
            fpath = self._resolve_output(str(fpath), pass2_dir)
            fname = fpath.stem.lower()
            stem_type = "other"
            for st in ("drums", "bass", "other"):
                if st in fname:
                    stem_type = st
                    break
            # Skip the duplicate vocals from Demucs
            if "vocal" in fname:
                continue
            stems.append(StemInfo(
                id=str(uuid4()),
                track_id="",
                stem_type=stem_type,
                audio_path=str(fpath),
                audio_url=get_audio_url(
                    fpath.name, f"stems/{output_dir.name}/pass2"
                ),
                duration=get_audio_duration(str(fpath)),
            ))

        if cb:
            cb("Two-pass separation complete", 1.0)
        return stems
