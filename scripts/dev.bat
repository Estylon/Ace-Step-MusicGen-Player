@echo off
echo ============================================
echo  ACE-Step MusicGen Player - Dev Mode
echo ============================================
echo.
echo Starting backend (FastAPI) + frontend (Vite HMR)...
echo.

:: Terminal 1: FastAPI with auto-reload
start "ACE-Step Backend" cmd /k "call "%~dp0..\app\backend\venv\Scripts\activate.bat" && cd /d "%~dp0..\app\backend" && uvicorn main:app --reload --host 127.0.0.1 --port 3456"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Terminal 2: Vite dev server
start "ACE-Step Frontend" cmd /k "cd /d "%~dp0..\app\frontend" && npm run dev"

echo.
echo Backend:  http://127.0.0.1:3456/docs  (API docs)
echo Frontend: http://127.0.0.1:5173       (Vite HMR)
echo.
echo Close both terminal windows to stop.
pause
