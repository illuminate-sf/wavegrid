@echo off
REM Supervisor: keeps the agent running, auto-restarts on crash, logs to agent.log.
REM Register as a SYSTEM startup task so it survives logoff/reboot:
REM   schtasks /Create /TN LaserAgent /SC ONSTART /RU SYSTEM /RL HIGHEST /TR "cmd /c %~f0" /F
REM Point NODE at your node.exe if it isn't on PATH (e.g. "C:\Program Files\nodejs\node.exe").
set NODE=node
:loop
%NODE% "%~dp0agent.mjs" >> "%~dp0..\agent.log" 2>&1
timeout /t 5 /nobreak >nul
goto loop
