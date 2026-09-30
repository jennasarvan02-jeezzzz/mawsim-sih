# ===================================================
# FreightIQ — PowerShell Unified Launcher
# ===================================================

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "   Starting FreightIQ (Backend + Frontend)" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Start Backend in a separate window
Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .venv\Scripts\Activate.ps1; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Frontend in a separate window
Write-Host "[2/2] Starting React Vite Frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "Both servers launched successfully!" -ForegroundColor Green
Write-Host "  • Frontend UI: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  • Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  • Swagger API: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
