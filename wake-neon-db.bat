@echo off
echo =====================================================
echo   WAKING UP NEON DATABASE
echo =====================================================
echo.
echo Attempting to wake database with connection...
echo.

:retry
set /a count=1
:loop
if %count% GTR 3 goto failed

echo [Attempt %count%/3] Connecting to database...
npx prisma db push --accept-data-loss 2>nul
if %errorlevel% EQU 0 goto success

timeout /t 3 /nobreak >nul
set /a count+=1
goto loop

:success
echo.
echo =====================================================
echo   [SUCCESS] DATABASE IS ACTIVE AND READY!
echo =====================================================
echo.
echo You can now:
echo   1. Go to http://localhost:3000
echo   2. Connect your Gmail account
echo   3. Start syncing and classifying emails
echo.
pause
exit /b 0

:failed
echo.
echo =====================================================
echo   DATABASE STILL SLEEPING - MANUAL WAKE NEEDED
echo =====================================================
echo.
echo Please wake it manually:
echo   1. Go to: https://console.neon.tech
echo   2. Find project: ep-solitary-king-ai1l19t4
echo   3. Click to wake if showing "Idle"
echo   4. Wait for "Active" status
echo   5. Run this script again
echo.
pause
exit /b 1
