@echo off
setlocal enabledelayedexpansion
title ACE-Step MusicGen Player - Install
color 0A

echo.
echo  ================================================================
echo   ACE-Step MusicGen Player - Installation
echo  ================================================================
echo.

:: ── Pre-flight checks ────────────────────────────────────────────────

echo [CHECK] Verifying prerequisites...

python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Python not found!
    echo  Please install Python 3.10+ from https://python.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do echo   Python: %%v

node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Node.js not found!
    echo  Please install Node.js 18+ from https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f %%v in ('node --version 2^>^&1') do echo   Node.js: %%v

git --version >nul 2>&1
if errorlevel 1 (
    echo   Git: not found (optional, needed for updates)
) else (
    for /f "tokens=3" %%v in ('git --version 2^>^&1') do echo   Git: %%v
)

echo.

:: ── Check trainer path ───────────────────────────────────────────────

set "TRAINER_PATH=D:\ace-lora-trainer"
if not exist "%TRAINER_PATH%\acestep" (
    echo  [WARNING] ACE-Step trainer not found at %TRAINER_PATH%
    echo  You can set ACESTEP_TRAINER_PATH environment variable to your trainer location.
    echo  The app will still install, but generation won't work without the trainer.
    echo.
    set /p "CONTINUE=Continue anyway? (Y/N): "
    if /i "!CONTINUE!" neq "Y" exit /b 1
    echo.
)

:: ── Step 1: Python virtual environment ───────────────────────────────

echo [1/6] Creating Python virtual environment...
if not exist "%~dp0app\backend\venv\Scripts\python.exe" (
    python -m venv "%~dp0app\backend\venv"
    if errorlevel 1 (
        echo  [ERROR] Failed to create venv
        pause
        exit /b 1
    )
    echo   Created: app\backend\venv
) else (
    echo   Already exists, skipping.
)

call "%~dp0app\backend\venv\Scripts\activate.bat"

:: ── Step 2: uv package manager ───────────────────────────────────────

echo [2/6] Installing uv package manager...
pip install uv --quiet --disable-pip-version-check 2>nul
echo   Done.

:: ── Step 3: Python dependencies ──────────────────────────────────────

echo [3/6] Installing Python dependencies...
uv pip install -r "%~dp0app\backend\requirements.txt" --quiet
if errorlevel 1 (
    echo  [ERROR] Failed to install Python dependencies
    echo  Check app\backend\requirements.txt
    pause
    exit /b 1
)
echo   Done.

:: ── Step 4: PyTorch with CUDA ────────────────────────────────────────

echo [4/6] Installing PyTorch with CUDA support...
python -c "import torch; print(f'  PyTorch {torch.__version__} already installed (CUDA: {torch.cuda.is_available()})')" 2>nul
if errorlevel 1 (
    echo   Downloading PyTorch (this may take a few minutes)...
    uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124 --quiet
    if errorlevel 1 (
        echo  [WARNING] CUDA PyTorch install failed, trying CPU version...
        uv pip install torch torchvision torchaudio --quiet
    )
    echo   Done.
)

:: ── Step 5: Frontend dependencies ────────────────────────────────────

echo [5/6] Installing frontend dependencies...
cd /d "%~dp0app\frontend"
call npm install --loglevel=error 2>nul
if errorlevel 1 (
    echo  [ERROR] npm install failed
    pause
    exit /b 1
)
echo   Done.

:: ── Step 6: Build frontend ───────────────────────────────────────────

echo [6/6] Building frontend for production...
call npm run build 2>nul
if errorlevel 1 (
    echo  [WARNING] Frontend build failed. You can still use dev mode.
) else (
    echo   Built to app\backend\static\
)

cd /d "%~dp0"

:: ── Complete ─────────────────────────────────────────────────────────

echo.
echo  ================================================================
echo   Installation Complete!
echo  ================================================================
echo.
echo   To start the app:
echo     start.bat
echo.
echo   For development mode (hot-reload):
echo     scripts\dev.bat
echo.
echo   The app will be available at:
echo     http://127.0.0.1:3456
echo.
echo  ================================================================
echo.
pause
