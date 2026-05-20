@echo off
echo ========================================
echo Restarting Backend Server
echo ========================================
echo.

echo Stopping existing Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server...
echo Server will run on http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js
