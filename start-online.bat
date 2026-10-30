@echo off
title Hanumanth Chits - Live Server & WhatsApp Gateway
echo ========================================================
echo       HANUMANTH CHITS - STARTING SERVERS
echo ========================================================
echo.

cd /d %~dp0

echo [1/3] Starting WhatsApp Gateway (Port 3002)...
start WhatsApp Gateway cmd /c node scripts\whatsapp-gateway.mjs

echo [2/3] Starting Next.js Web App (Port 3001)...
start Next.js Web App cmd /c npm run dev -- -p 3001

timeout /t 5 >nul

echo [3/3] Starting Secure Online Cloudflare Tunnel...
start "Cloudflare Live Tunnel" cmd /k "..\cloudflared.exe tunnel --url http://127.0.0.1:3001"

echo.
echo ========================================================
echo All services launched! Check the Cloudflare window for
echo your live public https link to open on your mobile phone.
echo ========================================================
pause
