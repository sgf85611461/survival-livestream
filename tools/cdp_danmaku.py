import json, time, requests, websocket, re, base64, gzip, os, threading

CDP_HTTP = "http://localhost:9222"
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tts_config.json")

# TTS - edge-tts (online, better voices)
import asyncio, edge_tts, tempfile, pygame
pygame.mixer.init()
_tts_queue = []
_tts_lock = threading.Lock()

VOICES = {
    "xiaoxiao": "zh-CN-XiaoxiaoNeural",   # 普通话
    "xiaobei": "zh-CN-liaoning-XiaobeiNeural",  # 东北话
    "xiaoni": "zh-CN-shaanxi-XiaoniNeural",  # 陕西/西北话
}

def load_config():
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {}

cfg = load_config()

def speak(text):
    if not text: return
    if not cfg.get("enabled", True): return
    with _tts_lock:
        _tts_queue.append(text)

def _tts_worker():
    while True:
        if _tts_queue:
            text = _tts_queue.pop(0)
            try:
                voice_key = cfg.get("voice", "xiaoxiao")
                voice = VOICES.get(voice_key, VOICES["xiaoxiao"])
                rate_val = f"{'+' if cfg.get('rate',2)>=0 else ''}{int(cfg.get('rate',2)*10)}%"
                tmp = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
                tmp.close()
                async def gen():
                    communicate = edge_tts.Communicate(text, voice, rate=rate_val)
                    await communicate.save(tmp.name)
                asyncio.run(gen())
                pygame.mixer.music.load(tmp.name)
                pygame.mixer.music.set_volume(cfg.get("volume", 100)/100)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    time.sleep(0.1)
                os.unlink(tmp.name)
            except Exception as e:
                print(f"[TTS错误] {e}")
        else:
            time.sleep(0.2)

threading.Thread(target=_tts_worker, daemon=True).start()

def _timed_worker():
    global _tip_idx
    while True:
        time.sleep(cfg.get("timedInterval", 60))
        tips = cfg.get("timedTips", [])
        if tips and cfg.get("enabled", True):
            speak(tips[_tip_idx % len(tips)])
            _tip_idx += 1

threading.Thread(target=_timed_worker, daemon=True).start()

# Config reload endpoint (simple HTTP server on 8090)
import http.server
class TTSHandler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()
    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
            if self.path == '/tts_config':
                with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                refresh_cfg()
                self.send_response(200)
                self._cors()
                self.end_headers()
                self.wfile.write(b'ok')
            elif self.path == '/tts_speak':
                speak(data.get('text', ''))
                self.send_response(200)
                self._cors()
                self.end_headers()
                self.wfile.write(b'ok')
            elif self.path == '/tts_event':
                ev = data.get('event', '')
                mapping = {'lowWall':'lowWall','boss':'boss','gameOver':'gameOver'}
                key = mapping.get(ev, ev)
                speak(cfg.get(key, ''))
                self.send_response(200)
                self._cors()
                self.end_headers()
                self.wfile.write(b'ok')
        except Exception as e:
            self.send_response(500)
            self._cors()
            self.end_headers()
            self.wfile.write(str(e).encode())
    def do_GET(self):
        if self.path == '/tts_config':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                self.wfile.write(f.read().encode('utf-8'))
        else:
            self.send_response(404); self.end_headers()
    def log_message(self, *a): pass

threading.Thread(target=lambda: http.server.HTTPServer(('localhost', 8090), TTSHandler).serve_forever(), daemon=True).start()
print("TTS config server on :8090")

# Track like count for wall upgrades
_like_count = 0
_last_wall_level = 0
_tip_idx = 0

def refresh_cfg():
    global cfg
    cfg = load_config()

inject_js = """
(function(){
window.__danmakuQueue = [];
window.__seenTexts = {};
if(window.__observer) window.__observer.disconnect();
var observer = new MutationObserver(function(mutations){
var now = Date.now();
for(var k in window.__seenTexts){
if(now - window.__seenTexts[k] > 1000) delete window.__seenTexts[k];
}
mutations.forEach(function(m){
m.addedNodes.forEach(function(node){
if(node.textContent){
var t = node.textContent.trim();
if(t.length > 1 && t.length < 100){
if(t.indexOf('点赞了') >= 0){
window.__danmakuQueue.push(t);
} else if(!window.__seenTexts[t]){
window.__seenTexts[t] = now;
window.__danmakuQueue.push(t);
}
}
}
});
});
});
document.querySelectorAll('.webcast-chatroom___list').forEach(function(list){
observer.observe(list, {childList:true, subtree:true});
});
window.__observer = observer;
return 'ok';
})();
"""

poll_js = """JSON.stringify(window.__danmakuQueue.splice(0, window.__danmakuQueue.length));"""

def send_game(t, d):
    msg = {"type": t}
    msg.update(d)
    try:
        requests.post("http://localhost:8080/broadcast", json=msg, timeout=2)
    except Exception as e:
        print(f"[发送失败] {e}")

