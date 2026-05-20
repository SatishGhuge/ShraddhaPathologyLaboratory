@echo off
echo.
echo ========================================
echo   SilverLeaf Database Seeding
echo ========================================
echo.
echo This will seed:
echo   - Departments
echo   - Tests with default charges
echo   - Packages
echo   - Doctors
echo   - Corporates
echo   - Units
echo   - Sample Types
echo.
echo NOTE: Franchises and Centers are NOT seeded
echo       (Create them via UI to get proper IDs)
echo.
pause

node scripts/seed-basic.js

echo.
echo ========================================
echo   Seeding Complete!
echo ========================================
echo.
pause
