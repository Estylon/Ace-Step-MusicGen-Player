#!/bin/bash
set -e

echo "============================================"
echo " ACE-Step MusicGen Player - Install"
echo "============================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[1/6] Creating Python virtual environment..."
python3 -m venv "$PROJECT_DIR/app/backend/venv"
source "$PROJECT_DIR/app/backend/venv/bin/activate"

echo "[2/6] Installing uv..."
pip install uv --quiet

echo "[3/6] Installing Python dependencies..."
uv pip install -r "$PROJECT_DIR/app/backend/requirements.txt"

echo "[4/6] Installing PyTorch..."
if [[ "$(uname)" == "Darwin" ]]; then
    uv pip install torch torchvision torchaudio
else
    uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
fi

echo "[5/6] Installing audio-separator..."
# Try normal install first; if diffq-fixed fails to build, use fallback
if ! uv pip install "audio-separator[gpu]>=0.30.0" 2>/dev/null; then
    echo "  Normal install failed, trying Cython workaround..."
    uv pip install Cython 2>/dev/null || true
    if ! pip install diffq --no-build-isolation --quiet 2>/dev/null; then
        echo "  Installing audio-separator without diffq (non-quantized models only)..."
        pip install audio-separator --no-deps --quiet
        uv pip install requests six tqdm pydub julius einops pyyaml ml_collections resampy beartype "rotary-embedding-torch>=0.5.3" scipy onnxruntime
    else
        uv pip install "audio-separator[gpu]>=0.30.0"
    fi
fi

echo "[6/6] Installing frontend dependencies..."
cd "$PROJECT_DIR/app/frontend"
npm install

echo ""
echo "Install complete!"
echo "  Build frontend: cd app/frontend && npm run build"
echo "  Start: ./scripts/start.sh"
echo ""
echo "  IMPORTANT: After first launch, go to Settings to configure paths."
