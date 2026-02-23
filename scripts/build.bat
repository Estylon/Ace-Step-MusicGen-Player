@echo off
echo Building frontend for production...
cd /d "%~dp0..\app\frontend"
call npm run build
echo.
echo Frontend built to app/backend/static/
echo You can now use start.bat to serve everything from FastAPI.
pause
