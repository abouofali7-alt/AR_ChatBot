@echo off
title AR_ChatBot
cd /d "%~dp0"

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found!
    pause
    exit /b 1
)

:: Install deps if needed
if not exist "backend\node_modules" (
    echo Installing dependencies...
    cd /d "%~dp0backend"
    call npm install --production
    cd /d "%~dp0"
)

:: Start server
cd /d "%~dp0backend"
start /b node server.js >nul 2>&1

:: Wait for server
timeout /t 2 /nobreak >nul

:: Try to open as app (no address bar, looks like native app)
set URL=http://localhost:3000
set OPENED=0

:: Try Edge first
where msedge >nul 2>&1
if %errorlevel% equ 0 (
    start "" msedge --app=%URL% --window-size=1200,800 --window-name="AR_ChatBot" --disable-features=TranslateUI
    set OPENED=1
    goto :done
)

:: Try Chrome
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    start "" chrome --app=%URL% --window-size=1200,800 --window-name="AR_ChatBot"
    set OPENED=1
    goto :done
)

:: Try common paths
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%URL% --window-size=1200,800 --window-name="AR_ChatBot"
    set OPENED=1
    goto :done
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%URL% --window-size=1200,800 --window-name="AR_ChatBot"
    set OPENED=1
    goto :done
)

:: Fallback: open in default browser
start %URL%

:done
echo AR_ChatBot is running!
echo Close this window to stop.
:: Keep alive until browser is closed
:loop
timeout /t 5 /nobreak >nul
tasklist /fi "WINDOWTITLE eq AR_ChatBot" 2>nul | find "node" >nul 2>&1
goto :loop
