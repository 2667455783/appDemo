# Copy AI_* from local backend/.env.dev to /opt/appdemo-backend/.env.prod
# Does not print secret values. Run from repo root or backend folder.
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = Split-Path -Parent $here
if (-not (Test-Path -LiteralPath (Join-Path $root 'package.json'))) {
  $root = Split-Path -Parent $root
}
Set-Location -LiteralPath $root

$cfg = Get-Content -LiteralPath (Join-Path $root 'scripts\release.config.json') -Raw | ConvertFrom-Json
$key = [string]$cfg.identityFile
$hostName = [string]$cfg.host
$user = [string]$cfg.user
$port = 22
if ($cfg.port) { $port = [int]$cfg.port }
if (-not (Test-Path -LiteralPath $key)) { Write-Error ("SSH key not found: " + $key) }

$envLocal = Join-Path $root 'backend\.env.dev'
if (-not (Test-Path -LiteralPath $envLocal)) {
  Write-Error 'missing backend\.env.dev (the SiliconFlow file you already used locally)'
}

$wanted = @('AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL', 'AI_TIMEOUT_SECONDS')
$picked = @()
Get-Content -LiteralPath $envLocal | ForEach-Object {
  $line = $_.Trim()
  if ($line.StartsWith('#') -or $line.Length -lt 3) { return }
  $eq = $line.IndexOf('=')
  if ($eq -lt 1) { return }
  $name = $line.Substring(0, $eq).Trim()
  $val = $line.Substring($eq + 1).Trim()
  if ($wanted -contains $name -and $val.Length -gt 0) {
    $picked += ($name + '=' + $val)
    Write-Host ($name + '=present locally')
  }
}
$need = @('AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL')
foreach ($n in $need) {
  if (-not ($picked | Where-Object { $_.StartsWith($n + '=') })) {
    Write-Error ($n + ' is empty in backend\.env.dev')
  }
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
$tmp = Join-Path $env:TEMP 'appdemo-ai.env'
[System.IO.File]::WriteAllLines($tmp, $picked)
$common = @('-i', $key, '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=accept-new')
$dest = ($user + '@' + $hostName + ':/tmp/appdemo-ai.env')
$scpArgs = @('-P', [string]$port) + $common + @($tmp, $dest)
& $scp @scpArgs
Remove-Item -LiteralPath $tmp -Force
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$remoteCmd = @'
set -eu
sed -i "s/\r$//" /tmp/appdemo-ai.env
ENVF=/opt/appdemo-backend/.env.prod
mkdir -p /opt/appdemo-backend
touch "$ENVF"
cp -a "$ENVF" "$ENVF.bak"
grep -v -E "^(AI_API_KEY|AI_BASE_URL|AI_MODEL|AI_TIMEOUT_SECONDS)=" "$ENVF" > /tmp/env.prod.keep || true
cat /tmp/env.prod.keep /tmp/appdemo-ai.env > "$ENVF"
rm -f /tmp/appdemo-ai.env /tmp/env.prod.keep
chmod 600 "$ENVF"
systemctl restart appdemo-backend
sleep 6
systemctl is-active appdemo-backend
curl -sS --max-time 8 http://127.0.0.1:8080/api/v1/health || true
echo
for k in AI_API_KEY AI_BASE_URL AI_MODEL; do
  if grep -q "^${k}=.\+" "$ENVF"; then echo "$k=set"; else echo "$k=MISSING"; fi
done
'@
$sshArgs = @('-p', [string]$port) + $common + @(($user + '@' + $hostName), $remoteCmd)
& $ssh @sshArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'AI env synced. Local frontend: npm run dev:prod-api'