def parse_varint(data, pos):
    result = 0; shift = 0
    while True:
        b = data[pos]; pos += 1
        result |= (b & 0x7f) << shift
        if not (b & 0x80): break
        shift += 7
    return result, pos

def process_ws_frame(payload_b64):
    """Parse PushFrame -> gzip decompress -> extract avatar from MemberMessage"""
    try:
        raw = base64.b64decode(payload_b64)
        if len(raw) < 100: return
        pos = 0; fields = {}
        while pos < len(raw):
            try:
                tag, pos = parse_varint(raw, pos)
                fn = tag >> 3; wt = tag & 7
                if wt == 0:
                    val, pos = parse_varint(raw, pos); fields[fn] = val
                elif wt == 2:
                    length, pos = parse_varint(raw, pos)
                    fields[fn] = raw[pos:pos+length]; pos += length
                else: break
            except: break
        for k, v in fields.items():
            if isinstance(v, bytes) and v[:2] == b'\x1f\x8b':
                try:
                    decomp = gzip.decompress(v)
                    if b'WebcastMemberMessage' in decomp:
                        urls = re.findall(rb'https?://[^\x00-\x1f"\'<>\\ ]+avatar[^\x00-\x1f"\'<>\\ ]+\.jpeg[^\x00-\x1f"\'<>\\ ]*', decomp)
                        if urls:
                            avatar = urls[0].decode('ascii', errors='replace')
                            print(f"[进房] 头像: {avatar[:80]}")
                            send_game("viewerJoin", {"avatar": avatar})
                            speak(cfg.get("welcome", "欢迎来到避难所"))
                except: pass
    except: pass

seen_py = {}

while True:
    try:
        tabs = requests.get(f"{CDP_HTTP}/json", timeout=5).json()
        ws_url = None
        for t in tabs:
            if "live.douyin.com" in t.get("url", "") and not t.get("url","").endswith("service-worker.js"):
                ws_url = t["webSocketDebuggerUrl"]
                print(f"Tab: {t['title']}")
                break
        if not ws_url:
            print("No live tab, waiting...")
            time.sleep(3); continue

        browser_ws = websocket.create_connection(ws_url, origin="http://localhost:9222", timeout=10)
        browser_ws.send(json.dumps({"id":1,"method":"Network.enable"}))
        # Wait for Network.enable response
        while True:
            r = json.loads(browser_ws.recv())
            if r.get("id") == 1: break
        print("Network enabled")

        # Inject
        browser_ws.send(json.dumps({"id":2,"method":"Runtime.evaluate","params":{"expression":inject_js}}))
        while True:
            r = json.loads(browser_ws.recv())
            if r.get("id") == 2:
                print(f"Injected: {r.get('result',{}).get('result',{}).get('value')}")
                break
        time.sleep(1)

        msg_id = 10
        while True:
            # Send poll
            msg_id += 1
            browser_ws.send(json.dumps({"id":msg_id,"method":"Runtime.evaluate","params":{"expression":poll_js}}))
            # Read until we get our response, processing WS events along the way
            val = "[]"
            while True:
                r = json.loads(browser_ws.recv())
                if r.get("method") == "Network.webSocketFrameReceived":
                    resp = r["params"]["response"]
                    if resp.get("opcode") == 2:
                        process_ws_frame(resp["payloadData"])
                elif r.get("id") == msg_id:
                    val = r.get("result",{}).get("result",{}).get("value","[]")
                    break

            msgs = json.loads(val)
            for text in msgs:
                if "欢迎来到" in text or "严禁" in text or "理性消费" in text:
                    continue
                is_like = "点赞了" in text
                if not is_like:
                    now = time.time()
                    for k in list(seen_py.keys()):
                        if now - seen_py[k] > 3: del seen_py[k]
                    if text in seen_py: continue
                    seen_py[text] = now
                print(f"[弹幕] {text}")
                if "关注了" in text:
                    send_game("follow", {"user": "观众"})
                    speak(cfg.get("follow", "感谢关注"))
                elif is_like:
                    send_game("like", {"count": 1})
                    _like_count += 1
                    if _like_count == 10 and _last_wall_level < 1:
                        _last_wall_level = 1
                        speak(cfg.get("brickWall", "围墙升级"))
                    elif _like_count == 30 and _last_wall_level < 2:
                        _last_wall_level = 2
                        speak(cfg.get("stoneWall", "城墙升级"))
                elif "送出" in text or "礼物" in text:
                    send_game("simulateGift", {"user": "观众"})
                    speak(cfg.get("gift", "感谢礼物"))
                elif "建塔" in text:
                    send_game("buildTower", {})
                    speak(cfg.get("buildTower", "建造了箭塔"))
                else:
                    m = re.match(r'^([^:：]{1,20})[:：]\s*(.*)$', text)
                    if m and m[1] and m[2]:
                        send_game("danmaku", {"text": m[2].strip(), "user": m[1].strip()})
                    else:
                        send_game("danmaku", {"text": text, "user": "观众"})

            time.sleep(0.3)

    except Exception as e:
        print(f"Disconnected: {e}, reconnecting...")
        try: browser_ws.close()
        except: pass
        time.sleep(3)
