@echo off
echo.
echo ====================================================================
echo   Waking Up Neon Database
echo ====================================================================
echo.
echo This script will wake up your Neon database by making connection attempts.
echo.

:retry
echo Attempt to connect to database...
npx prisma db push --skip-generate --accept-data-loss

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================================
    echo   SUCCESS! Database is awake and connected.
    echo ====================================================================
    echo.
    echo You can now:
    echo   1. Try connecting Gmail again in the app
    echo   2. Click the Sync button to fetch emails
    echo.
    goto end
) else (
    echo.
    echo Database still sleeping or connection failed.
    echo Waiting 5 seconds before retry...
    timeout /t 5 /nobreak >nul
    goto retry
)

:end
pause
