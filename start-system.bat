@echo off
echo =====================================================
echo   STARTING EMAIL SPAM DETECTION SYSTEM
echo   Now with MongoDB Database!
echo =====================================================
echo.
echo Starting services...
echo.

REM Start BERT ML Server in new window
start "BERT ML Server" cmd /k "cd ml_pipeline && python serve.py"
echo [1/2] ✓ BERT ML Server starting on port 8000...

REM Wait for ML server to initialize
timeout /t 5 /nobreak >nul

REM Start Next.js in new window
start "Next.js App" cmd /k "npm run dev"
echo [2/2] ✓ Next.js App starting on port 3000...

echo.
echo =====================================================
echo   SERVICES STARTED!
echo =====================================================
echo.
echo Two windows opened:
echo   1. BERT ML Server (port 8000)
echo   2. Next.js App (port 3000)
echo.
echo Wait 10-15 seconds, then visit:
echo   http://localhost:3000
echo.
echo =====================================================
pause
