@echo off
title Push to GitHub - Hanumanth Chits
echo ========================================================
echo       PUSHING TO GITHUB (srikanthkondeti25)
echo ========================================================
echo.

cd /d %~dp0

echo Running: git push -u origin main
echo If a GitHub browser popup appears, click 'Sign in with your browser'.
echo.

git push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% equ 0 (
    echo SUCCESS! Code pushed to https://github.com/srikanthkondeti25/hanumanth-chits
) else (
    echo Something went wrong. Check output above.
)
echo ========================================================
pause
