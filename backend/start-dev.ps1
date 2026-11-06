# Requires Windows PowerShell 5.1+. Do not use a here-string in this file.
# Usage from backend folder:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\start-dev.ps1

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Normalize-JavaHome {
  param([string]$HomeDir)
  if ([string]::IsNullOrWhiteSpace($HomeDir)) { return $null }
  $HomeDir = $HomeDir.Trim().Trim('"')
  while ($HomeDir.EndsWith('\') -or $HomeDir.EndsWith('/')) {
    $HomeDir = $HomeDir.Substring(0, $HomeDir.Length - 1)
  }
  $exeInBin = Join-Path $HomeDir 'bin\java.exe'
  if (Test-Path -LiteralPath $exeInBin) { return $HomeDir }
  $exeHere = Join-Path $HomeDir 'java.exe'
  if (Test-Path -LiteralPath $exeHere) { return (Split-Path -Parent $HomeDir) }
  return $null
}

function Add-Home {
  param($List, [string]$Candidate)
  $n = Normalize-JavaHome $Candidate
  if ($n) { [void]$List.Add($n) }
}

function Get-JavaVersion {
  param([string]$JavaExe)
  try {
    $out = & $JavaExe -version 2>&1 | Out-String
    if ($out -match 'version "(\d+)') { return [int]$Matches[1] }
    if ($out -match 'version "1\.(\d+)') { return [int]$Matches[1] }
  } catch {
    return 0
  }
  return 0
}

function Get-RegistryJavaHomes {
  $found = New-Object System.Collections.Generic.List[string]
  $roots = @(
    'HKLM:\SOFTWARE\JavaSoft\JDK',
    'HKLM:\SOFTWARE\JavaSoft\Java Development Kit',
    'HKLM:\SOFTWARE\WOW6432Node\JavaSoft\JDK',
    'HKLM:\SOFTWARE\Eclipse Adoptium',
    'HKLM:\SOFTWARE\Microsoft\JDK'
  )
  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    Get-ChildItem -LiteralPath $root -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
      foreach ($name in @('JavaHome', 'Path', 'InstallationPath')) {
        try {
          $val = (Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction SilentlyContinue).$name
          if ($val) { [void]$found.Add([string]$val) }
        } catch { }
      }
    }
  }
  return $found
}

function Resolve-JavaHome {
  $homes = New-Object System.Collections.Generic.List[string]
  Add-Home $homes $env:JAVA_HOME

  $javaCmd = Get-Command java.exe -ErrorAction SilentlyContinue
  if (-not $javaCmd) { $javaCmd = Get-Command java -ErrorAction SilentlyContinue }
  if ($javaCmd -and $javaCmd.Source) {
    Add-Home $homes (Split-Path -Parent (Split-Path -Parent $javaCmd.Source))
  }

  try {
    $whereOut = cmd.exe /c 'where java 2>nul'
    foreach ($line in @($whereOut)) {
      if ($line -and (Test-Path -LiteralPath $line)) {
        Add-Home $homes (Split-Path -Parent (Split-Path -Parent $line))
      }
    }
  } catch { }

  foreach ($reg in (Get-RegistryJavaHomes)) { Add-Home $homes $reg }

  $roots = @(
    (Join-Path $env:ProgramFiles 'Java'),
    (Join-Path $env:ProgramFiles 'Eclipse Adoptium'),
    (Join-Path $env:ProgramFiles 'Microsoft'),
    (Join-Path $env:ProgramFiles 'Amazon Corretto'),
    (Join-Path $env:ProgramFiles 'Zulu'),
    (Join-Path $env:ProgramFiles 'BellSoft'),
    (Join-Path $env:ProgramFiles 'OpenJDK'),
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jbr'),
    (Join-Path $env:ProgramFiles 'Android\Android Studio\jre'),
    (Join-Path $env:ProgramFiles 'Cursor\jbr'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Eclipse Adoptium'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft'),
    (Join-Path $env:USERPROFILE '.jdks'),
    (Join-Path $env:USERPROFILE 'scoop\apps\temurin17\current'),
    (Join-Path $env:USERPROFILE 'scoop\apps\temurin21\current')
  )
  $x86 = ${env:ProgramFiles(x86)}
  if ($x86) { $roots += (Join-Path $x86 'Java') }

  foreach ($root in $roots) {
    Add-Home $homes $root
    if (-not (Test-Path -LiteralPath $root)) { continue }
    Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
      Add-Home $homes $_.FullName
      Add-Home $homes (Join-Path $_.FullName 'jbr')
    }
  }

  $unique = @($homes | Select-Object -Unique)
  $ranked = foreach ($h in $unique) {
    $java = Join-Path $h 'bin\java.exe'
    [pscustomobject]@{
      Home = $h
      Ver  = Get-JavaVersion $java
      Jdk  = [bool](Test-Path -LiteralPath (Join-Path $h 'bin\javac.exe'))
    }
  }
  $ok = @($ranked | Where-Object { $_.Ver -ge 17 } | Sort-Object -Property @{ Expression = 'Jdk'; Descending = $true }, @{ Expression = 'Ver'; Descending = $true })
  if ($ok.Count -gt 0) { return $ok[0].Home }
  $any = @($ranked | Sort-Object -Property Ver -Descending)
  if ($any.Count -gt 0 -and $any[0].Ver -gt 0) { return $any[0].Home }
  return $null
}

$javaHome = Resolve-JavaHome
if (-not $javaHome) {
  Write-Host 'No JDK found. JAVA_HOME is required.'
  Write-Host 'Install Temurin 17 (free) then re-run this script:'
  Write-Host '  winget install --id EclipseAdoptium.Temurin.17.JDK -e --accept-package-agreements --accept-source-agreements'
  Write-Host 'Or set JAVA_HOME to a JDK folder that contains bin\java.exe (not the bin folder itself).'
  exit 1
}

$env:JAVA_HOME = $javaHome
$env:Path = (Join-Path $javaHome 'bin') + ';' + $env:Path
Write-Host ('JAVA_HOME=' + $javaHome)

$listen = netstat -ano | Select-String ':8080' | Select-String 'LISTENING'
if ($listen) {
  Write-Host 'Port 8080 is already in use. Stop the old backend (Ctrl+C in that window):'
  Write-Host $listen
  exit 1
}

Write-Host 'Starting Spring Boot with Maven Wrapper (first run downloads Maven)...'
$mvnw = Join-Path $PSScriptRoot 'mvnw.cmd'
$proc = Start-Process -FilePath $mvnw -ArgumentList 'spring-boot:run' -WorkingDirectory $PSScriptRoot -NoNewWindow -Wait -PassThru
exit $proc.ExitCode
