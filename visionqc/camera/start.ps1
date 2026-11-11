param(
  [Parameter(Mandatory = $true)][string]$Weights,
  [string]$Python = 'python'
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Weights -PathType Leaf)) { throw "Model dosyasi bulunamadi: $Weights" }
$resolved = (Resolve-Path -LiteralPath $Weights).Path
& $Python "$PSScriptRoot/service.py" --weights $resolved
