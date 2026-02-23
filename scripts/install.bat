@echo off
setlocal enabledelayedexpansion
echo ============================================
echo  ACE-Step MusicGen Player - Install
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+ first.
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo [1/7] Creating Python virtual environment...
if not exist "%~dp0..\app\backend\venv\Scripts\python.exe" (
    python -m venv "%~dp0..\app\backend\venv"
)
call "%~dp0..\app\backend\venv\Scripts\activate.bat"

echo [2/7] Installing uv package manager...
pip install uv --quiet --disable-pip-version-check 2>nul

echo [3/7] Installing Python dependencies...
uv pip install -r "%~dp0..\app\backend\requirements.txt" --quiet

echo [4/7] Installing PyTorch with CUDA...
python -c "import torch" 2>nul
if errorlevel 1 (
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
    if errorlevel 1 (
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
        if errorlevel 1 (
            echo  [WARNING] CUDA install failed, trying CPU...
            pip install torch torchvision torchaudio
        )
    )
)

echo [5/7] Patching vector_quantize_pytorch for transformers 5.x...
python "%~dp0patch_vqvae.py"

echo [6/7] Installing audio-separator...
uv pip install "audio-separator[gpu]>=0.30.0" --quiet 2>nul
if errorlevel 1 (
    echo   Trying Cython workaround for diffq-fixed...
    uv pip install Cython --quiet 2>nul
    pip install diffq-fixed --no-build-isolation --quiet 2>nul
    if errorlevel 1 (
        echo   Installing audio-separator without diffq...
        pip install audio-separator --no-deps --quiet 2>nul
        uv pip install requests six tqdm pydub julius einops pyyaml ml_collections resampy beartype "rotary-embedding-torch>=0.5.3" scipy onnxruntime --quiet 2>nul
    ) else (
        uv pip install "audio-separator[gpu]>=0.30.0" --quiet 2>nul
    )
)

echo [7/7] Installing frontend dependencies...
cd /d "%~dp0..\app\frontend"
call npm install --loglevel=error 2>nul

echo.
echo ============================================
echo  Install Complete!
echo.
echo  After first launch, go to Settings to
echo  configure your model and LoRA paths.
echo.
echo  Run start.bat to launch the application.
echo ============================================
pause
