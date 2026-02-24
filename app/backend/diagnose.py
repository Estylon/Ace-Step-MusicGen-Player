"""
ACE-Step Pipeline Diagnostic
=============================
Run from the backend directory with the backend venv:
    cd E:\Ace-Step-MusicGen-Player\app\backend
    venv\Scripts\python diagnose.py

Tests each stage of the pipeline and reports where the problem is.
"""
import sys
import os
import json
import traceback
from pathlib import Path

# ── Setup paths ──────────────────────────────────────────────────────────────
TRAINER_PATH = "D:/ace-lora-trainer"
if TRAINER_PATH not in sys.path:
    sys.path.insert(0, TRAINER_PATH)

# Load user settings to get the correct checkpoint_dir
SETTINGS_FILE = Path(__file__).parent / "data" / "user_settings.json"
if SETTINGS_FILE.exists():
    with open(SETTINGS_FILE) as f:
        settings = json.load(f)
    CHECKPOINT_DIR = settings.get("checkpoint_dir", "")
else:
    CHECKPOINT_DIR = ""

print("=" * 70)
print("ACE-Step Pipeline Diagnostic")
print("=" * 70)
print(f"  Trainer path:    {TRAINER_PATH}")
print(f"  Settings file:   {SETTINGS_FILE} (exists={SETTINGS_FILE.exists()})")
print(f"  Checkpoint dir:  {CHECKPOINT_DIR}")
print()

# ── Step 0: Resolve checkpoint root ──────────────────────────────────────────
def resolve_checkpoint_root(cp_dir: str) -> str:
    cp = Path(cp_dir)
    if not cp.exists():
        return cp_dir
    has_config = (cp / "config.json").exists()
    has_weights = any(cp.glob("*.safetensors")) or (cp / "pytorch_model.bin").exists()
    if has_config and has_weights:
        # This is a model folder, return parent
        print(f"  [RESOLVE] '{cp.name}' is a model folder -> using parent: {cp.parent}")
        return str(cp.parent)
    return cp_dir

CHECKPOINT_ROOT = resolve_checkpoint_root(CHECKPOINT_DIR)
print(f"  Resolved root:   {CHECKPOINT_ROOT}")
print()

# ── Step 1: Check files ─────────────────────────────────────────────────────
print("STEP 1: Check model files")
print("-" * 50)

required_files = {
    "DiT model": [
        f"{CHECKPOINT_ROOT}/acestep-v15-turbo/config.json",
        f"{CHECKPOINT_ROOT}/acestep-v15-turbo/model.safetensors",
        f"{CHECKPOINT_ROOT}/acestep-v15-turbo/silence_latent.pt",
        f"{CHECKPOINT_ROOT}/acestep-v15-turbo/modeling_acestep_v15_turbo.py",
    ],
    "VAE": [
        f"{CHECKPOINT_ROOT}/vae/config.json",
        f"{CHECKPOINT_ROOT}/vae/diffusion_pytorch_model.safetensors",
    ],
    "Text encoder": [
        f"{CHECKPOINT_ROOT}/Qwen3-Embedding-0.6B/config.json",
        f"{CHECKPOINT_ROOT}/Qwen3-Embedding-0.6B/model.safetensors",
    ],
}

all_files_ok = True
for component, files in required_files.items():
    missing = [f for f in files if not Path(f).exists()]
    if missing:
        print(f"  FAIL  {component}:")
        for m in missing:
            print(f"         MISSING: {m}")
        all_files_ok = False
    else:
        sizes = {Path(f).name: Path(f).stat().st_size / (1024**2) for f in files}
        size_str = ", ".join(f"{n}={s:.1f}MB" for n, s in sizes.items())
        print(f"  OK    {component}: {size_str}")

# Check LM models
lm_models_found = []
for lm_name in ["acestep-5Hz-lm-1.7B", "acestep-5Hz-lm-4B"]:
    lm_dir = Path(CHECKPOINT_ROOT) / lm_name
    if lm_dir.exists():
        shards = list(lm_dir.glob("model*.safetensors"))
        has_index = (lm_dir / "model.safetensors.index.json").exists()
        if shards:
            total_size = sum(s.stat().st_size for s in shards) / (1024**3)
            print(f"  OK    LM {lm_name}: {len(shards)} shard(s), {total_size:.1f} GB")
            lm_models_found.append(lm_name)
        elif has_index:
            print(f"  WARN  LM {lm_name}: index exists but weight shards MISSING!")
        else:
            print(f"  WARN  LM {lm_name}: directory exists but no weights")
    else:
        print(f"  ---   LM {lm_name}: not present")

