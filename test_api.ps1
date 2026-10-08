$body = @{
    message = "What is the difference between ERP Starter and Professional edition and what are the prices?"
    history = @()
} | ConvertTo-Json

Write-Host "Sending query to http://localhost:8000/api/chat..."
$t0 = Get-Date

try {
    $res = Invoke-RestMethod -Uri "http://localhost:8000/api/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 60
    $elapsed = [Math]::Round(((Get-Date) - $t0).TotalSeconds, 2)

    Write-Host "`n==== STATUS: 200 OK (Completed in $elapsed seconds) ====" -ForegroundColor Green
    Write-Host "`n--- AI SALES EXECUTIVE RESPONSE ---" -ForegroundColor Cyan
    Write-Host $res.response
    Write-Host "`n--- RETRIEVED KNOWLEDGE SOURCES (pgvector) ---" -ForegroundColor Yellow
    foreach ($source in $res.sources) {
        Write-Host "- $($source.title) [$($source.category)] (Cosine distance: $([Math]::Round($source.distance, 4)))"
    }
} catch {
    Write-Host "Error calling API: $_" -ForegroundColor Red
}
