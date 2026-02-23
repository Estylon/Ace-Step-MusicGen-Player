# ACE-Step MusicGen Player

Premium music generation and stem separation application powered by **ACE-Step 1.5**. Features a Dark Pro Studio interface built with React, full control over all inference parameters, intelligent LoRA/LoKr adapter management, and high-quality stem separation using BS-RoFormer + Demucs.

---

## Features

- **Full ACE-Step Inference** — All 6 task types (text2music, cover, repaint, extract, lego, complete), turbo and base models, Chain-of-Thought language model integration
- **Smart Model Switching** — Visual model selector showing capabilities per model type (turbo: 8 steps/fast, base: full CFG/all tasks, SFT: fine-tuned variants)
- **LoRA/LoKr Adapter Management** — Auto-detection of adapter compatibility with the loaded model, one-click "Switch & Load" for incompatible adapters, real-time scale adjustment, active/inactive toggle
- **Stem Separation** — BS-RoFormer (SDR 12.97 vocal isolation) + Demucs htdemucs_ft (4-stem) + two-pass mode combining both for best quality
- **Multi-Track Player** — Synchronized waveform playback with per-stem solo/mute/volume controls
- **Generation Library** — SQLite-backed history with search, sort, and full metadata
- **Real-Time Progress** — Server-Sent Events for live generation and separation progress
- **Adaptive UI** — Controls automatically adapt based on loaded model capabilities and GPU tier
- **Customizable Paths** — All model, checkpoint, LoRA, and output paths are configurable through the Settings page

---

## Requirements

| Requirement | Version | Notes |
|---|---|---|
| **Python** | 3.10+ | Required |
| **Node.js** | 18+ | Required for frontend build |
| **NVIDIA GPU** | CUDA-capable | Recommended. CPU works but is very slow |
| **ACE-Step Trainer** | Latest | Your local ACE-Step trainer installation |

---

## Quick Start

### Windows

```bash
# 1. Clone this repository
git clone https://github.com/Estylon/Ace-Step-MusicGen-Player.git
cd Ace-Step-MusicGen-Player

# 2. Install (creates venv, installs Python & Node deps, builds frontend)
install.bat

# 3. Start the application
start.bat
```

The app will open at **http://127.0.0.1:3456**

### Linux / macOS

```bash
# 1. Clone
git clone https://github.com/Estylon/Ace-Step-MusicGen-Player.git
cd Ace-Step-MusicGen-Player

# 2. Install
chmod +x scripts/*.sh
./scripts/install.sh
cd app/frontend && npm run build && cd ../..

# 3. Start
./scripts/start.sh
```

### Development Mode (Hot Reload)

```bash
# Windows — opens two terminals: FastAPI with reload + Vite HMR
scripts\dev.bat
```

The Vite dev server runs at `http://localhost:5173` and proxies API calls to the backend on port 3456.

---

## First-Time Setup

After installation, go to the **Settings** page to configure your paths:

1. **ACE-Step Trainer Path** — Point to your local ACE-Step trainer directory (e.g. `D:\ace-lora-trainer`)
2. **Checkpoint Directory** — The folder containing your model checkpoints (usually `{trainer}/checkpoints`)
3. **LoRA Search Paths** — Add one or more folders where your LoRA/LoKr adapters are stored
4. **Output Directories** — Optionally change where generated audio and separated stems are saved

All settings are persisted and automatically loaded on startup.

---

## Configuration

### Environment Variables

These can override the saved settings and are useful for command-line control:

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
| `acestep-v15-base` | Base | 32-100 | Yes | All 6 tasks |
| `acestep-v15-sft` | SFT | 32-100 | Yes | All 6 tasks |
| Custom checkpoints | Auto-detect | Varies | Varies | Varies |

### Model Capabilities

- **Turbo**: Fastest generation (~8 steps). Limited to text2music, cover, and repaint tasks. No CFG support.
- **Base**: Full quality with Classifier-Free Guidance. Supports all 6 task types including extract, lego, and complete.
- **SFT**: Supervised fine-tuned variant with enhanced quality. Same capabilities as base.
- **Custom**: User fine-tuned checkpoints are auto-detected and their type is inferred from the name or config.

---

## LoRA / LoKr Adapters

The adapter system automatically detects and manages LoRA and LoKr adapters:

