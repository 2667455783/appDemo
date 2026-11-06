# Deploy explore-chat backend to tjb666.space using the same SSH key as APK release.
# From repo root OR backend folder (wrapper).
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
$hostName = [string]$cfg.host
$user = [string]$cfg.user
$port = 22
if ($cfg.port) { $port = [int]$cfg.port }
$key = [string]$cfg.identityFile
if (-not (Test-Path -LiteralPath $key)) {
  Write-Error ("SSH key not found: " + $key)
}

function Find-SshTool([string]$name) {
  $p1 = Join-Path $env:WINDIR ('System32\OpenSSH\' + $name + '.exe')
  if (Test-Path -LiteralPath $p1) { return $p1 }
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  Write-Error ($name + ' not found. Install OpenSSH Client.')
}

$ssh = Find-SshTool 'ssh'
$scp = Find-SshTool 'scp'
$remote = Join-Path $root 'scripts\deploy-explore-backend-remote.sh'
if (-not (Test-Path -LiteralPath $remote)) {
  Write-Error 'missing scripts/deploy-explore-backend-remote.sh'
}

$dest = ($user + '@' + $hostName + ':/tmp/deploy-explore-backend.sh')
$common = @('-i', $key, '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=accept-new')

Write-Host ('Deploying to ' + $user + '@' + $hostName + ' (no local JDK needed)')
Write-Host 'Uploading remote script...'
$scpArgs = @('-P', [string]$port) + $common + @($remote, $dest)
& $scp @scpArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Running on server...'
$remoteCmd = 'sed -i "s/\r$//" /tmp/deploy-explore-backend.sh && bash /tmp/deploy-explore-backend.sh'
$sshArgs = @('-p', [string]$port) + $common + @(($user + '@' + $hostName), $remoteCmd)
& $ssh @sshArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Deploy finished. Then run: npm run dev:prod-api'
