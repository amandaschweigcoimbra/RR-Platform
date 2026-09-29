@echo off
echo Starting RRP Frontend...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing npm dependencies...
    npm install
)

echo Frontend ready. Opening http://localhost:3000
npm run dev
