#!/bin/bash
set -e

echo "============================================"
echo " ACE-Step MusicGen Player - Install"
echo "============================================"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "[1/5] Creating Python virtual environment..."
python3 -m venv "$PROJECT_DIR/app/backend/venv"
source "$PROJECT_DIR/app/backend/venv/bin/activate"

echo "[2/5] Installing uv..."
pip install uv --quiet

echo "[3/5] Installing Python dependencies..."
uv pip install -r "$PROJECT_DIR/app/backend/requirements.txt"

echo "[4/5] Installing PyTorch..."
if [[ "$(uname)" == "Darwin" ]]; then
    uv pip install torch torchvision torchaudio
else
    uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
fi

echo "[5/5] Installing frontend dependencies..."
cd "$PROJECT_DIR/app/frontend"
npm install

echo ""
echo "Install complete! Run ./scripts/start.sh to launch."
