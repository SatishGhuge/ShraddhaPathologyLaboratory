@echo off
echo ============================================
echo Clear All Test Data
echo ============================================
echo.
echo WARNING: This will DELETE ALL test data!
echo.
echo This includes:
echo   - All tests
echo   - All categories and parameters
echo   - All age ranges and range values
echo   - All test charges
echo   - All corporate charges
echo   - All package test associations
echo.
pause
echo.

echo Running SQL script...
mysql -u root -p silverleaf_db < scripts\clear-test-data.sql

echo.
echo ============================================
echo Done! All test data has been deleted.
echo ============================================
echo.
echo You can now:
echo 1. Refresh your browser
echo 2. Add new tests manually
echo.
pause
