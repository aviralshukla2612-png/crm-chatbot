# =================================================================
# ESS CHATBOT SaaS — SECURE 1-COMMAND DOCKER DEPLOYMENT (PowerShell)
# =================================================================
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "🚀 [1/5] Pre-Flight Checks & Configuration Validation..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Warning ".env file not found. Copying .env.example..."
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env with default placeholders." -ForegroundColor Yellow
}

if (Test-Path ".git") {
    try { git pull origin main } catch { Write-Warning "Git pull skipped or failed, proceeding with local files." }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "🐳 [2/5] Building & Launching Docker Services..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path "frontend/data")) {
    New-Item -ItemType Directory -Path "frontend/data" -Force | Out-Null
}

docker compose up -d --build --remove-orphans

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "⏳ [3/5] Waiting for PostgreSQL readiness..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$retries = 0
$maxRetries = 20
$pgReady = $false

while (-not $pgReady -and $retries -lt $maxRetries) {
    try {
        $null = docker compose exec -T postgres pg_isready 2>&1
        if ($LASTEXITCODE -eq 0) { $pgReady = $true; break }
    } catch {}
    Write-Host "Waiting for PostgreSQL... ($($retries + 1)/$maxRetries)"
    Start-Sleep -Seconds 2
    $retries++
}

if (-not $pgReady) {
    Write-Host "❌ PostgreSQL took too long to start. Please check 'docker compose logs postgres'." -ForegroundColor Red
    exit 1
}
Write-Host "✅ PostgreSQL is online and accepting connections!" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "📦 [4/5] Executing Idempotent Schema & Data Migration..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (Test-Path "frontend/data/idempotent_migration.sql") {
    Write-Host "Applying idempotent_migration.sql..."
    Get-Content "frontend/data/idempotent_migration.sql" | docker compose exec -T postgres psql -U postgres -d ess_chatbot
    Write-Host "✅ Database schema and tenant records applied." -ForegroundColor Green
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE! All services are active." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  🌐 Frontend App & Widget:  http://127.0.0.1:3300" -ForegroundColor Yellow
Write-Host "  🏥 Health Check:           http://127.0.0.1:3300/api/health" -ForegroundColor Yellow
Write-Host "  🐘 PostgreSQL Database:    127.0.0.1:5432" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green
Write-Host "View live logs with: docker compose logs -f"
