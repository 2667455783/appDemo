# Wrapper so this works from the backend folder:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-explore-backend.ps1
$ErrorActionPreference = 'Stop'
$target = Join-Path $PSScriptRoot '..\..\scripts\deploy-explore-backend.ps1'
if (-not (Test-Path -LiteralPath $target)) {
  Write-Error 'Run git pull in C:\Users\PC\Desktop\appDemo first. The deploy script lives at repo-root\scripts\deploy-explore-backend.ps1'
}
& $target
exit $LASTEXITCODE
