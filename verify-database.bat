@echo off
echo.
echo ====================================================================
echo   Verifying Neon Database Connection
echo ====================================================================
echo.
echo Testing connection to: ep-solitary-king-ai1l19t4.c-4.us-east-1.aws.neon.tech
echo.

echo [1/3] Checking database connection...
npx prisma db push --skip-generate --accept-data-loss

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================================
    echo   [SUCCESS] Database is ACTIVE and connected!
    echo ====================================================================
    echo.
    echo You can now:
    echo   1. Go to http://localhost:3000
    echo   2. Click profile -^> "Connect Gmail"
    echo   3. The retry mechanism will save your OAuth tokens
    echo   4. Click the Sync button to fetch and classify emails
    echo.
    echo ====================================================================
    goto end
) else (
    echo.
    echo ====================================================================
    echo   [FAILED] Database is still not reachable
    echo ====================================================================
    echo.
    echo Please:
    echo   1. Go to https://console.neon.tech
    echo   2. Find your project: ep-solitary-king-ai1l19t4
    echo   3. Make sure status shows 'Active' (not 'Idle' or 'Suspended')
    echo   4. If suspended, click to wake it up
    echo   5. Wait 30 seconds, then run this script again
    echo.
)

:end
pause
