# ACE-Step MusicGen Player — User Guide

A complete guide to using the ACE-Step MusicGen Player for music generation, model management, and stem separation.

---

## Table of Contents

1. [Installation](#installation)
2. [First Launch & Configuration](#first-launch--configuration)
3. [Generating Music](#generating-music)
4. [Model Management](#model-management)
5. [LoRA & LoKr Adapters](#lora--lokr-adapters)
6. [Stem Separation](#stem-separation)
7. [Library & Playback](#library--playback)
8. [Settings](#settings)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites

Before installing, make sure you have:
- **Python 3.10 or later** — Download from [python.org](https://python.org)
- **Node.js 18 or later** — Download from [nodejs.org](https://nodejs.org)
- **NVIDIA GPU with CUDA** — Strongly recommended for fast generation. CPU works but generation will be very slow.
- **ACE-Step Trainer** — A local installation of the ACE-Step trainer with model checkpoints

### Windows Installation

1. Download or clone the repository:
   ```
   git clone https://github.com/Estylon/Ace-Step-MusicGen-Player.git
   ```

2. Open the `Ace-Step-MusicGen-Player` folder

3. Double-click **`install.bat`**

   This will:
   - Check that Python, Node.js, and Git are installed
   - Create a Python virtual environment
   - Install all Python dependencies (FastAPI, PyTorch, audio-separator, etc.)
   - Install PyTorch with CUDA support (falls back to CPU if CUDA is unavailable)
   - Install frontend dependencies (React, TypeScript, TailwindCSS)
   - Build the production frontend

4. When installation finishes, the console will display a success message. Press any key to close.

### Linux / macOS Installation

```bash
git clone https://github.com/Estylon/Ace-Step-MusicGen-Player.git
cd Ace-Step-MusicGen-Player
chmod +x scripts/*.sh
./scripts/install.sh
cd app/frontend && npm run build && cd ../..
```

---

## First Launch & Configuration

### Starting the Application

**Windows**: Double-click **`start.bat`**
**Linux/macOS**: Run `./scripts/start.sh`

The server starts at **http://127.0.0.1:3456** — open this URL in your browser.

### Initial Setup (Important!)

On first launch, go to the **Settings** page (gear icon in the sidebar) to configure your paths:

1. **ACE-Step Trainer Path**
   - Set this to the root directory of your ACE-Step trainer installation
   - This is the folder that contains the `acestep` Python package
   - Example: `D:\ace-lora-trainer` or `/home/user/ace-lora-trainer`

2. **Checkpoint Directory**
   - Set this to the folder containing your model checkpoint folders
   - Usually located inside the trainer directory under `checkpoints/`
   - Each checkpoint is a subfolder with a `config.json` inside

3. **LoRA Search Paths**
   - Add one or more directories where your LoRA and LoKr adapters are stored
   - Click **"Add Path"** to add each directory
   - The app will scan all subfolders for adapter files
   - Common locations: `{trainer}/output`, `D:\loras`, etc.

4. Click **"Save Settings"** — your paths are now persisted and will be remembered on future launches.

### Command-Line Options

You can customize the startup behavior:

```bash
start.bat --port 8080                          # Different port
start.bat --model acestep-v15-base             # Start with base model
start.bat --lm acestep-5Hz-lm-1.7B            # Enable language model
start.bat --host 0.0.0.0 --port 3456          # Accessible from network
```

---

## Generating Music

The Generate page is the main workspace. It provides full control over all ACE-Step parameters.

### Basic Generation

1. Navigate to **Generate** in the sidebar
2. Select a **Task Type** (text2music is the most common)
3. Write a **Caption** — a short description of the music you want
4. Optionally write **Lyrics** (or leave empty / set to "[Instrumental]")
5. Set basic metadata: **BPM**, **Key/Scale**, **Duration**
6. Click **Generate**

### Task Types

| Task | Description | When to Use |
|---|---|---|
| **text2music** | Generate music from text description | Most common use case |
| **cover** | Create a new version of a reference track | When you have a reference audio |
| **repaint** | Regenerate portions of existing audio | To fix or modify parts of a track |
| **extract** | Extract specific elements from audio | Isolate instruments or components |
| **lego** | Combine elements from different sources | Creative mixing and mashups |
| **complete** | Continue/extend an existing track | Extend a track that's too short |

> **Note**: Turbo models only support text2music, cover, and repaint. Switch to a Base or SFT model for all 6 tasks.

### Caption Tips

- Be specific: "Upbeat electronic dance music, 128 BPM, with bright synth leads and punchy drums" works better than "dance music"
- Mention instruments, mood, genre, and energy level
- The AI can also infer BPM, key, and language from the caption when the Language Model is active

### Music Metadata

| Parameter | Description | Default |
|---|---|---|
| **BPM** | Beats per minute (30-300) | Auto-detected or 120 |
| **Key/Scale** | Musical key (e.g. "C major", "A minor") | Auto |
| **Time Signature** | Time signature (4/4, 3/4, etc.) | 4/4 |
| **Language** | Vocal language (51 languages supported) | Unknown (auto-detect) |
| **Duration** | Track length in seconds (10-600) | Auto (-1) |

### Diffusion Settings

These control the generation quality and behavior. The available options change based on the loaded model:

| Parameter | Turbo | Base/SFT | Description |
|---|---|---|---|
| **Steps** | 8 (fixed) | 32-100 (slider) | More steps = higher quality but slower |
| **Guidance Scale** | Hidden | 1.0-30.0 | How strictly to follow the prompt |
| **Shift** | 3.0 | 1.0-5.0 | Noise schedule shift |
| **Infer Method** | ODE only | ODE or SDE | Sampling method |
| **ADG** | Hidden | Toggle | Adaptive Diffusion Guidance |
| **CFG Interval** | Hidden | Start/End sliders | When CFG is active during generation |
| **Seed** | Random (-1) | Random (-1) | Set a specific seed for reproducibility |

### Language Model (Chain-of-Thought)

When a language model is loaded, it can enhance generation:

| Parameter | Description | Default |
|---|---|---|
| **Thinking** | Enable Chain-of-Thought reasoning | On |
| **Temperature** | LM creativity (0.0-2.0) | 0.85 |
| **CFG Scale** | LM guidance strength | 2.0 |
| **Top-K / Top-P** | Sampling parameters | 0 / 0.9 |
| **CoT Metas** | Auto-infer BPM/key/time from caption | On |
| **CoT Caption** | Auto-enhance the caption | On |
| **CoT Language** | Auto-detect vocal language | On |
| **Constrained Decoding** | Ensure valid metadata output | On |

### Batch Generation

Set **Batch Size** (1-8) to generate multiple variations at once. Each will use a different random seed.

### Reference Audio

For **cover**, **repaint**, **extract**, **lego**, and **complete** tasks, you need to upload a reference audio file. Click **"Upload Reference Audio"** to select a file.

---

## Model Management

### Switching Models

The current model is shown in the sidebar. To switch:

1. Click on the model selector in the **Generate** page (or sidebar)
2. Available models are listed with their type and capabilities
3. Click a model to load it

> **Warning**: Switching models will unload any currently loaded adapter.

### Model Types Explained

**Turbo** (Fastest)
- 8 fixed diffusion steps
- No Classifier-Free Guidance
- Supports: text2music, cover, repaint
- Best for: Quick iterations, drafting ideas

**Base** (Highest Quality)
- 32-100 adjustable steps
- Full CFG support for precise prompt following
- Supports all 6 task types
- Best for: Final production, complex tasks

**SFT** (Fine-Tuned)
- Same capabilities as Base
- Enhanced with supervised fine-tuning
- Better at following complex instructions
- Best for: Professional quality output

**Custom Checkpoints**
- Your own fine-tuned models are auto-detected
- Type is inferred from the checkpoint name or config
- Place them in the checkpoint directory

---

## LoRA & LoKr Adapters

### What Are Adapters?

Adapters are lightweight model modifications that change the style or characteristics of generated music without replacing the entire model. There are two types:

- **LoRA** (Low-Rank Adaptation) — Standard adapter format, created with PEFT
- **LoKr** (Low-Rank Kronecker) — Compact adapter format from LyCORIS

### Understanding Compatibility

Each adapter is trained for a specific base model type. A LoRA trained on Turbo will not work correctly with Base, and vice versa. The app handles this automatically:

- **Compatible adapters** (green) — Match the currently loaded model. Click **"Load"** to use them.
- **Incompatible adapters** (locked) — Need a different model. Click **"Switch & Load"** to automatically switch the model and load the adapter in one action.

### Managing Adapters

1. **Open the Adapter Panel** in the Generate page (collapsible section)
2. **Add Search Folders** — Click "Browse Folder" to add directories where adapters are stored
3. **Scan** — Click "Scan" to refresh the adapter list
4. **Load** — Click "Load" on any compatible adapter
5. **Adjust Scale** — Use the slider (0.0 = no effect, 1.0 = full effect, up to 2.0 for exaggerated effect)
6. **Toggle Active** — Switch the adapter on/off without unloading, useful for A/B comparison
7. **Unload** — Remove the adapter entirely

### How Adapters Are Detected

The app automatically detects adapters by scanning your configured directories for:
- `adapter_config.json` — PEFT LoRA adapters
- `lokr_weights.safetensors` + `lokr_config.json` — LyCORIS LoKr adapters

The base model type is inferred from the `base_model_name_or_path` field in the adapter config.

### Tips

- You can add any number of search directories in **Settings > LoRA Search Paths**
- Adapters from your trainer's `output/` folder are included by default
- Keep adapters organized by type (turbo/base) in separate folders for clarity
- Scale values below 1.0 create a subtle effect; above 1.0 creates an exaggerated effect
- Use the active/inactive toggle to quickly compare generation with and without the adapter

---

## Stem Separation

The Stems page lets you separate audio into individual instrument tracks.

### How to Separate Stems

1. Navigate to **Stems** in the sidebar
2. Upload an audio file or select a track from your library
3. Choose a separation mode:
   - **2-Stem (Vocals)** — Fastest. Uses BS-RoFormer for high-quality vocal/instrumental split (SDR 12.97)
   - **4-Stem (Full)** — Uses Demucs to separate into Vocals, Drums, Bass, and Other
   - **Two-Pass (Best Quality)** — Combines BS-RoFormer (best vocals) with Demucs (best instrumental separation)
4. Click **Separate**
5. Monitor progress in real-time

### First-Time Download

On first use, the separation models are automatically downloaded:
- **BS-RoFormer** (~1.2GB) — Best vocal isolation model
- **Demucs htdemucs_ft** (~600MB) — Best multi-stem model

These are downloaded once and cached locally.

### Multi-Track Player

After separation, the multi-track player lets you:
- **Solo** a single stem to hear it in isolation
- **Mute** individual stems
- **Adjust volume** per stem with individual sliders
- **Synchronized playback** — all stems play in perfect sync
- **Download** individual stems as audio files

---

## Library & Playback

### Generation Library

All generated tracks are automatically saved to the library. Access it via the **Library** page in the sidebar.

Features:
- **Search** — Filter tracks by caption, title, or metadata
- **Sort** — Order by date, duration, model, or name
- **Track Cards** — Visual cards showing waveform preview, duration, model used, adapter info
- **Track Detail** — Click a track to see full metadata, generation parameters, and stems
- **Delete** — Remove tracks and their associated files

### Player Bar

The player bar at the bottom of the screen provides:
- **Transport controls** — Play/pause, skip forward/back
- **Progress bar** — Click or drag to seek
- **Volume control** — Adjust playback volume
- **Track info** — Current track name and duration

---

## Settings

Access Settings from the sidebar (gear icon). All settings are saved automatically and persist between sessions.

### Model Paths

| Setting | Description | Example |
|---|---|---|
| **ACE-Step Trainer Path** | Root of your ACE-Step installation | `D:\ace-lora-trainer` |
| **Checkpoint Directory** | Folder with model checkpoints | `D:\ace-lora-trainer\checkpoints` |

### LoRA / LoKr Search Paths

Add multiple directories to scan for adapters. Each subdirectory will be checked for LoRA or LoKr files. Click **"Add Path"** to add new directories, and the trash icon to remove them.

### Output Directories

| Setting | Description | Default |
|---|---|---|
| **Audio Output** | Where generated tracks are saved | `app/backend/audio_output` |
| **Stems Output** | Where separated stems are saved | `app/backend/stems_output` |

### Path Validation

Each path input shows a validation indicator:
- **Green checkmark** — Path exists and is valid
- **Red alert** — Path does not exist or is not accessible
- Click the folder icon or blur the input to validate

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Play / Pause |
| `Left Arrow` | Seek backward 5 seconds |
| `Right Arrow` | Seek forward 5 seconds |
| `M` | Mute / Unmute |
| `Up Arrow` | Volume up |
| `Down Arrow` | Volume down |

---

## Troubleshooting

### "Model init failed" on startup

**Cause**: The trainer path or checkpoint directory is incorrect.
**Fix**: Go to Settings and verify your ACE-Step Trainer Path and Checkpoint Directory. Make sure the `acestep` module exists in the trainer directory.

### "No models available" in the model selector

**Cause**: Checkpoint directory doesn't contain valid model folders.
**Fix**: Each model should be a subfolder inside the checkpoint directory with a `config.json` file. Verify the path in Settings.

### "No adapters found"

**Cause**: LoRA search paths not configured or paths don't contain adapters.
**Fix**:
1. Go to **Settings** and add your adapter directories
2. Go to the **Adapter Panel** and click **"Scan"**
3. Each adapter needs an `adapter_config.json` (LoRA) or `lokr_weights.safetensors` (LoKr) file

### Generation is very slow

**Cause**: Running on CPU instead of GPU.
**Fix**: Ensure you have an NVIDIA GPU with CUDA. Check GPU status in the sidebar — it should show your GPU name and VRAM. If it shows "Unknown", PyTorch may not have CUDA support. Reinstall PyTorch with CUDA.

### "CUDA out of memory"

**Cause**: Not enough GPU VRAM for the operation.
**Fix**:
- Use the Turbo model (uses less VRAM than Base)
- Reduce batch size to 1
- Generate shorter durations
- Unload the language model if not needed
- Close other GPU-intensive applications

### Stem separation models not downloading

**Cause**: Network issues or firewall blocking downloads.
**Fix**: The models are downloaded from Hugging Face. Ensure your internet connection works and the firewall allows downloads. Models are cached in the audio-separator's default cache directory.

### Frontend not loading (blank page)

**Cause**: Frontend not built.
**Fix**: Run `scripts\build.bat` (Windows) or `cd app/frontend && npm run build` (Linux/Mac).

### Port already in use

**Cause**: Another application is using port 3456.
**Fix**: Start with a different port: `start.bat --port 8080`

---

## Advanced Usage

### API Access

The full REST API is available at `http://127.0.0.1:3456/docs` (Swagger UI) when the server is running. You can use this to integrate with other tools or build custom workflows.

### Programmatic Generation

See the [README.md](README.md) for code examples in Python, JavaScript, and cURL.

### Multiple LoRA Directories

You can configure any number of LoRA search paths in Settings. This is useful if you store adapters in different locations:
- Training output: `D:\ace-lora-trainer\output`
- Curated collection: `D:\my-loras`
- Downloaded from others: `D:\community-loras`

All directories are scanned when the adapter list is refreshed.
