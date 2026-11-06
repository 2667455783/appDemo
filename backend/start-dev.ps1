# 本机开发启动：不依赖全局 mvn，默认 profile=dev，读取 backend/.env.dev
# 用法：在 backend 目录  .\start-dev.ps1
# 不要加 -Dspring-boot.run.profiles=local（那会改用内存 H2，且不读 .env.dev）

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  Write-Error "找不到 java。请用你上次能跑通 SiliconFlow 的同一个窗口/JDK，或把 JDK 17 加进 PATH。"
}

$listen = netstat -ano | Select-String ':8080' | Select-String 'LISTENING'
if ($listen) {
  Write-Host "8080 已被占用，旧后端还在跑。请先在那个窗口 Ctrl+C，或根据下面 PID 结束进程："
  Write-Host $listen
  Write-Error "请先释放 8080 再启动。"
}

Write-Host "使用仓库自带 Maven Wrapper 启动（首次会下载 Maven，请等一会儿）..."
& "$PSScriptRoot\mvnw.cmd" spring-boot:run
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
