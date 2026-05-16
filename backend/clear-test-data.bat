@echo off
echo ========================================
echo    CLEAR TEST DATA SCRIPT
echo ========================================
echo.
echo This will permanently delete ALL data from:
echo - Tests table
echo - Test Parameters
echo - Test Categories  
echo - Test Templates
echo - Test Charges
echo - Corporate Charges
echo - Package Charges
echo - Patient Tests
echo.
set /p confirm="Are you sure you want to continue? (y/N): "
if /i "%confirm%" neq "y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Starting test data clearing...
node clear-test-data.js

echo.
echo ========================================
echo Script execution completed!
echo ========================================
pause