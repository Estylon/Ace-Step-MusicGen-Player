# ACE-Step MusicGen Player — User Guide

A complete guide to using the ACE-Step MusicGen Player for music generation, model management, and stem separation.

---

## Table of Contents

1. [Installation](#installation)
2. [First Launch & Configuration](#first-launch--configuration)
3. [Generating Music](#generating-music)
4. [Generation Presets](#generation-presets)
5. [AutoGen (Automatic Generation)](#autogen-automatic-generation)
6. [Model Management](#model-management)
7. [LoRA & LoKr Adapters](#lora--lokr-adapters)
8. [Style Tags & Trigger Words](#style-tags--trigger-words)
9. [Stem Separation](#stem-separation)
10. [Player & Playback](#player--playback)
11. [Queue](#queue)
12. [Favorites & Rating](#favorites--rating)
13. [Library](#library)
14. [Parameter Recall](#parameter-recall)
15. [Batch Export with Mastering](#batch-export-with-mastering)
16. [Settings](#settings)
17. [Keyboard Shortcuts](#keyboard-shortcuts)
18. [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites

Before installing, make sure you have:
- **Python 3.10 or later** — Download from [python.org](https://python.org)
- **Node.js 18 or later** — Download from [nodejs.org](https://nodejs.org)
- **NVIDIA GPU with CUDA** — Strongly recommended for fast generation. CPU works but generation will be very slow.
- **ACE-Step checkpoints** — Model checkpoint files (turbo, base, or SFT)

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
3. Optionally set a **Track Name** — this names your track in the player and library
4. Write a **Music Description** (caption) — describe the music you want
5. Optionally write **Lyrics** (or toggle "Instrumental")
6. Set metadata: **BPM**, **Key/Scale**, **Duration**
7. Click **Generate**

> **Tip**: If a LoRA adapter is active with a style tag, you'll see an indicator below the Music Description field showing the tag that will be prepended automatically.

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
- If you're using a LoRA with a style tag, you don't need to manually type the trigger word — it's prepended automatically

### Music Metadata

| Parameter | Description | Default |
|---|---|---|
| **BPM** | Beats per minute (30–300) | Auto-detected or 120 |
| **Key/Scale** | Musical key (e.g. "C major", "A minor") | Auto |
| **Time Signature** | Time signature (4/4, 3/4, etc.) | 4/4 |
| **Language** | Vocal language (51 languages supported) | Unknown (auto-detect) |
| **Duration** | Track length in seconds (10–600) | Auto (-1) |

### Diffusion Settings

These control the generation quality and behavior. The available options change based on the loaded model:

| Parameter | Turbo | Base/SFT | Description |
|---|---|---|---|
| **Steps** | 8 (fixed) | 32–100 (slider) | More steps = higher quality but slower |
| **Guidance Scale** | Hidden | 1.0–30.0 | How strictly to follow the prompt |
| **Shift** | 3.0 | 1.0–5.0 | Noise schedule shift |
| **Infer Method** | ODE only | ODE or SDE | Sampling method |
| **ADG** | Hidden | Toggle | Adaptive Diffusion Guidance |
| **CFG Interval** | Hidden | Start/End sliders | When CFG is active during generation |
| **Seed** | Random (-1) | Random (-1) | Set a specific seed for reproducibility |

### Language Model (Chain-of-Thought)

When a language model is loaded, it can enhance generation:

| Parameter | Description | Default |
|---|---|---|
| **Thinking** | Enable Chain-of-Thought reasoning | On |
| **Temperature** | LM creativity (0.0–2.0) | 0.85 |
| **CFG Scale** | LM guidance strength | 2.0 |
| **Top-K / Top-P** | Sampling parameters | 0 / 0.9 |
| **CoT Metas** | Auto-infer BPM/key/time from caption | On |
| **CoT Caption** | Auto-enhance the caption | On |
| **CoT Language** | Auto-detect vocal language | On |
| **Constrained Decoding** | Ensure valid metadata output | On |

### Batch Generation

Set **Batch Size** (1–8) to generate multiple variations at once. Each will use a different random seed.

### Reference Audio

For **cover**, **repaint**, **extract**, **lego**, and **complete** tasks, you need to upload a reference audio file. Click **"Upload Reference Audio"** to select a file.

### Generation Results

After generation completes, result cards appear with:
- **Animated waveform** with playback progress overlay
- **Play/Pause overlay** — click anywhere on the waveform to play
- **Editable title** — click the pencil icon to rename inline (Enter to save, Escape to cancel)
- **Status badges** — "Playing" or "Paused" indicators
- **Active track glow** — amber glow on the currently playing card
- **Favorite toggle** — heart icon on each result card to mark as favorite (persists to library)
- **Star rating** — 5-star rating on each result card (persists to library)

### Title-Based Filenames

Generated audio files are automatically named after your track title:
- A caption like "Upbeat electronic dance music" produces a file named `Upbeat_electronic_dance_music.flac`
- If you edit the title later (in results or library), the file on disk is also renamed to match
- Invalid filename characters are automatically sanitized
- If a file with the same name already exists, a short ID suffix is appended to avoid collisions

---

## Generation Presets

Presets let you save and recall your favorite generation settings so you can quickly switch between different styles, configurations, or workflows.

### Saving a Preset

1. Configure all your generation parameters as desired (caption, diffusion settings, LM settings, etc.)
2. Click the **"Presets"** dropdown button in the Generate page toolbar (next to Import/Export/Reset)
3. Click **"Save current settings as preset"**
4. Enter a name for your preset (e.g. "Lo-fi Chill", "Epic Orchestral", "Fast Draft")
5. Click **Save**

### Loading a Preset

1. Click the **"Presets"** dropdown
2. Click the preset name to load it
3. All generation parameters are instantly replaced with the saved values

### Managing Presets

- **Overwrite** — Hover over a preset and click the save icon to overwrite it with the current settings
- **Delete** — Hover over a preset and click the trash icon. Click again to confirm deletion
- **Count badge** — The Presets button shows a count of how many presets you have saved

### Tips

- Presets save all generation parameters: caption, lyrics, diffusion settings, LM settings, batch size, format, etc.
- Presets do NOT save the model or adapter selection — these are managed separately
- You can also use the **Import/Export** buttons for JSON-based preset sharing with other users
- The preset counter badge in the toolbar shows how many presets are available

---

## AutoGen (Automatic Generation)

AutoGen lets you run continuous, hands-free generation. After each track completes, a new generation starts automatically with a randomized seed.

### How to Use

1. Navigate to the **Generate** page
2. Set up your generation parameters (caption, settings, etc.) as usual
3. Find the **AutoGen** panel between the Generate button and results
4. Toggle **AutoGen** on
5. Set **Max runs** (0 = unlimited, or enter a number like 10)
6. Click **Generate** to start the first run
7. After each track completes, a new one starts automatically after a ~1.5 second delay

### Controls

- **Toggle switch** — Turn AutoGen on/off
- **Max runs input** — Set a cap (0 = unlimited, shown as ∞)
- **Run counter** — Shows "Run X / Y" in real-time
- **Stop button** — Immediately halts the loop (current generation finishes, no new one starts)

### Tips

- AutoGen randomizes the seed between runs, so each track is different
- All generated tracks appear in the results panel and are saved to the library
- You can adjust other parameters between runs by turning AutoGen off, changing settings, then turning it back on
- The counter resets when you toggle AutoGen off and on again

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
- 32–100 adjustable steps
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

### Lazy-Load Aware

The model uses lazy initialization — weights aren't loaded into GPU memory until the first generation. If you try to load an adapter before generating anything, the player automatically triggers weight loading first, then loads the adapter. You don't need to worry about the order.

### Tips

- You can add any number of search directories in **Settings > LoRA Search Paths**
- Adapters from your trainer's `output/` folder are included by default
- Keep adapters organized by type (turbo/base) in separate folders for clarity
- Scale values below 1.0 create a subtle effect; above 1.0 creates an exaggerated effect
- Use the active/inactive toggle to quickly compare generation with and without the adapter

---

## Style Tags & Trigger Words

Style tags let you assign a **trigger word** (or phrase) to each LoRA/LoKr adapter. When that adapter is active, the tag is automatically prepended to your caption during generation.

### How It Works

1. Load an adapter (see [LoRA & LoKr Adapters](#lora--lokr-adapters))
2. In the adapter panel, find the **Style tag / trigger word** input field (with the tag icon)
3. Type the trigger word for this adapter (e.g. `lofi_style`, `epic_orchestral`, `synthwave_vibe`)
4. A **"prepend"** badge appears confirming the tag is active
5. Below the **Music Description** field, an indicator shows: **`lofi_style` will be prepended** along with the adapter name

### At Generation Time

When you click Generate, the system automatically builds the final caption:

```
[style tag] + [space] + [your caption]
```

For example:
- Style tag: `lofi_style`
- Your caption: `Chill beat with piano and vinyl crackle`
- Sent to the model: `lofi_style Chill beat with piano and vinyl crackle`

### Details

- Style tags are saved **per adapter path** — each adapter remembers its own tag
- Tags persist across sessions (stored in the settings store)
- If no style tag is set, or the adapter is inactive/unloaded, your caption is sent as-is
- The tag is only prepended if both the adapter is **loaded** and **active**
- You can clear a tag at any time by emptying the input field

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

## Player & Playback

### Player Bar

The player bar sits at the bottom of the screen and provides a full playback experience:

- **Seek bar** — thin bar at the very top of the player; click anywhere to seek
- **Album art area** — track artwork (or placeholder) on the left
- **Track info** — title and caption/model info
- **Transport controls** (center):
  - Shuffle toggle
  - Previous track
  - Play / Pause (large central button)
  - Next track
  - Repeat toggle (none → all → one)
- **Time display** — current position and total duration
- **Audio visualizer** — real-time frequency bars (amber/gold gradient) driven by the Web Audio API AnalyserNode
- **Volume control** — click the speaker icon to mute/unmute, use the slider to adjust
- **Queue button** — opens the queue panel (shows badge with track count)
- **Expand button** (↑) — opens the full player overlay

### Audio Engine

The player uses a real audio engine under the hood:
- **HTMLAudioElement** for reliable audio playback and seeking
- **Web Audio API** with an AnalyserNode connected for real-time frequency data
- The audio engine is a singleton — one instance shared across the entire app
- All playback actions (play, pause, seek, volume) are synchronized between the UI state and the actual audio element

### Full Player Overlay

Click the expand button (↑) in the player bar to open a full-screen player view:

- **Large audio visualizer** — 48-bar frequency visualization, much larger than the player bar version
- **Track title and caption** — prominently displayed
- **Metadata badges** — BPM, key, duration, model, seed
- **Lyrics display** — scrollable lyrics panel (hidden for instrumental tracks)
- **Full transport controls** — large play/pause, prev/next, shuffle, repeat
- **Seek bar** — wide, prominent seek control with time labels
- **Volume control** — dedicated volume slider
- **Close button** (↓) — minimizes back to the player bar

### Playback from Generation Results

Click any result card's waveform area to start playing that track. The card shows:
- Animated waveform bars with a progress overlay
- "Playing" / "Paused" badge
- Amber glow effect on the active card

---

## Queue

### Queue Panel

Click the queue button (music list icon) in the player bar to open the queue panel:

- **Track list** — shows all queued tracks with index number, title, and duration
- **Now Playing indicator** — the current track is highlighted with amber color and "Now Playing" label
- **Click to jump** — click any track in the queue to play it immediately
- **Remove tracks** — hover over a track to reveal the remove button (×)
- **Clear Queue** — remove all tracks from the queue at once

### How Tracks Enter the Queue

- **Playing a track** automatically adds it to the queue if it's not already there
- **Play All** from the library sets the entire filtered list as the queue
- The queue persists during the session but resets when you reload the app

---

## Favorites & Rating

### Favorites

Mark tracks as favorites using the heart icon:

- **Heart toggle** — appears on every track card in both the Library and Generation Results
- **Library filter** — click the "Favorites" button in the Library header to show only favorited tracks
- **Persistence** — favorites are saved to the database and persist across sessions

### Star Rating

Rate tracks from 1 to 5 stars:

- **Star rating** — appears on every track card in both Library and Generation Results
- **Click to rate** — click a star to set the rating. Click the same star again to clear the rating (set to 0)
- **Hover preview** — stars highlight on hover to show the rating you'd set
- **Sort by rating** — use the sort dropdown in the Library to order tracks by rating
- **Persistence** — ratings are saved to the database and persist across sessions

---

## Library

### Generation Library

All generated tracks are automatically saved to the library. Access it via the **Library** page in the sidebar.

Features:
- **Search** — Filter tracks by caption, title, or metadata
- **Sort** — Order by date, duration, BPM, name, or rating
- **Favorites filter** — Toggle to show only favorited tracks
- **Track Cards** — Visual cards showing waveform preview, duration, model used, adapter info, heart icon, star rating
- **Track Detail** — Click a track to see full metadata, generation parameters, and stems
- **Delete** — Remove tracks and their associated files
- **Inline title editing** — Rename tracks directly from the card (also renames the audio file on disk)
- **Multi-select** — Select multiple tracks for batch export (see [Batch Export with Mastering](#batch-export-with-mastering))
- **Parameter recall** — Reload a track's generation settings (see [Parameter Recall](#parameter-recall))

---

## Parameter Recall

Parameter recall lets you reload the exact generation settings used to create any track in your library, making it easy to reproduce or iterate on a particular style.

### How to Use

**From a Track Card:**
1. In the Library, find a track you want to recreate
2. Click the **"Recall"** button (circular arrow icon) in the track card's action bar
3. The app navigates to the Generate page with all parameters loaded

**From Track Detail:**
1. Click on a track to open the detail slide-over panel
2. Click the **"Recall"** button in the footer action bar
3. The panel closes and the app navigates to the Generate page with parameters loaded

### What Gets Recalled

All generation parameters stored in the track's `params_json` are restored:
- Caption, lyrics, instrumental flag
- BPM, key/scale, time signature, language, duration
- Diffusion settings (steps, guidance scale, seed, shift, method, ADG, CFG interval)
- LM settings (thinking, temperature, top-k, top-p, negative prompt, CoT options)
- Task type, batch size, audio format

### Tips

- The Recall button only appears on tracks that have saved generation parameters (most tracks created in v0.3.0+)
- After recall, the seed is loaded as-is — change it to -1 (random) if you want variations rather than exact reproduction
- Recall does NOT switch your model or adapter — you'll need to match those manually if they differ from what was originally used

---

## Batch Export with Mastering

Export multiple tracks from your library as professionally mastered WAV or MP3 files. WAV exports are ready for digital distribution on platforms like Spotify, Apple Music, and DistroKid. MP3 exports are ideal for sharing, personal listening, or uploading to platforms that accept lossy formats.

### Mastering Specs

Every exported track is automatically mastered with these settings:

| Parameter | Value | Standard |
|---|---|---|
| **Integrated Loudness** | -14 LUFS | Spotify, YouTube, Apple Music target |
| **True Peak Ceiling** | -1.0 dBTP | Prevents inter-sample clipping |
| **Sample Rate** | 44,100 Hz | CD quality / streaming standard |
| **Bit Depth (WAV)** | 16-bit PCM | Standard WAV format |
| **Format (MP3)** | MP3 | Compressed format for sharing |

### How to Export

1. Go to the **Library** page
2. Click the **"Select"** button in the header to enter multi-select mode
3. Click on tracks to select them — selected tracks show a ring highlight and checkbox
4. Use **"Select All"** / **"Deselect All"** to manage selections quickly
5. Click **"Export WAV"** for lossless mastered WAV files, or **"Export MP3"** for compressed MP3 files
6. Wait for the mastering and encoding process to complete (a loading spinner shows progress)
7. A ZIP file is automatically downloaded to your browser's download folder

### What Happens During Export

For each selected track, the mastering service:

1. **Reads** the source audio file (FLAC, WAV, MP3, etc.)
2. **Resamples** to 44.1 kHz if the source has a different sample rate
3. **Normalizes** the integrated loudness to -14 LUFS using K-weighted measurement
4. **Limits** the true peak level to -1.0 dBTP using 4x oversampled peak detection
5. **Writes** a 16-bit PCM WAV file, or **encodes** to MP3 (depending on the chosen format)

All mastered files are packaged into a single ZIP archive for convenient download.

### Tips

- The mastering process is non-destructive — your original files are never modified
- Export up to 50 tracks at once
- File names in the ZIP match the track titles (sanitized for filesystem compatibility)
- If multiple tracks share the same title, a numeric suffix is appended automatically
- For custom mastering settings (different LUFS target, peak ceiling, or sample rate), use the API directly: `POST /api/export/batch`

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

### Adapter fails to load / "Model not initialized"

**Cause**: In older versions, loading an adapter before the first generation would fail silently because the model uses lazy initialization.
**Fix**: This is now handled automatically — the player triggers weight loading before adapter load. If you still see issues, try generating one track first, then load the adapter.

### No sound when clicking Play

**Cause**: The audio engine needs a user interaction to initialize the Web Audio API context (browser policy).
**Fix**: Click the play button directly (not via keyboard shortcut) for the first playback. After that, all controls work normally.

### Generation produces static / noise

**Cause**: Incompatible `transformers` library version. Versions 5.x break FSQ (Finite Scalar Quantization) non-persistent buffers during meta device initialization.
**Fix**: Ensure you have `transformers>=4.51.0,<4.58.0` installed. The install script handles this, but if you upgraded manually, downgrade with:
```bash
pip install transformers==4.57.6
```

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

See the [README.md](README.md) for code examples in cURL.

### Multiple LoRA Directories

You can configure any number of LoRA search paths in Settings. This is useful if you store adapters in different locations:
- Training output: `D:\ace-lora-trainer\output`
- Curated collection: `D:\my-loras`
- Downloaded from others: `D:\community-loras`

All directories are scanned when the adapter list is refreshed.

### Using with the ACE-Step LoRA Trainer

This player is designed to work alongside [ace-lora-trainer](https://github.com/Estylon/ace-lora-trainer). Recommended setup:

1. Set the **Trainer Path** to your trainer installation
2. Set the **Checkpoint Directory** to `{trainer}/checkpoints`
3. Add `{trainer}/output` as a LoRA search path
4. Train a LoRA in the trainer, then immediately test it here by clicking **Scan** and loading the new adapter
5. Assign a **style tag** to the adapter for automatic trigger word prepending
