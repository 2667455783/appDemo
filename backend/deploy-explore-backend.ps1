$ErrorActionPreference = 'Stop'
$target = Join-Path $PSScriptRoot '..\scripts\deploy-explore-backend.ps1'
if (-not (Test-Path -LiteralPath $target)) {
  Write-Error 'Run git pull in C:\Users\PC\Desktop\appDemo first.'
}
& $target
exit $LASTEXITCODE
