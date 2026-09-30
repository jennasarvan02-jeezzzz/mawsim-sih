@echo off
title FreightIQ — Unified Launcher
echo ===================================================
echo   Starting FreightIQ (Backend + Frontend)
echo ===================================================

echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "FreightIQ Backend (FastAPI)" cmd /k "cd backend && .venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Launching Vite Frontend on http://localhost:5173 ...
start "FreightIQ Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting up!
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo ===================================================
timeout /t 3 >nul
start http://localhost:5173
