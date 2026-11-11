param(
    [ValidateSet('start', 'status', 'stop')]
    [string]$Action = 'start'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$appRoot = $repoRoot
$composeArgs = @('--project-directory', $appRoot, '-f', (Join-Path $appRoot 'compose.yaml'), '--profile', 'app')
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker bulunamadi. Docker Desktop kurup baslatin.' }
if ($Action -eq 'start') {
    if (-not (Test-Path -LiteralPath (Join-Path $appRoot '.env'))) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $appRoot 'scripts/setup-dev.ps1')
        if ($LASTEXITCODE -ne 0) { throw 'Yerel ayarlar olusturulamadi.' }
    }
    & docker compose @composeArgs up -d --build --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw 'VisionQC baslatilamadi. Yukaridaki Docker hatasini kontrol edin.' }
    Write-Host 'VisionQC hazir: http://localhost:5197'
    Write-Host 'Kamera icin model servisini ayri bir terminalde baslatin; ayrintilar README.md dosyasinda.'
} elseif ($Action -eq 'status') {
    & docker compose @composeArgs ps -a
    if ($LASTEXITCODE -ne 0) { throw 'Servis durumu alinamadi.' }
} else {
    & docker compose @composeArgs stop
    if ($LASTEXITCODE -ne 0) { throw 'Servisler durdurulamadi.' }
    Write-Host 'Servisler durduruldu; kayitlar korundu.'
}
