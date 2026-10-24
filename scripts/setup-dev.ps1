$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$envPath = Join-Path $repoRoot '.env'
if (Test-Path -LiteralPath $envPath) {
    Write-Host '.env zaten var; mevcut ayarlar korundu.'
    exit 0
}
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
    'MQTT_PORT=1883'
)
[IO.File]::WriteAllText($envPath, ($settings -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
Write-Host 'Yerel .env olusturuldu. Parolalar Git tarafindan yok sayilir.'
