@echo off
cd /d "%~dp0"
echo ========================================================
echo Starting PROVEXA Management System (OCR + Backend + Frontend)
echo ========================================================
if exist "ocr_service\venv\Scripts\python.exe" (
    start "PROVEXA OCR Service" /min /D "%~dp0ocr_service" venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
) else (
    echo OCR virtualenv not found. Run: cd ocr_service && python -m venv venv && venv\Scripts\pip install -r requirements.txt
)
npm run dev
pause
