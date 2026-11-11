const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const { exec } = require('child_process');

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const parsed = url.parse(req.url, true);
    if (parsed.pathname === '/broadcast' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) client.send(body);
            });
            res.end('ok');
        });
        return;
    }
    if (parsed.pathname === '/send') {
        const msg = JSON.stringify(parsed.query);
        console.log('[HTTP收到]', msg);
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    } else if (parsed.pathname === '/open-live') {
        const rid = parsed.query.rid || '996594434954';
        exec(`start "" "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir=C:\\edge_cdp https://live.douyin.com/${rid}`);
        res.end('opened');
        return;
    } else if (parsed.pathname === '/start-danmaku') {
        const rid = parsed.query.rid || '996594434954';
        exec(`start "弹幕捕获" cmd /c "cd /d C:\\Users\\Administrator\\Doubao\\chats\\2026-11-03\\new-chat && python cdp_danmaku.py ${rid}"`);
        res.end('started');
        return;
    }
    res.end('ok');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });
});

server.listen(8080, () => {
    console.log('服务器启动: ws+http://localhost:8080');
});
