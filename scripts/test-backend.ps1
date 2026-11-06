$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    python scripts/test-product.py
    if ($LASTEXITCODE -ne 0) { throw 'Product integration checks failed.' }
} finally { Pop-Location }
