@echo off
echo ========================================
echo SilverLeaf Diagnostics - MySQL Setup
echo ========================================
echo.

echo Step 1: Checking if MySQL is running...
netstat -ano | findstr :3306 >nul
if %errorlevel% equ 0 (
    echo [OK] MySQL is running on port 3306
) else (
    echo [ERROR] MySQL is not running!
    echo Please start MySQL in XAMPP/WAMP first
    pause
    exit /b 1
)
echo.

echo Step 2: Generating Prisma Client...
call npm run prisma:generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma Client
    pause
    exit /b 1
)
echo.

echo Step 3: Running database migrations...
echo When prompted, enter migration name: init
call npm run prisma:migrate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to run migrations
    pause
    exit /b 1
)
echo.

echo Step 4: Seeding database with default users...
node scripts/seed.js
if %errorlevel% neq 0 (
    echo [ERROR] Failed to seed database
    pause
    exit /b 1
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Default Login Credentials:
echo - Admin: admin / Admin@123
echo - User: user / User@123
echo.
echo View database at: http://localhost/phpmyadmin
echo Database name: silverleaf_db
echo.
echo Press any key to start the server...
pause >nul

echo.
echo Starting server...
npm run dev
