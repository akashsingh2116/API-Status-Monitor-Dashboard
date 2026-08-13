param(
  [Parameter(Mandatory = $true)]
  [string]$ApiKey,

  [string]$Base = "http://localhost:5000",

  [string[]]$Endpoints = @(
    "/social", "/weather", "/data", "/link", "/inventory",
    "/payment", "/analytics", "/profile", "/notifications"
  )
)

Write-Host "=== Sending simulated events for API key $ApiKey ==="

$statuses = @(200, 200, 201, 301, 302, 404, 500, 503)

foreach ($endpoint in $Endpoints) {
  for ($i = 0; $i -lt 5; $i++) {
    $status = Get-Random -InputObject $statuses
    $body = @{
      method         = "GET"
      endpoint       = $endpoint
      status         = $status
      responseTimeMs = Get-Random -Minimum 20 -Maximum 800
    } | ConvertTo-Json

    try {
      Invoke-RestMethod -Uri "$Base/api/ingest" -Method Post `
        -Headers @{ "x-api-key" = $ApiKey; "Content-Type" = "application/json" } `
        -Body $body
    } catch {
      Write-Host "Request failed: $_"
    }
    Start-Sleep -Milliseconds 300
  }
  Write-Host "-> Finished $endpoint"
}

Write-Host "=== Simulation done. Check the dashboard for this API. ==="
