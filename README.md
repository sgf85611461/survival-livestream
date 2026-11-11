# 末日避难所（抖音弹幕合作生存游戏）

Cocos Creator 3.8.8 3D 直播互动生存游戏：观众弹幕/点赞/关注/送礼实时驱动建塔、升级城墙、生存者射箭。

## 目录
- `assets/` — Cocos 游戏工程（场景、脚本 GameManager.ts、资源）
- `tools/` — 配套工具
  - `cdp_danmaku.py` — CDP 抓抖音直播间弹幕/点赞/关注/送礼/进房头像，edge-tts 语音播报
  - `server.js` — 本地 WS/HTTP 中转服务（端口 8080）
  - `control-panel.html` — 直播控制面板（房间号、话术、TTS 开关/语音/音量/语速）
  - `tts_config.json` — TTS 配置
  - `start.bat` — 一键启动

## 运行
1. 启动 Cocos Creator 打开本工程，预览游戏（localhost:7456）
2. 运行 `node tools/server.js`
3. 控制面板填房间号，点"打开直播间"和"启动弹幕捕获"
4. 或直接运行 `tools/start.bat`

## 依赖
- Node.js、Python（edge-tts、websocket-client、requests、pygame、pywin32）
- Edge 浏览器（CDP 调试端口 9222）