if not all_files_ok:
    print("\nCRITICAL: Some model files are missing! Fix this first.")
    sys.exit(1)

print()

# ── Step 2: Test imports ─────────────────────────────────────────────────────
print("STEP 2: Test imports")
print("-" * 50)

try:
    import torch
    print(f"  OK    PyTorch {torch.__version__}, CUDA={torch.cuda.is_available()}")
    if torch.cuda.is_available():
        props = torch.cuda.get_device_properties(0)
        total_mem = getattr(props, "total_memory", None) or getattr(props, "total_mem", 0)
        vram_gb = total_mem / (1024**3)
        print(f"  OK    GPU: {props.name}, VRAM: {vram_gb:.1f} GB")
except Exception as e:
    print(f"  FAIL  PyTorch: {e}")
    sys.exit(1)

try:
    import transformers
    print(f"  OK    transformers {transformers.__version__}")
except Exception as e:
    print(f"  FAIL  transformers: {e}")

try:
    import diffusers
    print(f"  OK    diffusers {diffusers.__version__}")
except Exception as e:
    print(f"  FAIL  diffusers: {e}")

try:
    import vector_quantize_pytorch
    print(f"  OK    vector_quantize_pytorch")
except Exception as e:
    print(f"  FAIL  vector_quantize_pytorch: {e}")

try:
    from acestep.handler import AceStepHandler
    from acestep.llm_inference import LLMHandler
    print(f"  OK    acestep imports")
except Exception as e:
    print(f"  FAIL  acestep imports: {e}")
    traceback.print_exc()
    sys.exit(1)

print()

# ── Step 3: Load DiT model ──────────────────────────────────────────────────
print("STEP 3: Load DiT model (acestep-v15-turbo)")
print("-" * 50)

try:
    handler = AceStepHandler()
    status_msg, ok = handler.initialize_service(
        project_root=CHECKPOINT_ROOT,
        config_path="acestep-v15-turbo",
        device="auto",
        lazy=False,  # Force immediate load
        custom_checkpoint_dir=CHECKPOINT_ROOT,
    )
    print(f"  Init:  ok={ok}, msg={status_msg}")

    if handler.model is not None:
        model = handler.model
        dtype = next(model.parameters()).dtype
        device = next(model.parameters()).device
        n_params = sum(p.numel() for p in model.parameters()) / 1e6
        print(f"  Model: device={device}, dtype={dtype}, params={n_params:.1f}M")

        # Check for NaN/Inf in model weights (sample a few)
        nan_count = 0
        inf_count = 0
        zero_count = 0
        checked = 0
        for name, param in model.named_parameters():
            if checked >= 20:
                break
            p = param.data.float()
            if torch.isnan(p).any():
                nan_count += 1
                print(f"  WARN  NaN in param: {name}")
            if torch.isinf(p).any():
                inf_count += 1
                print(f"  WARN  Inf in param: {name}")
            if p.abs().max() < 1e-10:
                zero_count += 1
                print(f"  WARN  All-zero param: {name}")
            checked += 1

        if nan_count == 0 and inf_count == 0 and zero_count == 0:
            print(f"  OK    Sampled {checked} params: no NaN/Inf/zero issues")

        # Check silence_latent
        if handler.silence_latent is not None:
            sl = handler.silence_latent
            sl_f = sl.float()
            print(f"  OK    silence_latent: shape={sl.shape}, device={sl.device}, "
                  f"mean={sl_f.mean():.4f}, std={sl_f.std():.4f}")
        else:
            print(f"  WARN  silence_latent is None!")
    else:
        print(f"  FAIL  model is None after init!")

except Exception as e:
    print(f"  FAIL  {e}")
    traceback.print_exc()

print()

# ── Step 4: Check VAE ───────────────────────────────────────────────────────
print("STEP 4: Check VAE")
print("-" * 50)

