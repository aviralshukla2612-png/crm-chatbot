# =================================================================
# ESS CHATBOT SaaS — SECURE 1-COMMAND DOCKER DEPLOYMENT (PowerShell)
# =================================================================
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "🚀 [1/5] Pre-Flight Checks & Configuration Validation..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Error "Production '.env' file not found! Create .env from .env.example with strong credentials."
    exit 1
}

# Load .env file
Get-Content ".env" | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line.Split("=", 2)
        if ($parts.Length -eq 2) {
            $key = $parts[0].Trim()
            $val = $parts[1].Trim(' "')
            [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
        }
    }
}

$pgPass = $env:POSTGRES_PASSWORD
if (-not $pgPass) {
    Write-Error "POSTGRES_PASSWORD is not set in .env! Production requires a secure database password."
    exit 1
}

if ($pgPass -eq "postgrespassword" -or $pgPass.Contains("your_") -or $pgPass -eq "password" -or $pgPass -eq "admin") {
    Write-Error "Insecure default or placeholder POSTGRES_PASSWORD detected in .env! Generate a secure password before deploying."
    exit 1
}

if ($env:DEFAULT_AI_PROVIDER -eq "groq") {
    if (-not $env:GROQ_API_KEY -or $env:GROQ_API_KEY.Contains("your_")) {
        Write-Error "DEFAULT_AI_PROVIDER is set to 'groq', but GROQ_API_KEY is empty or a placeholder!"
        exit 1
    }
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
    Write-Error "PostgreSQL took too long to start. Check 'docker compose logs postgres'."
    exit 1
}
Write-Host "✅ PostgreSQL is online and accepting connections!" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "📦 [4/5] Executing Idempotent Schema & Data Migration..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (Test-Path "frontend/data/idempotent_migration.sql") {
    Write-Host "Applying idempotent_migration.sql..."
    Get-Content "frontend/data/idempotent_migration.sql" | docker compose exec -T postgres psql -U postgres -d ess_chatbot
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Database migration failed!"
        exit 1
    }
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
