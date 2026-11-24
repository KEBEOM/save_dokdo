// 달리고 구하고 풀어라!: 스테이지 선택, 달리기(플랫폼) 게임, 파란 로봇 퀴즈
import { W, H, ctx, img, sp, preload, drawCover, drawFit, drawImg, panel, text, textBox, button, hit, input, keyDown, keyHit, save, persist, audio, go, game, fmt, dim, beginUI, ui, inside, clamp } from './core.js';
import { nav, Notice } from './widgets.js';

const U = 64;                 // 1 유닛 = 64px
const GRAV = 9.81 * 3, JUMP = 12, SPEED = 5, MAXFALL = 22;
const PW = 0.5, PH = 0.62;    // 주인공 충돌 상자 (원래 게임: 반지름 0.3 원)
const ROBOT_R = 0.38;

// 9스테이지 로보킹 문제: 원래 게임 연결에서는 '시마네현 고시'가 정답으로 되어 있었지만,
// 힌트(세종실록지리지)와 사실에 맞게 '세종실록'을 정답으로 고침
const STAGE9_FIX = '세종실록';
const AMAZING = ['이럴 수가... 분명히 로봇 군단을 시켜 \n인간들이 독도에 대한 기억을 잊어버리게 했는데...', '어째서 너는 이렇게 독도에 \n대해 잘 알고 있는 거지?', '좋다... 재밌군... \n그렇다면 다음 스테이지로 넘어와라.', '나를 다시 찾아온다면 독도를 걸고 승부하자. 기다리고 있겠다...'];
const KING_GATE = ['여기까지 오다니 대단하다. 독도를 걸고 승부를 해보자.', '대결할 준비가 되었다면 문을 열고 들어와라. 나는 준비하고 있겠다.'];
const NOT_PASS = '자네에게 정령들의 기운이 충분히 느껴지지 않는군..\n정령들을 모두 구출하고 도전하는것이 좋다네...\n다른 스테이지에 두고온 정령들을 살펴보고 오게나..';
const GUIDE = ['점프 버튼을 공중에서 한 번 더 누르면 더블 점프! 높은 발판도 올라갈 수 있다!', '열쇠를 획득해라! 열쇠를 얻으면 스테이지 해결에 필요한 힌트도 제공한다! 획득한 열쇠를 클릭하면 획득한 힌트를 다시 볼 수 있다!', '섬 곳곳에 숨어있는 정령들을 구출해라!', '파란로봇 중에는 문제를 내는 녀석들도 있다!!', '로봇에게 닿으면 처음 장소로 돌아오니 주의해라!', '나를 찾아와 문제를 풀고 다음 스테이지로 넘어가라!'];

function spriteInfo(key) {
  const s = game.data.sprites[key];
  if (!s) return null;
  const im = sp(key);
  const pw = s.rect ? s.rect[2] : (im ? im.width : 0), ph = s.rect ? s.rect[3] : (im ? im.height : 0);
  return { im, w: pw / s.ppu, h: ph / s.ppu };
}

// ================================================================ 스테이지 선택
export class StageSelectScene {
  constructor() { this.notice = new Notice(); this.t = 0; }
  enter() { audio.play('run_intro'); }
  update(dt) { this.t += dt; }
  draw() {
    beginUI(this.notice.open ? 1 : 0);
    drawCover(img('bg3'), 0, 0, W, H);
    text('달리고 구하고 풀어라!', W / 2, 40, { size: 56, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 10 });
    for (let i = 0; i < 10; i++) {
      const x = 150 + (i % 5) * 205, y = 160 + Math.floor(i / 5) * 250;
      const open = i + 1 <= save.unlockedStage;
      const bob = open ? Math.sin(this.t * 2 + i) * 4 : 0;
      ctx.save(); if (!open) ctx.filter = 'grayscale(1) brightness(.6)';
      drawFit(img(save.cleared[i] ? 'stagemark' + (i + 1) : 'selecticon'), x, y + bob, 160, 160);
      ctx.restore();
      if (!open) drawFit(img('Lock'), x + 50, y + 50, 60, 60);
      if (save.rescued[i]) drawFit(img('savept'), x + 120, y - 6, 44, 44);
      panel(x + 20, y + 168, 120, 46, { r: 8, inner: false, lw: 3 });
      text(`스테이지${i + 1}`, x + 80, y + 176, { size: 24, align: 'center' });
      if (hit(x, y, 160, 214, 0)) {
        audio.sfx('click');
        if (open) go(nav.stage(i + 1));
        else this.notice.push(`스테이지${i} 을(를) 먼저 깨야 열려요!`);
      }
    }
    text(`구출한 정령 ${save.rescued.filter(Boolean).length} / 10`, 60, H - 70, { size: 30, color: '#fff', stroke: '#2b2b2b', strokeW: 6 });
    if (button('돌아가기', W - 240, H - 100, 200, 70, { size: 30 })) go(nav.select());
    this.notice.draw(1);
  }
}

