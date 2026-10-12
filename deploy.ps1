# ========================================================
# NexusAI / Ollama Chatbot - 1-Command Docker Deployment (PowerShell)
# ========================================================
$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "🚀 [1/4] Pulling latest code from Git..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
if (Test-Path ".git") {
    try { git pull origin main } catch { Write-Warning "Git pull skipped or failed, proceeding with local files." }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "🐳 [2/4] Building and launching Docker containers..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path "frontend/data")) {
    New-Item -ItemType Directory -Path "frontend/data" -Force | Out-Null
}

docker compose up -d --build --remove-orphans

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "⏳ [3/4] Waiting for Ollama engine to initialize..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$retries = 0
$maxRetries = 30
$ready = $false

while (-not $ready -and $retries -lt $maxRetries) {
    try {
        $null = docker compose exec -T ollama ollama list 2>&1
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    } catch {}
    Write-Host "Waiting for Ollama API... ($($retries + 1)/$maxRetries)"
    Start-Sleep -Seconds 2
    $retries++
}

if (-not $ready) {
    Write-Host "❌ Ollama took too long to start. Please check 'docker compose logs ollama'." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Ollama is online!" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "📦 [4/4] Pre-pulling AI models inside Ollama container..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$chatModel = if ($env:CHAT_MODEL) { $env:CHAT_MODEL } else { "llama3.2:1b" }
$embedModel = "nomic-embed-text"

Write-Host "-> Pulling Chat Model: $chatModel"
docker compose exec -T ollama ollama pull $chatModel

Write-Host "-> Pulling Embedding Model: $embedModel"
docker compose exec -T ollama ollama pull $embedModel

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE! All services are active." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  🌐 Frontend App & Widget:  http://localhost:3300" -ForegroundColor Yellow
Write-Host "  🧠 Ollama API:             http://localhost:11434" -ForegroundColor Yellow
Write-Host "  ⚡ FastAPI RAG Backend:    http://localhost:8008" -ForegroundColor Yellow
Write-Host "  💻 Open-WebUI Dashboard:   http://localhost:3880" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Green
Write-Host "View live logs with: docker compose logs -f"
