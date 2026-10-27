# Apply schema.sql using backend/.env (requires MySQL 8 client)
$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
# Prefer .env.dev (local default profile), then legacy .env
$envFile = Join-Path $backendRoot '.env.dev'
if (-not (Test-Path $envFile)) { $envFile = Join-Path $backendRoot '.env' }
if (-not (Test-Path $envFile)) {
  throw "Missing .env.dev / .env under $backendRoot (copy .env.dev.example first)"
}
Write-Host "Using env file: $envFile"

$vars = @{}
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $i = $line.IndexOf('=')
  if ($i -lt 1) { return }
  $vars[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim()
}

$hostName = $vars['MYSQL_HOST']
$port = if ($vars['MYSQL_PORT']) { $vars['MYSQL_PORT'] } else { '3306' }
$db = $vars['MYSQL_DATABASE']
$user = $vars['MYSQL_USER']
$pass = $vars['MYSQL_PASSWORD']
if (-not $hostName -or -not $db -or -not $user) {
  throw 'Missing MYSQL_HOST / MYSQL_DATABASE / MYSQL_USER in .env'
}

$mysqlExe = $null
$cmd = Get-Command mysql -ErrorAction SilentlyContinue
if ($cmd) { $mysqlExe = $cmd.Source }
else {
  $guess = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
  if (Test-Path $guess) { $mysqlExe = $guess }
}
if (-not $mysqlExe) { throw 'mysql client not found' }

# Avoid shell mangling of special chars in password (e.g. @)
$cnf = Join-Path $env:TEMP ("appdemo-mysql-{0}.cnf" -f [guid]::NewGuid().ToString('N'))
@(
  '[client]'
  "host=$hostName"
  "port=$port"
  "user=$user"
  "password=$pass"
  'default-character-set=utf8mb4'
) | Set-Content -Path $cnf -Encoding Ascii

try {
  $schema = Join-Path $PSScriptRoot 'schema.sql'
  Write-Host "CREATE DATABASE IF NOT EXISTS $db ..."
  & $mysqlExe --defaults-extra-file=$cnf -e "CREATE DATABASE IF NOT EXISTS ``$db`` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE failed (exit $LASTEXITCODE). Check user/password/privileges." }
  Write-Host "Applying $schema ..."
  Get-Content $schema -Raw -Encoding UTF8 | & $mysqlExe --defaults-extra-file=$cnf $db
  if ($LASTEXITCODE -ne 0) { throw "schema apply failed (exit $LASTEXITCODE)" }
  Write-Host 'Done.'
}
finally {
  Remove-Item $cnf -Force -ErrorAction SilentlyContinue
}
