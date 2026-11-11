// 末日避难所 - 弹幕合作生存游戏（无怪版，先调场景）
import { _decorator, Component, Node, Vec3, Vec4, Color, Material, MeshRenderer, director, Camera, input, Input, KeyCode, Label, Canvas, UITransform, utils, primitives, instantiate, Animation, assetManager, AudioSource, resources, Texture2D, SpriteFrame, Sprite, ImageAsset } from 'cc';
const { ccclass } = _decorator;

interface Arrow {
    node: Node;
    target: Zombie | null;
    speed: number;
}

interface Zombie {
    node: Node;
    hpBar: Node;
    speed: number;
    hp: number;
    maxHp: number;
    isHuman: boolean;
    isBoss: boolean;
    state: 'walk' | 'attack';
    attackTimer: number;
}

@ccclass('GameManager')
export class GameManager extends Component {

    wallHp: number = 30;
    wallMaxHp: number = 30;
    wallLevel: number = 0;
    wallGraceTimer: number = 0;
    gameOver: boolean = false;
    wave: number = 1;
    waveTotal: number = 6;
    waveKills: number = 0;
    waveQuota: number = 10;
    waveBreakTimer: number = 0;
    waveCleared: boolean = false;
    gamePaused: boolean = false;
    gameOverLabel: Node = null!;
    gameTime: number = 0;
    kills: number = 0;
    statsTimer: number = 0;
    arrows: Arrow[] = [];
    zombies: Zombie[] = [];
    zombieTemplateNode: Node = null!;
    zombie1TemplateNode: Node = null!;
    bossTemplateNode: Node = null!;
    spawnTimer: number = 0;
    bossSpawnTimer: number = 0;
    shootTimer: number = 0;
    tentNodes: Node[] = [];
    survivor: Node = null!;
    survivorDir: number = 1;
    survivorZDir: number = 1;
    survivorSpawnTimer: number = 0;
    survivorIdx: number = 0;
    wallBar: Node = null!;
    wallMesh: Node = null!;
    towers: { node: Node, level: number }[] = [];
    towerShootTimer: number = 0;
    likeCount: number = 0;
    survivors: any[] = [];
    rockTimer: number = 0;
    baseShootInterval: number = 1.5;
    baseTowerInterval: number = 0.5;
    viewerCount: number = 1;
    zombieHpOverride: number = 0;
    humanHpOverride: number = 0;
    bossHpOverride: number = 0;
    speedOverride: number = 0;
    spawnIntervalOverride: number = 0;
    wallHpOverride: number = 0;
    arrowDmgOverride: number = 0;
    arrowRateOverride: number = 0;
    giftCount: number = 0;
    missedCount: number = 0;
    viewerTimer: number = 0;
    boostTimer: number = 0;
    boostMultiplier: number = 1;
    danmakuTimer: number = 0;
    giftTimer: number = 0;
    shakeTimer: number = 0;
    camNode: Node = null;
    audioCtx: any = null;

    arrowClip: any = null;
    giftClip: any = null;
    smallDieClip: any = null;
    humanDieClip: any = null;
    bossDieClip: any = null;
    bgmClip: any = null;
    audioSource: AudioSource = null!;

    loadSounds() {
        const audioSrc = this.node.getComponent(AudioSource) || this.node.addComponent(AudioSource);
        this.audioSource = audioSrc;
        assetManager.loadAny({ uuid: '220b25b8-7df9-48c3-ae2b-c2b9ff938d5d' }, (err: any, clip: any) => { if (!err) this.arrowClip = clip; });
        assetManager.loadAny({ uuid: 'b5d5947b-0ddc-4d1f-855b-c6c6495caf61' }, (err: any, clip: any) => { if (!err) this.giftClip = clip; });
        assetManager.loadAny({ uuid: '58e3d05e-5f69-4b03-8357-4e4696e4f42d' }, (err: any, clip: any) => { if (!err) this.smallDieClip = clip; });
        assetManager.loadAny({ uuid: 'aa6ecd0b-c15d-459f-a675-1b6d44e237cc' }, (err: any, clip: any) => { if (!err) this.humanDieClip = clip; });
        assetManager.loadAny({ uuid: '65d9eb17-83e6-4481-8ea9-4ecdecf06f79' }, (err: any, clip: any) => { if (!err) this.bossDieClip = clip; });
        assetManager.loadAny({ uuid: 'c1963933-9b46-43c9-9630-5c862b260c32' }, (err: any, clip: any) => {
            if (!err) {
                this.bgmClip = clip;
                this.audioSource.clip = clip;
                this.audioSource.loop = true;
                this.audioSource.volume = 0.3;
                this.audioSource.play();
            }
        });
    }

    playClip(clip: any, vol: number = 0.5) {
        if (!clip || !this.audioSource) return;
        this.audioSource.playOneShot(clip, vol);
    }

    floatText(text: string, pos: Vec3, color: Color = new Color(255, 255, 255)) {
        const node = new Node('FloatText');
        this.node.addChild(node);
        node.setPosition(pos);
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setContentSize(200, 50);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = 28;
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.floats.push({ node: node, startPos: pos.clone(), t: 0 });
    }

    floats: { node: Node, startPos: Vec3, t: number }[] = [];
    treeTemplateNode: Node = null!;
    tree2TemplateNode: Node = null!;
    tree3TemplateNode: Node = null!;
    houseTemplateNode: Node = null!;
    tower1TemplateNode: Node = null!;
    tower2TemplateNode: Node = null!;
    groundTemplateNode: Node = null!;
    rocksTemplateNode: Node = null!;
    survivorTemplateNode: Node = null!;
    survivor2TemplateNode: Node = null!;
    survivor3TemplateNode: Node = null!;
    arrowTemplateNode: Node = null!;
    wall1TemplateNode: Node = null!;
    wall2TemplateNode: Node = null!;
    wall3TemplateNode: Node = null!;

