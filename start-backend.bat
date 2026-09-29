@echo off
echo Starting RRP Backend...
cd /d "%~dp0backend"

if not exist ".venv" (
    echo Creating virtual environment...
    "C:\Users\I572267\AppData\Local\Programs\Python\Python312\python.exe" -m venv .venv
)

call .venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo Backend ready. Starting server on http://localhost:8000
.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