try:
    if handler.vae is not None:
        vae = handler.vae
        vae_dtype = next(vae.parameters()).dtype
        vae_device = next(vae.parameters()).device
        vae_params = sum(p.numel() for p in vae.parameters()) / 1e6
        print(f"  OK    VAE loaded: device={vae_device}, dtype={vae_dtype}, params={vae_params:.1f}M")

        # Test VAE decode with dummy input
        with torch.no_grad():
            # Latent shape: [batch, channels, length]
            # channels=64 (decoder_input_channels), length=25 (1 second at 25Hz)
            dummy_latent = torch.randn(1, 64, 25, device=vae_device, dtype=vae_dtype)
            decoder_out = vae.decode(dummy_latent)
            wav = decoder_out.sample

            wav_f = wav.float()
            rms = wav_f.pow(2).mean().sqrt().item()
            peak = wav_f.abs().max().item()
            has_nan = torch.isnan(wav_f).any().item()
            has_inf = torch.isinf(wav_f).any().item()
            unique_vals = wav_f.flatten()[:48000].unique().numel()

            print(f"  OK    VAE decode test: output shape={wav.shape}")
            print(f"         rms={rms:.6f}, peak={peak:.6f}, unique_vals_1s={unique_vals}")
            print(f"         has_nan={has_nan}, has_inf={has_inf}")

            if has_nan or has_inf:
                print(f"  FAIL  VAE produces NaN/Inf!")
            elif rms < 1e-6:
                print(f"  FAIL  VAE produces silence (rms near zero)")
            elif unique_vals < 1000:
                print(f"  WARN  VAE produces very few unique values ({unique_vals}) - may sound quantized")
            else:
                print(f"  OK    VAE decode looks healthy")
    else:
        print(f"  FAIL  VAE not loaded!")
except Exception as e:
    print(f"  FAIL  {e}")
    traceback.print_exc()

print()

# ── Step 5: Check FSQ / Quantizer ───────────────────────────────────────────
print("STEP 5: Check FSQ / Quantizer")
print("-" * 50)

try:
    if handler.model is not None:
        model = handler.model
        tokenizer = getattr(model, "tokenizer", None)
        if tokenizer is not None:
            quantizer = getattr(tokenizer, "quantizer", None)
            if quantizer is not None:
                q_device = next(quantizer.parameters()).device
                q_dtype = next(quantizer.parameters()).dtype

                # Check scales buffer
                scales = getattr(quantizer, "scales", None)
                if scales is not None:
                    print(f"  OK    scales: shape={scales.shape}, device={scales.device}")
                    print(f"         values={scales.flatten()[:8].tolist()}")
                    if scales.abs().max() < 1e-10:
                        print(f"  FAIL  scales are all zeros!")
                    elif torch.isnan(scales).any():
                        print(f"  FAIL  scales contain NaN!")
                else:
                    print(f"  WARN  scales buffer not found")

                # Check codebook_size
                cb_size = getattr(quantizer, "codebook_size", 0)
                print(f"  INFO  codebook_size={cb_size}")
                if cb_size == 0:
                    print(f"  FAIL  codebook_size is 0! Codebooks not rebuilt.")

                # Test quantize/dequantize round-trip
                fsq_dim = getattr(model.config, "fsq_dim", 2048)
                dummy_in = torch.randn(1, 4, fsq_dim, device=q_device, dtype=q_dtype)
                with torch.no_grad():
                    quantized, indices = quantizer(dummy_in)

                q_rms = quantized.float().pow(2).mean().sqrt().item()
                idx_unique = indices.unique().numel()
                print(f"  OK    Quantize test: quantized rms={q_rms:.6f}, "
                      f"unique indices={idx_unique}")

                if q_rms < 1e-6:
                    print(f"  FAIL  Quantizer output is near-zero!")
                elif idx_unique < 2:
                    print(f"  FAIL  All indices are the same!")
                else:
                    print(f"  OK    Quantizer looks healthy")

                # Test get_output_from_indices (decode path)
                try:
                    with torch.no_grad():
                        decoded = quantizer.get_output_from_indices(indices)
                    dec_rms = decoded.float().pow(2).mean().sqrt().item()
                    dec_nan = torch.isnan(decoded).any().item()
                    print(f"  OK    Decode from indices: shape={decoded.shape}, "
                          f"rms={dec_rms:.6f}, nan={dec_nan}")
                except Exception as e:
                    print(f"  FAIL  get_output_from_indices error: {e}")
                    traceback.print_exc()
            else:
                print(f"  WARN  No quantizer in tokenizer")
        else:
            print(f"  WARN  No tokenizer in model")
except Exception as e:
    print(f"  FAIL  {e}")
    traceback.print_exc()

print()

# ── Step 6: Test text encoder ────────────────────────────────────────────────
print("STEP 6: Check Text Encoder")
print("-" * 50)

