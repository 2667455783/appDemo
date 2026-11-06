@echo off
REM Windows 双击或在 backend 目录执行：start-dev.cmd
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1" %*
exit /b %ERRORLEVEL%
