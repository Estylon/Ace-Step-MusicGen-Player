#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

source "$PROJECT_DIR/app/backend/venv/bin/activate"
cd "$PROJECT_DIR/app/backend"

echo "Starting ACE-Step MusicGen Player on http://127.0.0.1:3456"
python main.py --host 127.0.0.1 --port 3456
