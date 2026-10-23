# =======================================================
# NaijaFamily Pooled Bank - Windows PowerShell Launcher
# =======================================================
Write-Host "=======================================================" -ForegroundColor Green
Write-Host " Launching NaijaFamily Pooled Bank (Frontend + Backend)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Green
Write-Host "Starting Backend API Server (Port 5000) & Vite (Port 5173)..." -ForegroundColor Yellow
& cmd.exe /c "npm.cmd start"
