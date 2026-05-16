@echo off
TITLE PROVEXA OCR Service
echo ============================================
echo   PROVEXA OCR Service - Starting on :8001
echo ============================================

REM -- Try to activate virtual environment if it exists
if exist "%~dp0venv\Scripts\activate.bat" (
    call "%~dp0venv\Scripts\activate.bat"
    echo [OK] Virtual environment activated.
) else (
    echo [WARN] No venv found. Using system Python.
    echo [INFO] Create one with: python -m venv venv
    echo [INFO] Then install: pip install -r requirements.txt
)

cd /d "%~dp0"

uvicorn main:app --host 0.0.0.0 --port 8001 --reload
pause
