# Copy AI_* from local backend/.env.dev to the server .env.prod. Does not print secrets.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = Split-Path -Parent $here
if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json'))) {
  $root = Split-Path -Parent $root
}
Set-Location -LiteralPath $root

$cfg = Get-Content -LiteralPath (Join-Path $root 'scripts\release.config.json') -Raw | ConvertFrom-Json
$keyFile = [string]$cfg.identityFile
$hostName = [string]$cfg.host
$user = [string]$cfg.user
$port = 22
if ($cfg.port) { $port = [int]$cfg.port }
if (-not (Test-Path -LiteralPath $keyFile)) { Write-Error ('SSH key not found: ' + $keyFile) }

$envLocal = Join-Path $root 'backend\.env.dev'
if (-not (Test-Path -LiteralPath $envLocal)) {
  Write-Error 'missing backend\.env.dev'
}

$wanted = @('AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL', 'AI_TIMEOUT_SECONDS')
$picked = New-Object System.Collections.Generic.List[string]
Get-Content -LiteralPath $envLocal | ForEach-Object {
  $line = $_.Trim().TrimEnd([char]13)
  if ($line.StartsWith('#') -or $line.Length -lt 3) { return }
  $eq = $line.IndexOf('=')
  if ($eq -lt 1) { return }
  $name = $line.Substring(0, $eq).Trim()
  $val = $line.Substring($eq + 1).Trim()
  if (($wanted -contains $name) -and ($val.Length -gt 0)) {
    [void]$picked.Add(($name + '=' + $val))
    Write-Host ($name + '=present locally')
  }
}
foreach ($n in @('AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL')) {
  $ok = $false
  foreach ($p in $picked) { if ($p.StartsWith($n + '=')) { $ok = $true } }
  if (-not $ok) { Write-Error ($n + ' is empty in backend\.env.dev') }
}

function Find-SshTool([string]$name) {
  $p1 = Join-Path $env:WINDIR ('System32\OpenSSH\' + $name + '.exe')
  if (Test-Path -LiteralPath $p1) { return $p1 }
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  Write-Error ($name + ' not found')
}
$ssh = Find-SshTool 'ssh'
$scp = Find-SshTool 'scp'
$remoteSh = Join-Path $root 'scripts\sync-ai-env-to-prod-remote.sh'
if (-not (Test-Path -LiteralPath $remoteSh)) { Write-Error 'missing sync-ai-env-to-prod-remote.sh' }

$tmp = Join-Path $env:TEMP 'appdemo-ai.env'
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($tmp, (($picked -join "`n") + "`n"), $utf8)

$common = @('-i', $keyFile, '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=accept-new')
$destEnv = ($user + '@' + $hostName + ':/tmp/appdemo-ai.env')
$destSh = ($user + '@' + $hostName + ':/tmp/sync-ai-env-to-prod-remote.sh')

Write-Host 'Uploading AI env (values hidden) and remote script...'
$scp1 = @('-P', [string]$port) + $common + @($tmp, $destEnv)
& $scp @scp1
if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath $tmp -Force; exit $LASTEXITCODE }
$scp2 = @('-P', [string]$port) + $common + @($remoteSh, $destSh)
& $scp @scp2
Remove-Item -LiteralPath $tmp -Force
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Applying on server...'
$remoteCmd = 'sed -i "s/\r$//" /tmp/sync-ai-env-to-prod-remote.sh /tmp/appdemo-ai.env && bash /tmp/sync-ai-env-to-prod-remote.sh'
$sshArgs = @('-p', [string]$port) + $common + @(($user + '@' + $hostName), $remoteCmd)
& $ssh @sshArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'AI env synced. Then run: npm run dev:prod-api'
