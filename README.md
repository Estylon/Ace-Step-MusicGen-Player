# ACE-Step MusicGen Player

> A music generation player built around **my** workflow, **my** tastes, and **my** needs — shared for anyone who finds it useful.

I created this project because I wanted a dedicated interface to generate music with ACE-Step that didn't feel like a lab notebook. Something with a proper player, real-time waveform visualization, full control over every parameter, and tight integration with my standalone LoRA trainer. This is that tool.

It's opinionated — designed to pair with [my ACE-Step LoRA Trainer](https://github.com/Estylon/ace-lora-trainer) and optimized for the kind of iterative, adapter-driven workflow I use daily. If your setup looks anything like mine (local checkpoints, a pile of LoRAs, and a GPU that never sleeps), you might find this useful too.

---

## What It Does

**ACE-Step MusicGen Player** is a full-stack application (FastAPI + React) for generating, playing, and managing AI music powered by [ACE-Step 1.5](https://github.com/ace-step/ACE-Step).

### Core

- **All 6 ACE-Step task types** — text2music, cover, repaint, extract, lego, complete
- **Turbo & Base models** with smart capability detection — UI adapts automatically to the loaded model
- **Chain-of-Thought language model** integration for auto-BPM, key detection, and caption enhancement
- **Batch generation** — up to 8 variations per run with independent seeds
- **Real-time progress** via Server-Sent Events

### LoRA / LoKr Adapter System

- **Auto-detection** of PEFT LoRA and LyCORIS LoKr adapters across multiple directories
- **Compatibility grouping** — adapters tagged as compatible or requiring a model switch
- **One-click Switch & Load** — automatically swaps the base model and loads the adapter
- **Real-time scale adjustment** (0.0 – 2.0) and active/inactive toggle for instant A/B comparison
- **Style tags / trigger words** — assign a trigger word to any adapter that gets automatically prepended to your caption at generation time. Set it once, forget it.
- **Lazy-load aware** — adapters load correctly even if the model hasn't been used yet (automatic weight initialization)

### Player & Audio

- **Real audio engine** — HTMLAudioElement + Web Audio API with AnalyserNode for frequency analysis
- **Spotify-style player bar** — seek bar, transport controls (shuffle, prev, play, next, repeat), volume with mute, time display
- **Real-time audio visualizer** — canvas-based frequency bars with purple gradient, driven by the AnalyserNode
- **Premium result cards** — animated waveform with playback progress overlay, editable track titles, play state badges
- **Track naming** — name your tracks before generation or edit titles inline after

### Stem Separation

- **BS-RoFormer** (SDR 12.97 vocal isolation) + **Demucs htdemucs_ft** (4-stem)
- **Two-pass mode** combining both for best quality
- **Multi-track player** with per-stem solo/mute/volume and synchronized playback

### Library & Settings

- **SQLite-backed generation library** with search, sort, and full metadata
- **Customizable paths** — all model, checkpoint, LoRA, and output directories configurable through the UI
- **Native OS folder picker** for all path settings
- **Persistent settings** across sessions

---

## Designed For My LoRA Trainer

This player is purpose-built to work alongside [**ace-lora-trainer**](https://github.com/Estylon/ace-lora-trainer), my standalone ACE-Step LoRA/LoKr training tool. The integration is tight:

- Point the player at your trainer's `checkpoints/` directory and it discovers all models automatically
- Point it at your `output/` directory and it finds all trained adapters
- Adapter compatibility with the currently loaded model is checked automatically
- The **style tag** system lets you assign trigger words to each LoRA, so they're always prepended when that adapter is active — no more forgetting the trigger word

You can use this player without the trainer (just point it at any ACE-Step checkpoint), but the two are designed to complement each other.

---

## Requirements

| Requirement | Version | Notes |
|---|---|---|
| **Python** | 3.10+ | Required |
| **Node.js** | 18+ | Required for frontend build |
| **NVIDIA GPU** | CUDA-capable | Recommended. CPU works but is very slow |
| **ACE-Step checkpoints** | v1.5 | Turbo, Base, or SFT |

---

## Quick Start

### Windows

```bash
git clone https://github.com/Estylon/Ace-Step-MusicGen-Player.git
cd Ace-Step-MusicGen-Player

# Install (creates venv, installs all deps, builds frontend)
install.bat

# Start
start.bat
```

### Linux / macOS

```bash
git clone https://github.com/Estylon/Ace-Step-MusicGen-Player.git
cd Ace-Step-MusicGen-Player

chmod +x scripts/*.sh
./scripts/install.sh
cd app/frontend && npm run build && cd ../..

./scripts/start.sh
```

The app opens at **http://127.0.0.1:3456**.

### Development Mode (Hot Reload)

```bash
# Windows — opens FastAPI with reload + Vite HMR
scripts\dev.bat
```

Vite dev server runs at `http://localhost:5173` and proxies API calls to the backend on port 3456.

---

## First-Time Setup

After installation, go to **Settings** (gear icon in the sidebar):

1. **ACE-Step Trainer Path** — root of your ACE-Step trainer installation (e.g. `D:\ace-lora-trainer`)
2. **Checkpoint Directory** — folder containing model checkpoints (usually `{trainer}/checkpoints`)
3. **LoRA Search Paths** — directories where your LoRA/LoKr adapters live. Add as many as you need.
4. **Output Directories** — optionally change where generated audio and separated stems are saved

All settings persist automatically.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ACESTEP_TRAINER_PATH` | `D:/ace-lora-trainer` | Root path to the ACE-Step trainer |
| `ACESTEP_CHECKPOINT_DIR` | `{TRAINER_PATH}/checkpoints` | Model checkpoints directory |
| `ACESTEP_MODEL` | `acestep-v15-turbo` | Model to load at startup |
| `ACESTEP_LM_MODEL` | *(empty)* | Language model (e.g. `acestep-5Hz-lm-1.7B`) |
| `ACESTEP_LORA_DIR` | *(empty)* | Additional LoRA adapter search directory |
| `HOST` | `127.0.0.1` | Server bind address |
| `PORT` | `3456` | Server bind port |

### Command-Line Arguments

```bash
start.bat --port 8080 --host 0.0.0.0 --model acestep-v15-base --lm acestep-5Hz-lm-1.7B
```

---

## Supported Models

| Model | Type | Steps | CFG | Tasks |
|---|---|---|---|---|
| `acestep-v15-turbo` | Turbo | 8 | No | text2music, cover, repaint |
| `acestep-v15-turbo-shift3` | Turbo | 8 | No | text2music, cover, repaint |
| `acestep-v15-base` | Base | 32–100 | Yes | All 6 tasks |
| `acestep-v15-sft` | SFT | 32–100 | Yes | All 6 tasks |
| Custom checkpoints | Auto-detect | Varies | Varies | Varies |

- **Turbo**: Fastest (~8 steps). Limited tasks, no CFG.
- **Base**: Full quality with Classifier-Free Guidance. All 6 task types.
- **SFT**: Supervised fine-tuned. Same capabilities as Base with enhanced quality.
- **Custom**: Your fine-tuned checkpoints are auto-detected.

---

## LoRA / LoKr Adapters

- **Auto-Detection**: Scans for `adapter_config.json` (PEFT LoRA) or `lokr_weights.safetensors` (LyCORIS LoKr)
- **Compatibility Grouping**: Compatible vs. "Requires Model Switch"
- **One-Click Switch & Load**: Swaps the base model and loads the adapter in one action
- **Scale**: 0.0 (no effect) → 1.0 (full) → 2.0 (exaggerated)
- **Style Tags**: Assign a trigger word per adapter — it's automatically prepended to your caption during generation

---

## Stem Separation

| Mode | Models Used | Output | Quality |
|---|---|---|---|
| **2-Stem** | BS-RoFormer | Vocals + Instrumental | SDR 12.97 |
| **4-Stem** | Demucs htdemucs_ft | Vocals + Drums + Bass + Other | SDR 9.2 |
| **Two-Pass** | BS-RoFormer + Demucs | Best vocals + Drums + Bass + Other | Combined best |

Models are downloaded automatically on first use (~1.8GB total).

---

## Architecture

```
Ace-Step-MusicGen-Player/
  app/
    backend/           Python FastAPI server
      api/             Route modules (generate, stems, models, lora, library, gpu, audio, settings)
      services/        Business logic (inference, stem separation, library, audio)
      models/          Pydantic schemas + SQLite database
    frontend/          React 19 + TypeScript 5 + TailwindCSS v4
      src/
        components/    UI components organized by feature
        stores/        Zustand state management (player, generation, settings, library, stems)
        api/           Typed API client layer
        hooks/         Custom React hooks (audio engine bridge)
        lib/           Audio engine singleton, utilities
  scripts/             Install/start/dev automation
```

---

## API Reference

Interactive docs at **http://127.0.0.1:3456/docs** when running.

| Endpoint | Method | Description |
|---|---|---|
| `/api/generate` | POST | Start music generation |
| `/api/generate/{id}/progress` | GET (SSE) | Real-time progress stream |
| `/api/generate/upload` | POST | Upload reference audio |
| `/api/stems/separate` | POST | Start stem separation |
| `/api/stems/{id}/progress` | GET (SSE) | Separation progress |
| `/api/models/status` | GET | Current model + GPU + LM status |
| `/api/models/load` | POST | Switch model |
| `/api/models/load-lm` | POST | Load language model |
| `/api/lora/list` | GET | List adapters with compatibility |
| `/api/lora/load` | POST | Load adapter |
| `/api/lora/unload` | POST | Unload adapter |
| `/api/lora/config` | PATCH | Update adapter scale/active |
| `/api/lora/scan` | POST | Re-scan adapter directories |
| `/api/library` | GET | List generated tracks |
| `/api/library/{id}` | GET/DELETE | Track detail / delete |
| `/api/gpu/status` | GET | GPU VRAM status |
| `/api/settings` | GET/PUT | User settings |

### Quick Example (cURL)

```bash
curl -X POST http://127.0.0.1:3456/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Upbeat electronic dance music with synth leads",
    "lyrics": "[Instrumental]",
    "instrumental": true,
    "bpm": 128,
    "duration": 30,
    "inference_steps": 8,
    "task_type": "text2music"
  }'
```

---

## Tech Stack

**Backend**: Python 3.10+, FastAPI, Uvicorn, PyTorch, aiosqlite, audio-separator, librosa
**Frontend**: React 19, TypeScript 5, Vite 7, TailwindCSS v4, Zustand, Radix UI, Framer Motion, Lucide Icons
**Audio**: Web Audio API (AnalyserNode), HTMLAudioElement, wavesurfer.js

---

## License

Apache 2.0 — see [LICENSE](LICENSE)