try:
    if handler.text_encoder is not None and handler.text_tokenizer is not None:
        te_device = next(handler.text_encoder.parameters()).device
        te_dtype = next(handler.text_encoder.parameters()).dtype
        print(f"  OK    Text encoder loaded: device={te_device}, dtype={te_dtype}")

        # Quick test
        tokens = handler.text_tokenizer("Test pop rock music", return_tensors="pt", padding=True, truncation=True, max_length=77)
        tokens = {k: v.to(te_device) for k, v in tokens.items()}
        with torch.no_grad():
            output = handler.text_encoder(**tokens)
            hidden = output.last_hidden_state

        h_rms = hidden.float().pow(2).mean().sqrt().item()
        h_nan = torch.isnan(hidden).any().item()
        print(f"  OK    Text encode test: shape={hidden.shape}, rms={h_rms:.6f}, nan={h_nan}")

        if h_nan:
            print(f"  FAIL  Text encoder produces NaN!")
        elif h_rms < 1e-6:
            print(f"  FAIL  Text encoder output is near-zero!")
        else:
            print(f"  OK    Text encoder looks healthy")
    else:
        print(f"  FAIL  Text encoder not loaded!")
except Exception as e:
    print(f"  FAIL  {e}")
    traceback.print_exc()

print()

# ── Step 7: Mini generation test ─────────────────────────────────────────────
print("STEP 7: Mini generation test (10 seconds, text2music)")
print("-" * 50)
print("  This will take a moment...")

try:
    from acestep.inference import GenerationParams, GenerationConfig, generate_music

    params = GenerationParams(
        caption="Upbeat pop rock song with electric guitar",
        lyrics="",
        instrumental=True,
        duration=10,
        inference_steps=8,
        guidance_scale=7.0,
        seed=42,
        shift=3.0,
        infer_method="ode",
        task_type="text2music",
        thinking=False,  # Skip LLM to isolate DiT+VAE pipeline
    )
    gen_config = GenerationConfig(batch_size=1, audio_format="flac")

    save_dir = str(Path(__file__).parent / "audio_output")
    result = generate_music(
        dit_handler=handler,
        llm_handler=None,
        params=params,
        config=gen_config,
        save_dir=save_dir,
    )

    if result.success:
        print(f"  OK    Generation succeeded!")
        for i, audio in enumerate(result.audios):
            audio_path = audio.get("path", "")
            if audio_path:
                import soundfile as sf
                import numpy as np
                data, sr = sf.read(audio_path)
                rms = np.sqrt(np.mean(data ** 2))
                peak = np.max(np.abs(data))
                flat = data.flatten()
                zcr = np.mean(np.abs(np.diff(np.sign(flat)))) / 2
                unique_1s = len(np.unique(np.round(flat[:sr], 6)))
                ac1 = np.corrcoef(flat[:sr-1], flat[1:sr])[0, 1] if len(flat) > sr else 0

                print(f"  Audio: {audio_path}")
                print(f"    shape={data.shape}, sr={sr}")
                print(f"    rms={rms:.6f}, peak={peak:.6f}")
                print(f"    zcr={zcr:.4f}, autocorr_lag1={ac1:.4f}")
                print(f"    unique_values_1s={unique_1s}")

                # Verdict
                if rms < 1e-4:
                    print(f"  VERDICT: SILENCE - audio is near-silent")
                elif unique_1s < 500:
                    print(f"  VERDICT: HEAVILY QUANTIZED - very few unique values, likely noise/buzz")
                elif zcr > 0.4:
                    print(f"  VERDICT: HIGH ZCR - likely noise/static")
                elif ac1 < -0.3:
                    print(f"  VERDICT: NEGATIVE AUTOCORRELATION - high-frequency noise pattern")
                elif ac1 > 0.8 and rms > 0.01:
                    print(f"  VERDICT: LOOKS LIKE MUSIC! Smooth, structured audio")
                elif ac1 > 0.3:
                    print(f"  VERDICT: SOMEWHAT STRUCTURED - could be music with artifacts")
                else:
                    print(f"  VERDICT: UNCLEAR - check by listening")

                print(f"\n  >>> Play this file to verify: {audio_path}")
    else:
        print(f"  FAIL  Generation failed: {result.error}")

except Exception as e:
    print(f"  FAIL  {e}")
    traceback.print_exc()

print()
print("=" * 70)
print("Diagnostic complete. Look for FAIL/WARN messages above.")
print("=" * 70)
