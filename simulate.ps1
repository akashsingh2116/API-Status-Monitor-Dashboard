$BASE = "http://localhost:5000"
$KEY = "akash-singh-2116"

# 9 APIs
$apis = @(
  "/api/social",
  "/api/weather",
  "/api/data",
  "/api/link",
  "/api/inventory",
  "/api/payment",
  "/api/analytics",
  "/api/profile",
  "/api/notifications"
)

Write-Host "=== Simulating Random API Calls for Testing ==="

# Random generator for status codes
$statuses = @(200, 200, 201, 301, 302, 404, 500, 503, 100, 101)

foreach ($api in $apis) {
    for ($i = 0; $i -lt 5; $i++) {
        $status = Get-Random -InputObject $statuses
        try {
            Invoke-RestMethod -Uri "$BASE/simulate/$status" -Headers @{ "x-api-name" = $api; "x-api-key" = $KEY }
        } catch {
            # Ignore errors, they still get logged
        }
        Start-Sleep -Milliseconds 300
    }
    Write-Host "→ Finished $api"
}

Write-Host "=== Simulation done. Check Home (OK/ERR), Tracer logs, Analysis KPIs ==="
