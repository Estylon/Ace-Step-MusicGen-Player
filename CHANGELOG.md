# Changelog

All notable changes to ACE-Step MusicGen Player.

---

## [0.4.0] — 2025-02-24

### Added — Amber/Gold Color Scheme
- **Complete color overhaul** — Replaced all violet/purple accent (#7c3aed) with amber/gold (#f59e0b) throughout the entire UI to differentiate from Tadpole Studio
- Updated CSS design tokens, audio visualizer canvas gradients, and all component-level color references
- Warning color shifted to orange (#fb923c) to avoid conflict with new accent

### Added — Queue + Favorites + Rating System
- **Queue panel** — Slide-out panel (via ListMusic button in PlayerBar) showing the current queue with track list, "Now Playing" highlight, click-to-jump, per-track remove, and Clear Queue
- **Favorites** — Heart icon toggle on every track card (Library + Generation Results). Filter favorites in Library with dedicated toggle button. Persists to SQLite via PATCH API
- **Star rating** — 5-star rating component on every track card. Click to rate (click same star to clear). Sort by rating in Library. Persists via PATCH API
- **Optimistic UI updates** — Favorites and rating toggle instantly in the UI, with automatic rollback on API failure

### Added — AutoGen (Automatic Batch Generation)
- **AutoGen toggle** — Enable continuous generation: after each track completes, a new generation auto-starts with a randomized seed
- **Max runs** — Set a limit (0 = unlimited) for how many auto-generations to run
- **Run counter** — Real-time display showing "Run X / Y" or "Run X / ∞"
- **Stop button** — Instantly halt the auto-generation loop
- Located in the Generate page between the Generate button and results

### Added — Full Player Overlay
- **Full-screen player** — Slide-up overlay (via ChevronUp button in PlayerBar) with large audio visualizer, track title, caption, metadata badges, lyrics display, full transport controls, seek bar, and volume control
- **framer-motion animations** — Spring-based slide transitions for both the full player and queue panel

### Added — Title-Based Audio Filenames
- **Smart file naming** — Generated audio files are now renamed from UUIDs to use the track title as filename (e.g. `Epic_Synthwave_Track.flac` instead of `abc123.flac`)
- **Title rename propagation** — When editing a track title (in results or library), the audio file on disk is also renamed to match
- **Filename sanitization** — Invalid filesystem characters are stripped, spaces collapsed, and length limited to 80 chars
- **Collision handling** — If a file with the same name exists, a short ID suffix is appended
- **Peaks sidecar** — `.peaks.json` sidecar files are renamed alongside the audio file

### Changed — Backend
- Database migration: added `favorite` (INTEGER DEFAULT 0) and `rating` (INTEGER DEFAULT 0) columns to tracks table (idempotent with try/except)
- `GET /api/library` now accepts `favorite` query parameter for filtering
- `PATCH /api/library/{id}` now accepts `favorite` and `rating` fields
- `rating` added as valid sort column in library listing
- `update_track()` now renames the audio file when title changes
- `_row_to_track()` includes favorite/rating with safe key checking for backward compatibility

### Changed — Frontend
- New reusable `StarRating` component (`src/components/ui/StarRating.tsx`)
- New `QueuePanel` component (`src/components/player/QueuePanel.tsx`)
- New `FullPlayer` component (`src/components/player/FullPlayer.tsx`)
- `usePlayerStore` — Added: `fullPlayerOpen`, `openFullPlayer`, `closeFullPlayer`, `toggleFullPlayer`, `removeFromQueue`, `clearQueue`, `setQueue`, `moveInQueue`
- `useLibraryStore` — Added: `filterFavorites`, `setFilterFavorites`, `toggleFavorite`, `setRating` with optimistic updates
- `useGenerationStore` — Added: `autoGen`, `autoGenMaxRuns`, `autoGenRunCount`, `setAutoGen`, `setAutoGenMaxRuns`, `resetAutoGenCount`, auto-retrigger on SSE complete
- PlayerBar now includes queue button (with badge count) and expand-to-full-player button
- AppShell mounts FullPlayer at root level
- Library page has favorites filter toggle and rating sort option

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
