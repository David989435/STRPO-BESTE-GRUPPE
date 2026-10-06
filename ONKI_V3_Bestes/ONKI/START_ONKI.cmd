@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Bitte zuerst Node.js ab Version 22 installieren.
  pause
  exit /b 1
)
echo ONKI wird gestartet. Dieses Fenster offen lassen.
echo Danach im Browser http://127.0.0.1:3000 oeffnen.
echo Beenden mit Strg+C.
node backend/server.js
pause
