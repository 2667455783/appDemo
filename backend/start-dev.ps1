# 本机开发启动：不依赖全局 mvn / JAVA_HOME。
# 用法（在 backend 目录）：
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\start-dev.ps1
# 默认 profile=dev，读取 .env.dev。不要加 profiles=local。

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Normalize-JavaHome([string]$home) {
  if (-not $home) { return $null }
  $home = $home.Trim().Trim('"').TrimEnd('\', '/')
  if (Test-Path -LiteralPath (Join-Path $home 'bin\java.exe')) { return $home }
  # 有人把 JAVA_HOME 设成 ...\bin
  if (Test-Path -LiteralPath (Join-Path $home 'java.exe')) {
    return (Split-Path -Parent $home)
  }
  return $null
}

function Test-JavaHome([string]$home) {
  return [bool](Normalize-JavaHome $home)
}

function Get-JavaVersion([string]$javaExe) {
  try {
    $out = & $javaExe -version 2>&1 | Out-String
    if ($out -match 'version "(\d+)') { return [int]$Matches[1] }
    if ($out -match 'version "1\.(\d+)') { return [int]$Matches[1] }
  } catch { }
  return 0
}

function Resolve-JavaHome {
  $homes = New-Object System.Collections.Generic.List[string]

  $fromEnv = Normalize-JavaHome $env:JAVA_HOME
  if ($fromEnv) { $homes.Add($fromEnv) }

  $javaCmd = Get-Command java -ErrorAction SilentlyContinue
  if ($javaCmd -and $javaCmd.Source) {
    $bin = Split-Path -Parent $javaCmd.Source
    $home = Split-Path -Parent $bin
    $home = Normalize-JavaHome $home
    if ($home) { $homes.Add($home) }
  }

  $whereJava = & cmd.exe /c "where java 2>nul"
  foreach ($line in @($whereJava)) {
    if ($line -and (Test-Path -LiteralPath $line)) {
      $home = Normalize-JavaHome (Split-Path -Parent (Split-Path -Parent $line))
      if ($home) { $homes.Add($home) }
    }
  }

  $roots = @(
    $env:JAVA_HOME,
    "$env:ProgramFiles\Java",
    "$env:ProgramFiles\Eclipse Adoptium",
    "$env:ProgramFiles\Microsoft",
    "$env:ProgramFiles\Amazon Corretto",
    "$env:ProgramFiles\Zulu",
    "$env:ProgramFiles\BellSoft",
    "$env:ProgramFiles\OpenJDK",
    "$env:ProgramFiles\Android\Android Studio\jbr",
    "$env:ProgramFiles\Android\Android Studio\jre",
    "${env:ProgramFiles(x86)}\Java",
    "$env:LOCALAPPDATA\Programs\Eclipse Adoptium",
    "$env:LOCALAPPDATA\Programs\Microsoft",
    "$env:USERPROFILE\.jdks",
    "$env:USERPROFILE\scoop\apps\temurin17\current",
    "$env:USERPROFILE\scoop\apps\openjdk17\current",
    "$env:USERPROFILE\scoop\apps\temurin21\current"
  ) | Where-Object { $_ }

  foreach ($root in $roots) {
    $n = Normalize-JavaHome $root
    if ($n) { $homes.Add($n) }
    if (-not (Test-Path -LiteralPath $root)) { continue }
    Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      $n = Normalize-JavaHome $_.FullName
      if ($n) { $homes.Add($n) }
      $n = Normalize-JavaHome (Join-Path $_.FullName 'jbr')
      if ($n) { $homes.Add($n) }
    }
  }

  Get-ChildItem "$env:LOCALAPPDATA\JetBrains\Toolbox\apps" -Directory -ErrorAction SilentlyContinue |
    ForEach-Object {
      Get-ChildItem $_.FullName -Recurse -Directory -Filter 'jbr' -ErrorAction SilentlyContinue |
        Select-Object -First 3 |
        ForEach-Object {
          $n = Normalize-JavaHome $_.FullName
          if ($n) { $homes.Add($n) }
        }
    }

  $unique = $homes | Select-Object -Unique
  $ranked = foreach ($h in $unique) {
    $java = Join-Path $h 'bin\java.exe'
    $ver = Get-JavaVersion $java
    $hasJavac = Test-Path (Join-Path $h 'bin\javac.exe')
    [pscustomobject]@{ Home = $h; Ver = $ver; Jdk = $hasJavac }
  }
  $ok = @($ranked | Where-Object { $_.Ver -ge 17 } | Sort-Object @{ Expression = 'Jdk'; Descending = $true }, @{ Expression = 'Ver'; Descending = $true })
  if ($ok.Count -gt 0) { return $ok[0].Home }
  $any = @($ranked | Sort-Object @{ Expression = 'Ver'; Descending = $true })
  if ($any.Count -gt 0) { return $any[0].Home }
  return $null
}

$javaHome = Resolve-JavaHome
if (-not $javaHome) {
  Write-Host @"
找不到 JDK。Maven Wrapper 需要 JAVA_HOME。

请先装 Eclipse Temurin 17（免费），或把已有 JDK 的路径设进当前窗口：

  `$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot'
  `$env:Path = "`$env:JAVA_HOME\bin;" + `$env:Path
  .\mvnw.cmd spring-boot:run

Android Studio 自带的 JBR 也可以：
  `$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
"@
  exit 1
}

$env:JAVA_HOME = $javaHome
$env:Path = "$(Join-Path $javaHome 'bin');$env:Path"
Write-Host "JAVA_HOME=$javaHome"

$listen = netstat -ano | Select-String ':8080\s' | Select-String 'LISTENING'
if ($listen) {
  Write-Host "8080 已被占用，旧后端还在跑。请先在那个窗口 Ctrl+C："
  Write-Host $listen
  exit 1
}

Write-Host "使用仓库自带 Maven Wrapper 启动（首次会下载 Maven，请等一会儿）..."
& "$PSScriptRoot\mvnw.cmd" spring-boot:run
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
