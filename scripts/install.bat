@echo off
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

echo [1/5] Creating Python virtual environment...
python -m venv "%~dp0..\app\backend\venv"
call "%~dp0..\app\backend\venv\Scripts\activate.bat"

echo [2/5] Installing uv package manager...
pip install uv --quiet

echo [3/5] Installing Python dependencies...
uv pip install -r "%~dp0..\app\backend\requirements.txt"

echo [4/5] Installing PyTorch with CUDA...
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124

echo [5/5] Installing frontend dependencies...
cd /d "%~dp0..\app\frontend"
call npm install

echo.
echo ============================================
echo  Install Complete!
echo.
echo  Make sure D:\ace-lora-trainer exists with
echo  the ACE-Step model checkpoints.
echo.
echo  Run start.bat to launch the application.
echo ============================================
pause
