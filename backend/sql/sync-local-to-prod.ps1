# Sync local MySQL (structure + data) → production.
# Reads backend/.env.dev (source) and backend/.env.prod (target).
# WARNING: overwrites tables in the prod database with local dump.
$ErrorActionPreference = 'Stop'

$backendRoot = Split-Path $PSScriptRoot -Parent
$srcEnv = Join-Path $backendRoot '.env.dev'
$dstEnv = Join-Path $backendRoot '.env.prod'
if (-not (Test-Path $srcEnv)) { throw "Missing $srcEnv" }
if (-not (Test-Path $dstEnv)) { throw "Missing $dstEnv" }

function Read-EnvFile([string]$path) {
  $vars = @{}
  Get-Content $path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $vars[$line.Substring(0, $i).Trim()] = $line.Substring($i + 1).Trim()
  }
  return $vars
}

function Find-MysqlExe([string]$name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $base = 'C:\Program Files\MySQL\MySQL Server 8.0\bin'
  $guess = Join-Path $base $name
  if (Test-Path $guess) { return $guess }
  throw "$name not found (install MySQL 8 client)"
}

function New-MysqlCnf([hashtable]$vars) {
  $hostName = $vars['MYSQL_HOST']
  $port = if ($vars['MYSQL_PORT']) { $vars['MYSQL_PORT'] } else { '3306' }
  $user = $vars['MYSQL_USER']
  $pass = $vars['MYSQL_PASSWORD']
  if (-not $hostName -or -not $user) { throw 'Missing MYSQL_HOST / MYSQL_USER' }
  $cnf = Join-Path $env:TEMP ("appdemo-sync-{0}.cnf" -f [guid]::NewGuid().ToString('N'))
  @(
    '[client]'
    "host=$hostName"
    "port=$port"
    "user=$user"
    "password=$pass"
    'default-character-set=utf8mb4'
  ) | Set-Content -Path $cnf -Encoding Ascii
  return $cnf
}

$src = Read-EnvFile $srcEnv
$dst = Read-EnvFile $dstEnv
$srcDb = $src['MYSQL_DATABASE']
$dstDb = $dst['MYSQL_DATABASE']
if (-not $srcDb -or -not $dstDb) { throw 'Missing MYSQL_DATABASE in .env.dev / .env.prod' }

$mysql = Find-MysqlExe 'mysql.exe'
$mysqldump = Find-MysqlExe 'mysqldump.exe'

$srcCnf = New-MysqlCnf $src
$dstCnf = New-MysqlCnf $dst
$dumpFile = Join-Path $PSScriptRoot ('_sync_studyApp_{0}.dump.sql' -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

Write-Host "Source: $($src['MYSQL_HOST']):$($src['MYSQL_PORT']) / $srcDb"
Write-Host "Target: $($dst['MYSQL_HOST']):$($dst['MYSQL_PORT']) / $dstDb"
Write-Host "Dump → $dumpFile"

try {
  Write-Host 'Ping source...'
  & $mysql --defaults-extra-file=$srcCnf -N -e "SELECT 1" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Cannot connect to source $($src['MYSQL_HOST'])" }

  Write-Host 'Ping target...'
  & $mysql --defaults-extra-file=$dstCnf -N -e "SELECT 1" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw @"
Cannot connect to target $($dst['MYSQL_HOST']).
Check: security group allows your IP on 3306; MySQL user host is '%' or your IP; password matches.
"@
  }

  Write-Host "CREATE DATABASE IF NOT EXISTS $dstDb ..."
  & $mysql --defaults-extra-file=$dstCnf -e "CREATE DATABASE IF NOT EXISTS ``$dstDb`` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE on target failed (exit $LASTEXITCODE)" }

  # Best-effort: large LONGTEXT (user_project.files_json); ignore if no SUPER privilege
  try {
    $null = & $mysql --defaults-extra-file=$dstCnf -e "SET GLOBAL max_allowed_packet=67108864;" 2>&1
  } catch {
    Write-Host 'Skip SET GLOBAL max_allowed_packet (no privilege) — session flag on import instead'
  }

  Write-Host 'mysqldump source (structure + data)...'
  # Dump tables only (no CREATE DATABASE) so we import into dstDb explicitly
  $tableList = & $mysql --defaults-extra-file=$srcCnf -N $srcDb -e "SHOW TABLES;"
  if ($LASTEXITCODE -ne 0 -or -not $tableList) { throw 'No tables on source or SHOW TABLES failed' }
  $tables = @($tableList | Where-Object { $_ -and $_.Trim() })
  Write-Host ("Tables: " + ($tables -join ', '))

  # -r writes UTF-8 without PowerShell BOM/encoding surprises
  $dumpArgs = @(
    "--defaults-extra-file=$srcCnf",
    '--single-transaction',
    '--routines',
    '--triggers',
    '--set-gtid-purged=OFF',
    '--default-character-set=utf8mb4',
    '--hex-blob',
    '--add-drop-table',
    '--no-tablespaces',
    "-r$dumpFile",
    $srcDb
  ) + $tables
  & $mysqldump @dumpArgs 2>&1 | ForEach-Object {
    $msg = "$_"
    if ($msg -match 'Error|fatal') { Write-Host $msg }
  }
  if ($LASTEXITCODE -ne 0) { throw "mysqldump failed (exit $LASTEXITCODE)" }

  $sizeMb = [math]::Round((Get-Item $dumpFile).Length / 1MB, 2)
  Write-Host "Dump size: ${sizeMb} MB — importing to target (overwrites tables)..."
  # cmd redirection avoids PowerShell mangling large SQL
  $importCmd = "`"$mysql`" --defaults-extra-file=`"$dstCnf`" --max_allowed_packet=64M $dstDb"
  cmd /c "$importCmd < `"$dumpFile`""
  if ($LASTEXITCODE -ne 0) { throw "Import to target failed (exit $LASTEXITCODE)" }

  Write-Host ''
  Write-Host '=== Target SHOW TABLES ==='
  & $mysql --defaults-extra-file=$dstCnf $dstDb -e "SHOW TABLES;"
  Write-Host ''
  Write-Host '=== Row counts source ==='
  & $mysql --defaults-extra-file=$srcCnf $srcDb -e @"
SELECT 'app_user' t, COUNT(*) c FROM app_user
UNION ALL SELECT 'user_profile', COUNT(*) FROM user_profile
UNION ALL SELECT 'study_snapshot', COUNT(*) FROM study_snapshot
UNION ALL SELECT 'git_repo', COUNT(*) FROM git_repo
UNION ALL SELECT 'git_branch_snapshot', COUNT(*) FROM git_branch_snapshot
UNION ALL SELECT 'user_project', COUNT(*) FROM user_project;
"@
  Write-Host '=== Row counts target ==='
  & $mysql --defaults-extra-file=$dstCnf $dstDb -e @"
SELECT 'app_user' t, COUNT(*) c FROM app_user
UNION ALL SELECT 'user_profile', COUNT(*) FROM user_profile
UNION ALL SELECT 'study_snapshot', COUNT(*) FROM study_snapshot
UNION ALL SELECT 'git_repo', COUNT(*) FROM git_repo
UNION ALL SELECT 'git_branch_snapshot', COUNT(*) FROM git_branch_snapshot
UNION ALL SELECT 'user_project', COUNT(*) FROM user_project;
"@
  Write-Host 'Done.'
}
finally {
  Remove-Item $srcCnf, $dstCnf -Force -ErrorAction SilentlyContinue
}
