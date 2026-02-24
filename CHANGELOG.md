# Changelog

All notable changes to ACE-Step MusicGen Player.

---

## [0.3.0] — 2025-02-24

### Added — Premium Player & Audio Engine
- **Real audio engine** — Singleton `HTMLAudioElement` + Web Audio API `AnalyserNode` for actual audio playback (previously the player was UI-only with no sound)
- **Audio visualizer** — Canvas-based real-time frequency bars with purple gradient, driven by AnalyserNode frequency data
- **Spotify-style player bar** — Complete redesign with thin seek bar, album art, center transport controls (shuffle/prev/play/next/repeat), time display, volume with mute toggle, glassmorphism backdrop
- **Premium result cards** — Animated waveform bars with playback progress overlay, play/pause overlay button, "Playing"/"Paused" badges, purple glow on active track
- **Editable track titles** — Inline editing with pencil icon on result cards (Enter to save, Escape to cancel)
- **Track name input** — New "Track Name" field in the generation form to name tracks before generation

### Added — LoRA Style Tags / Trigger Words
- **Style tag system** — Assign a trigger word per LoRA/LoKr adapter that auto-prepends to the caption at generation time
- **Style tag input** in adapter panel with Tag icon and "prepend" badge indicator
- **Caption indicator** — Visual indicator below "Music Description" showing the active tag and adapter name
- **Per-adapter persistence** — Style tags are saved per adapter path and persist across sessions

### Fixed — LoRA Adapter Loading
- **Lazy-load initialization** — Adapters now load correctly even before the first generation; the backend triggers `ensure_models_loaded()` automatically before loading any adapter
- **Proper error propagation** — Backend now raises HTTP 500 with error message instead of returning 200 OK with error in message body
- **Non-blocking adapter load** — Uses `run_in_threadpool` to avoid blocking the FastAPI event loop during adapter loading
- **Frontend error display** — Adapter load errors are now shown in the UI

### Changed
- Player bar height increased from 80px to 86px to accommodate new visualizer
- Added `animate-pulse-slow` CSS utility for subtle UI animations
- Generation store now reads settings store for active style tag before API calls

---

## [0.2.1] — 2025-02-23

### Fixed
- **GPU "Unknown" display** — Sidebar GPU badge now shows correct GPU name and VRAM
- **LM "Not Loaded" display** — Language model status shown correctly in sidebar

---

## [0.2.0] — 2025-02-23

### Fixed — Audio Generation (Critical)
- **Static/noise generation resolved** — Root cause: `transformers==5.2.0` was incompatible with ACE-Step. Version 5.x corrupts FSQ (Finite Scalar Quantization) non-persistent buffers via meta device initialization. Pinned to `transformers>=4.51.0,<4.58.0`.
- **Post-load FSQ buffer restoration** — Added diagnostics and buffer rebuild after meta→real weight transition
- **Root cause FSQ fix** — Restore non-persistent buffers (`_basis`, `_implicit_codebook`) after loading from meta device
- **Lazy codebook rebuild** — FSQ codebook properly rebuilt after meta→real transition
- **vector_quantize_pytorch meta tensor crash** — Fixed compatibility with transformers 5.x meta tensor initialization

---

## [0.1.0] — 2025-02-22

### Added
- **Model and LoRA selectors** in Generate page
- **Nested adapter subfolder support** — LoRA scanner now traverses `adapter/` subfolders
- **Native OS folder picker** for all path settings
- **Adaptive UI** — Controls adapt based on loaded model capabilities

### Fixed
- Adapter status `None` path and guard against pydantic errors
- Model loading path and LoRA scan crash
- Radix Select crash with empty-string values
- Model discovery when checkpoint_dir points to a model folder
- SPA routing + PyTorch cu126 for Python 3.14
- audio-separator install on Python 3.13+

### Changed
- Deferred model loading — lets user configure paths first before loading anything

---

## [0.0.1] — 2025-02-21

### Added
- Initial release
- Full ACE-Step inference (all 6 task types)
- FastAPI backend with SSE progress streaming
- React 19 + TypeScript 5 + TailwindCSS v4 frontend
- Smart model switching with capability detection
- LoRA/LoKr adapter management with auto-detection
- Stem separation (BS-RoFormer + Demucs)
- Multi-track player with per-stem controls
- SQLite-backed generation library
- Customizable paths and persistent settings
