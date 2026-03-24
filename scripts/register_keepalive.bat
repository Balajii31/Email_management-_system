@echo off
REM Supabase Keep-Alive — runs every 4 days using Windows Task Scheduler
REM Run this file as Administrator ONCE to register the scheduled task

set PYTHON=python
set SCRIPT=%~dp0supabase_keepalive.py

echo Registering Supabase Keep-Alive Scheduled Task...

schtasks /create ^
  /tn "SupabaseKeepAlive" ^
  /tr "\"%PYTHON%\" \"%SCRIPT%\"" ^
  /sc daily ^
  /mo 4 ^
  /st 09:00 ^
  /ru "%USERNAME%" ^
  /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Scheduled Task registered successfully!
    echo      Name  : SupabaseKeepAlive
    echo      Runs  : Every 4 days at 09:00
    echo      Script: %SCRIPT%
    echo.
    echo Running first ping now...
    "%PYTHON%" "%SCRIPT%"
) else (
    echo.
    echo [ERROR] Failed to register. Try right-clicking this file and
    echo         selecting "Run as administrator".
)

pause
