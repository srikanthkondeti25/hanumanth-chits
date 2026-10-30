@echo off
title Cloudflare Live Tunnel (Auto-Reconnect)
cd /d %~dp0\..

:loop
echo [%TIME%] Starting Cloudflare Tunnel to http://127.0.0.1:3001...
..\cloudflared.exe tunnel --url http://127.0.0.1:3001
echo.
echo [%TIME%] Tunnel connection closed. Automatically reconnecting in 3 seconds...
timeout /t 3 >nul
goto loop