    loadModels() {
        const scene = director.getScene()!;
        // 小怪模板zombie3
        const z3 = scene.getChildByName('zombie3');
        if (z3) { z3.active = false; this.zombieTemplateNode = z3; }
        // 人形怪模板zombie1
        const z1 = scene.getChildByName('zombie1');
        if (z1) { z1.active = false; this.zombie1TemplateNode = z1; }
        // Boss模板
        const boss = scene.getChildByName('boss');
        if (boss) { boss.active = false; this.bossTemplateNode = boss; }
        // zombie2导入失败
        const z2 = scene.getChildByName('zombie2');
        if (z2) z2.active = false;
        const tree1 = scene.getChildByName('tree1');
        if (tree1) { tree1.active = false; this.treeTemplateNode = tree1; }
        const tree2 = scene.getChildByName('tree2');
        if (tree2) { tree2.active = false; this.tree2TemplateNode = tree2; }
        const tree3 = scene.getChildByName('tree3');
        if (tree3) { tree3.active = false; this.tree3TemplateNode = tree3; }
        const house = scene.getChildByName('house');
        if (house) { house.active = false; this.houseTemplateNode = house; }
        const ground = scene.getChildByName('ground2');
        if (ground) { ground.active = false; this.groundTemplateNode = ground; }
        const plane = scene.getChildByName('Plane');
        if (plane) plane.active = false;
        const rocks = scene.getChildByName('rocks');
        if (rocks) { rocks.active = false; this.rocksTemplateNode = rocks; }
        const sv = scene.getChildByName('survivor');
        if (sv) { sv.active = false; this.survivorTemplateNode = sv; }
        const sv2 = scene.getChildByName('survivor2');
        if (sv2) { sv2.active = false; this.survivor2TemplateNode = sv2; }
        const sv3 = scene.getChildByName('survivor3');
        if (sv3) { sv3.active = false; this.survivor3TemplateNode = sv3; }
        const arrow = scene.getChildByName('arrow');
        if (arrow) { arrow.active = false; this.arrowTemplateNode = arrow; }
        const t1 = scene.getChildByName('tower1');
        if (t1) { t1.active = false; this.tower1TemplateNode = t1; }
        const t2 = scene.getChildByName('tower2');
        if (t2) { t2.active = false; this.tower2TemplateNode = t2; }
        const w1 = scene.getChildByName('wall1');
        if (w1) { w1.active = false; this.wall1TemplateNode = w1; }
        const w2 = scene.getChildByName('wall2');
        if (w2) { w2.active = false; this.wall2TemplateNode = w2; }
        const w3 = scene.getChildByName('wall3');
        if (w3) { w3.active = false; this.wall3TemplateNode = w3; }
    }

    start() {
        try {
            this.loadHeartTexture();
            this.setupCamera();
            this.loadModels();
            this.loadSounds();
            this.createGround();
            this.createWall();
            this.createWallBar();
            this.createTents();
            this.createSurvivor();
            this.createDecorations();
        } catch(e) { console.error('START ERROR:', e); }
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        this.connectWS();
    }

    ws: any = null;
    connectWS() {
        try {
            this.ws = new WebSocket('ws://localhost:8080');
            this.ws.onopen = () => { console.log('WS connected to panel'); this.ws.send(JSON.stringify({type:'game'})); };
            this.ws.binaryType = 'arraybuffer';
            this.ws.onmessage = (e: any) => {
                if (e.data instanceof Blob) {
                    e.data.text().then((text: string) => this.handleWS(text));
                    return;
                }
                let data: string = e.data;
                if (typeof data !== 'string') {
                    const decoder = new TextDecoder();
                    data = decoder.decode(new Uint8Array(data));
                }
                this.handleWS(data);
            };
            this.ws.onclose = (e: any) => { console.log('WS closed! code:', e.code, 'reason:', e.reason); setTimeout(() => this.connectWS(), 3000); };
            this.ws.onerror = (e: any) => { console.error('WS error:', e); };
        } catch(e) {}
    }

    handleWS(data: string) {
        try {
            const msg = JSON.parse(data);
            console.log('[WS收到]', JSON.stringify(msg));
            if (msg.type === 'param') {
                if (msg.key === 'smallHp') this.zombieHpOverride = msg.value;
                if (msg.key === 'humanHp') this.humanHpOverride = msg.value;
                if (msg.key === 'bossHp') this.bossHpOverride = msg.value;
                if (msg.key === 'speed') this.speedOverride = msg.value;
                if (msg.key === 'spawnInterval') this.spawnIntervalOverride = msg.value;
                if (msg.key === 'viewerSlider') this.viewerCount = msg.value;
                if (msg.key === 'wallHp') { this.wallMaxHp = msg.value; this.wallHp = msg.value; this.updateWallBar(); }
                if (msg.key === 'arrowDmg') this.arrowDmgOverride = msg.value;
                if (msg.key === 'arrowRate') this.arrowRateOverride = msg.value;
            } else if (msg.type === 'action') {
                if (msg.cmd === 'boss') this.spawnZombie(true);
                if (msg.cmd === 'heal') { this.wallHp = this.wallMaxHp; this.updateWallBar(); }
                if (msg.cmd === 'start') { this.gamePaused = false; if (this.audioSource) this.audioSource.play(); }
                if (msg.cmd === 'stop') { this.gamePaused = true; if (this.audioSource) this.audioSource.pause(); }
            } else if (msg.type === 'scene') {
                this.switchScene(msg.mode);
            } else if (msg.type === 'danmaku') {
                this.onDanmakuReceived(msg.text, msg.user || '手动测试');
            } else if (msg.type === 'buildTower') {
                this.buildTower((Math.random() - 0.5) * 6);
            } else if (msg.type === 'simulateGift') {
                this.onGiftReceived(msg.user || '模拟观众');
            } else if (msg.type === 'viewerJoin') {
                this.viewerCount++;
                console.log('viewerJoin, avatar:', msg.avatar);
                this.spawnSurvivor(msg.avatar);
            } else if (msg.type === 'viewerLeave') {
                console.log('viewerLeave, avatar:', msg.avatar);
                for (let i = this.survivors.length - 1; i >= 0; i--) {
                    if (this.survivors[i].avatar === msg.avatar) {
                        this.survivors[i].node.destroy();
                        this.survivors.splice(i, 1);
                        this.viewerCount = Math.max(1, this.viewerCount - 1);
                        break;
                    }
                }
            } else if (msg.type === 'follow') {
                console.log('收到关注消息:', msg.user);
                this.wallMaxHp += 20;
                this.wallHp = Math.min(this.wallMaxHp, this.wallHp + 30);
                this.updateWallBar();
                this.floatText(msg.user + ' 关注了，防御+20！', new Vec3(0, 5, 4), new Color(255, 215, 0));
            } else if (msg.type === 'like') {
                this.likeCount += (msg.count || 1);
                this.wallGraceTimer = 0;
            }
        } catch(e) { console.error('WS error:', e); }
    }

