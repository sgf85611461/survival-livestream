@echo off
echo Starting...
start "server" cmd /k "cd /d C:\Users\Administrator\Doubao\chats\2026-11-03\new-chat && node server.js"
timeout /t 2 /nobreak >nul
start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir=C:\edge_cdp https://live.douyin.com/996594434954
timeout /t 5 /nobreak >nul
start "danmaku" cmd /k "cd /d C:\Users\Administrator\Doubao\chats\2026-11-03\new-chat && python cdp_danmaku.py"
timeout /t 2 /nobreak >nul
start "" "C:\Users\Administrator\Doubao\chats\2026-11-03\new-chat\control-panel.html"
echo Done!
pause