@echo off
REM Sysmex Local Agent Runner
REM Set environment variables below or create a .env file

set TCP_PORT=5100
set DB_HOST=localhost
set DB_PORT=3306
set DB_USER=root
set DB_PASSWORD=LocalLabPass123!
set DB_NAME=lab_agent_db
set VPS_TAILSCALE_URL=http://localhost:3351

echo.
echo ======================================================================
echo SYSMEX LOCAL AGENT - HEMATOLOGY ANALYZER INTEGRATION
echo ======================================================================
echo.
echo Configuration:
echo   TCP Server (Sysmex Machine):  %TCP_PORT%
echo   Database:                     %DB_HOST%:%DB_PORT%/%DB_NAME%
echo   Cloud Backend URL:            %VPS_TAILSCALE_URL%
echo.
echo Agent runs as transparent bridge - no test code validation
echo Machine tests are determined by lab technicians configuration
echo.
echo ======================================================================
echo.

REM Run the packaged executable
dist\sysmex-agent.exe

pause