// ================================================================ 스테이지 (달리기)
export class StageScene {
  constructor(n) {
    this.n = n;
    const d = game.data.stages[n - 1];
    this.d = d;
    this.solids = [];
    this.deadly = [];
    this.tiles = [];
    for (const p of d.platforms) {
      this.tiles.push({ p });
      if (p.box) (p.deadly ? this.deadly : this.solids).push({ x: p.box[0], y: p.box[1], w: p.box[2], h: p.box[3] });
    }
    // 원래 게임의 경계(Top Left / Bottom Right)
    const [lx, ty] = d.topLeft, [rx, by] = d.bottomRight;
    this.bounds = { l: lx, r: rx, t: Math.max(ty, d.start[1] + 4), b: by };
    this.start = [d.start[0], d.start[1] + 0.2];
    this.coins = d.coins.map(([x, y], i) => ({ x, y, i, got: false }));
    this.keys = d.keys.map(k => ({ ...k, got: false }));
    this.robots = d.robots.map((r, i) => ({ ...r, i, sx0: r.x, sy0: r.y, vx: r.walk ? (r.flip ? 1 : -1) : 0, vy: 0, t: Math.random() * 3, solved: !!(r.q && save.robotQ[game.data.robotQuestions[r.q]?.flag]) }));
    // 발밑에 발판이 없는 로봇(원작에서 허공·맵 밖에 놓인 로봇)은 가장 가까운 발판 위로 옮김
    for (const rb of this.robots) {
      const under = this.solids.some(s => rb.x >= s.x - 0.2 && rb.x <= s.x + s.w + 0.2 && s.y + s.h <= rb.y + 0.6);
      if (under) continue;
      let best = null, bd = Infinity;
      for (const s of this.solids) {
        const top = s.y + s.h, cx = s.x + s.w / 2;
        if (this.solids.some(o => o !== s && Math.abs(o.x - s.x) < 0.5 && o.y > s.y && o.y - top < 1.2)) continue; // 위가 막힌 칸 제외
        const dist = Math.hypot(cx - rb.x, top - rb.y);
        if (dist < bd) { bd = dist; best = s; }
      }
      if (best) { rb.x = rb.sx0 = best.x + best.w / 2; rb.y = rb.sy0 = best.y + best.h + ROBOT_R + 0.02; }
    }
    this.spirit = d.spirit && !save.rescued[n - 1] ? { ...d.spirit, got: false } : null;
    this.door = { ...d.door, open: false };
    this.flag = d.flag;
    this.p = { x: this.start[0], y: this.start[1], vx: 0, vy: 0, ground: false, coyote: 0, buffer: 0, airJumps: 1, puff: 0, face: 1, anim: 0, blink: 0 };
    this.cam = { x: this.p.x, y: this.p.y };
    this.notice = new Notice();
    this.modal = null;       // 열쇠 힌트·퀴즈 같은 큰 창
    this.t = 0;
    this.touch = { left: false, right: false, jump: false };
    this.cleared = false;
    // 이 스테이지에 쓰는 그림을 미리 받아 두기 (받는 중에는 그릴 때마다 다시 확인)
    const keys = new Set(d.platforms.map(p => p.s));
    for (const o of [d.door, d.flag, d.spirit, ...d.deco]) if (o?.s) keys.add(o.s);
    if (d.saveBg) keys.add(d.saveBg);
    this.ready = false;
    preload([...keys].map(k => 'sp/' + k).concat(['boy_stand', 'boy_walk', 'boy_jump', 'robo_red', 'robo_blue', 'roboking', 'dokdo_icon', 'daddy_small', 'dp', 'stagebg'])).then(() => { this.ready = true; });
  }
  enter() {
    audio.play(this.n >= 9 ? 'child_adventure' : this.n >= 7 ? 'daddy_reveal' : this.n >= 4 ? 'robot_attack' : 'protect_dokdo');
    if (this.returnFromQuiz) { this.returnFromQuiz = false; }
  }
  get busy() { return !this.ready || !!this.modal || this.notice.open; }

