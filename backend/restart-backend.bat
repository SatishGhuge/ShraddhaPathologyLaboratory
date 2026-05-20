@echo off
echo ========================================
echo Restarting Backend Server
echo ========================================
echo.

echo Step 1: Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Generating Prisma Client...
call npx prisma generate

echo Step 3: Starting Backend Server...
call npm start

pause
