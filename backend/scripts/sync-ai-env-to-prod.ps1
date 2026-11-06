$ErrorActionPreference = 'Stop'
$target = Join-Path $PSScriptRoot '..\..\scripts\sync-ai-env-to-prod.ps1'
& $target
exit $LASTEXITCODE