  // ---------------------------------------------------------------- 물리
  collide(box, list) { for (const s of list) if (box.x < s.x + s.w && box.x + box.w > s.x && box.y < s.y + s.h && box.y + box.h > s.y) return s; return null; }
  pbox(p = this.p) { return { x: p.x - PW / 2, y: p.y - 0.38, w: PW, h: PH }; }
  solidList() { return this.door && !this.door.open && this.door.box ? [...this.solids, { x: this.door.box[0], y: this.door.box[1], w: this.door.box[2], h: this.door.box[3], door: true }] : this.solids; }
  moveBody(o, dx, dy, getBox, list) {
    // x축 이동 후 y축 이동 (겹치면 밀어내기)
    o.x += dx;
    let b = getBox(o), s = this.collide(b, list), hitX = null;
    if (s) { hitX = s; if (dx > 0) o.x -= (b.x + b.w) - s.x + 1e-4; else if (dx < 0) o.x += (s.x + s.w) - b.x + 1e-4; }
    o.y += dy;
    b = getBox(o); s = this.collide(b, list);
    let landed = false, bumped = false;
    if (s) {
      if (dy < 0) { o.y += (s.y + s.h) - b.y + 1e-4; landed = true; }
      else if (dy > 0) { o.y -= (b.y + b.h) - s.y + 1e-4; bumped = true; }
    }
    return { hitX, landed, bumped };
  }
  update(dt) {
    this.t += dt;
    dt = Math.min(dt, 1 / 30);
    if (this.busy) { this.readTouch(); return; }
    const p = this.p;
    this.readTouch();
    const left = keyDown('ArrowLeft', 'KeyA') || this.touch.left;
    const right = keyDown('ArrowRight', 'KeyD') || this.touch.right;
    const jumpHit = keyHit('Space', 'ArrowUp', 'KeyW') || this.touch.jumpHit;
    p.vx = (right ? 1 : 0) - (left ? 1 : 0);
    if (p.vx) p.face = p.vx;
    p.vx *= SPEED;
    if (jumpHit) p.buffer = 0.12;
    p.buffer -= dt; p.coyote -= dt;
    if (p.buffer > 0) {
      if (p.coyote > 0) { p.vy = JUMP; p.buffer = 0; p.coyote = 0; audio.sfx('jump'); }
      else if (p.airJumps > 0) { p.vy = JUMP; p.buffer = 0; p.airJumps--; p.puff = 0.3; audio.sfx('jump'); } // 더블 점프
    }
    p.vy = Math.max(-MAXFALL, p.vy - GRAV * dt);
    const r = this.moveBody(p, p.vx * dt, p.vy * dt, o => this.pbox(o), this.solidList());
    p.ground = r.landed;
    if (r.landed || r.bumped) p.vy = 0;
    if (p.ground) { p.coyote = 0.1; p.airJumps = 1; }
    if (r.hitX && r.hitX.door) this.touchDoor();
    p.x = clamp(p.x, this.bounds.l, this.bounds.r);
    p.anim += dt;
    if (p.blink > 0) p.blink -= dt;
    if (p.puff > 0) p.puff -= dt;
    // 떨어지거나 죽는 땅에 닿으면 처음 자리로
    if (p.y < this.bounds.b - 3 || this.collide(this.pbox(), this.deadly)) this.respawn();

    // 로봇
    for (const rb of this.robots) {
      rb.t += dt;
      rb.vy = Math.max(-MAXFALL, rb.vy - GRAV * dt);
      const box = o => ({ x: o.x - ROBOT_R, y: o.y - ROBOT_R, w: ROBOT_R * 2, h: ROBOT_R * 2 });
      const res = this.moveBody(rb, rb.vx * dt, rb.vy * dt, box, this.solids);
      if (res.landed || res.bumped) rb.vy = 0;
      if (rb.walk) {
        // 벽에 부딪히거나 발밑이 비면 돌아서기
        const ahead = { x: rb.x + Math.sign(rb.vx) * (ROBOT_R + 0.05) - 0.05, y: rb.y - ROBOT_R - 0.2, w: 0.1, h: 0.15 };
        if (res.hitX || (res.landed && !this.collide(ahead, this.solids))) rb.vx = -rb.vx;
      }
      if (rb.y < this.bounds.b - 3 || this.collide(box(rb), this.deadly)) { rb.x = rb.sx0; rb.y = rb.sy0; rb.vy = 0; rb.appear = 0.8; }
      if (rb.appear > 0) { rb.appear -= dt; continue; }
      if (rb.solved) continue;
      const dx = rb.x - p.x, dy = rb.y - (p.y - 0.08);
      if (dx * dx + dy * dy < (ROBOT_R + 0.32) ** 2 && p.blink <= 0) {
        if (rb.q) { this.openRobotQuiz(rb); return; }
        audio.sfx('hurt');
        this.respawn();
      }
    }
    // 독도 포인트
    for (const c of this.coins) {
      if (!c.got && Math.abs(c.x - p.x) < 0.55 && Math.abs(c.y - (p.y - 0.08)) < 0.6) { c.got = true; save.dp += 3; persist(); audio.sfx('coin'); }
    }
    // 열쇠
    for (const k of this.keys) {
      if (!k.got && Math.abs(k.x - p.x) < 0.7 && Math.abs(k.y - (p.y - 0.08)) < 0.8) { k.got = true; audio.sfx('key'); this.modal = { type: 'key', n: k.n }; }
    }
    // 정령
    const s = this.spirit;
    if (s && !s.got) {
      const info = spriteInfo(s.s); const half = info ? Math.max(info.w * Math.abs(s.sx), 0.8) / 2 : 0.6;
      if (Math.abs(s.x - p.x) < half + 0.2 && Math.abs(s.y - p.y) < half + 0.3) {
        s.got = true; save.rescued[this.n - 1] = true; save.savePts += 2 ** (this.n - 1); persist();
        audio.sfx('good'); this.modal = { type: 'save' };
      }
    }
    // 목적지(깃발)
    if (this.door.open && this.flag && !this.cleared) {
      const f = this.flag.box;
      if (this.collide(this.pbox(), [{ x: f[0] - 0.3, y: f[1] - 0.3, w: f[2] + 0.6, h: f[3] + 1.2 }])) this.reachFlag();
    }
    // 카메라
    const vw = W / U, vh = H / U;
    this.cam.x += (p.x - this.cam.x) * Math.min(1, dt * 8);
    this.cam.y += (p.y + 1 - this.cam.y) * Math.min(1, dt * 8);
    const minX = this.bounds.l - 2 + vw / 2, maxX = this.bounds.r + 2 - vw / 2;
    this.cam.x = minX > maxX ? (minX + maxX) / 2 : clamp(this.cam.x, minX, maxX);
    const minY = this.bounds.b - 3 + vh / 2, maxY = this.bounds.t + 2 - vh / 2;
    this.cam.y = minY > maxY ? (minY + maxY) / 2 : clamp(this.cam.y, minY, maxY);
  }
  readTouch() {
    // 화면 아래 이동 버튼 (여러 손가락 동시 터치)
    this.touch.left = this.touch.right = false;
    let jumpNow = false;
    if (!this.busy) for (const pt of input.pointers.values()) {
      if (inside(pt.x, pt.y, 20, H - 160, 140, 140)) this.touch.left = true;
      if (inside(pt.x, pt.y, 170, H - 160, 140, 140)) this.touch.right = true;
      if (inside(pt.x, pt.y, W - 190, H - 170, 170, 150)) jumpNow = true;
    }
    this.touch.jumpHit = jumpNow && !this.touch.jumpHeld;
    this.touch.jumpHeld = jumpNow;
  }
  respawn() {
    const p = this.p;
    p.x = this.start[0]; p.y = this.start[1]; p.vx = p.vy = 0; p.blink = 1.2;
  }
  touchDoor() {
    if (this.modal) return;
    const d = this.d;
    if (!this.keys.some(k => k.got)) { this.modal = { type: 'msg', text: d.noKeyText === '...... ....... ....... ....... .......' ? d.noKeyText : '열쇠를 얻어와라!!!!!', face: this.n >= 9 ? 'king' : 'daddy' }; this.p.x -= 0.4 * Math.sign(this.door.x - this.p.x || 1); return; }
    if (this.n === 10) { this.modal = { type: 'seq', texts: KING_GATE, face: 'king', then: () => this.openDoor() }; return; }
    this.modal = { type: 'quiz', picked: null };
  }
  openDoor() { this.door.open = true; audio.sfx('good'); }
  reachFlag() {
    this.cleared = true;
    const n = this.n;
    if (n === 10) {
      if (!save.rescued.every(Boolean)) { this.modal = { type: 'notpass' }; this.cleared = false; this.door.open = false; this.p.x -= 1.5; return; }
      save.cleared[9] = true; persist();
      go(nav.beforeFinal());
      return;
    }
    save.cleared[n - 1] = true;
    save.unlockedStage = Math.max(save.unlockedStage, n + 1);
    persist();
    audio.sfx('good');
    if (n === 8 && !save.leeSeen) { save.leeSeen = true; persist(); go(nav.leeReveal()); return; }
    this.modal = { type: 'clear' };
  }
  openRobotQuiz(rb) {
    this.p.x -= 1.6 * Math.sign(rb.x - this.p.x || 1); this.p.vy = 0; this.p.blink = 1.5;
    this.returnFromQuiz = true;
    go(nav.robotQuiz(rb.q, this, () => { rb.solved = true; }));
  }

