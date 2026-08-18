@echo off
title AR_ChatBot - Starting...
echo ========================================
echo    AR_ChatBot - AI Customer Service
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

:: Start server
echo [INFO] Starting AR_ChatBot server...
echo [INFO] Dashboard: http://localhost:3000
echo [INFO] API: http://localhost:3000/api/chat
echo.
cd /d "%~dp0backend"
node server.js

pause