    onKeyDown(e: any) {
        console.log('key:', e.keyCode);
        if (e.keyCode === KeyCode.Digit1) this.switchScene('day');
        if (e.keyCode === KeyCode.Digit2) this.switchScene('rain');
        if (e.keyCode === KeyCode.Digit3) this.switchScene('night');
        if (e.keyCode === KeyCode.Digit4) this.switchScene('indoor');
    }

    switchScene(type: string) {
        const scene = director.getScene()!;
        const lightNode = scene.getChildByName('Main Light');
        if (!lightNode) { console.log('no light node'); return; }
        const light = lightNode.getComponent('cc.Light' as any);
        console.log('light found:', !!light, 'props:', light ? Object.keys(light) : 'none');
        const camNode = scene.getChildByName('Main Camera');
        const cam = camNode ? camNode.getComponent(Camera) : null;

        if (type === 'day') {
            if (light) { light.color = new Color(255, 245, 220, 255); light.illuminance = 65000; }
            lightNode.setRotationFromEuler(-50, 0, 0);
            if (cam) cam.clearColor = new Color(135, 180, 220, 255);
        } else if (type === 'rain') {
            if (light) { light.color = new Color(160, 170, 180, 255); light.illuminance = 15000; }
            lightNode.setRotationFromEuler(-40, 0, 0);
            if (cam) cam.clearColor = new Color(80, 85, 90, 255);
        } else if (type === 'night') {
            if (light) { light.color = new Color(80, 100, 160, 255); light.illuminance = 3000; }
            lightNode.setRotationFromEuler(-30, 0, 0);
            if (cam) cam.clearColor = new Color(10, 15, 30, 255);
        } else if (type === 'indoor') {
            if (light) { light.color = new Color(255, 220, 160, 255); light.illuminance = 65000; }
            lightNode.setRotationFromEuler(-50, 0, 0);
            if (cam) cam.clearColor = new Color(40, 30, 20, 255);
        }
        console.log('scene switched:', type);
    }

    upgradeWall(targetLevel: number) {
        if (targetLevel <= this.wallLevel) return;
        this.wallLevel = targetLevel;
        console.log('墙升级到', targetLevel, 'wall2:', !!this.wall2TemplateNode, 'wall3:', !!this.wall3TemplateNode);
        const oldWalls = this.node.children.filter(c => c.name === 'WallSeg' || c.name === 'Wall');
        oldWalls.forEach(w => w.destroy());
        if (targetLevel === 1) {
            this.wallMaxHp = 60; this.wallHp = 60;
            if (this.wall2TemplateNode) {
                for (const x of [-4, -2, 0, 2, 4]) {
                    const w = instantiate(this.wall2TemplateNode);
                    this.node.addChild(w); w.active = true;
                    w.setPosition(new Vec3(x, 0, 4));
                    w.setScale(1, 3, 1); w.name = 'WallSeg';
                }
            } else {
                // 降级：用红色方块代替砖墙
                for (const x of [-4, -2, 0, 2, 4]) {
                    this.createBox('WallSeg', new Vec3(x, 1.2, 4), new Vec3(1.5, 2.4, 0.6), new Color(200, 60, 50));
                }
            }
        } else if (targetLevel === 2) {
            this.wallMaxHp = 120; this.wallHp = 120;
            if (this.wall3TemplateNode) {
                for (const x of [-4, -2, 0, 2, 4]) {
                    const w = instantiate(this.wall3TemplateNode);
                    this.node.addChild(w); w.active = true;
                    w.setPosition(new Vec3(x, 0, 4));
                    w.setScale(1, 3, 1); w.name = 'WallSeg';
                }
            } else {
                for (const x of [-4, -2, 0, 2, 4]) {
                    this.createBox('WallSeg', new Vec3(x, 1.8, 4), new Vec3(1.5, 3.5, 0.7), new Color(80, 80, 120));
                }
            }
        }
        this.updateWallBar();
    }

    downgradeWall(targetLevel: number) {
        if (targetLevel >= this.wallLevel) return;
        this.wallLevel = targetLevel;
        const oldWalls = this.node.children.filter(c => c.name === 'WallSeg' || c.name === 'Wall');
        oldWalls.forEach(w => w.destroy());
        if (targetLevel === 0) {
            this.wallMaxHp = Math.max(30, this.wallMaxHp - 30);
            this.wallHp = Math.min(this.wallHp, this.wallMaxHp);
            if (this.wall1TemplateNode) {
                for (const x of [-4, -2, 0, 2, 4]) {
                    const w = instantiate(this.wall1TemplateNode);
                    this.node.addChild(w); w.active = true;
                    w.setPosition(new Vec3(x, 0, 4));
                    w.setScale(3, 6, 3); w.name = 'WallSeg';
                }
            } else {
                this.createBox('Wall', new Vec3(0, 0.5, 4), new Vec3(10, 1, 0.5), new Color(139, 90, 43));
            }
        } else if (targetLevel === 1) {
            this.wallMaxHp = Math.max(60, this.wallMaxHp - 30);
            this.wallHp = Math.min(this.wallHp, this.wallMaxHp);
            if (this.wall2TemplateNode) {
                for (const x of [-4, -2, 0, 2, 4]) {
                    const w = instantiate(this.wall2TemplateNode);
                    this.node.addChild(w); w.active = true;
                    w.setPosition(new Vec3(x, 0, 4));
                    w.setScale(1, 3, 1); w.name = 'WallSeg';
                }
            } else {
                for (const x of [-4, -2, 0, 2, 4]) {
                    this.createBox('WallSeg', new Vec3(x, 1.2, 4), new Vec3(1.5, 2.4, 0.6), new Color(200, 60, 50));
                }
            }
        }
        this.updateWallBar();
    }

