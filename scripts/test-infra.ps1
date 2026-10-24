$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    function Invoke-InfrastructureCheck {
        param([string]$Service, [string]$Command)
        & docker compose exec -T $Service sh -ec $Command
        if ($LASTEXITCODE -ne 0) { throw "$Service testi basarisiz." }
    }
    & docker compose config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Compose yapilandirmasi gecersiz.' }
    Invoke-InfrastructureCheck postgres 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1" | grep -qx 1'
    Write-Host 'PASS PostgreSQL sorgusu'
    Invoke-InfrastructureCheck redis 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping | grep -qx PONG'
    Write-Host 'PASS Redis PING'
    $mqttCheck = @'
result=$(mktemp)
trap 'rm -f "$result"' EXIT
mosquitto_sub -h localhost -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" -t nivect/dev/smoke -q 1 -C 1 -W 10 > "$result" &
subscriber=$!
sleep 1
mosquitto_pub -h localhost -u "$MQTT_USERNAME" -P "$MQTT_PASSWORD" -t nivect/dev/smoke -q 1 -m altyapi-test
wait "$subscriber"
grep -qx altyapi-test "$result"
'@
    Invoke-InfrastructureCheck mosquitto ($mqttCheck.Replace("`r`n", "`n"))
    Write-Host 'PASS MQTT publish/subscribe'
} finally {
    Pop-Location
}
