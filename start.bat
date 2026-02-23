@echo off
setlocal
title ACE-Step MusicGen Player
color 0D

echo.
echo  ================================================================
echo   ACE-Step MusicGen Player
echo  ================================================================
echo.

:: Check if installed
if not exist "%~dp0app\backend\venv\Scripts\python.exe" (
    echo  [ERROR] Not installed yet! Run install.bat first.
    echo.
    pause
    exit /b 1
)

:: Activate venv
call "%~dp0app\backend\venv\Scripts\activate.bat"

:: Check if frontend is built
if not exist "%~dp0app\backend\static\index.html" (
    echo  [NOTE] Frontend not built. Building now...
    cd /d "%~dp0app\frontend"
    call npm run build 2>nul
    cd /d "%~dp0"
    echo.
)

:: Parse optional arguments
set "HOST=127.0.0.1"
set "PORT=3456"
set "MODEL=acestep-v15-turbo"
set "LM_MODEL="

:parse_args
if "%~1"=="" goto start_server
if /i "%~1"=="--port" set "PORT=%~2" & shift & shift & goto parse_args
if /i "%~1"=="--host" set "HOST=%~2" & shift & shift & goto parse_args
if /i "%~1"=="--model" set "MODEL=%~2" & shift & shift & goto parse_args
if /i "%~1"=="--lm" set "LM_MODEL=%~2" & shift & shift & goto parse_args
shift
goto parse_args

:start_server
echo  Model:    %MODEL%
if defined LM_MODEL if not "%LM_MODEL%"=="" echo  LM:       %LM_MODEL%
echo  Server:   http://%HOST%:%PORT%
echo  API Docs: http://%HOST%:%PORT%/docs
echo.
echo  Press Ctrl+C to stop the server.
echo  ================================================================
echo.

:: Set environment
set "ACESTEP_MODEL=%MODEL%"
if defined LM_MODEL if not "%LM_MODEL%"=="" set "ACESTEP_LM_MODEL=%LM_MODEL%"

:: Start server
cd /d "%~dp0app\backend"
python main.py --host %HOST% --port %PORT%

pause
