$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $health = Invoke-RestMethod 'http://localhost:8080/actuator/health'
    if ($health.status -ne 'UP') { throw 'Backend saglik kontrolu basarisiz.' }
    $suffix = [Guid]::NewGuid().ToString('N')
    $mqttLine = 'mqtt-' + $suffix
    $httpLine = 'http-' + $suffix
    $mqttJson = @{ lineCode = $mqttLine; capOk = $false; labelOk = $true; liquidLevelOk = $true } | ConvertTo-Json -Compress
    $mqttJson | docker compose exec -T mosquitto sh -ec 'mosquitto_pub -h localhost -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" -t production/dev-test/inspections -q 1 -s'
    if ($LASTEXITCODE -ne 0) { throw 'MQTT gonderimi basarisiz.' }
    $httpJson = @{ lineCode = $httpLine; capOk = $true; labelOk = $true; liquidLevelOk = $true } | ConvertTo-Json -Compress
    $response = Invoke-WebRequest 'http://localhost:8080/api/v1/inspections' -UseBasicParsing -Method Post -ContentType 'application/json' -Body $httpJson
    if ($response.StatusCode -ne 202) { throw 'HTTP kabul testi basarisiz.' }
    $sql = "SELECT line_code || ':' || overall_result FROM bottle_inspections WHERE line_code IN ('$mqttLine', '$httpLine') ORDER BY line_code"
    $found = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        $rows = @(docker compose exec -T postgres sh -ec 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "$1"' sh $sql)
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL dogrulamasi basarisiz.' }
        if (($rows -contains "${mqttLine}:FAIL") -and ($rows -contains "${httpLine}:PASS")) {
            $found = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $found) { throw 'MQTT/HTTP mesajlari 20 saniye icinde DB kaydina donusmedi.' }
    $failures = @(Invoke-RestMethod 'http://localhost:8080/api/v1/inspections/failures')
    if (-not ($failures | Where-Object { $_.lineCode -eq $mqttLine })) { throw 'FAIL kaydi API yanitinda bulunamadi.' }
    Write-Host 'PASS Backend health, MQTT -> Redis -> PostgreSQL FAIL, HTTP -> Redis -> PostgreSQL PASS, failures API'
    Write-Host 'Test iki adet mqtt-/http- onekli inceleme kaydi olusturdu.'
} finally {
    Pop-Location
}
