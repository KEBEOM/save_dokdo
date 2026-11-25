// 달리고 구하고 풀어라!: 스테이지 선택, 달리기(플랫폼) 게임, 파란 로봇 퀴즈
import { W, H, ctx, img, sp, preload, drawCover, drawFit, drawImg, panel, text, textBox, button, hit, input, keyDown, keyHit, save, persist, audio, go, game, fmt, dim, beginUI, ui, inside, clamp } from './core.js';
import { nav, Notice, CardReveal, spiritSquash } from './widgets.js';
import { generateLevel } from './levelgen.js';

const U = 64;                 // 1 유닛 = 64px
const GRAV = 9.81 * 3, JUMP = 12, SPEED = 5, MAXFALL = 22;
const PW = 0.5, PH = 0.62;    // 주인공 충돌 상자 (원래 게임: 반지름 0.3 원)
const ROBOT_R = 0.38;

// 9스테이지 로보킹 문제: 원래 게임 연결에서는 '시마네현 고시'가 정답으로 되어 있었지만,
// 힌트(세종실록지리지)와 사실에 맞게 '세종실록'을 정답으로 고침
const STAGE9_FIX = '세종실록';
const AMAZING = ['이럴 수가... 분명히 로봇 군단을 시켜 \n인간들이 독도에 대한 기억을 잊어버리게 했는데...', '어째서 너는 이렇게 독도에 \n대해 잘 알고 있는 거지?', '좋다... 재밌군... \n그렇다면 다음 스테이지로 넘어와라.', '나를 다시 찾아온다면 독도를 걸고 승부하자. 기다리고 있겠다...'];
// 9스테이지에서 로보킹을 처음 만났을 때 (원작 대사)
const KING_MEET = ['오호..너는 누구냐..', '나는 로봇들의 왕\n로보킹이다.', '너의 실력을 확인해볼 겸 \n문제를 내보겠다.'];
const KING_GATE = ['여기까지 오다니 대단하다. 독도를 걸고 승부를 해보자.', '대결할 준비가 되었다면 문을 열고 들어와라. 나는 준비하고 있겠다.'];
const NOT_PASS = '자네에게 정령들의 기운이 충분히 느껴지지 않는군..\n정령들을 모두 구출하고 도전하는것이 좋다네...\n다른 스테이지에 두고온 정령들을 살펴보고 오게나..';
const GUIDE = ['점프 버튼을 공중에서 한 번 더 누르면 더블 점프! 높은 발판도 올라갈 수 있다!', '노란 테두리 발판은 움직인다! 올라타서 높은 곳이나 먼 곳으로 건너가자!', '열쇠를 획득해라! 열쇠를 얻으면 스테이지 해결에 필요한 힌트도 제공한다! 획득한 열쇠를 클릭하면 획득한 힌트를 다시 볼 수 있다!', '섬 곳곳에 숨어있는 정령들을 구출해라!', '파란로봇 중에는 문제를 내는 녀석들도 있다!!', '로봇에게 닿으면 처음 장소로 돌아오니 주의해라!', '초록 로봇은 구겨진 종이를 던진다! 종이에 맞아도 처음 장소로 돌아간다!', '아래 방향키(↓)나 ▼ 버튼을 누르고 있으면 아래쪽을 내려다볼 수 있다!', '나를 찾아와 문제를 풀고 다음 스테이지로 넘어가라!'];