- **Auto-Detection**: Scans configured directories for `adapter_config.json` (PEFT LoRA) or `lokr_weights.safetensors` (LyCORIS LoKr)
- **Compatibility Grouping**: Adapters are grouped into "Compatible" (matches loaded model type) and "Requires Model Switch"
- **One-Click Switch & Load**: For incompatible adapters, click "Switch & Load" to automatically switch the base model and load the adapter
- **Real-Time Controls**: Adjust adapter scale (0.0 - 2.0) and toggle active/inactive for A/B comparison
- **Multiple Search Paths**: Configure any number of LoRA directories through the Settings page

---

## Stem Separation

Three separation modes available, with models downloaded automatically on first use (~1.8GB total):

| Mode | Models Used | Output Stems | Quality |
|---|---|---|---|
| **2-Stem (Vocals)** | BS-RoFormer | Vocals + Instrumental | SDR 12.97 |
| **4-Stem (Full)** | Demucs htdemucs_ft | Vocals + Drums + Bass + Other | SDR 9.2 |
| **Two-Pass (Best)** | BS-RoFormer + Demucs | Best vocals + Drums + Bass + Other | Combined best |

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
        stores/        Zustand state management
        api/           Typed API client layer
        hooks/         Custom React hooks
  scripts/             Install/start/dev scripts
  install.bat          Windows installer (root shortcut)
  start.bat            Windows launcher (root shortcut)
```

---

## API Reference

Full interactive API documentation is available at **http://127.0.0.1:3456/docs** when the server is running.

### Core Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/generate` | POST | Start music generation |
| `/api/generate/{id}/progress` | GET (SSE) | Real-time progress stream |
| `/api/generate/upload` | POST | Upload reference audio |
| `/api/stems/separate` | POST | Start stem separation |
| `/api/stems/{id}/progress` | GET (SSE) | Separation progress stream |
| `/api/models/status` | GET | Current model + GPU + LM status |
| `/api/models/load` | POST | Switch model |
| `/api/models/load-lm` | POST | Load language model |
| `/api/lora/list` | GET | List adapters with compatibility |
| `/api/lora/load` | POST | Load adapter |
| `/api/lora/unload` | POST | Unload adapter |
| `/api/lora/config` | PATCH | Update adapter scale/active |
| `/api/lora/scan` | POST | Re-scan adapter directories |
| `/api/lora/add-path` | POST | Add adapter search directory |
| `/api/library` | GET | List generated tracks |
| `/api/library/{id}` | GET | Track detail with stems |
| `/api/library/{id}` | DELETE | Delete track |
| `/api/gpu/status` | GET | GPU VRAM status |
| `/api/settings` | GET/PUT | User settings (paths) |
| `/api/settings/validate-path` | POST | Validate a filesystem path |

### Example: Generate Music (cURL)

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
    "seed": -1,
    "task_type": "text2music",
    "batch_size": 1,
    "audio_format": "flac"
  }'
```

### Example: Generate Music (Python)

```python
import requests

response = requests.post("http://127.0.0.1:3456/api/generate", json={
    "caption": "Chill lo-fi hip hop beat with jazzy piano",
    "lyrics": "[Instrumental]",
    "instrumental": True,
    "bpm": 85,
    "duration": 60,
    "inference_steps": 8,
    "task_type": "text2music",
})
job = response.json()
print(f"Job ID: {job['job_id']}")

# Subscribe to progress via SSE
import sseclient
url = f"http://127.0.0.1:3456/api/generate/{job['job_id']}/progress"
client = sseclient.SSEClient(url)
for event in client.events():
    print(event.data)
```

### Example: Generate Music (JavaScript)

```javascript
const response = await fetch('http://127.0.0.1:3456/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    caption: 'Epic orchestral trailer music',
    lyrics: '[Instrumental]',
    instrumental: true,
    duration: 45,
    inference_steps: 8,
    task_type: 'text2music',
  }),
})
const { job_id } = await response.json()

// Subscribe to progress
const evtSource = new EventSource(
  `http://127.0.0.1:3456/api/generate/${job_id}/progress`
)
evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log(`Progress: ${data.percent}%`)
}
```

---

## Tech Stack

**Backend**: Python 3.10+, FastAPI, Uvicorn, aiosqlite, audio-separator, librosa, PyTorch
**Frontend**: React 19, TypeScript 5, Vite 6, TailwindCSS v4, Zustand, Radix UI, wavesurfer.js, Framer Motion, Lucide Icons

---

## License

MIT
