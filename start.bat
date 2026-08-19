@echo off
title AR_ChatBot - AI Assistant
echo ========================================
echo    AR_ChatBot - AI Assistant
echo ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install from https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "backend\node_modules" (
    echo [INFO] Installing dependencies...
    cd /d "%~dp0backend"
    call npm install --production
    cd /d "%~dp0"
)

:: Start server in background
echo [INFO] Starting AR_ChatBot...
cd /d "%~dp0backend"
start /b node server.js

:: Wait for server to start
timeout /t 3 /nobreak >nul

:: Open browser
start http://localhost:3000

:: Keep running
echo [INFO] AR_ChatBot is running at http://localhost:3000
echo [INFO] Press Ctrl+C to stop
cd /d "%~dp0"
node -e "setInterval(()=>{},1000)"