function mix(a, b, f) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * f).toString(16).padStart(2, '0')).join('');
}
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
      if (save.rescued[i]) drawFit(img('water_icon'), x + 116, y - 10, 52, 52, { frame: [0, 0, 160, 160] });
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
    const orig = game.data.stages[n - 1];
    const d = { ...orig, ...generateLevel(orig, n) };   // 들어갈 때마다 새로 만드는 랜덤 맵
    this.d = d;
    this.diff = (n - 1) / 9;
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
    this.robots = d.robots.map((r, i) => ({ ...r, i, sx0: r.x, sy0: r.y, vx: r.walk ? (r.flip ? 1 : -1) * (r.speed || 1) : 0, vy: 0, t: Math.random() * 3, jt: 0.5 + Math.random() * 1.5, solved: false, tt: 1.5 + Math.random() * 2 }));
    this.stones = [];
    this.look = 0;     // 아래 내려다보기 (0~1)
    // 날씨: 1스테이지는 맑음, 그 뒤로는 들어올 때마다 맑음·비·눈 중 하나
    const wr = Math.random();
    this.weather = n === 1 ? 'clear' : wr < 0.4 ? 'clear' : wr < 0.7 ? 'rain' : 'snow';
    this.drops = Array.from({ length: this.weather === 'rain' ? 170 : this.weather === 'snow' ? 130 : 0 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.3 }));
    this.splash = [];
    // 하늘 구름 (하늘색과 같은 빛으로 물듦)
    this.clouds = Array.from({ length: 7 }, (_, k) => ({ x: k * 360 + Math.random() * 200, y: 40 + Math.random() * 260, s: 0.7 + Math.random() * 0.7, v: 4 + Math.random() * 6 }));
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
    // 움직이는 발판 (엘리베이터·나룻배)
    this.movers = (d.movers || []).map(m => ({ ...m, x: m.x0, y: m.top - 1, w: m.w, h: 1, t: m.phase / ((m.speed * Math.PI) / Math.max(m.ax, m.ay)) }));
    for (const m of this.movers) this.placeMover(m);
    this.spirit = d.spirit && !save.rescued[n - 1] ? { ...d.spirit, got: false } : null;
    this.door = { ...d.door, open: false };
    this.flag = d.flag;
    this.p = { lastGround: this.start[1], x: this.start[0], y: this.start[1], vx: 0, vy: 0, ground: false, coyote: 0, buffer: 0, airJumps: 1, puff: 0, face: 1, anim: 0, blink: 0 };
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
    preload([...keys].map(k => 'sp/' + k).concat(['boy_stand', 'boy_walk', 'boy_jump', 'robo_red', 'robo_green', 'robo_blue', 'roboking', 'dokdo_icon', 'daddy_small', 'dp', 'stagebg'])).then(() => { this.ready = true; });
  }
  enter() {
    audio.play(this.n >= 9 ? 'child_adventure' : this.n >= 7 ? 'daddy_reveal' : this.n >= 4 ? 'robot_attack' : 'protect_dokdo');
    if (this.returnFromQuiz) { this.returnFromQuiz = false; }
  }
  get busy() { return !this.ready || !!this.modal || this.notice.open; }

  // ---------------------------------------------------------------- 물리
  collide(box, list) { for (const s of list) if (box.x < s.x + s.w && box.x + box.w > s.x && box.y < s.y + s.h && box.y + box.h > s.y) return s; return null; }
  pbox(p = this.p) { return { x: p.x - PW / 2, y: p.y - 0.38, w: PW, h: PH }; }
  solidList() {
    const list = this.movers.length ? [...this.solids, ...this.movers] : this.solids;
    return this.door && !this.door.open && this.door.box ? [...list, { x: this.door.box[0], y: this.door.box[1], w: this.door.box[2], h: this.door.box[3], door: true }] : list;
  }
  // 움직이는 발판: 양 끝에서 천천히 멈췄다 돌아오는 왕복 운동
  placeMover(m) {
    const range = Math.max(m.ax, m.ay), w = (m.speed * Math.PI) / range;
    const f = 0.5 - 0.5 * Math.cos(m.t * w);
    m.x = m.x0 + m.ax * f; m.y = m.top - 1 + m.ay * f;
  }
  updateMovers(dt) {
    const p = this.p;
    const feet = p.y - 0.38;
    for (const m of this.movers) {
      const ox = m.x, oy = m.y;
      const riding = p.vy <= 0.01 && Math.abs(feet - (m.y + m.h)) < 0.08 && p.x + PW / 2 > m.x && p.x - PW / 2 < m.x + m.w;
      m.t += dt; this.placeMover(m);
      const dx = m.x - ox, dy = m.y - oy;
      if (riding) { p.x += dx; p.y += dy; continue; }
      // 타고 있지 않은데 발판이 주인공을 밀면 밖으로 밀어내기
      const b = this.pbox();
      if (this.collide(b, [m])) {
        const pushUp = (m.y + m.h) - b.y, pushDown = (b.y + b.h) - m.y, pushL = (b.x + b.w) - m.x, pushR = (m.x + m.w) - b.x;
        const k = Math.min(pushUp, pushDown, pushL, pushR);
        if (k === pushUp) { p.y += pushUp + 1e-3; p.vy = Math.max(p.vy, 0); } else if (k === pushDown) { p.y -= pushDown + 1e-3; p.vy = Math.min(p.vy, 0); }
        else if (k === pushL) p.x -= pushL + 1e-3; else p.x += pushR + 1e-3;
      }
    }
  }
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
    this.updateMovers(dt);
    const left = keyDown('ArrowLeft', 'KeyA') || this.touch.left;
    const right = keyDown('ArrowRight', 'KeyD') || this.touch.right;
    const jumpHit = keyHit('Space', 'ArrowUp', 'KeyW') || this.touch.jumpHit;
    const lookDown = keyDown('ArrowDown', 'KeyS') || this.touch.down;
    this.look += ((lookDown ? 1 : 0) - this.look) * Math.min(1, dt * (lookDown ? 3 : 6));
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
    if (p.ground) { p.coyote = 0.1; p.airJumps = 1; p.lastGround = p.y; }
    if (r.hitX && r.hitX.door) this.touchDoor();
    p.x = clamp(p.x, this.bounds.l, this.bounds.r);
    p.anim += dt;
    if (p.blink > 0) p.blink -= dt;
    if (p.puff > 0) p.puff -= dt;
    // 떨어지거나 죽는 땅에 닿으면 처음 자리로
    // 맨 아래로 떨어지거나, 마지막으로 서 있던 곳보다 한참(16칸) 아래로 떨어지면 체크포인트로
    if (p.y < this.bounds.b - 3 || p.y < p.lastGround - 16 || this.collide(this.pbox(), this.deadly)) this.respawn();

    // 로봇
    for (const rb of this.robots) {
      rb.t += dt;
      rb.vy = Math.max(-MAXFALL, rb.vy - GRAV * dt);
      const box = o => ({ x: o.x - ROBOT_R, y: o.y - ROBOT_R, w: ROBOT_R * 2, h: ROBOT_R * 2 });
      const res = this.moveBody(rb, rb.vx * dt, rb.vy * dt, box, this.solids);
      if (res.landed || res.bumped) rb.vy = 0;
      // 파란 로봇은 가끔 폴짝 뛰어오름 (스테이지가 오를수록 자주, 높이)
      if (rb.blue && !rb.solved && res.landed) {
        rb.jt -= dt;
        if (rb.jt <= 0) {
          rb.jt = 0.45 + Math.random() * 0.9;                       // 예전보다 약 2배 자주
          if (Math.random() < Math.min(0.92, 0.6 + 0.035 * this.n)) { rb.vy = 7 + Math.random() * (2 + 0.35 * this.n); rb.hop = 0.25; }
        }
      }
      if (rb.hop > 0) rb.hop -= dt;
      // 초록 로봇: 주인공이 가까우면 멈춰서 돌을 던짐
      if (rb.green && !(rb.appear > 0)) {
        const dx = p.x - rb.x, dy = p.y - rb.y;
        if (rb.wind > 0) {
          rb.wind -= dt; rb.look = Math.sign(dx) || 1;
          if (rb.wind <= 0) { this.throwStone(rb); rb.vx = rb.saveVx; }
        } else {
          rb.tt -= dt;
          if (rb.tt <= 0 && Math.abs(dx) < 11 && Math.abs(dy) < 7 && p.blink <= 0) {
            rb.wind = 0.45; rb.saveVx = rb.vx || rb.saveVx; rb.vx = 0; rb.tt = Math.max(1.1, 2.6 - 0.12 * this.n) + Math.random() * 1.2;
          }
        }
      }
      if (rb.walk && rb.vx) {
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
    // 초록 로봇이 던진 구겨진 종이
    for (const st of this.stones) {
      st.t += dt; st.vy -= GRAV * 0.55 * dt; st.x += st.vx * dt; st.y += st.vy * dt; st.rot += st.vx * dt * 3;
      const b = { x: st.x - 0.16, y: st.y - 0.16, w: 0.32, h: 0.32 };
      if (this.collide(b, this.solids) || this.collide(b, this.movers) || st.y < this.bounds.b - 6 || st.t > 4) { st.dead = true; if (st.t < 4) { audio.sfx('thud'); this.splash.push({ x: st.x, y: st.y, t: 0.3, paper: true }); } continue; }
      if (p.blink <= 0 && Math.abs(st.x - p.x) < 0.38 && Math.abs(st.y - (p.y - 0.07)) < 0.45) { st.dead = true; audio.sfx('hurt'); this.respawn(); }
    }
    this.stones = this.stones.filter(s => !s.dead);
    // 독도 포인트
    for (const c of this.coins) {
      if (!c.got && Math.abs(c.x - p.x) < 0.55 && Math.abs(c.y - (p.y - 0.08)) < 0.6) { c.got = true; save.dp += 3; persist(); audio.sfx('coin'); }
    }
    // 열쇠
    for (const k of this.keys) {
      if (!k.got && Math.abs(k.x - p.x) < 0.7 && Math.abs(k.y - (p.y - 0.08)) < 0.8) { k.got = true; this.start = [k.x, k.y - 0.25]; audio.sfx('key'); this.modal = { type: 'key', n: k.n, checkpoint: true }; }
    }
    // 정령
    const s = this.spirit;
    if (s && !s.got) {
      const info = spriteInfo(s.s); const half = info ? Math.max(info.w * Math.abs(s.sx), 0.8) / 2 : 0.6;
      if (Math.abs(s.x - p.x) < half + 0.2 && Math.abs(s.y - p.y) < half + 0.3) {
        s.got = true; save.rescued[this.n - 1] = true; save.dp += 10; persist();
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
    this.cam.y += (p.y + 1 - 6 * this.look - this.cam.y) * Math.min(1, dt * 8);   // ↓를 누르면 6칸 아래까지
    const minX = this.bounds.l - 2 + vw / 2, maxX = this.bounds.r + 2 - vw / 2;
    this.cam.x = minX > maxX ? (minX + maxX) / 2 : clamp(this.cam.x, minX, maxX);
    const minY = this.bounds.b - 3 + vh / 2, maxY = this.bounds.t + 2 - vh / 2;
    this.cam.y = minY > maxY ? (minY + maxY) / 2 : clamp(this.cam.y, minY, maxY);
  }
  readTouch() {
    // 화면 아래 이동 버튼 (여러 손가락 동시 터치)
    this.touch.left = this.touch.right = this.touch.down = false;
    let jumpNow = false;
    if (!this.busy) for (const pt of input.pointers.values()) {
      if (inside(pt.x, pt.y, 20, H - 160, 140, 140)) this.touch.left = true;
      if (inside(pt.x, pt.y, 170, H - 160, 140, 140)) this.touch.right = true;
      if (inside(pt.x, pt.y, W - 190, H - 170, 170, 150)) jumpNow = true;
      if (inside(pt.x, pt.y, W - 160, H - 300, 110, 110)) this.touch.down = true;
    }
    this.touch.jumpHit = jumpNow && !this.touch.jumpHeld;
    this.touch.jumpHeld = jumpNow;
  }
  // 구겨진 종이 뭉치 (울퉁불퉁한 흰 공 + 접힌 주름)
  drawPaper(x, y, rot, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const pts = [[-11, -3], [-7, -10], [0, -12], [6, -9], [12, -4], [10, 5], [5, 11], [-3, 10], [-10, 6]];
    ctx.fillStyle = '#f6f1e4'; ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a9a294'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-1, -1); ctx.lineTo(6, -6); ctx.moveTo(-1, -1); ctx.lineTo(-2, 8); ctx.moveTo(-1, -1); ctx.lineTo(9, 3); ctx.moveTo(-9, 3); ctx.lineTo(-4, 4); ctx.stroke();
    ctx.restore();
  }
  throwStone(rb) {
    const p = this.p, g = GRAV * 0.55;
    const tx = p.x + (Math.random() - 0.5) * 1.2 + p.vx * 0.25, ty = p.y + (Math.random() - 0.5) * 0.6;
    const sx = rb.x + rb.look * 0.3, sy = rb.y + 0.45;
    const dx = tx - sx, dy = ty - sy;
    const T = clamp(Math.abs(dx) / 7, 0.55, 1.3);
    this.stones.push({ x: sx, y: sy, vx: dx / T, vy: (dy + 0.5 * g * T * T) / T, t: 0, rot: 0 });
    audio.sfx('throw');
  }
  respawn() {
    const p = this.p;
    p.x = this.start[0]; p.y = this.start[1]; p.vx = p.vy = 0; p.blink = 1.2; p.lastGround = p.y;
  }
  touchDoor() {
    if (this.modal) return;
    const d = this.d;
    if (!this.keys.some(k => k.got)) { this.modal = { type: 'msg', text: d.noKeyText === '...... ....... ....... ....... .......' ? d.noKeyText : '열쇠를 얻어와라!!!!!', face: this.n >= 9 ? 'king' : 'daddy' }; this.p.x -= 0.4 * Math.sign(this.door.x - this.p.x || 1); return; }
    if (this.n === 10) { this.modal = { type: 'seq', texts: KING_GATE, face: 'king', then: () => this.openDoor() }; return; }
    if (this.n === 9 && !this.kingMet) { this.kingMet = true; this.modal = { type: 'seq', texts: KING_MEET, face: 'king', then: () => { this.modal = { type: 'quiz', picked: null }; } }; return; }
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
    // 하늘과 배경: 스테이지가 오를수록 노을이 짐
    const dd = this.diff;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mix('#7cc6f0', '#4a3a7c', dd));
    sky.addColorStop(0.55, mix('#a9dcf3', '#e8735a', dd));
    sky.addColorStop(1, mix('#d4eef8', '#ffc078', dd));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (dd > 0.25) {
      // 지는 해
      const sy = 120 + dd * 330 - clamp((this.cam.y - this.bounds.b) * 4, 0, 120);
      const g = ctx.createRadialGradient(980, sy, 10, 980, sy, 220);
      g.addColorStop(0, `rgba(255,236,170,${0.9 * dd})`); g.addColorStop(0.25, `rgba(255,170,90,${0.6 * dd})`); g.addColorStop(1, 'rgba(255,140,80,0)');
      ctx.fillStyle = g; ctx.fillRect(700, sy - 230, 560, 460);
      ctx.fillStyle = `rgba(255,224,150,${dd})`; ctx.beginPath(); ctx.arc(980, sy, 46, 0, Math.PI * 2); ctx.fill();
    }
    this.drawClouds(dd);
    const bg = img('stagebg');
    if (bg) {
      const bw = 1600, bh = bw * bg.height / bg.width;
      const ox = -((this.cam.x * 12) % bw + bw) % bw;
      ctx.globalAlpha = 0.75;
      for (let k = -1; k < 3; k++) ctx.drawImage(bg, ox + k * bw, H - bh + clamp((this.cam.y - this.bounds.b) * 6, 0, 200), bw, bh);
      ctx.globalAlpha = 1;
      // 노을빛으로 물들이기
      if (dd > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = mix('#ffffff', '#ff9a70', dd * 0.85); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    }
    for (const t of this.tiles) if (!t.p.deadly) this.drawWorldSprite(spriteInfo(t.p.s), t.p.x, t.p.y, t.p.sx, t.p.sy);
    // 움직이는 발판: 지나가는 길을 점선으로 보여 주고 발판은 노란 테두리로
    for (const m of this.movers) {
      const [ax, ay] = this.w2s(m.x0 + m.w / 2, m.top - 0.5), [bx, by] = this.w2s(m.x0 + m.ax + m.w / 2, m.top - 0.5 + m.ay);
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 4; ctx.setLineDash([10, 12]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.restore();
      for (let k = 0; k < m.w; k++) {
        const s = m.w === 1 ? 'Platforms__Single' : k === 0 ? 'Platforms__Single_Left' : k === m.w - 1 ? 'Platforms__Single_Right' : 'Platforms__Single';
        this.drawWorldSprite(spriteInfo(s), m.x + k + 0.5, m.y + 0.5, 1, 1);
      }
      const [px, py] = this.w2s(m.x, m.y + 1);
      ctx.save(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.strokeRect(px + 2, py + 2, m.w * U - 4, U - 4); ctx.restore();
    }
    for (const dc of this.d.deco) if (!dc.bg && dc.s) this.drawWorldSprite(spriteInfo(dc.s), dc.x, dc.y, dc.sx, dc.sy);
    // 깃발과 문지기
    if (this.flag) this.drawWorldSprite(spriteInfo(this.flag.s), this.flag.x, this.flag.y, this.flag.sx, this.flag.sy);
    if (this.door) {
      const king = this.n >= 9;
      const fr = Math.floor(this.t * 2) % 2;
      this.drawSheet(king ? 'roboking' : 'daddy_small', king ? [fr * 81, 0, 80, 80] : [fr * 82, 0, 82, 82], this.door.x, this.door.y, 1.85, king ? this.p.x > this.door.x : this.p.x < this.door.x, this.door.open ? 0.45 : 1);
      if (!this.door.open) {
        const [px, py] = this.w2s(this.door.x, this.door.y + 1.5);
        if (px > -100 && px < W + 100) { panel(px - 34, py - 30, 68, 40, { r: 8, inner: false, lw: 3 }); text('?', px, py - 26, { size: 30, align: 'center', color: '#c0392b' }); }
      }
    }
    for (const c of this.coins) if (!c.got) this.drawSheet('dp', null, c.x, c.y + Math.sin(this.t * 4 + c.i) * 0.06, 0.6);
    for (const k of this.keys) if (!k.got) this.drawSheet('dokdo_icon', [Math.floor(this.t * 3) % 2 * 160, 0, 160, 160], k.x, k.y + Math.sin(this.t * 3 + k.n) * 0.1, 0.95);
    if (this.spirit && !this.spirit.got) {
      const s = this.spirit;
      // 원작 정령 몸짓(가만히 있을 때)으로 살짝 납작해졌다 돌아옴 (발바닥 기준)
      const info = spriteInfo(s.s), [qx, qy] = spiritSquash(this.t, false);
      const hh = info ? info.h * Math.abs(s.sy) : 1;
      this.drawWorldSprite(info, s.x, s.y - hh * (1 - qy) / 2, s.sx * qx, s.sy * qy);
      const [px, py] = this.w2s(s.x, s.y + 1);
      text('!', px, py - 20 + Math.sin(this.t * 6) * 4, { size: 34, align: 'center', color: '#ffe066', stroke: '#2b2b2b', strokeW: 6 });
    }
    for (const rb of this.robots) {
      const blue = rb.blue;
      const fr = Math.floor(rb.t * (rb.walk ? 8 : 5)) % 8;
      const frame = blue ? [fr * 81, 0, 80, 80] : [fr * 80, 0, 80, 80];
      const facingRight = rb.wind > 0 ? rb.look > 0 : rb.vx > 0;
      if (rb.wind > 0) { const [wx, wy] = this.w2s(rb.x + rb.look * 0.35, rb.y + 0.7); this.drawPaper(wx, wy, this.t * 2, 0.9); }
      this.drawSheet(blue ? 'robo_blue' : rb.green ? 'robo_green' : 'robo_red', frame, rb.x, rb.y + 0.02, rb.hop > 0 ? 0.95 * (1 + rb.hop * 0.4) : 0.95, facingRight, rb.solved ? 0.35 : (rb.appear > 0 ? (Math.floor(rb.appear * 10) % 2 ? 0.2 : 0.8) : 1));
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
    for (const st of this.stones) {
      const [sx, sy] = this.w2s(st.x, st.y);
      this.drawPaper(sx, sy, st.rot, 1);
    }
    if (dd > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = mix('#ffffff', '#ffc4a0', dd * 0.7); ctx.fillRect(0, 0, W, H); ctx.restore(); }
    this.drawWeather();
    if (!this.ready) {
      ctx.fillStyle = 'rgba(27,43,54,.85)'; ctx.fillRect(0, 0, W, H);
      text(`스테이지${this.n}`, W / 2, H / 2 - 70, { size: 60, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 10 });
      text('맵을 불러오는 중…', W / 2, H / 2 + 20, { size: 32, align: 'center', color: '#f4e3c3' });
      return;
    }
    this.drawHUD(layer);
    this.drawMinimap();
    if (this.modal) this.drawModal();
    this.notice.draw(2);
  }
  // 비·눈: 화면 위에 그리는 알갱이 (카메라가 움직이면 같이 밀림)
  drawWeather() {
    const dt = 1 / 60, wx = this.weather;
    const camDx = (this.cam.x - (this.lastCam?.x ?? this.cam.x)) * U, camDy = (this.cam.y - (this.lastCam?.y ?? this.cam.y)) * U;
    this.lastCam = { x: this.cam.x, y: this.cam.y };
    for (const s of this.splash) s.t -= dt;
    this.splash = this.splash.filter(s => s.t > 0);
    for (const s of this.splash) {
      const [sx, sy] = this.w2s(s.x, s.y);
      ctx.strokeStyle = s.paper ? `rgba(240,235,220,${s.t * 3})` : `rgba(220,235,255,${s.t * 3})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx, sy, (0.3 - s.t) * 60 + 4, (0.3 - s.t) * 14 + 2, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (wx === 'clear') return;
    ctx.save();
    if (wx === 'rain') {
      ctx.fillStyle = 'rgba(40,60,90,.18)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(210,225,255,.55)'; ctx.lineWidth = 2; ctx.beginPath();
      for (const d of this.drops) {
        if (!this.busy) { d.x += -130 * d.s * dt - camDx; d.y += 900 * d.s * dt + camDy; }
        if (d.y > H) { d.y -= H + 20; d.x = Math.random() * (W + 200); }
        if (d.x < -20) d.x += W + 40; else if (d.x > W + 220) d.x -= W + 40;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 5 * d.s, d.y - 22 * d.s);
      }
      ctx.stroke();
      // 화면에 보이는 발판 위에 톡톡 튀는 물보라
      if (!this.busy && Math.random() < 0.5) {
        const vx0 = this.cam.x - W / U / 2, vx1 = this.cam.x + W / U / 2, vy0 = this.cam.y - H / U / 2, vy1 = this.cam.y + H / U / 2;
        const t = this.solids[Math.floor(Math.random() * this.solids.length)];
        if (t && t.x > vx0 && t.x < vx1 && t.y + t.h > vy0 && t.y + t.h < vy1) this.splash.push({ x: t.x + Math.random(), y: t.y + t.h, t: 0.25 });
      }
    } else {
      ctx.fillStyle = 'rgba(230,240,255,.12)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (const d of this.drops) {
        if (!this.busy) { d.ph += dt * 1.5; d.x += Math.sin(d.ph) * 30 * dt - 15 * dt - camDx * 0.9; d.y += 60 * d.s * dt + camDy * 0.9; }
        if (d.y > H + 10) { d.y -= H + 20; d.x = Math.random() * W; } else if (d.y < -10) d.y += H + 20;
        if (d.x < -10) d.x += W + 20; else if (d.x > W + 10) d.x -= W + 20;
        ctx.beginPath(); ctx.arc(d.x, d.y, 2 + 2.5 * d.s, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  // 픽셀 구름: 원작 배경의 구름 모양을 흉내 낸 네모 조각들, 하늘 그라데이션과 같은 색감으로
  drawClouds(dd) {
    const base = this.weather === 'rain' ? mix('#b8c0c8', '#9a8a8e', dd) : this.weather === 'snow' ? mix('#f4f7fb', '#e8d8dc', dd) : mix('#ffffff', '#ffc2a0', dd);
    const shade = this.weather === 'rain' ? mix('#9aa3ad', '#7a6a72', dd) : mix('#dceef8', '#f09a80', dd);
    const shape = [[3, 0, 3, 1], [2, 1, 6, 1], [1, 2, 9, 1], [0, 3, 13, 2]];
    const span = 7 * 360;
    ctx.save(); ctx.globalAlpha = this.weather === 'rain' ? 0.9 : 0.85;
    for (const c of this.clouds) {
      const u = 10 * c.s;
      let x = ((c.x + this.t * c.v - this.cam.x * U * 0.08) % span + span) % span - 300;
      const y = c.y + clamp((this.cam.y - this.bounds.b) * 3, 0, 120);
      for (const [bx, by, bw, bh] of shape) {
        ctx.fillStyle = base; ctx.fillRect(Math.round(x + bx * u), Math.round(y + by * u), Math.round(bw * u), Math.round(bh * u));
      }
      ctx.fillStyle = shade; ctx.fillRect(Math.round(x), Math.round(y + 4.4 * u), Math.round(13 * u), Math.round(0.6 * u));
    }
    ctx.restore();
  }
  drawMinimap() {
    const x = W - 270, y = 78, w = 250, h = 130;
    // 맵이 길면 주인공 주변 70칸만 보여 줌
    const b = this.bounds, span = Math.min(70, b.r - b.l + 2);
    const L = clamp(this.p.x - span / 2, b.l - 1, Math.max(b.l - 1, b.r + 1 - span)), R = L + span;
    const sc = w / span, vspan = h / sc;
    const T = clamp(this.p.y + vspan / 2, b.b - 1 + vspan, Math.max(b.t, b.b - 1 + vspan)), B = T - vspan;
    const mx = v => x + (w - (R - L) * sc) / 2 + (v - L) * sc, my = v => y + (h - (T - B) * sc) / 2 + (T - v) * sc;
    ctx.save();
    panel(x - 8, y - 6, w + 16, h + 12, { r: 8, fill: 'rgba(250,240,220,.85)', inner: false, lw: 3 });
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = '#7a5a3a';
    for (const s of this.solids) ctx.fillRect(mx(s.x), my(s.y + s.h), Math.max(1.5, s.w * sc), Math.max(1.5, 0.6 * sc));
    ctx.fillStyle = '#e0a800';
    for (const m of this.movers) ctx.fillRect(mx(m.x), my(m.y + m.h), Math.max(1.5, m.w * sc), Math.max(1.5, 0.6 * sc));
    const dot = (px, py, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(mx(px), my(py), r, 0, Math.PI * 2); ctx.fill(); };
    for (const rb of this.robots) if (rb.q && !rb.solved) dot(rb.x, rb.y, 3, '#3b8ede'); else if (rb.green) dot(rb.x, rb.y, 2.5, '#27ae60'); else if (!rb.blue) dot(rb.x, rb.y, 2, '#c0392b');
    for (const k of this.keys) if (!k.got) dot(k.x, k.y, 3.5, '#e0a800');
    if (this.spirit && !this.spirit.got) dot(this.spirit.x, this.spirit.y, 4, '#2ecc71');
    if (this.door) dot(this.door.x, this.door.y, 4, this.door.open ? '#999' : '#8e44ad');
    if (this.flag) dot(this.flag.x, this.flag.y, 3.5, '#e74c3c');
    const blink = Math.floor(this.t * 4) % 2;
    dot(this.p.x, this.p.y, blink ? 4.5 : 3.5, '#fff'); dot(this.p.x, this.p.y, blink ? 3 : 2.5, '#d35400');
    // 카메라가 보는 범위
    ctx.strokeStyle = 'rgba(58,47,40,.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(mx(this.cam.x - W / U / 2), my(this.cam.y + H / U / 2), (W / U) * sc, (H / U) * sc);
    ctx.restore();
  }
  drawHUD(layer) {
    const d = this.d;
    panel(14, 12, 190, 52, { r: 8, inner: false });
    text(`스테이지${this.n}`, 109, 20, { size: 30, align: 'center' });
    panel(214, 12, 170, 52, { r: 8, inner: false }); drawFit(img('dp'), 220, 16, 44, 44); text(fmt(save.dp), 372, 22, { size: 28, align: 'right' });
    if (this.weather !== 'clear') { panel(394, 12, 130, 52, { r: 8, inner: false, fill: this.weather === 'rain' ? '#d6e4f0' : '#f4f8ff' }); text(this.weather === 'rain' ? '비 오는 날' : '눈 오는 날', 459, 24, { size: 24, align: 'center', color: '#2b3a4a' }); }
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
    if (button('가이드', W - 280, 12, 120, 56, { size: 24 })) this.modal = { type: 'guide' };
    if (button('메뉴', W - 150, 12, 130, 56, { size: 26 }) || (keyHit('Escape') && layer === 0)) this.modal = { type: 'pause' };
    // 터치 버튼
    if (input.touch) {
      const a = 0.55;
      ctx.globalAlpha = a;
      panel(20, H - 160, 140, 140, { r: 70, inner: false, fill: this.touch.left ? '#fff' : '#f4e3c3' }); text('◀', 90, H - 118, { size: 56, align: 'center' });
      panel(170, H - 160, 140, 140, { r: 70, inner: false, fill: this.touch.right ? '#fff' : '#f4e3c3' }); text('▶', 240, H - 118, { size: 56, align: 'center' });
      panel(W - 190, H - 170, 170, 150, { r: 75, inner: false, fill: this.touch.jumpHeld ? '#fff' : '#f4e3c3' }); text('점프', W - 105, H - 118, { size: 40, align: 'center' });
      panel(W - 160, H - 300, 110, 110, { r: 55, inner: false, fill: this.touch.down ? '#fff' : '#f4e3c3' }); text('▼', W - 105, H - 268, { size: 44, align: 'center' });
      ctx.globalAlpha = 1;
    } else {
      text('←/→ 이동 · Space/↑ 점프 (공중에서 한 번 더: 더블 점프) · ↓ 아래 보기', 20, H - 40, { size: 20, color: '#fff', stroke: 'rgba(0,0,0,.55)', strokeW: 4 });
    }
  }
  drawModal() {
    const m = this.modal, d = this.d, L = 1;
    dim(0.5);
    const close = () => { this.modal = null; };
    const face = (f, x = 130, y = 230, sz = 170) => drawFit(img(f === 'king' ? 'roboking' : 'daddy4'), x, y, sz, sz, f === 'king' ? { frame: [0, 0, 80, 80] } : {});
    if (m.type === 'key') {
      panel(140, 170, W - 280, 380);
      panel(170, 140, 230, 56, { fill: '#3a2f28', line: '#f4e3c3', inner: false });
      text(`정령의 힌트${m.n}`, 285, 150, { size: 30, color: '#fff', align: 'center' });
      const info = d.spirit ? spriteInfo(d.spirit.s) : null;
      if (info?.im) drawFit(info.im, 180, 240, 200, 200);
      textBox(d.hints[m.n - 1], 410, 210, W - 600, 230, { size: 30 });
      if (m.checkpoint) text('★ 이제 떨어지면 이 자리에서 다시 시작해요', W / 2, 440, { size: 22, align: 'center', color: '#7a5a3a' });
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
      // 위: 얼굴 + 문제, 아래: 보기 4개 (서로 겹치지 않게)
      panel(130, 120, 160, 160, { fill: '#fff8ea', r: 12, inner: false });
      face(this.n >= 9 ? 'king' : 'daddy', 140, 130, 140);
      textBox(d.quiz, 320, 120, W - 450, 160, { size: 34 });
      const answers = d.answers;
      answers.forEach((a, k) => {
        const x = 130 + (k % 2) * 520, y = 320 + Math.floor(k / 2) * 140;
        if (button(a.t, x, y, 500, 116, { layer: L, size: 32 })) this.answerGate(a);
      });
    } else if (m.type === 'save') {
      const bg = img('sp/' + d.saveBg);
      // 위: 제목, 가운데: 그림, 아래: 정령의 말 + 확인
      panel(140, 34, W - 280, 652, { fill: '#2d3a45' });
      text(`${game.data.hub.spiritNames[this.n - 1]}을(를) 구출했다!`, W / 2, 50, { size: 34, align: 'center', color: '#ffe066', stroke: '#2b2b2b', strokeW: 6 });
      text('독도 포인트 +10', W / 2, 94, { size: 24, align: 'center', color: '#fff' });
      if (bg) drawFit(bg, 170, 134, W - 340, 430);
      panel(200, 584, W - 590, 76, {});
      textBox(d.saveText, 220, 590, W - 630, 64, { size: 30 });
      if (button('확인', W - 370, 592, 170, 62, { layer: L, size: 28 }) || keyHit('Enter', 'Space')) close();
    } else if (m.type === 'guide') {
      panel(100, 30, W - 200, H - 60);
      drawFit(img('daddy_small'), 140, 44, 64, 64, { frame: [0, 0, 82, 82] });
      text('게임 방법 안내', 216, 56, { size: 40, color: '#7a3b12' });
      // 한 줄에 그림 하나 + 설명 하나
      const icons = [['boy_jump', [160, 0, 80, 80]], ['mover'], ['dokdo_icon', [160, 0, 160, 160]], ['spirit'], ['robo_blue', [0, 0, 80, 80]], ['robo_red', [0, 0, 80, 80]], ['robo_green', [0, 0, 80, 80]], ['down'], ['daddy_small', [0, 0, 82, 82]]];
      GUIDE.forEach((g, k) => {
        const y = 114 + k * 55;
        ctx.fillStyle = k % 2 ? 'rgba(122,59,18,.06)' : 'rgba(122,59,18,.12)'; ctx.fillRect(130, y, W - 260, 51);
        const [n, fr] = icons[k] || [];
        if (n === 'mover') { const t = spriteInfo('Platforms__Single'); if (t?.im) drawFit(t.im, 148, y + 9, 40, 32); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.strokeRect(148, y + 9, 40, 32); }
        else if (n === 'spirit') { const info = d.spirit ? spriteInfo(d.spirit.s) : null; if (info?.im) drawFit(info.im, 143, y + 2, 50, 47); }
        else if (n === 'down') text('▼', 168, y + 6, { size: 34, align: 'center', color: '#7a3b12' });
        else if (n) drawFit(img(n), 143, y + 2, 50, 47, { frame: fr });
        textBox(g, 214, y + 1, W - 360, 49, { size: 21, align: 'left' });
      });
      if (button('닫기', W / 2 - 90, H - 98, 180, 56, { layer: L }) || keyHit('Escape', 'Enter')) close();
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
    this.reveal = new CardReveal();
  }
  enter() { audio.play('roboking_battle'); }
  update(dt) {
    this.t += dt;
    this.reveal.update(dt);
    if (this.state === 'intro' && this.t > 3.2) { this.t = 0; if (++this.i >= this.q.intro.length) this.state = 'question'; }
  }
  draw() {
    const L = this.reveal.open ? 1 : 0;
    beginUI(L);
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
            this.state = 'right';
            // 맞힐 때마다 보상 하나: 독도 포인트(70%) 또는 아직 없는 생물 카드(30%)
            //   카드를 다 모았으면 항상 독도 포인트
            save.robotQ[this.q.flag] = true;
            const cards = game.data.hub.creatureCards;
            const missing = cards.map((c, i) => i).filter(i => !save.creature[i]);
            if (missing.length && Math.random() < 0.3) {
              const ci = missing[Math.floor(Math.random() * missing.length)], card = cards[ci];
              save.creature[ci] = true; persist();
              this.reveal.show({ pic: card.pic, frame: card.frame, kind: '보상', name: card.quote, extra: '새 생물 카드!' });
            } else {
              const pts = 10;
              save.dp += pts; persist();
              this.reveal.show({ points: pts, kind: '보상', name: `독도 포인트 +${pts}`, extra: '독도 석상에서 퍼즐을 열 수 있어요' });
            }
            // 카드 뽑기처럼: 뒷면 카드를 눌러야 무엇이 나왔는지 보임
            this.onSolved?.();
          } else { audio.sfx('bad'); this.state = 'wrong'; this.msg = this.q.wrong[Math.floor(Math.random() * this.q.wrong.length)]; }
        }
      });
    } else if (this.state === 'wrong') {
      robot(this.msg);
      if (button('다시 풀기', W - 300, 600, 220, 64) || keyHit('Enter', 'Space')) this.state = 'question';
    } else if (this.state === 'right') {
      if (!this.reveal.open) robot(this.q.right);
      if (!this.reveal.open && (button('돌아가기', W - 300, 600, 220, 64) || keyHit('Enter', 'Space'))) go(this.back);
    }
    this.reveal.draw(1);
  }
}
