# Deploy explore-chat backend to tjb666.space using the same SSH key as APK release.
# From repo root:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-explore-backend.ps1
# From backend folder the wrapper at backend\scripts\deploy-explore-backend.ps1 calls this file.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = Split-Path -Parent $here
if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json'))) {
  $root = Split-Path -Parent $root
}
if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json'))) {
  Write-Error 'Cannot find repo root (package.json). cd to C:\Users\PC\Desktop\appDemo then git pull.'
}
Set-Location -LiteralPath $root

$cfgPath = Join-Path $root 'scripts\release.config.json'
if (-not (Test-Path -LiteralPath $cfgPath)) {
  Write-Error 'missing scripts/release.config.json'
}
$cfg = Get-Content -LiteralPath $cfgPath -Raw | ConvertFrom-Json
$hostName = $cfg.host
$user = $cfg.user
$port = 22
if ($cfg.port) { $port = [int]$cfg.port }
$key = $cfg.identityFile
if (-not (Test-Path -LiteralPath $key)) {
  Write-Error ("SSH key not found: " + $key)
}

$ssh = Join-Path $env:WINDIR 'System32\OpenSSH\ssh.exe'
if (-not (Test-Path -LiteralPath $ssh)) { $ssh = 'ssh' }

$remote = Join-Path $root 'scripts\deploy-explore-backend-remote.sh'
if (-not (Test-Path -LiteralPath $remote)) {
  Write-Error 'missing scripts/deploy-explore-backend-remote.sh'
}

Write-Host ('Deploying to ' + $user + '@' + $hostName + ' (no local JDK needed)')
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $ssh
$psi.Arguments = "-i `"$key`" -p $port -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new ${user}@${hostName} bash -s"
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$p = New-Object System.Diagnostics.Process
$p.StartInfo = $psi
$null = $p.Start()
$in = Get-Content -LiteralPath $remote -Raw
$p.StandardInput.Write($in)
$p.StandardInput.Close()
$out = $p.StandardOutput.ReadToEnd()
$err = $p.StandardError.ReadToEnd()
$p.WaitForExit()
if ($out) { Write-Host $out }
if ($err) { Write-Host $err }
if ($p.ExitCode -ne 0) { exit $p.ExitCode }
Write-Host 'Deploy finished. Then run: npm run dev:prod-api'