    buildTower(x: number) {
        const existing = this.towers.find(t => t.node.isValid && Math.abs(t.node.position.x - x) < 1);
        if (existing) {
            this.upgradeTower(existing);
            return;
        }
        // Max 10 towers total, max 5 per level
        const alive = this.towers.filter(t => t.node && t.node.isValid);
        if (alive.length >= 10) return;
        const woodenCount = alive.filter(t => t.level === 1).length;
        const stoneCount = alive.filter(t => t.level === 2).length;
        // New tower defaults to level 1 (wooden), max 5 wooden
        if (woodenCount >= 5) return;
        let tower: Node;
        if (this.tower2TemplateNode) {
            tower = instantiate(this.tower2TemplateNode);
            this.node.addChild(tower);
            tower.active = true;
            tower.setPosition(new Vec3(x, 0, 7));
            tower.setScale(0.75, 0.75, 0.75);
        } else {
            tower = this.createBox('Tower', new Vec3(x, 1.5, 7), new Vec3(0.8, 2, 0.8), new Color(160, 120, 80));
        }
        this.towers.push({ node: tower, level: 1, life: 15 });
    }

    upgradeTower(t: { node: Node, level: number, life?: number }) {
        if (t.level >= 2) return;
        t.level++;
        if (this.tower1TemplateNode) {
            const pos = t.node.position;
            t.node.destroy();
            const newTower = instantiate(this.tower1TemplateNode);
            this.node.addChild(newTower);
            newTower.active = true;
            newTower.setPosition(pos);
            newTower.setScale(1.5, 1.5, 1.5);
            for (const child of newTower.children) child.setScale(1.5, 1.5, 1.5);
            t.node = newTower;
        }
        this.floatText('箭楼升级!', new Vec3(t.node.position.x, 5, 7), new Color(255, 215, 0));
        t.life = 15;
    }

    onGiftReceived(user: string = '神秘观众') {
        this.giftCount++;
        this.playClip(this.giftClip, 0.5);
        this.spawnGiftHearts();
        this.floatText(user + ' 送了礼物！', new Vec3(0, 6, 5), new Color(255, 100, 150));
        // 送礼：直接升到城墙 + 补3个箭塔
        if (this.wallLevel < 2) this.upgradeWall(2);
        else { this.wallHp = this.wallMaxHp; this.updateWallBar(); }
        let built = 0;
        for (let x = -6; x <= 6 && built < 3; x += 3) {
            if (this.towers.length >= 10) break;
            this.buildTower(x);
            built++;
        }
    }

    onDanmakuReceived(msg: string, user: string) {
        console.log(`[${user}]: ${msg}`);
        if (msg.includes('修墙')) {
            const heal = Math.min(30, this.wallMaxHp - this.wallHp);
            this.wallHp += heal;
            this.updateWallBar();
        } else if (msg.includes('加速')) {
            this.boostTimer = 5.0;
            this.boostMultiplier = 0.5;
        } else if (msg.includes('建塔')) {
            this.buildTower((Math.random() - 0.5) * 6);
        }
    }

    setupCamera() {
        const cam = director.getScene()!.getChildByName('Main Camera');
        if (cam) {
            this.camNode = cam;
            cam.setPosition(new Vec3(0, 10, 12));
            cam.setRotationFromEuler(-25, 0, 0);
            const c = cam.getComponent(Camera);
            if (c) {
                c.projection = Camera.ProjectionType.ORTHO;
                c.orthoHeight = 14;
            }
        }
    }

    shakeCamera() {
        if (!this.camNode) return;
        const baseX = 0, baseZ = 12;
        for (let i = 0; i < 5; i++) {
            this.scheduleOnce(() => {
                this.camNode.setPosition(baseX + (Math.random() - 0.5) * 0.3, 10, baseZ + (Math.random() - 0.5) * 0.3);
            }, i * 0.03);
        }
        this.scheduleOnce(() => {
            this.camNode.setPosition(baseX, 10, baseZ);
        }, 0.16);
    }

