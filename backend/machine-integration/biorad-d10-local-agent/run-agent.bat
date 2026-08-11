@echo off
REM ============================================================================
REM BIO-RAD D-10 LOCAL AGENT - STARTUP SCRIPT
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ██████╗ ██╗ ██████╗ ██╗      █████╗ ██████╗ ██████╗       ██████╗  ██████╗  ██╗ ██████╗ 
echo ██╔══██╗██║██╔═══██╗██║     ██╔══██╗██╔══██╗██╔══██╗      ██╔══██╗██╔═══██╗███║██╔════╝ 
echo ██████╔╝██║██║   ██║██║     ███████║██║  ██║██║  ██║█████╗██║  ██║██║   ██║╚██║██║  ███╗
echo ██╔══██╗██║██║   ██║██║     ██╔══██║██║  ██║██║  ██║╚════╝██║  ██║██║   ██║ ██║██║   ██║
echo ██████╔╝██║╚██████╔╝███████╗██║  ██║██████╔╝██████╔╝      ██████╔╝╚██████╔╝ ██║╚██████╔╝
echo ╚═════╝ ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝ ╚═════╝       ╚═════╝  ╚═════╝  ╚═╝ ╚═════╝ 
echo.
echo Bio-Rad D-10 HbA1c Analyzer - ASTM E1381/E1394 Protocol
echo Local Integration Agent - Port 5200
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found
    echo Creating .env from .env.example...
    if exist ".env.example" (
        copy .env.example .env > nul
        echo [INFO] .env created. Please configure database and VPS settings.
    ) else (
        echo [ERROR] .env.example not found. Cannot proceed.
        exit /b 1
    )
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        exit /b 1
    )
)

REM Start the agent
echo [INFO] Starting Bio-Rad D-10 Local Agent...
echo.

node app.js

if errorlevel 1 (
    echo.
    echo [ERROR] Agent crashed. Check the logs above.
    pause
    exit /b 1
)

pause
