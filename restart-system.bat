@echo off
echo.
echo ====================================================================
echo   Restarting Email Spam Detection System
echo ====================================================================
echo.

echo Stopping any running services...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo Starting BERT ML Server...
start "BERT ML Server" cmd /k "cd ml_pipeline && python serve.py"
timeout /t 5 /nobreak >nul

echo.
echo Starting Next.js Application...
start "Next.js App" cmd /k "npm run dev"

echo.
echo ====================================================================
echo   Services Starting...
echo ====================================================================
echo.
echo   BERT ML Server:  http://localhost:8000
echo   Next.js App:     http://localhost:3000
echo.
echo   Please wait 10-15 seconds for services to fully start.
echo   Then open: http://localhost:3000
echo.
echo ====================================================================
echo.
pause
