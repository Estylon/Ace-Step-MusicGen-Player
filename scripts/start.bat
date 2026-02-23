@echo off
echo ============================================
echo  ACE-Step MusicGen Player
echo ============================================
echo.

:: Activate venv
call "%~dp0..\app\backend\venv\Scripts\activate.bat"

:: Start FastAPI backend (serves built frontend if available)
echo Starting backend on http://127.0.0.1:3456 ...
cd /d "%~dp0..\app\backend"
python main.py --host 127.0.0.1 --port 3456

pause
