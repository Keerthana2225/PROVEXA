@echo off
cd /d "%~dp0"

echo [PROVEXA OCR] Checking port 8001...

:: Kill any process already using port 8001
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8001 " ^| findstr "LISTENING"') do (
    echo [PROVEXA OCR] Killing old process on port 8001 (PID %%p)...
    taskkill /PID %%p /F >nul 2>&1
    timeout /t 1 /nobreak >nul
)

echo [PROVEXA OCR] Starting OCR service on port 8001...
cd ocr_service
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
pause
