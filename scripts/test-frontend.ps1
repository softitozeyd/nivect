param([int]$FrontendPort = 8080)
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '../frontend')
try {
    $env:NIVECT_UI_URL = "http://127.0.0.1:$FrontendPort"
    npm run test:e2e
    if ($LASTEXITCODE -ne 0) { throw 'Current frontend browser checks failed.' }
} finally { Pop-Location }
