@echo off
title Resolvo - AI Complaint Resolution Engine
color 0B
echo.
echo  ==========================================
echo   RESOLVO - AI Complaint Resolution Engine
echo  ==========================================
echo.

:: Start Flask Backend
echo [1/3] Starting Flask Backend on port 5000...
cd /d "%~dp0backend"
start /B cmd /c "python app.py"
ping 127.0.0.1 -n 4 > nul

:: Install and start Frontend
echo [2/3] Starting Vite Frontend on port 5173...
cd /d "%~dp0frontend"
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
start /B cmd /c "npm run dev"
ping 127.0.0.1 -n 4 > nul

:: Open browser
echo [3/3] Opening browser...
start http://localhost:5173

echo.
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo.
echo  Press Ctrl+C to stop all services.
pause > nul
