@echo off
cd /d "%~dp0"
set APPLY_ONCE_BROWSER_CHANNEL=chrome
call npm start
pause
