@echo off
REM JARVIS_HOME launcher — double-click to start the desktop shell.
REM Minimises its own console so only the Electron window is visible.

cd /d "%~dp0"

REM Prefer prebuilt Electron if packaged; fall back to dev run otherwise.
if exist "dist\win-unpacked\jarvis-home.exe" (
  start "" "dist\win-unpacked\jarvis-home.exe"
) else (
  start "" /min cmd /c "npm run dev:electron"
)