  // ---------------------------------------------------------------- 그리기
  w2s(x, y) { return [(x - this.cam.x) * U + W / 2, H / 2 - (y - this.cam.y) * U]; }
  drawWorldSprite(info, x, y, sx = 1, sy = 1, opts = {}) {
    if (!info || !info.im) return;
    const w = info.w * Math.abs(sx) * U, h = info.h * Math.abs(sy) * U;
    const [px, py] = this.w2s(x, y);
    if (px + w / 2 < -50 || px - w / 2 > W + 50 || py + h / 2 < -50 || py - h / 2 > H + 50) return;
    drawImg(info.im, px - w / 2, py - h / 2, w, h, { flip: (sx < 0) !== !!opts.flip, frame: opts.frame, alpha: opts.alpha });
  }
  drawSheet(name, frame, x, y, sizeU, flip, alpha) {
    const im = img(name); if (!im) return;
    const [px, py] = this.w2s(x, y), s = sizeU * U;
    if (px + s < -50 || px - s > W + 50 || py + s < -50 || py - s > H + 50) return;
    drawImg(im, px - s / 2, py - s / 2, s, s, { frame, flip, alpha });
  }
  draw() {
    const layer = this.notice.open ? 2 : this.modal ? 1 : 0;
    beginUI(layer);
    // 하늘과 배경
    ctx.fillStyle = '#9fd3f0'; ctx.fillRect(0, 0, W, H);
    const bg = img('stagebg');
    if (bg) {
      const bw = 1600, bh = bw * bg.height / bg.width;
      const ox = -((this.cam.x * 12) % bw + bw) % bw;
      ctx.globalAlpha = 0.75;
      for (let k = -1; k < 3; k++) ctx.drawImage(bg, ox + k * bw, H - bh + clamp((this.cam.y - this.bounds.b) * 6, 0, 200), bw, bh);
      ctx.globalAlpha = 1;
    }
    for (const t of this.tiles) if (!t.p.deadly) this.drawWorldSprite(spriteInfo(t.p.s), t.p.x, t.p.y, t.p.sx, t.p.sy);
    for (const dc of this.d.deco) if (!dc.bg && dc.s) this.drawWorldSprite(spriteInfo(dc.s), dc.x, dc.y, dc.sx, dc.sy);
    // 깃발과 문지기
    if (this.flag) this.drawWorldSprite(spriteInfo(this.flag.s), this.flag.x, this.flag.y, this.flag.sx, this.flag.sy);
    if (this.door) {
      const king = this.n >= 9;
      const fr = Math.floor(this.t * 2) % 2;
      this.drawSheet(king ? 'roboking' : 'daddy_small', king ? [fr * 81, 0, 80, 80] : [fr * 82, 0, 82, 82], this.door.x, this.door.y, 1.85, this.door.sx < 0, this.door.open ? 0.45 : 1);
      if (!this.door.open) {
        const [px, py] = this.w2s(this.door.x, this.door.y + 1.5);
        if (px > -100 && px < W + 100) { panel(px - 34, py - 30, 68, 40, { r: 8, inner: false, lw: 3 }); text('?', px, py - 26, { size: 30, align: 'center', color: '#c0392b' }); }
      }
    }
    for (const c of this.coins) if (!c.got) this.drawSheet('dp', null, c.x, c.y + Math.sin(this.t * 4 + c.i) * 0.06, 0.6);
    for (const k of this.keys) if (!k.got) this.drawSheet('dokdo_icon', [Math.floor(this.t * 3) % 2 * 160, 0, 160, 160], k.x, k.y + Math.sin(this.t * 3 + k.n) * 0.1, 0.95);
    if (this.spirit && !this.spirit.got) {
      const s = this.spirit;
      this.drawWorldSprite(spriteInfo(s.s), s.x, s.y + Math.sin(this.t * 2.5) * 0.12, s.sx, s.sy);
      const [px, py] = this.w2s(s.x, s.y + 1);
      text('!', px, py - 20 + Math.sin(this.t * 6) * 4, { size: 34, align: 'center', color: '#ffe066', stroke: '#2b2b2b', strokeW: 6 });
    }
    for (const rb of this.robots) {
      const blue = rb.blue;
      const fr = Math.floor(rb.t * (rb.walk ? 8 : 5)) % 8;
      const frame = blue ? [fr * 81, 0, 80, 80] : [fr * 80, 0, 80, 80];
      this.drawSheet(blue ? 'robo_blue' : 'robo_red', frame, rb.x, rb.y + 0.02, 0.95, rb.vx > 0, rb.solved ? 0.35 : (rb.appear > 0 ? (Math.floor(rb.appear * 10) % 2 ? 0.2 : 0.8) : 1));
      if (rb.q && !rb.solved) {
        const [px, py] = this.w2s(rb.x, rb.y + 0.9);
        if (px > -50 && px < W + 50) text('?', px, py - 16, { size: 28, align: 'center', color: '#3b8ede', stroke: '#fff', strokeW: 5 });
      }
    }
    // 주인공
    const p = this.p;
    if (p.puff > 0) {
      const [px, py] = this.w2s(p.x, p.y - 0.45), r = (0.3 - p.puff) * 120 + 10;
      ctx.save(); ctx.globalAlpha = p.puff / 0.3; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    if (!(p.blink > 0 && Math.floor(p.blink * 10) % 2)) {
      let sheet = 'boy_stand', fr = Math.floor(p.anim * 6) % 9;
      if (!p.ground) { sheet = 'boy_jump'; fr = p.vy > 2 ? 1 : p.vy > -2 ? 2 : 3; }
      else if (Math.abs(p.vx) > 0.1) { sheet = 'boy_walk'; fr = Math.floor(p.anim * 10) % 4; }
      this.drawSheet(sheet, [fr * 80, 0, 80, 80], p.x, p.y, 0.8 * 1.25, p.face < 0);
    }
    if (!this.ready) {
      ctx.fillStyle = 'rgba(27,43,54,.85)'; ctx.fillRect(0, 0, W, H);
      text(`스테이지${this.n}`, W / 2, H / 2 - 70, { size: 60, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 10 });
      text('맵을 불러오는 중…', W / 2, H / 2 + 20, { size: 32, align: 'center', color: '#f4e3c3' });
      return;
    }
    this.drawHUD(layer);
    if (this.modal) this.drawModal();
    this.notice.draw(2);
  }
  drawHUD(layer) {
    const d = this.d;
    panel(14, 12, 190, 52, { r: 8, inner: false });
    text(`스테이지${this.n}`, 109, 20, { size: 30, align: 'center' });
    panel(214, 12, 170, 52, { r: 8, inner: false }); drawFit(img('dp'), 220, 16, 44, 44); text(fmt(save.dp), 372, 22, { size: 28, align: 'right' });
    panel(394, 12, 150, 52, { r: 8, inner: false }); drawFit(img('savept'), 400, 16, 44, 44); text(fmt(save.savePts), 532, 22, { size: 28, align: 'right' });
    // 열쇠 3개 + 정령
    for (let k = 1; k <= 3; k++) {
      const key = this.keys.find(q => q.n === k), got = key && key.got;
      const x = 14 + (k - 1) * 66, y = 74;
      panel(x, y, 58, 58, { r: 8, inner: false, fill: got ? '#fff2d6' : '#bdb3a2', lw: 3 });
      ctx.save(); if (!got) ctx.filter = 'grayscale(1) brightness(.5)';
      drawFit(img('dokdo_icon'), x + 4, y + 4, 50, 50, { frame: [160, 0, 160, 160] });
      ctx.restore();
      if (got && hit(x, y, 58, 58, 0)) this.modal = { type: 'key', n: k };
    }
    const sx = 14 + 3 * 66;
    panel(sx, 74, 58, 58, { r: 8, inner: false, fill: save.rescued[this.n - 1] ? '#d6f0c8' : '#bdb3a2', lw: 3 });
    if (this.d.spirit) { const info = spriteInfo(this.d.spirit.s); ctx.save(); if (!save.rescued[this.n - 1]) ctx.filter = 'brightness(.2)'; if (info?.im) drawFit(info.im, sx + 4, 78, 50, 50); ctx.restore(); }
    if (button('가이드', W - 440, 12, 120, 56, { size: 24 })) this.modal = { type: 'guide' };
    if (button('게임이\n힘들어요!', W - 310, 12, 150, 56, { size: 20 })) this.modal = { type: 'cheat' };
    if (button('메뉴', W - 150, 12, 130, 56, { size: 26 }) || (keyHit('Escape') && layer === 0)) this.modal = { type: 'pause' };
    // 터치 버튼
    if (input.touch) {
      const a = 0.55;
      ctx.globalAlpha = a;
      panel(20, H - 160, 140, 140, { r: 70, inner: false, fill: this.touch.left ? '#fff' : '#f4e3c3' }); text('◀', 90, H - 118, { size: 56, align: 'center' });
      panel(170, H - 160, 140, 140, { r: 70, inner: false, fill: this.touch.right ? '#fff' : '#f4e3c3' }); text('▶', 240, H - 118, { size: 56, align: 'center' });
      panel(W - 190, H - 170, 170, 150, { r: 75, inner: false, fill: this.touch.jumpHeld ? '#fff' : '#f4e3c3' }); text('점프', W - 105, H - 118, { size: 40, align: 'center' });
      ctx.globalAlpha = 1;
    } else {
      text('←/→ 또는 A/D 이동 · Space/↑ 점프 (공중에서 한 번 더 누르면 더블 점프)', 20, H - 40, { size: 20, color: '#fff', stroke: 'rgba(0,0,0,.55)', strokeW: 4 });
    }
  }
  drawModal() {
    const m = this.modal, d = this.d, L = 1;
    dim(0.5);
    const close = () => { this.modal = null; };
    const face = f => drawFit(img(f === 'king' ? 'roboking' : 'daddy4'), 130, 230, 170, 170, f === 'king' ? { frame: [0, 0, 80, 80] } : {});
    if (m.type === 'key') {
      panel(140, 170, W - 280, 380);
      panel(170, 140, 230, 56, { fill: '#3a2f28', line: '#f4e3c3', inner: false });
      text(`정령의 힌트${m.n}`, 285, 150, { size: 30, color: '#fff', align: 'center' });
      const info = d.spirit ? spriteInfo(d.spirit.s) : null;
      if (info?.im) drawFit(info.im, 180, 240, 200, 200);
      textBox(d.hints[m.n - 1], 410, 210, W - 600, 260, { size: 30 });
      if (button('확인', W / 2 - 100, 470, 200, 60, { layer: L }) || keyHit('Enter', 'Space')) close();
    } else if (m.type === 'msg') {
      panel(110, 210, W - 220, 260); face(m.face);
      textBox(m.text, 330, 240, W - 480, 140, { size: 34 });
      if (button('확인', W / 2 - 100, 390, 200, 60, { layer: L }) || keyHit('Enter', 'Space')) { close(); m.then?.(); }
    } else if (m.type === 'seq') {
      m.i = m.i || 0;
      panel(110, 210, W - 220, 260); face(m.face);
      textBox(m.texts[m.i], 330, 240, W - 480, 140, { size: 32 });
      if (button(m.i < m.texts.length - 1 ? '다음' : '확인', W / 2 - 100, 390, 200, 60, { layer: L }) || keyHit('Enter', 'Space')) {
        if (++m.i >= m.texts.length) { close(); m.then?.(); }
      }
    } else if (m.type === 'quiz') {
      panel(90, 70, W - 180, 560);
      panel(W / 2 - 170, 46, 340, 56, { fill: '#3a2f28', line: '#f4e3c3', inner: false });
      text(d.quizTitle || `스테이지 ${this.n} 문제`, W / 2, 56, { size: 30, color: '#fff', align: 'center' });
      face(this.n >= 9 ? 'king' : 'daddy');
      textBox(d.quiz, 320, 130, W - 470, 150, { size: 34 });
      const answers = d.answers;
      answers.forEach((a, k) => {
        const x = 150 + (k % 2) * 500, y = 320 + Math.floor(k / 2) * 130;
        if (button(a.t, x, y, 470, 110, { layer: L, size: 32 })) this.answerGate(a);
      });
    } else if (m.type === 'save') {
      const bg = img('sp/' + d.saveBg);
      panel(140, 60, W - 280, 600, { fill: '#2d3a45' });
      if (bg) drawFit(bg, 160, 80, W - 320, 470);
      panel(W / 2 - 260, 560, 520, 76, {});
      textBox(d.saveText, W / 2 - 240, 566, 480, 64, { size: 30 });
      text(`${game.data.hub.spiritNames[this.n - 1]}을(를) 구출했다!  구출 포인트 +${fmt(2 ** (this.n - 1))}`, W / 2, 100, { size: 30, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 6 });
      if (button('확인', W - 330, 570, 160, 60, { layer: L }) || keyHit('Enter', 'Space')) close();
    } else if (m.type === 'guide') {
      panel(100, 50, W - 200, H - 100);
      drawFit(img('daddy'), 120, 70, 200, 200);
      text('게임 방법 안내', 350, 80, { size: 40, color: '#7a3b12' });
      GUIDE.forEach((g, k) => textBox('• ' + g, 350, 130 + k * 76, W - 520, 70, { size: 23, align: 'left' }));
      const icons = [['boy_jump', [160, 0, 80, 80]], ['dokdo_icon', [160, 0, 160, 160]], [null], ['robo_blue', [0, 0, 80, 80]], ['robo_red', [0, 0, 80, 80]], ['daddy_small', [0, 0, 82, 82]]];
      icons.forEach(([n, fr], k) => { if (n) drawFit(img(n), 270, 135 + k * 76, 60, 60, { frame: fr }); });
      const info = d.spirit ? spriteInfo(d.spirit.s) : null; if (info?.im) drawFit(info.im, 270, 135 + 2 * 76, 60, 60);
      if (button('닫기', W - 300, H - 130, 160, 60, { layer: L }) || keyHit('Escape', 'Enter')) close();
    } else if (m.type === 'cheat') {
      panel(170, 150, W - 340, 400);
      text('미션수행', W / 2, 176, { size: 38, align: 'center', color: '#7a3b12' });
      textBox('찾기 어려운 열쇠나 정령을 누르면 그곳으로 데려다 줄게!', 200, 226, W - 400, 50, { size: 24 });
      const items = [...[1, 2, 3].map(k => ({ label: `열쇠${k}`, obj: this.keys.find(q => q.n === k), icon: ['dokdo_icon', [160, 0, 160, 160]] })),
        { label: '정령', obj: this.spirit, icon: null }, { label: '독도아저씨', obj: this.door, icon: [this.n >= 9 ? 'roboking' : 'daddy_small', this.n >= 9 ? [0, 0, 80, 80] : [0, 0, 82, 82]] }];
      items.forEach((it, k) => {
        const x = 220 + k * 172, y = 290;
        const done = !it.obj || it.obj.got || (it.obj === this.door && this.door.open);
        panel(x, y, 150, 170, { fill: done ? '#cfc6b6' : '#fff8ea', r: 10 });
        if (it.icon) drawFit(img(it.icon[0]), x + 25, y + 15, 100, 100, { frame: it.icon[1] });
        else if (d.spirit) { const info = spriteInfo(d.spirit.s); if (info?.im) drawFit(info.im, x + 25, y + 15, 100, 100); }
        text(done ? '완료!' : it.label, x + 75, y + 126, { size: 26, align: 'center' });
        if (!done && hit(x, y, 150, 170, L)) {
          audio.sfx('click');
          const o = it.obj;
          this.p.x = o === this.door ? o.x - 1.6 * Math.sign(this.flag.x - o.x || 1) : o.x;
          this.p.y = o.y + 1.2; this.p.vy = 0; this.p.blink = 1;
          close();
        }
      });
      if (button('닫기', W - 340, 480, 140, 56, { layer: L }) || keyHit('Escape')) close();
    } else if (m.type === 'pause') {
      panel(W / 2 - 230, 180, 460, 360);
      text('잠깐 멈춤', W / 2, 206, { size: 40, align: 'center' });
      if (button('계속하기', W / 2 - 160, 280, 320, 70, { layer: L, size: 30 }) || keyHit('Escape')) close();
      if (button('스테이지 메뉴로', W / 2 - 160, 370, 320, 70, { layer: L, size: 30 })) go(nav.stageSelect());
      if (button(audio.muted ? '소리 켜기' : '소리 끄기', W / 2 - 160, 460, 320, 60, { layer: L, size: 26 })) audio.toggleMute();
    } else if (m.type === 'clear') {
      panel(W / 2 - 330, 150, 660, 420);
      text(`스테이지${this.n} 클리어!`, W / 2, 190, { size: 54, align: 'center', color: '#3d7a2a' });
      textBox(save.rescued[this.n - 1] ? `${game.data.hub.spiritNames[this.n - 1]}도 구했어요!` : '이 스테이지의 정령을 아직 못 구했어요.\n다시 와서 구해 주세요!', W / 2 - 280, 280, 560, 90, { size: 28 });
      textBox(`독도 석상에서 ${this.n}번 정령 퍼즐을 열 수 있어요!`, W / 2 - 280, 370, 560, 60, { size: 24, color: '#5a4a3a' });
      if (this.n < 10 && button('다음 스테이지', W / 2 - 300, 460, 280, 76, { layer: L, size: 30 })) go(nav.stage(this.n + 1));
      if (button('스테이지 메뉴', W / 2 + 20, 460, 280, 76, { layer: L, size: 30 })) go(nav.stageSelect());
    } else if (m.type === 'notpass') {
      panel(110, 190, W - 220, 320); face('daddy');
      textBox(NOT_PASS, 330, 220, W - 480, 180, { size: 30 });
      if (button('스테이지 메뉴로 나간다', W / 2 - 180, 420, 360, 64, { layer: L, size: 28 })) go(nav.stageSelect());
      if (button('조금 더 둘러보기', W / 2 + 200, 420, 260, 64, { layer: L, size: 24 })) close();
    }
  }
  answerGate(a) {
    const d = this.d;
    const ok = this.n === 9 ? a.t === STAGE9_FIX : a.ok;
    if (ok) {
      audio.sfx('good');
      if (this.n === 9) this.modal = { type: 'seq', texts: AMAZING, face: 'king', then: () => this.openDoor() };
      else this.modal = { type: 'msg', text: d.okText, face: 'daddy', then: () => this.openDoor() };
    } else {
      audio.sfx('bad');
      this.modal = { type: 'msg', text: d.wrongText || '다시 공부하고 와라!!!!!', face: this.n >= 9 ? 'king' : 'daddy', then: () => this.respawn() };
    }
  }
}

// ================================================================ 파란 로봇 퀴즈
export class RobotQuizScene {
  constructor(qid, back, onSolved) {
    this.q = game.data.robotQuestions[qid]; this.back = back; this.onSolved = onSolved;
    this.i = 0; this.t = 0; this.state = 'intro'; this.msg = null;
  }
  enter() { audio.play('roboking_battle'); }
  update(dt) {
    this.t += dt;
    if (this.state === 'intro' && this.t > 3.2) { this.t = 0; if (++this.i >= this.q.intro.length) this.state = 'question'; }
  }
  draw() {
    beginUI(0);
    drawCover(img('bg19'), 0, 0, W, H);
    const robot = (txt) => {
      panel(120, 470, W - 240, 200, { fill: 'rgba(235,245,255,.96)', line: '#1f3b5a' });
      drawFit(img('bg17'), 140, 330, 150, 180);
      textBox(txt, 320, 490, W - 480, 160, { size: 36 });
    };
    if (this.state === 'intro') {
      robot(this.q.intro[this.i]);
      if (button('넘기기', W - 220, 20, 190, 60) || keyHit('Space', 'Enter')) { this.state = 'question'; }
      else if (input.clicked && input.clickY > 120) { this.t = 0; if (++this.i >= this.q.intro.length) this.state = 'question'; }
    } else if (this.state === 'question') {
      panel(90, 60, W - 180, 300, { fill: 'rgba(235,245,255,.97)', line: '#1f3b5a' });
      text('문제', W / 2, 80, { size: 30, align: 'center', color: '#1f3b5a' });
      textBox(this.q.question, 130, 120, W - 260, 220, { size: 38 });
      this.q.choices.forEach((c, k) => {
        if (button(c, 120 + k * 360, 400, 320, 200, { size: 34, fill: '#e8f2ff', hoverFill: '#fff' })) {
          if (k === this.q.correct) {
            audio.sfx('good');
            const first = !save.robotQ[this.q.flag];
            this.state = 'right'; this.first = first;
            if (first) {
              save.robotQ[this.q.flag] = true; save.dp += 5;
              const qn = parseInt(this.q.flag.slice(1), 10);
              if (qn >= 1 && qn <= 24) save.creature[qn - 1] = true;
              persist();
            }
            this.onSolved?.();
          } else { audio.sfx('bad'); this.state = 'wrong'; this.msg = this.q.wrong[Math.floor(Math.random() * this.q.wrong.length)]; }
        }
      });
    } else if (this.state === 'wrong') {
      robot(this.msg);
      if (button('다시 풀기', W - 300, 600, 220, 64) || keyHit('Enter', 'Space')) this.state = 'question';
    } else if (this.state === 'right') {
      robot(this.q.right);
      if (this.first) {
        panel(W / 2 - 230, 60, 460, 380, {});
        drawFit(img('card_normal'), W / 2 - 90, 80, 180, 180);
        const qn = parseInt(this.q.flag.slice(1), 10), card = game.data.hub.creatureCards[qn - 1];
        if (card?.pic) drawFit(img('cr_' + card.pic), W / 2 - 55, 112, 110, 110);
        if (card) text(card.quote, W / 2, 236, { size: 22, align: 'center', color: '#5a4a3a' });
        text('생물카드를', W / 2, 270, { size: 40, align: 'center' });
        text('획득했다!!!', W / 2, 330, { size: 40, align: 'center', color: '#c0392b' });
        text('독도 포인트 +5', W / 2, 390, { size: 28, align: 'center', color: '#5a4a3a' });
      }
      if (button('돌아가기', W - 300, 600, 220, 64) || keyHit('Enter', 'Space')) go(this.back);
    }
  }
}
