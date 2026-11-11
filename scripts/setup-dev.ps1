$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $repoRoot '.env'
function New-LocalSecret {
    $bytes = New-Object byte[] 24
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$settings = @(
    'POSTGRES_DB=nivect'
    'POSTGRES_USER=nivect'
    ('POSTGRES_PASSWORD=' + (New-LocalSecret))
    'POSTGRES_PORT=5432'
    ('REDIS_PASSWORD=' + (New-LocalSecret))
    'REDIS_PORT=6379'
    'MQTT_USERNAME=nivect'
    ('MQTT_PASSWORD=' + (New-LocalSecret))
    ('QC_OPERATOR_PASSWORD=' + (New-LocalSecret))
    ('QC_INGEST_PASSWORD=' + (New-LocalSecret))
    'MQTT_PORT=1883'
)
$existing = if (Test-Path -LiteralPath $envPath) { [IO.File]::ReadAllText($envPath) } else { '' }
$missing = @($settings | Where-Object {
    $key = ($_ -split '=', 2)[0]
    $existing -notmatch ('(?m)^' + [Regex]::Escape($key) + '=')
})
if ($missing.Count -gt 0) {
    $prefix = if ($existing -and -not $existing.EndsWith("`n")) { "`n" } else { '' }
    [IO.File]::WriteAllText($envPath, $existing + $prefix + ($missing -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
}
Write-Host 'Yerel .env hazir. Mevcut degerler korundu; parolalar Git tarafindan yok sayilir.'