    ttsEvent(ev: string) {
        try { fetch('http://localhost:8090/tts_event', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({event:ev})}); } catch(e) {}
    }
    _lowWarned: boolean = false;

    showGameOver() {
        this.scheduleOnce(() => {
            // 软重置：清僵尸/塔，保留生存者
            for (const z of this.zombies) { z.node.destroy(); if (z.hpBar && z.hpBar.isValid) z.hpBar.destroy(); }
            this.zombies = [];
            for (const t of this.towers) t.node.destroy();
            this.towers = [];
            this.wallMaxHp = 30;
            this.wallHp = 30;
            this.wallLevel = 0;
            this.kills = 0;
            this.missedCount = 0;
            this.gameOver = false;
            this._lowWarned = false;
            this.wave = 1;
            this.waveKills = 0;
            this.waveQuota = 15;
            this.waveCleared = false;
            this.waveBreakTimer = 0;
            // 重建木栅栏
            const oldWalls = this.node.children.filter(c => c.name === 'WallSeg' || c.name === 'Wall');
            console.log('Reset: destroying', oldWalls.length, 'old walls, template:', !!this.wall1TemplateNode);
            oldWalls.forEach(w => w.destroy());
            if (this.wall1TemplateNode) {
                for (const x of [-4, -2, 0, 2, 4]) {
                    const w = instantiate(this.wall1TemplateNode);
                    this.node.addChild(w); w.active = true;
                    w.setPosition(new Vec3(x, 0, 4));
                    w.setScale(3, 6, 3);
                    w.name = 'WallSeg';
                }
            } else {
                this.createBox('Wall', new Vec3(0, 0.5, 4), new Vec3(10, 1, 0.5), new Color(139, 90, 43));
            }
            this.updateWallBar();
        }, 5.0);
    }

    createBox(name: string, pos: Vec3, size: Vec3, color: Color): Node {
        const node = new Node(name);
        this.node.addChild(node);
        node.setPosition(pos);
        node.setScale(size);
        const mr = node.addComponent(MeshRenderer);
        mr.mesh = utils.createMesh(primitives.box());
        const mat = new Material();
        mat.initialize({ effectName: 'builtin-standard' });
        mat.setProperty('albedoScale', color);
        mr.material = mat;
        return node;
    }

    createGround() {
        if (this.groundTemplateNode) {
            for (let x = -4; x <= 4; x++) {
                for (let z = -28; z <= 14; z++) {
                    const g = instantiate(this.groundTemplateNode);
                    this.node.addChild(g);
                    g.active = true;
                    g.setPosition(new Vec3(x * 1.2, -0.2, z * 1.2));
                }
            }
        } else {
            this.createBox('Ground', new Vec3(0, -0.1, -8), new Vec3(16, 0.2, 50), new Color(50, 50, 55));
        }
        this.createBox('GrassL', new Vec3(-6, -0.05, 0), new Vec3(3, 0.15, 22), new Color(40, 80, 40));
        this.createBox('GrassR', new Vec3(6, -0.05, 0), new Vec3(3, 0.15, 22), new Color(40, 80, 40));
    }

    createWall() {
        if (this.wall1TemplateNode) {
            for (const x of [-4, -2, 0, 2, 4]) {
                const w = instantiate(this.wall1TemplateNode);
                this.node.addChild(w);
                w.active = true;
                w.setPosition(new Vec3(x, 0, 4));
                w.setScale(3, 6, 3);
                w.name = 'WallSeg';
            }
        } else {
            this.createBox('Wall', new Vec3(0, 0.5, 4), new Vec3(10, 1, 0.5), new Color(139, 90, 43));
        }
    }

    createWallBar() {
        this.wallBar = this.createBox('WallBar', new Vec3(0, -0.2, 15.5), new Vec3(8, 0.15, 0.1), new Color(180, 140, 0));
    }

    updateWallBar() {
        const ratio = this.wallHp / this.wallMaxHp;
        if (this.wallBar && this.wallBar.isValid) {
            this.wallBar.setScale(8 * ratio, 0.2, 0.1);
            const color = ratio > 0.5 ? new Color(180, 140, 0) : ratio > 0.25 ? new Color(255, 200, 0) : new Color(255, 0, 0);
            const mr = this.wallBar.getComponent(MeshRenderer)!;
            mr.material!.setProperty('albedoScale', color);
        }
    }

    createTents() {
        const positions = [
            new Vec3(-2.5, 0, 14), new Vec3(0, 0, 14), new Vec3(2.5, 0, 14),
        ];
        for (let i = 0; i < 3; i++) {
            if (this.houseTemplateNode) {
                const h = instantiate(this.houseTemplateNode);
                this.node.addChild(h);
                h.active = true;
                h.setPosition(positions[i]);
                h.setScale(2, 2, 2);
                this.tentNodes.push(h);
            } else {
                this.tentNodes.push(this.createBox('Tent' + (i + 1), new Vec3(positions[i].x, 0.5, positions[i].z), new Vec3(1.5, 1, 1.5), new Color(180, 140, 60)));
            }
        }
    }

    createSurvivor() {
        if (this.survivorTemplateNode) {
            this.survivor = instantiate(this.survivorTemplateNode);
            this.node.addChild(this.survivor);
            this.survivor.active = true;
            this.survivor.setPosition(new Vec3(0, 0, 6));
            const anims = this.survivor.getComponentsInChildren(Animation);
            for (const anim of anims) {
                if (!anim.clips || anim.clips.length === 0) continue;
                const walk = anim.clips.find(c => /walk|run|move/i.test(c.name));
                anim.play(walk ? walk.name : anim.clips[0].name);
            }
        } else {
            this.survivor = this.createBox('Survivor', new Vec3(0, 1, 6), new Vec3(0.6, 1.5, 0.6), new Color(70, 130, 200));
        }
    }

    spawnSurvivor(avatarUrl?: string) {
        const svs = [this.survivorTemplateNode, this.survivor2TemplateNode, this.survivor3TemplateNode].filter(t => t);
        if (svs.length === 0) return;
        const chosen = svs[this.survivorIdx % svs.length];
        this.survivorIdx++;
        const sv = instantiate(chosen);
        this.node.addChild(sv);
        sv.active = true;
        sv.setPosition(new Vec3((Math.random() - 0.5) * 4, 0, 12));
        const anims = sv.getComponentsInChildren(Animation);
        for (const anim of anims) {
            if (!anim.clips || anim.clips.length === 0) continue;
            const walk = anim.clips.find(c => /walk|run|move/i.test(c.name));
            anim.play(walk ? walk.name : anim.clips[0].name);
        }
        const avatarColors = [new Color(255,100,100), new Color(100,200,255), new Color(255,220,100), new Color(150,255,150), new Color(200,150,255)];
        const avatar = this.createBox('Avatar', new Vec3(0, 3, 12), new Vec3(0.6, 0.6, 0.05), avatarColors[this.survivorIdx % avatarColors.length]);
        // Load real avatar image if URL provided
        if (avatarUrl) {
            console.log('Loading avatar:', avatarUrl);
            assetManager.loadRemote<ImageAsset>(avatarUrl, (err, imageAsset) => {
                if (err) { console.error('Avatar load failed:', err); return; }
                if (!imageAsset) { console.error('No imageAsset'); return; }
                const tex = new Texture2D();
                tex.image = imageAsset;
                const mr = avatar.getComponent(MeshRenderer);
                if (mr) {
                    const mat = new Material();
                    mat.initialize({
                        effectName: 'builtin-standard',
                        defines: { USE_ALBEDO_MAP: true }
                    });
                    mat.setProperty('albedoMap', tex);
                    mat.setProperty('albedo', new Color(255, 255, 255, 255));
                    mr.setMaterial(mat, 0);
                    console.log('Avatar applied!');
                }
            });
        }
        this.survivors = this.survivors || [];
        // 上限20个，满了删最老的
        while (this.survivors.length >= 20) {
            const old = this.survivors.shift();
            old.node.destroy();
        }
        this.survivors.push({ node: sv, avatar: avatar, dir: Math.random() > 0.5 ? 1 : -1, zDir: 1 });
    }

    createDecorations() {
        const treeZs = [-28, -23, -18, -13, -8, -3, 2, 7, 10, 13];
        for (const side of [-1, 1]) {
            for (const tz of treeZs) {
                if (!this.treeTemplateNode) continue;
                const t = instantiate(this.treeTemplateNode);
                this.node.addChild(t);
                t.active = true;
                t.setPosition(new Vec3(side * 6, 0, tz));
                t.setScale(0.25, 0.25, 0.25);
                t.setRotationFromEuler(0, side * 45, 0);
            }
        }
        const edgeZs = [-30, -27, -24, -21, -18, -15, -12, -9, -6, -3, 0, 3, 6];
        for (const side of [-1, 1]) {
            for (let i = 0; i < edgeZs.length; i++) {
                if (i % 2 === 0 && this.tree2TemplateNode) {
                    const t = instantiate(this.tree2TemplateNode);
                    this.node.addChild(t);
                    t.active = true;
                    t.setPosition(new Vec3(side * 8, 0, edgeZs[i]));
                    t.setScale(1.5, 1.5, 1.5);
                } else if (this.tree3TemplateNode) {
                    const t = instantiate(this.tree3TemplateNode);
                    this.node.addChild(t);
                    t.active = true;
                    t.setPosition(new Vec3(side * 8.5, 0, edgeZs[i]));
                    t.setScale(0.5, 0.5, 0.5);
                }
            }
        }
        if (this.treeTemplateNode) {
            for (const x of [-6, -2, 2, 6]) {
                const t = instantiate(this.treeTemplateNode);
                this.node.addChild(t);
                t.active = true;
                t.setPosition(new Vec3(x, 0, -32));
                t.setScale(0.25, 0.25, 0.25);
            }
        }
        if (this.tree2TemplateNode) {
            for (const x of [-4, 4]) {
                const t = instantiate(this.tree2TemplateNode);
                this.node.addChild(t);
                t.active = true;
                t.setPosition(new Vec3(x, 0, -32));
                t.setScale(1.5, 1.5, 1.5);
            }
        }
    }

    shootFrom(fromPos: Vec3) {
        const alive = this.zombies.filter(z => z.node && z.node.isValid);
        if (alive.length === 0) return;
        // 计算距离并排序
        const withDist = alive.map(z => ({
            z,
            d: Math.pow(z.node.position.x - fromPos.x, 2) + Math.pow(z.node.position.z - fromPos.z, 2)
        })).sort((a, b) => a.d - b.d);
        // 在最近3个里随机选，分散火力
        const pickCount = Math.min(3, withDist.length);
        const nearest = withDist[Math.floor(Math.random() * pickCount)].z;
        let arrow: Node;
        if (this.arrowTemplateNode) {
            arrow = instantiate(this.arrowTemplateNode);
            this.node.addChild(arrow);
            arrow.active = true;
            arrow.setPosition(new Vec3(fromPos.x, 1.2, fromPos.z));
        } else {
            arrow = this.createBox('Arrow', new Vec3(fromPos.x, 1.2, fromPos.z), new Vec3(0.15, 0.15, 0.5), new Color(200, 200, 100));
        }
        this.arrows.push({ node: arrow, target: nearest, speed: 12 });
        this.playClip(this.arrowClip, 0.3);
    }

    spawnZombie(isBoss: boolean = false) {
        const isHuman = !isBoss && Math.random() < 0.3;
        const template = isBoss ? this.bossTemplateNode : (isHuman ? this.zombie1TemplateNode : this.zombieTemplateNode);
        if (!template) { console.log('no template for boss:', isBoss); return; }
        const wrapper = new Node('ZombieWrapper');
        this.node.addChild(wrapper);
        const model = instantiate(template);
        wrapper.addChild(model);
        model.active = true;
        model.setPosition(0, 0, 2);
        model.setRotationFromEuler(0, 0, 0);
        model.setScale(1, 1, 1);
        wrapper.active = true;
        const sx = Math.max(-3, Math.min(3, (Math.random() - 0.5) * 6));
        wrapper.setPosition(new Vec3(sx, 0, -32));
        const anims = wrapper.getComponentsInChildren(Animation);
        for (const anim of anims) {
            if (!anim.clips || anim.clips.length === 0) continue;
            const walk = anim.clips.find(c => /walk|run|move/i.test(c.name));
            anim.play(walk ? walk.name : anim.clips[0].name);
        }
        const maxHp = isBoss ? (this.bossHpOverride || 67) : (isHuman ? (this.humanHpOverride || 33) : (this.zombieHpOverride || 13));
        const speed = (this.speedOverride || 5.0);
        const barW = isBoss ? 1.5 : 0.8;
        const hpBar = this.createBox('ZHp', new Vec3(sx, 2, -32), new Vec3(barW, 0.08, 0.08), new Color(255, 0, 0));
        this.zombies.push({ node: wrapper, hpBar: hpBar, speed: speed, hp: maxHp, maxHp: maxHp, isHuman: isHuman, isBoss: isBoss, state: 'walk', attackTimer: 0 });
    }

    giftHearts: any[] = [];
    heartTex: Texture2D = null!;
    loadHeartTexture() {
        resources.load('heart/texture', Texture2D, (err, tex) => {
            if (err) { console.log('heart load err:', err); return; }
            this.heartTex = tex;
            console.log('heart texture loaded');
        });
    }
    spawnGiftHearts() {
        for (let i = 0; i < 12; i++) {
            const h = this.createBox('GiftHeart', new Vec3(0, 0, 0), new Vec3(0.6, 0.6, 0.05), new Color(255, 80, 150));
            if (this.heartTex) {
                const mr = h.getComponent(MeshRenderer);
                const mat = new Material();
                mat.initialize({
                    effectName: 'builtin-standard',
                    defines: { USE_ALBEDO_MAP: true }
                });
                mat.setProperty('albedoMap', this.heartTex);
                mat.setProperty('albedo', new Color(255, 255, 255, 255));
                mr.setMaterial(mat, 0);
            }
            const x = (Math.random() - 0.5) * 14;
            h.setPosition(x, 0, 6 + (Math.random() - 0.5) * 4);
            this.giftHearts.push({ node: h, vy: 2 + Math.random() * 2, vx: (Math.random() - 0.5) * 1 });
        }
    }

    update(dt: number) {
        if (this.gameOver || this.gamePaused) return;

        // 礼物爱心飘升
        for (let i = this.giftHearts.length - 1; i >= 0; i--) {
            const h = this.giftHearts[i];
            if (!h.node || !h.node.isValid) { this.giftHearts.splice(i, 1); continue; }
            const p = h.node.position;
            h.node.setPosition(p.x + h.vx * dt, p.y + h.vy * dt, p.z);
            if (p.y > 15) { h.node.destroy(); this.giftHearts.splice(i, 1); }
        }

        this.gameTime += dt;
        this.statsTimer += dt;
        if (this.statsTimer >= 1.0 && this.ws && this.ws.readyState === 1) {
            this.statsTimer = 0;
            const m = Math.floor(this.gameTime / 60);
            const s = Math.floor(this.gameTime % 60);
            this.ws.send(JSON.stringify({type:'stats', kills:this.kills, missed:this.missedCount, time:m+':'+(s<10?'0':'')+s, viewers:this.viewerCount, wallHp:Math.max(0,Math.round(this.wallHp)), gifts:this.giftCount}));
        }

        // 波次系统：6波
        if (this.waveCleared) {
            this.waveBreakTimer += dt;
            if (this.waveBreakTimer >= 5) {
                this.waveBreakTimer = 0;
                this.waveCleared = false;
                this.wave++;
                this.waveKills = 0;
                this.waveQuota = 10 + this.wave * 5;
                if (this.wave > this.waveTotal) {
                    // 通关
                    this.gameOver = true;
                    this.floatText('通关成功！', new Vec3(0, 8, 5), new Color(100, 255, 100));
                    this.scheduleOnce(() => this.showGameOver(), 3);
                } else {
                    this.floatText(`第 ${this.wave} 波！`, new Vec3(0, 8, 5), new Color(255, 255, 100));
                }
            }
        } else if (!this.gameOver) {
            const spawnInterval = this.spawnIntervalOverride || Math.max(0.3, 3.0 - this.viewerCount * 0.03 - this.wave * 0.2);
            this.spawnTimer += dt;
            if (this.spawnTimer >= spawnInterval && this.waveKills < this.waveQuota) {
                this.spawnTimer = 0;
                this.spawnZombie();
            }
            // 本波刷满且全灭
            if (this.waveKills >= this.waveQuota && this.zombies.length === 0) {
                this.waveCleared = true;
                if (this.wave >= this.waveTotal) {
                    // 最后一波清完即通关
                    this.gameOver = true;
                    this.floatText('通关成功！', new Vec3(0, 8, 5), new Color(100, 255, 100));
                    this.scheduleOnce(() => this.showGameOver(), 3);
                } else {
                    this.floatText(`第 ${this.wave} 波防守成功！`, new Vec3(0, 8, 5), new Color(100, 255, 100));
                }
            }
        }

        // 每20秒刷一个Boss
        this.bossSpawnTimer += dt;
        if (this.bossSpawnTimer >= 15.0) {
            this.bossSpawnTimer = 0;
            this.spawnZombie(true);
            this.ttsEvent('boss');
        }

        // 小怪移动
        for (const z of this.zombies) {
            if (!z.node || !z.node.isValid) continue;
            const p = z.node.position.clone();
            // 血条跟随
            if (z.hpBar && z.hpBar.isValid) {
                z.hpBar.setPosition(p.x, p.y + 1.0, p.z);
            }
            if (z.state === 'walk') {
                z.node.setPosition(p.x, p.y, p.z + z.speed * dt);
                if (p.z >= 2) z.state = 'attack';
            } else if (z.state === 'attack') {
                z.attackTimer += dt;
                if (z.attackTimer >= 1.0) {
                    z.attackTimer = 0;
                    this.wallHp -= 8;
                    this.missedCount++;
                    this.updateWallBar();
                    this.shakeCamera();
                    if (this.wallHp <= this.wallMaxHp * 0.5 && this.wallLevel < 2 && !this._lowWarned) {
                        this._lowWarned = true;
                        this.ttsEvent('lowWall');
                    }
                    if (this.wallHp <= 0 && !this.gameOver) {
                        this.gameOver = true;
                        this.ttsEvent('gameOver');
                        this.showGameOver();
                    }
                    if (this.gameOver) { /* game over, stop */ }
                    else { z.state = 'walk'; }
                }
            }
        }
        if (this.gameOver) return;
        this.zombies = this.zombies.filter(z => z.node && z.node.isValid);

        // 模拟弹幕已关闭，只从控制台/真实弹幕触发

        // 模拟送礼已关闭，只从控制台/真实弹幕触发

        if (this.boostTimer > 0) {
            this.boostTimer -= dt;
            if (this.boostTimer <= 0) this.boostMultiplier = 1;
        }

        // 赞数只从点赞按钮/真实弹幕来，不自动涨

        // 赞数驱动墙升级/降级
        if (this.likeCount >= 30 && this.wallLevel < 2) {
            this.upgradeWall(2);
            this.wallGraceTimer = 0;
            this.floatText('城墙升级！', new Vec3(0, 5, 4), new Color(255, 215, 0));
        } else if (this.likeCount >= 10 && this.wallLevel < 1) {
            this.upgradeWall(1);
            this.wallGraceTimer = 0;
            this.floatText('砖墙升级！', new Vec3(0, 5, 4), new Color(255, 215, 0));
        }
        // 20秒没新赞，墙降一级
        if (this.wallLevel > 0) {
            this.wallGraceTimer += dt;
            if (this.wallGraceTimer >= 20) {
                this.wallGraceTimer = 0;
                if (this.wallLevel === 2) {
                    this.likeCount = 10; // 降到砖墙区间
                    this.downgradeWall(1);
                    this.floatText('城墙退化为砖墙！', new Vec3(0, 5, 4), new Color(255, 100, 100));
                } else {
                    this.likeCount = 0;
                    this.downgradeWall(0);
                    this.floatText('砖墙退化为木栅栏！', new Vec3(0, 5, 4), new Color(255, 100, 100));
                }
            }
        }

        // 射击
        const shootInterval = Math.max(0.15, (this.baseShootInterval - this.likeCount * 0.02) * this.boostMultiplier);
        const towerInterval = this.arrowRateOverride || Math.max(0.1, (this.baseTowerInterval - this.likeCount * 0.003) * this.boostMultiplier);

        this.shootTimer += dt;
        if (this.shootTimer >= shootInterval) {
            this.shootTimer = 0;
            for (const s of this.survivors) {
                if (s.node && s.node.isValid) this.shootFrom(s.node.position);
            }
        }

        // 点赞石头
        this.rockTimer += dt;
        if (this.rockTimer >= 2.0 && this.rocksTemplateNode) {
            this.rockTimer = 0;
            const r = instantiate(this.rocksTemplateNode);
            this.node.addChild(r);
            r.active = true;
            r.setPosition(new Vec3((Math.random() - 0.5) * 4, 0.5, -2 + (Math.random() - 0.5) * 4));
            r.setScale(5, 5, 5);
        }

        // 生存者巡逻
        if (this.survivor) {
            const sp = this.survivor.position;
            let nx = sp.x + this.survivorDir * 3 * dt;
            if (nx > 4) { nx = 4; this.survivorDir = -1; }
            if (nx < -4) { nx = -4; this.survivorDir = 1; }
            let nz = sp.z + this.survivorZDir * 2 * dt;
            if (nz > 8) { nz = 8; this.survivorZDir = -1; }
            if (nz < 5) { nz = 5; this.survivorZDir = 1; }
            this.survivor.setPosition(nx, sp.y, nz);
        }

        for (const s of this.survivors || []) {
            if (!s.node || !s.node.isValid) continue;
            const sp = s.node.position;
            let nx = sp.x + s.dir * 2 * dt;
            if (nx > 4) { nx = 4; s.dir = -1; }
            if (nx < -4) { nx = -4; s.dir = 1; }
            let nz2 = sp.z + s.zDir * 1.5 * dt;
            if (nz2 > 12) { nz2 = 12; s.zDir = -1; }
            if (nz2 < 5) { nz2 = 5; s.zDir = 1; }
            s.node.setPosition(nx, sp.y, nz2);
            if (s.avatar && s.avatar.isValid) {
                s.avatar.setPosition(nx, sp.y + 3, nz2);
            }
        }

        // 箭楼射击
        this.towerShootTimer += dt;
        if (this.towerShootTimer >= towerInterval) {
            this.towerShootTimer = 0;
            for (const t of this.towers) {
                if (t.node && t.node.isValid) this.shootFrom(t.node.position);
            }
        }
        // 塔寿命倒计时
        for (let i = this.towers.length - 1; i >= 0; i--) {
            const t = this.towers[i];
            if (!t.node || !t.node.isValid) { this.towers.splice(i, 1); continue; }
            t.life = (t.life || 15) - dt;
            if (t.life <= 0) { t.node.destroy(); this.towers.splice(i, 1); }
        }

        // 箭追踪目标
        for (const a of this.arrows) {
            if (!a.node || !a.node.isValid) continue;
            if (!a.target || !a.target.node || !a.target.node.isValid) {
                a.node.destroy();
                continue;
            }
            const p = a.node.position;
            const tp = a.target.node.position;
            const dx = tp.x - p.x;
            const dz = tp.z - p.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 0.8) {
                a.target.hp -= (this.arrowDmgOverride || 5);
                if (a.target.hpBar && a.target.hpBar.isValid) {
                    a.target.hpBar.setScale(0.8 * (a.target.hp / a.target.maxHp), 0.08, 0.08);
                }
                if (a.target.hp <= 0) {
                    this.kills++;
                    if (!a.target.isBoss) this.waveKills++;
                    this.playClip(a.target.isBoss ? this.bossDieClip : (a.target.isHuman ? this.humanDieClip : this.smallDieClip), 0.5);
                    if (a.target.hpBar && a.target.hpBar.isValid) a.target.hpBar.destroy();
                    if (a.target.node && a.target.node.isValid) a.target.node.destroy();
                    this.zombies = this.zombies.filter(z => z !== a.target);
                }
                a.node.destroy();
                continue;
            }
            a.node.setPosition(p.x + (dx / dist) * a.speed * dt, p.y, p.z + (dz / dist) * a.speed * dt);
            // 箭朝向目标方向
            const angle = Math.atan2(dx, dz) * 180 / Math.PI;
            a.node.setRotationFromEuler(0, angle, 0);
        }
        this.arrows = this.arrows.filter(a => a.node && a.node.isValid);

        // 屏幕震动
        if (this.camNode) {
            if (this.shakeTimer > 0) {
                this.shakeTimer -= dt;
                const s = this.shakeTimer * 3;
                this.camNode.setPosition((Math.random() - 0.5) * s, 10 + (Math.random() - 0.5) * s, 12 + (Math.random() - 0.5) * s);
            } else {
                this.camNode.setPosition(0, 10, 12);
            }
        }

        // 飘字动画
        for (const f of this.floats) {
            f.t += 0.005;
            if (f.node.isValid) {
                f.node.setPosition(f.startPos.x, f.startPos.y + f.t * 2, f.startPos.z);
                if (f.t >= 1.0) f.node.destroy();
            }
        }
        this.floats = this.floats.filter(f => f.node && f.node.isValid);
    }
}
