// 달리고 구하고 풀어라!: 스테이지 선택, 달리기(플랫폼) 게임, 파란 로봇 퀴즈
import { W, H, ctx, img, sp, preload, drawCover, drawFit, drawImg, panel, text, textBox, button, hit, input, keyDown, keyHit, save, persist, audio, go, game, fmt, dim, beginUI, ui, inside, clamp, rrect } from './core.js';
import { nav, Notice, CardReveal, spiritSquash, soundPanel } from './widgets.js';
import { generateLevel } from './levelgen.js';

const U = 64;                 // 1 유닛 = 64px
const GRAV = 9.81 * 3, JUMP = 12, SPEED = 5, MAXFALL = 22;
const PW = 0.5, PH = 0.62;    // 주인공 충돌 상자 (원래 게임: 반지름 0.3 원)
const ROBOT_R = 0.38;
const SHIELD_MAX = 2;          // 보호막은 최대 2겹

// 9스테이지 로보킹 문제: 원래 게임 연결에서는 '시마네현 고시'가 정답으로 되어 있었지만,
// 힌트(세종실록지리지)와 사실에 맞게 '세종실록'을 정답으로 고침
const STAGE9_FIX = '세종실록';   // 9스테이지는 로보킹 문제: 정답은 세종실록 (다른 보기는 모두 오답)
const AMAZING = ['이럴 수가... 분명히 로봇 군단을 시켜 \n인간들이 독도에 대한 기억을 잊어버리게 했는데...', '어째서 너는 이렇게 독도에 \n대해 잘 알고 있는 거지?', '좋다... 재밌군... \n그렇다면 다음 스테이지로 넘어와라.', '나를 다시 찾아온다면 독도를 걸고 승부하자. 기다리고 있겠다...'];
// 9스테이지에서 로보킹을 처음 만났을 때 (원작 대사)
const KING_MEET = ['오호..너는 누구냐..', '나는 로봇들의 왕\n로보킹이다.', '너의 실력을 확인해볼 겸 \n문제를 내보겠다.'];
const KING_GATE = ['여기까지 오다니 대단하다. 독도를 걸고 승부를 해보자.', '대결할 준비가 되었다면 문을 열고 들어와라. 나는 준비하고 있겠다.'];
const URCHIN_TIP = '성게를 치웠구나! 성게가 너무 많으면 바위의 해조류를 다 갉아먹어서\n바다가 하얗게 변해(갯녹음). 성게를 모두 치워 바다 숲을 살려 줘!';
const URCHIN_DONE = '성게를 모두 치웠다! 바다 숲이 다시 살아났어.\n성게를 좋아하는 돌돔도 놀러 왔네! (독도 포인트 +10)';
// 괭이갈매기 그림 조각 (assets/img/gull.png): 위치·크기와 부리 끝(bx,by)·발끝(feet)
const GULL = {"idle": [{"x": 0.0, "y": 0.0, "w": 105.6, "h": 88.8, "bx": 94.2, "by": 26.4, "feet": 82.2}, {"x": 108.0, "y": 0.0, "w": 103.2, "h": 91.2, "bx": 91.8, "by": 25.2, "feet": 84.6}, {"x": 213.6, "y": 0.0, "w": 103.8, "h": 90.6, "bx": 92.4, "by": 25.2, "feet": 84.0}, {"x": 319.8, "y": 0.0, "w": 105.0, "h": 89.4, "bx": 93.6, "by": 27.0, "feet": 82.8}], "peck": [{"x": 427.2, "y": 0.0, "w": 127.8, "h": 69.6, "bx": 111.6, "by": 50.4, "feet": 63.0}], "call": [{"x": 557.4, "y": 0.0, "w": 125.4, "h": 112.8, "bx": 109.8, "by": 45.0, "feet": 106.2}], "takeoff": [{"x": 685.2, "y": 0.0, "w": 120.0, "h": 88.2, "bx": 108.6, "by": 26.4, "feet": 81.6}, {"x": 807.6, "y": 0.0, "w": 118.8, "h": 101.4, "bx": 107.4, "by": 49.8, "feet": 94.8}], "fly": [{"x": 928.8, "y": 0.0, "w": 127.8, "h": 94.2, "bx": 116.4, "by": 54.6, "feet": 87.6}, {"x": 1059.0, "y": 0.0, "w": 125.4, "h": 84.6, "bx": 114.0, "by": 42.6, "feet": 78.0}, {"x": 1186.8, "y": 0.0, "w": 133.2, "h": 69.6, "bx": 121.2, "by": 31.8, "feet": 63.0}, {"x": 1322.4, "y": 0.0, "w": 129.6, "h": 73.2, "bx": 117.6, "by": 30.0, "feet": 66.6}]};
const GULL_K = 1.05;   // 그림 1px → 화면 1.05px
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const NOT_PASS = '자네에게 정령들의 기운이 충분히 느껴지지 않는군..\n정령들을 모두 구출하고 도전하는것이 좋다네...\n다른 스테이지에 두고온 정령들을 살펴보고 오게나..';
const GUIDE = ['점프 버튼을 공중에서 한 번 더 누르면 더블 점프! 높은 발판도 올라갈 수 있다!', '노란 테두리 발판은 움직인다! 올라타서 높은 곳이나 먼 곳으로 건너가자!', '열쇠를 획득해라! 열쇠를 얻으면 스테이지 해결에 필요한 힌트도 제공한다! 획득한 열쇠를 클릭하면 획득한 힌트를 다시 볼 수 있다!', '섬 곳곳에 숨어있는 정령들을 구출해라!', '파란로봇 중에는 문제를 내는 녀석들도 있다!!', '로봇에게 닿으면 처음 장소로 돌아오니 주의해라!', '초록 로봇(머리 위에 종이 뭉치)은 종이 뭉치를 던진다! 맞으면 뒤로 튕겨 나가고, 몸에 닿으면 처음 장소로!', '갈색 로봇(머리 위에 종이비행기)은 종이비행기를 던진다! 맞으면 보호막이 생겨(최대 2겹) 로봇에 한 번 닿아도 괜찮다!', '아래 방향키(↓)나 ▼ 버튼을 누르고 있으면 아래쪽을 내려다볼 수 있다!', '바위에 붙은 보라색 성게를 치워라! 다 치우면 바다 숲이 살아나고 돌돔이 놀러 온다!', '넓은 바다 앞 괭이갈매기 쪽으로 걸어가면 발에 매달려 건너간다! 돌아올 때도 태워 준다!', '나를 찾아와 문제를 풀고 다음 스테이지로 넘어가라!'];

// 0..n-1을 무작위 순서로
function shuffled(n) { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
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
      drawFit(img(save.cleared[i] ? 'stagemark' + (i + 1) : 'selecticon'), x, y + bob, 160, 160, open ? {} : { shade: '#2b2b2b', shadeAlpha: 0.55 });
      if (!open) drawFit(img('Lock'), x + 50, y + 50, 60, 60);
      if (save.rescued[i]) drawFit(img('water_icon'), x + 116, y - 10, 52, 52, { frame: [0, 0, 160, 160] });
      if (save.cleared[i]) { const st = (save.stars || [])[i] || 0; for (let k = 0; k < 3; k++) text('★', x + 80 + (k - 1) * 34, y + 128, { size: 34, align: 'center', color: k < st ? '#ffcc33' : '#cfc4b3', stroke: '#3a2f28', strokeW: 5 }); }
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
    // 괭이갈매기 (a쪽·b쪽 사이를 오가며 태워 줌)와 성게
    this.gulls = (d.gulls || []).map(g => ({ ...g, side: 'a', x: g.a[0], y: g.a[1], state: 'wait', t: 0, ready: true, fl: Math.random() * 6, dir: 1 }));
    this.urchins = (d.urchins || []).map(u => ({ ...u, got: false, grow: 0, pop: 0 }));
    this.fishShow = 0;
    // 별 3개: 목표 시간 안에 / 독도 포인트 모두 / 로봇에게 한 번도 안 잡히기
    this.playTime = 0; this.robotHits = 0;
    this.par = Math.max(60, Math.round((30 + 1.0 * (this.bounds.r - this.bounds.l)) / 10) * 10);
    this.robots = d.robots.map((r, i) => ({ ...r, i, sx0: r.x, sy0: r.y, vx: r.walk ? (r.flip ? 1 : -1) * (r.speed || 1) : 0, vy: 0, t: Math.random() * 3, jt: 0.5 + Math.random() * 1.5, solved: false, tt: 1.5 + Math.random() * 2 }));
    this.stones = [];
    this.look = 0;     // 아래 내려다보기 (0~1)
    // 날씨: 1스테이지는 맑음, 그 뒤로는 들어올 때마다 맑음·비·눈 중 하나
    const wr = Math.random();
    this.weather = n === 1 ? 'clear' : wr < 0.4 ? 'clear' : wr < 0.7 ? 'rain' : 'snow';
    this.drops = Array.from({ length: this.weather === 'rain' ? 170 : this.weather === 'snow' ? 130 : 0 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.6 + Math.random() * 0.8, ph: Math.random() * 6.3 }));
    this.splash = [];
    const TIME_BG = ['morning', 'morning', 'day', 'day', 'day', 'sunset', 'sunset', 'dusk', 'dusk', 'night'];
    this.bgName = 'runbg_' + (this.weather === 'rain' ? 'rain' : this.weather === 'snow' ? 'snow' : TIME_BG[n - 1]);
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
    this.p = { shields: [], lastGround: this.start[1], x: this.start[0], y: this.start[1], vx: 0, vy: 0, ground: false, coyote: 0, buffer: 0, airJumps: 1, puff: 0, face: 1, anim: 0, blink: 0 };
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
    preload([...keys].map(k => 'sp/' + k).concat(['boy_stand', 'boy_walk', 'boy_jump', 'robo_red', 'robo_green', 'robo_brown', 'robo_blue', 'roboking', 'dokdo_icon', 'daddy_small', 'dp', 'gull', 'rockbream', this.bgName])).then(() => { this.ready = true; });
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
    if (!this.cleared) this.playTime += dt;
    this.updateGulls(dt);
    if (p.riding) this.rideGull(dt); else {
    const left = keyDown('ArrowLeft', 'KeyA') || this.touch.left;
    const right = keyDown('ArrowRight', 'KeyD') || this.touch.right;
    const jumpHit = keyHit('Space', 'ArrowUp', 'KeyW') || this.touch.jumpHit;
    const lookDown = keyDown('ArrowDown', 'KeyS') || this.touch.down;
    this.look += ((lookDown ? 1 : 0) - this.look) * Math.min(1, dt * (lookDown ? 3 : 6));
    p.vx = (right ? 1 : 0) - (left ? 1 : 0);
    if (p.vx) p.face = p.vx;
    p.vx *= SPEED;
    // 종이 뭉치에 맞으면 잠깐 뒤로 밀려남 (그동안은 조작이 약하게만 먹힘)
    if (p.kb > 0) { const f = p.kb / 0.4; p.vx = p.kbv * f + p.vx * (1 - f) * 0.5; p.kb -= dt; }
    if (p.paperSafe > 0) p.paperSafe -= dt;
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
    // 맵 맨 아래로 빠지면 체크포인트로. 공중에서는 발밑(조금 옆까지)에 발판이 하나라도 있으면 끝까지 떨어져 착지하고,
    // 발밑이 완전히 비어 있을 때만 서 있던 곳보다 6칸 넘게 떨어지면 일찍 돌려보냄
    let voidFall = false;
    if (!p.ground && p.vy < 0 && p.y < p.lastGround - 6) {
      const feet = p.y - 0.38, x0 = p.x - 1.2, x1 = p.x + 1.2;
      const under = s => s.x < x1 && s.x + s.w > x0 && s.y + s.h <= feet + 0.05;
      const moverUnder = this.movers.some(m => m.x0 - 0.5 < x1 && m.x0 + m.ax + m.w + 0.5 > x0 && m.top - 1 <= feet);
      voidFall = !this.solids.some(under) && !moverUnder;
    }
    if (p.y < this.bounds.b - 3 || voidFall || this.collide(this.pbox(), this.deadly)) this.respawn();
    }   // (갈매기에 매달려 있지 않을 때만 걷기·점프)

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
          if (Math.random() < Math.min(0.92, 0.6 + 0.035 * this.n)) { rb.vy = 7 + Math.random() * (2 + 0.35 * this.n); rb.hop = 0.25; if (this.t - (this.lastBoing ?? -9) > 0.8) { const sp = this.near(rb.x, rb.y, 7); if (sp.vol > 0.05) { this.lastBoing = this.t; audio.sfx('boing', { vol: sp.vol * 0.7, pan: sp.pan }); } } }
        }
      }
      if (rb.hop > 0) rb.hop -= dt;
      // 로봇 소리: 종류마다 다른 소리를 가끔 냄 (가까우면 크게, 멀면 작게)
      rb.beep = (rb.beep ?? Math.random() * 2.5) - dt;
      if (rb.beep <= 0) {
        rb.beep = 2.5 + Math.random() * 2;
        // 가까운(9칸 안) 로봇만, 그리고 로봇 소리끼리는 0.7초 넘게 띄워서 하나씩
        if (!rb.solved && !(rb.appear > 0) && this.t - (this.lastRobo ?? -9) > 0.7) {
          const sp = this.near(rb.x, rb.y, 9);
          if (sp.vol > 0.05) { this.lastRobo = this.t; audio.sfx(rb.green ? 'robo_green' : rb.brown ? 'robo_brown' : rb.blue ? 'robo_blue' : 'robo_red', sp); }
        }
      }
      // 걸어 다니는 로봇은 가까우면 철컥철컥 발소리
      if (rb.walk && rb.vx && !(rb.appear > 0)) {
        rb.step = (rb.step ?? Math.random() * 0.35) - dt;
        if (rb.step <= 0) { rb.step = 0.36; const sp = this.near(rb.x, rb.y, 4); if (sp.vol > 0.05) audio.sfx('clank', sp); }
      }
      // 갈색 로봇: 주인공에게 보호막이 있으면 던지지 않고 가만히 서 있음
      if (rb.brown) {
        if (p.shields.includes(rb.i)) { if (rb.vx) { rb.saveVx = rb.vx; rb.vx = 0; } rb.wind = 0; rb.idle = true; }   // 자기가 준 보호막이 남아 있는 동안만 쉼
        else if (rb.idle) { rb.idle = false; rb.vx = rb.saveVx || rb.speed; rb.tt = 0.8; }
      }
      // 초록 로봇(종이 뭉치)·갈색 로봇(종이비행기): 주인공이 가까우면 멈춰서 던짐
      if ((rb.green || (rb.brown && !p.shields.includes(rb.i) && p.shields.length < SHIELD_MAX)) && !(rb.appear > 0)) {   // 갈색 로봇은 자기가 준 보호막이 깨지면 다시 던짐 (보호막이 가득 차면 쉼)
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
        if (rb.q) { if (!rb.busy) this.openRobotQuiz(rb); return; }
        if (p.shields.length) {
          // 보호막이 대신 막아 줌: 보호막만 깨지고 살짝 튕겨 나감
          p.shields.pop(); p.blink = 1.2; audio.sfx('pop');   // 맨 바깥 보호막 한 겹만 깨짐
          p.kb = 0.25; p.kbv = (Math.sign(p.x - rb.x) || 1) * 5; p.vy = Math.max(p.vy, 4.5);   // 살짝만 튕김
          this.splash.push({ x: p.x, y: p.y, t: 0.4, shield: true });
        } else {
          audio.sfx('hurt');
          this.robotHits++;
          this.respawn();
        }
      }
    }
    // 초록 로봇이 던진 구겨진 종이
    for (const st of this.stones) {
      st.t += dt;
      if (st.plane) { st.x += st.vx * dt; st.y += st.vy * dt + Math.sin(st.t * 7) * 0.012; st.vy -= 0.8 * dt; }   // 종이비행기: 거의 곧게 날다 살짝 내려감
      else { st.vy -= GRAV * 0.55 * dt; st.x += st.vx * dt; st.y += st.vy * dt; st.rot += st.vx * dt * 3; }
      const b = { x: st.x - 0.16, y: st.y - 0.16, w: 0.32, h: 0.32 };
      if (this.collide(b, this.solids) || this.collide(b, this.movers) || st.y < this.bounds.b - 6 || st.t > 4) { st.dead = true; if (st.t < 4) { audio.sfx('thud', this.near(st.x, st.y)); this.splash.push({ x: st.x, y: st.y, t: 0.3, paper: true }); } continue; }
      if (st.plane) {
        // 종이비행기에 맞으면 보호막 하나 (이미 있으면 그냥 사라짐)
        if (Math.abs(st.x - p.x) < 0.5 && Math.abs(st.y - (p.y - 0.07)) < 0.55) {
          st.dead = true;
          if (!p.shields.includes(st.from) && p.shields.length < SHIELD_MAX) { p.shields.push(st.from); audio.sfx('shield'); this.splash.push({ x: p.x, y: p.y, t: 0.4, shield: true }); }   // 갈색 로봇마다 한 겹씩 쌓임
        }
        continue;
      }
      if (p.blink <= 0 && !(p.paperSafe > 0) && Math.abs(st.x - p.x) < 0.42 && Math.abs(st.y - (p.y - 0.07)) < 0.48) {
        // 맞으면 날아온 쪽 반대로 튕겨 나감 (처음 자리로 돌아가지는 않음, 보호막이 있어도 튕기고 보호막은 그대로)
        st.dead = true; audio.sfx('bonk');
        p.kb = 0.4; p.kbv = (Math.sign(st.vx) || 1) * 9; p.vy = Math.max(p.vy, 7); p.paperSafe = 0.7;
        this.splash.push({ x: st.x, y: st.y, t: 0.3, paper: true });
      }
    }
    this.stones = this.stones.filter(s => !s.dead);
    // 독도 포인트
    for (const c of this.coins) {
      if (!c.got && Math.abs(c.x - p.x) < 0.55 && Math.abs(c.y - (p.y - 0.08)) < 0.6) { c.got = true; save.dp += 3; persist(); audio.sfx('coin'); }
    }
    // 성게: 닿으면 치움. 처음 한 번은 왜 치우는지 알려 주고, 다 치우면 돌돔이 놀러 옴
    for (const u of this.urchins) {
      if (u.pop > 0) u.pop -= dt;
      if (u.got) { if (u.grow < 1) u.grow = Math.min(1, u.grow + dt * 1.2); continue; }
      if (Math.abs(u.x - p.x) < 0.6 && Math.abs(u.y - (p.y - 0.08)) < 0.65) {
        u.got = true; u.pop = 0.4; save.dp += 2; persist(); audio.sfx('urchin');
        if (this.urchins.every(v => v.got)) { save.dp += 10; persist(); this.fishShow = 0.01; audio.sfx('good'); this.modal = { type: 'msg', face: 'daddy', text: URCHIN_DONE }; }
        else if (!save.tips.urchin) { save.tips.urchin = true; persist(); this.modal = { type: 'msg', face: 'daddy', text: URCHIN_TIP }; }
      }
    }
    if (this.fishShow > 0) { this.fishShow += dt; if (this.fishShow > 8) this.fishShow = 0; }
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
        this.start = [s.x, s.y - 0.15];   // 정령을 구한 자리도 체크포인트 (떨어지면 여기서 다시 시작)
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
  // 구겨진 종이 뭉치: 울퉁불퉁 불규칙한 테두리, 제멋대로 접힌 면(밝은 면·그늘진 면), 지그재그 주름, 꺾인 공책 줄
  drawPaper(x, y, rot, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    const out = [[-12, -4], [-9, -10], [-3, -12], [1, -9], [6, -13], [11, -8], [13, -1], [10, 4], [12, 9], [5, 12], [0, 9], [-5, 13], [-10, 8], [-13, 3]];
    const path = () => { ctx.beginPath(); out.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); };
    path(); ctx.fillStyle = '#f2efe6'; ctx.fill();
    ctx.save(); path(); ctx.clip();
    // 접힌 면들 (모양·밝기가 제각각)
    const faces = [
      ['#ffffff', [[-12, -4], [-9, -10], [-3, -12], [-2, -5], [-7, -2]]],
      ['#d9d3c4', [[-3, -12], [1, -9], [3, -3], [-2, -5]]],
      ['#fbf9f3', [[1, -9], [6, -13], [11, -8], [7, -3], [3, -3]]],
      ['#cbc4b2', [[11, -8], [13, -1], [10, 4], [7, -3]]],
      ['#efebe1', [[3, -3], [7, -3], [10, 4], [4, 5], [0, 1]]],
      ['#e2ddd0', [[-7, -2], [-2, -5], [3, -3], [0, 1], [-5, 3]]],
      ['#c8c0ad', [[-13, 3], [-12, -4], [-7, -2], [-5, 3], [-9, 6]]],
      ['#fdfcf8', [[-9, 6], [-5, 3], [0, 1], [-1, 7], [-5, 13], [-10, 8]]],
      ['#d4cdbd', [[0, 1], [4, 5], [5, 12], [0, 9], [-1, 7]]],
      ['#ebe6da', [[4, 5], [10, 4], [12, 9], [5, 12]]],
    ];
    for (const [c, pts] of faces) { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill(); }
    // 꺾인 공책 줄
    ctx.strokeStyle = 'rgba(80,130,205,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-8, -3); ctx.lineTo(-1, -6); ctx.lineTo(5, -1); ctx.lineTo(14, -4);
    ctx.moveTo(-14, 4); ctx.lineTo(-7, 1); ctx.lineTo(-2, 5); ctx.lineTo(6, 3); ctx.lineTo(14, 7); ctx.stroke();
    // 주름 (접힌 선을 따라 짙게)
    ctx.strokeStyle = 'rgba(95,85,70,.7)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-9, -10); ctx.lineTo(-2, -5); ctx.lineTo(3, -3); ctx.lineTo(7, -3); ctx.lineTo(11, -8);
    ctx.moveTo(-2, -5); ctx.lineTo(0, 1); ctx.lineTo(4, 5); ctx.lineTo(5, 12);
    ctx.moveTo(-12, -4); ctx.lineTo(-7, -2); ctx.lineTo(-5, 3); ctx.lineTo(-9, 6);
    ctx.moveTo(0, 1); ctx.lineTo(-1, 7); ctx.lineTo(-5, 13);
    ctx.moveTo(7, -3); ctx.lineTo(10, 4);
    ctx.stroke();
    ctx.restore();
    path(); ctx.strokeStyle = '#555'; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.restore();
  }
  // 종이비행기: 흰 삼각 날개 + 가운데 접힌 선 (ang: 날아가는 방향, 화면 기준)
  drawPlane(x, y, ang, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-ang); ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, -9); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();   // 위 날개
    ctx.fillStyle = '#dfe6ee';
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 8); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();    // 아래 날개
    ctx.fillStyle = '#c6d0dc';
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-6, 0); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill(); ctx.stroke();     // 몸통 접힘
    ctx.restore();
  }
  // 소리 위치: 주인공과 가까울수록 크게(3칸 안은 최대, 14칸 넘으면 안 들림), 왼쪽·오른쪽에서 들리게
  near(x, y, range = 14) {
    const p = this.p, d = Math.hypot(x - p.x, (y - p.y) * 1.3);
    return { vol: d < 2 ? 1 : Math.max(0, 1 - (d - 2) / (range - 2)), pan: Math.max(-1, Math.min(1, (x - p.x) / 9)) };   // 2칸 안은 최대, range칸에서 0
  }
  throwStone(rb) {
    const p = this.p, g = GRAV * 0.55;
    if (rb.brown) {
      // 종이비행기: 주인공 쪽으로 곧게 (조금 빗나갈 수 있음)
      const sx = rb.x + rb.look * 0.4, sy = rb.y + 0.5;
      const dx = p.x - sx, dy = (p.y - 0.05) - sy + (Math.random() - 0.5) * 0.4, d = Math.hypot(dx, dy) || 1, v = 6;
      this.stones.push({ x: sx, y: sy, vx: dx / d * v, vy: dy / d * v, t: 0, rot: 0, plane: true, from: rb.i });
      audio.sfx('plane', this.near(rb.x, rb.y));
      return;
    }
    const tx = p.x + (Math.random() - 0.5) * 1.2 + p.vx * 0.25, ty = p.y + (Math.random() - 0.5) * 0.6;
    const sx = rb.x + rb.look * 0.3, sy = rb.y + 0.45;
    const dx = tx - sx, dy = ty - sy;
    const T = clamp(Math.abs(dx) / 7, 0.55, 1.3);
    this.stones.push({ x: sx, y: sy, vx: dx / T, vy: (dy + 0.5 * g * T * T) / T, t: 0, rot: 0 });
    audio.sfx('throw', this.near(rb.x, rb.y));
  }
  // ---------------------------------------------------------------- 괭이갈매기
  gullFly(g, rider) {
    const from = g.side, to = from === 'a' ? 'b' : 'a';
    g.state = 'fly'; g.from = from; g.to = to; g.t = 0; g.rider = rider;
    g.T = 1.3 + Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]) * 0.12;
    const sp = this.near(g.x, g.y, 12); if (rider || sp.vol > 0.1) audio.sfx('gull', rider ? {} : sp);
    if (rider) { const p = this.p; p.riding = g; p.vx = p.vy = 0; p.kb = 0; g.off0 = [p.x - g.x, p.y - g.y]; }
  }
  updateGulls(dt) {
    const p = this.p;
    for (const g of this.gulls) {
      g.fl += dt;
      if (g.state === 'wait') {
        const home = g[g.side], other = g.side === 'a' ? g.b : g.a;
        g.x = home[0]; g.y = home[1];
        g.dir = Math.sign(other[0] - home[0]) || 1;
        // 몸통 자리(부리보다 조금 뒤)와 주인공 사이
        const dx = p.x - (g.x - 0.7 * g.dir), dy = p.y - (g.y - 0.54);
        const dist = Math.hypot(dx, dy);
        // 내려 준 뒤 잠깐(0.6초)은 다시 태우지 않음
        if (!g.ready) { g.cool = (g.cool ?? 0.6) - dt; if (g.cool <= 0) { g.ready = true; g.cool = undefined; } }
        // 가끔 바닥을 콕콕 쪼고, 주인공이 다가오면 끼룩! 하고 부름
        g.peck = (g.peck ?? 2 + Math.random() * 3) - dt;
        if (g.peck < -0.7) g.peck = 3 + Math.random() * 4;
        const near = g.ready && !p.riding && dist < 4;
        if (near && !g.called) { g.called = true; const sp = this.near(g.x, g.y, 8); audio.sfx('gull', sp); }
        if (dist > 6) g.called = false;
        g.near = near;
        // 바다 쪽(갈매기가 보는 쪽)으로 걸어 들어오면 태워 줌 (내린 자리에서 반대로 걸어가면 안 태움)
        if (g.ready && !p.riding && Math.abs(dx) < 0.95 && Math.abs(dy) < 0.8 && p.vx * g.dir > 0) this.gullFly(g, true);
        // 주인공이 반대편에 있으면 빈 몸으로 마중 나감 (돌아올 때도 탈 수 있게)
        else if (!p.riding && Math.hypot(p.x - other[0], p.y - other[1]) < 6 && Math.hypot(p.x - home[0], p.y - home[1]) > 8) this.gullFly(g, false);
      } else {
        g.t += dt;
        const A = g[g.from], B = g[g.to], dir = Math.sign(B[0] - A[0]) || 1;
        if (g.t <= g.T) {
          // 건너편 발판 위(자리보다 2.2칸 안쪽)까지 날아가서 주인공을 내려놓음
          const E = [B[0] + dir * 2.2, B[1] + 0.3];
          const u = Math.min(1, g.t / g.T), sm = u * u * (3 - 2 * u);
          g.x = A[0] + (E[0] - A[0]) * sm;
          g.y = A[1] + (E[1] - A[1]) * sm + (g.peak - Math.max(A[1], E[1])) * 4 * u * (1 - u);
          g.dir = dir;
          if (g.rider && u >= 0.92) {
            g.rider = false; g.ready = false;
            p.riding = null; p.vx = 0; p.vy = 0; p.lastGround = p.y; p.airJumps = 1; p.coyote = 0;
          }
          g.sx = g.x; g.sy = g.y;
        } else {
          // 내려놓은 뒤 제자리(발판 끝)로 뒤돌아 살짝 날아가 앉음
          const v = Math.min(1, (g.t - g.T) / 0.45);
          g.x = g.sx + (B[0] - g.sx) * v; g.y = g.sy + (B[1] - g.sy) * v + Math.sin(v * Math.PI) * 0.3;
          g.dir = -dir;
          if (v >= 1) { g.state = 'wait'; g.side = g.to; g.x = B[0]; g.y = B[1]; }
        }
      }
    }
  }
  rideGull(dt) {
    const p = this.p, g = p.riding;
    // 날아오르는 처음 0.35초 동안 발에 매달린 자리로 부드럽게 옮겨 감
    const k = Math.min(1, g.t / 0.35), tx = -0.6 * g.dir, ty = -1.1;
    const ox = g.off0 ? g.off0[0] + (tx - g.off0[0]) * k : tx, oy = g.off0 ? g.off0[1] + (ty - g.off0[1]) * k : ty;
    p.x = g.x + ox; p.y = g.y + oy; p.vx = p.vy = 0; p.ground = false; p.face = g.dir; p.anim += dt;
    if (p.blink > 0) p.blink -= dt;
  }
  respawn() {
    const p = this.p; p.kb = 0;   // 보호막(p.shields)은 떨어져서 다시 시작해도 그대로 남음 (스테이지를 나가면 새 판이라 없어짐)
    p.x = this.start[0]; p.y = this.start[1]; p.vx = p.vy = 0; p.blink = 1.2; p.lastGround = p.y;
  }
  touchDoor() {
    if (this.modal) return;
    const d = this.d;
    if (!this.keys.some(k => k.got)) { this.modal = { type: 'msg', text: d.noKeyText === '...... ....... ....... ....... .......' ? d.noKeyText : '열쇠를 얻어와라!!!!!', face: this.n >= 9 ? 'king' : 'daddy' }; this.p.x -= 0.4 * Math.sign(this.door.x - this.p.x || 1); return; }
    if (this.n === 10) { this.modal = { type: 'seq', texts: KING_GATE, face: 'king', then: () => this.openDoor() }; return; }
    if (this.n === 9 && !this.kingMet) { this.kingMet = true; this.modal = { type: 'seq', texts: KING_MEET, face: 'king', then: () => { this.modal = { type: 'quiz', picked: null, order: shuffled(this.d.answers.length) }; } }; return; }
    this.modal = { type: 'quiz', picked: null, order: shuffled(this.d.answers.length) };   // 보기 순서는 열 때마다 섞음
  }
  openDoor() { this.door.open = true; audio.sfx('good'); }
  reachFlag() {
    this.cleared = true;
    const n = this.n;
    if (n === 10) {
      if (!save.rescued.every(Boolean)) { this.modal = { type: 'notpass' }; this.cleared = false; this.door.open = false; this.p.x -= 1.5; return; }
      save.cleared[9] = true; this.recordStars(); persist();
      go(nav.beforeFinal());
      return;
    }
    save.cleared[n - 1] = true;
    save.unlockedStage = Math.max(save.unlockedStage, n + 1);
    this.recordStars();
    persist();
    audio.sfx('good');
    if (n === 8 && !save.leeSeen) { save.leeSeen = true; persist(); go(nav.leeReveal()); return; }
    this.modal = { type: 'clear', t0: this.t, shown: 0 };
  }
  // 별 3개 기록 (가장 많이 받은 개수를 남김)
  recordStars() {
    const n = this.n;
    this.starGot = [this.playTime <= this.par, this.coins.every(c => c.got), this.robotHits === 0];
    const cnt = this.starGot.filter(Boolean).length;
    if (!Array.isArray(save.stars)) save.stars = Array(10).fill(0);
    this.starBest = save.stars[n - 1] || 0;
    save.stars[n - 1] = Math.max(this.starBest, cnt);
  }
  openRobotQuiz(rb) {
    // 밀어내지 않고 그 자리에 세워 둠 (발판 끝에서 밀려 떨어지지 않게). 맞힌 로봇은 다시 문제를 내지 않음
    const p = this.p; p.vx = 0; p.vy = Math.max(0, p.vy); p.kb = 0; p.blink = 1.2; rb.busy = true;
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
    const layer = soundPanel.isOpen ? 3 : this.notice.open ? 2 : this.modal ? 1 : 0;
    beginUI(layer);
    // 배경: 스테이지가 오를수록 아침 → 한낮 → 노을 → 해질녘 → 밤 (비·눈 오는 날은 그 날씨 그림)
    const dd = this.diff;
    this.drawBackdrop();
    for (const t of this.tiles) if (!t.p.deadly) this.drawWorldSprite(spriteInfo(t.p.s), t.p.x, t.p.y, t.p.sx, t.p.sy);
    this.drawUrchins();
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
      if (rb.wind > 0) { const [wx, wy] = this.w2s(rb.x + rb.look * 0.35, rb.y + 0.7); if (rb.brown) this.drawPlane(wx, wy, rb.look > 0 ? -0.3 : Math.PI + 0.3, 1.1); else this.drawPaper(wx, wy, this.t * 2, 1.2); }
      this.drawSheet(blue ? 'robo_blue' : rb.green ? 'robo_green' : rb.brown ? 'robo_brown' : 'robo_red', frame, rb.x, rb.y + 0.02, rb.hop > 0 ? 0.95 * (1 + rb.hop * 0.4) : 0.95, facingRight, rb.solved ? 0.35 : (rb.appear > 0 ? (Math.floor(rb.appear * 10) % 2 ? 0.2 : 0.8) : 1));
      // 색을 구별하기 어려운 친구도 알아보게: 초록 로봇은 머리 위에 종이 뭉치, 갈색 로봇은 종이비행기 표시
      if ((rb.green || rb.brown) && !(rb.wind > 0)) {
        const [ix, iy] = this.w2s(rb.x, rb.y + 0.95 + Math.sin(this.t * 3 + rb.x) * 0.05);
        if (ix > -50 && ix < W + 50) { if (rb.brown) this.drawPlane(ix, iy, -0.25, 1.05); else this.drawPaper(ix, iy, 0.4, 1.05); }
      }
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
      const shake = p.kb > 0 ? Math.sin(this.t * 60) * 0.04 : 0;
      this.drawSheet(sheet, [fr * 80, 0, 80, 80], p.x + shake, p.y, 0.8 * 1.25, p.face < 0);
    }
    this.drawGulls();
    if (p.shields.length) {
      // 보호막: 주인공을 감싸는 하늘색 방울 (겹친 만큼 테두리가 늘어남)
      const [bx, by] = this.w2s(p.x, p.y + 0.05), r = 40 + Math.sin(this.t * 5) * 2;
      const g = ctx.createRadialGradient(bx - 10, by - 12, 4, bx, by, r);
      g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.7, 'rgba(140,220,255,.18)'); g.addColorStop(1, 'rgba(110,200,255,.45)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(90,190,255,.9)'; ctx.lineWidth = 3; ctx.stroke();
      for (let k = 1; k < Math.min(4, p.shields.length); k++) { ctx.beginPath(); ctx.arc(bx, by, r + k * 6, 0, Math.PI * 2); ctx.strokeStyle = `rgba(90,190,255,${0.7 - k * 0.15})`; ctx.lineWidth = 2; ctx.stroke(); }
    }
    for (const st of this.stones) {
      const [sx, sy] = this.w2s(st.x, st.y);
      if (st.plane) this.drawPlane(sx, sy, Math.atan2(-st.vy, st.vx), 1.3);
      else this.drawPaper(sx, sy, st.rot, 1.6);
    }
    // 밤·해질녘에는 발판과 인물도 살짝 어둡게 물들여 배경과 어울리게
    const tint = { dusk: 'rgba(60,50,120,.18)', night: 'rgba(20,25,70,.28)', sunset: 'rgba(255,140,90,.10)' }[this.bgName.replace('runbg_', '')];
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
    this.drawWeather();
    if (!this.ready) {
      ctx.fillStyle = 'rgba(27,43,54,.85)'; ctx.fillRect(0, 0, W, H);
      text(`스테이지${this.n}`, W / 2, H / 2 - 70, { size: 60, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 10 });
      text('맵을 불러오는 중...', W / 2, H / 2 + 20, { size: 32, align: 'center', color: '#f4e3c3' });
      return;
    }
    if (this.fishShow > 0) this.drawFish();
    this.drawHUD(layer);
    this.drawMinimap();
    if (this.modal) this.drawModal();
    this.notice.draw(2);
    soundPanel.draw(3);
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
      ctx.strokeStyle = s.shield ? `rgba(120,220,255,${s.t * 2.5})` : s.paper ? `rgba(240,235,220,${s.t * 3})` : `rgba(220,235,255,${s.t * 3})`; ctx.lineWidth = 2;
      const k = Math.max(0, 0.3 - Math.min(s.t, 0.3)) / 0.3, big = s.shield ? 2 : 1;
      ctx.beginPath(); ctx.ellipse(sx, sy, (k * 18 + 4) * big, (k * 4 + 2) * big + (s.shield ? k * 20 : 0), 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (wx === 'clear') return;
    ctx.save();
    if (wx === 'rain') {
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
  // 배경 그림 한 장(하늘·섬·바다·땅)을 가로로 이어 붙여 천천히 흘려 보냄
  //   카메라가 위로 올라가면 그림이 아래로 조금씩 내려가고, 그 위는 그림 맨 위 하늘색으로 이어짐
  drawBackdrop() {
    const SKY_TOP = { runbg_morning: '#7ce6fa', runbg_day: '#46acfd', runbg_sunset: '#df6960', runbg_dusk: '#28274d', runbg_night: '#0a0b21', runbg_rain: '#6b86a1', runbg_snow: '#babad4' };
    ctx.fillStyle = SKY_TOP[this.bgName] || '#7cc6f0'; ctx.fillRect(0, 0, W, H);
    const bg = img(this.bgName);
    if (!bg) return;
    const bw = 1600, bh = bw * bg.height / bg.width;            // 1600 × 1067
    const grass = bh * 0.715;                                    // 그림 속 풀밭 높이
    const vh = H / U, lowCam = this.bounds.b - 3 + vh / 2;       // 카메라가 가장 낮을 때
    const rise = Math.max(0, this.cam.y - lowCam);
    const y = Math.round(H - 110 - grass + Math.min(rise * U * 0.22, 420));
    const ox = -((this.cam.x * U * 0.12) % bw + bw) % bw;
    for (let k = -1; k < 2; k++) ctx.drawImage(bg, Math.round(ox + k * bw), y, bw, bh);
  }
  // 성게 하나 (보라색 공 + 가시)
  drawUrchinAt(cx, cy, r, t = 0) {
    ctx.save();
    ctx.strokeStyle = '#2a1238'; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.lineCap = 'round';
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + Math.sin(t * 2 + k) * 0.05, L = r * (1.55 + (k % 3) * 0.18);
      if (Math.sin(a) > 0.55) continue;   // 바닥에 붙은 쪽은 가시를 덜
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6); ctx.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L); ctx.stroke();
    }
    ctx.fillStyle = '#5b2a7a'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a4fb0'; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // 성게가 있는 발판은 하얗게(갯녹음), 치우면 초록 해조류가 자라남
  drawUrchins() {
    for (const u of this.urchins) {
      const pl = u.plat, [sx, sy] = this.w2s(pl.x0, pl.top);
      if (sx > W + 50 || sx + pl.w * U < -50 || sy < -80 || sy > H + 80) continue;
      if (!u.got) {
        ctx.save(); ctx.fillStyle = 'rgba(245,245,240,.85)';
        for (let k = 0; k < pl.w * 3; k++) {
          const bx = sx + (k + 0.5) * U / 3, w = U * (0.16 + ((k * 37) % 7) * 0.02);
          ctx.beginPath(); ctx.ellipse(bx, sy + 3, w, U * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        const [ux, uy] = this.w2s(u.x, u.y + Math.sin(this.t * 2 + u.x) * 0.02);
        this.drawUrchinAt(ux, uy, U * 0.22, this.t);
        // 처음에는 성게가 무서운 것처럼 보일 수 있으니, 가까이 가면 '닿아서 치우기!' 안내
        if (!save.tips.urchin && Math.hypot(this.p.x - u.x, this.p.y - u.y) < 4) text('닿아서 치우기!', ux, uy - 52 + Math.sin(this.t * 5) * 3, { size: 20, align: 'center', color: '#fff', stroke: '#5b2a7a', strokeW: 5 });
      } else {
        ctx.save(); ctx.lineCap = 'round';
        for (let k = 0; k < pl.w * 2; k++) {
          const bx = sx + (k + 0.5) * U / 2, h = U * (0.35 + ((k * 13) % 5) * 0.06) * u.grow;
          ctx.strokeStyle = k % 2 ? '#2f8f4e' : '#46b05f'; ctx.lineWidth = Math.max(2, U * 0.07);
          ctx.beginPath(); ctx.moveTo(bx, sy);
          for (let j = 1; j <= 4; j++) ctx.lineTo(bx + Math.sin(this.t * 2.5 + k + j) * U * 0.06 * j / 4, sy - h * j / 4);
          ctx.stroke();
        }
        ctx.restore();
        if (u.pop > 0) {
          const [ux, uy] = this.w2s(u.x, u.y), k = 1 - u.pop / 0.4;
          ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 3;
          for (let j = 0; j < 5; j++) { const a = j * 1.26; ctx.beginPath(); ctx.arc(ux + Math.cos(a) * k * U * 0.6, uy - k * U * 0.5 + Math.sin(a) * k * U * 0.3, U * 0.08, 0, Math.PI * 2); ctx.stroke(); }
          ctx.restore();
        }
      }
    }
  }
  // 괭이갈매기: 발판 끝에 서서 기다리다가(가끔 콕콕 쪼고, 다가오면 끼룩!) 주인공을 발에 매달고 날아감
  gullFrame(g) {
    if (g.state === 'fly') {
      if (g.t < 0.3) return GULL.takeoff[Math.min(1, Math.floor(g.t / 0.15))];
      if (g.t > g.T * 0.9) return GULL.takeoff[1];
      const cyc = [0, 1, 2, 3, 2, 1];
      return GULL.fly[cyc[Math.floor(g.fl / 0.08) % cyc.length]];
    }
    if (g.near) return Math.floor(this.t / 0.45) % 2 ? GULL.call[0] : GULL.idle[0];
    if (g.peck < 0) return GULL.peck[0];
    return GULL.idle[Math.floor(g.fl / 0.35) % GULL.idle.length];
  }
  drawGulls() {
    const im = img('gull');
    for (const g of this.gulls) {
      const [gx, gy] = this.w2s(g.x, g.y);
      if (gx < -200 || gx > W + 200) continue;
      const f = this.gullFrame(g), k = GULL_K;
      ctx.save(); ctx.translate(gx, gy); if (g.dir < 0) ctx.scale(-1, 1);
      ctx.imageSmoothingEnabled = true;   // 큰 그림을 줄여 그릴 때 깔끔하게
      ctx.drawImage(im, f.x, f.y, f.w, f.h, -f.bx * k, -f.by * k, f.w * k, f.h * k);
      ctx.restore();
      if (g.state === 'wait' && g.near) {
        text('매달리기!', gx - 0.7 * g.dir * U, gy - 74 + Math.sin(this.t * 5) * 3, { size: 22, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 5 });
      }
    }
  }
  // 성게를 다 치우면 화면 아래 작은 '바닷속 창'에 돌돔이 헤엄쳐 지나감
  drawFish() {
    const f = this.fishShow, a = Math.min(1, f / 0.4, (8 - f) / 0.5);
    const bw = 560, bh = 160, bx = (W - bw) / 2, by = H - bh - 70;
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    panel(bx - 6, by - 6, bw + 12, bh + 12, { r: 18, inner: false, fill: '#3a2f28' });
    const gr = ctx.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, '#5fb6e0'); gr.addColorStop(1, '#1f5f8f');
    ctx.fillStyle = gr; rrect(bx, by, bw, bh, 14); ctx.fill();
    ctx.save(); rrect(bx, by, bw, bh, 14); ctx.clip();
    // 바닥 해조류
    ctx.lineCap = 'round';
    for (let k = 0; k < 14; k++) { const x0 = bx + 20 + k * 40; ctx.strokeStyle = k % 2 ? '#2f8f4e' : '#46b05f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, by + bh); for (let j = 1; j <= 4; j++) ctx.lineTo(x0 + Math.sin(this.t * 2 + k + j) * 6, by + bh - j * 14); ctx.stroke(); }
    const fx = bx - 140 + (bw + 280) * Math.min(1, f / 7.5), fy = by + 10 + Math.sin(f * 3) * 8;
    ctx.imageSmoothingEnabled = true; drawFit(img('rockbream'), fx - 80, fy + 18, 160, 114); ctx.imageSmoothingEnabled = false;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
    for (let j = 0; j < 4; j++) { const bt = (f * 1.3 + j * 0.25) % 1; ctx.beginPath(); ctx.arc(fx + 60 + bt * 10, fy + 60 - bt * 60, 3 + j, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    text('돌돔이 놀러 왔어요!', W / 2, by - 44, { size: 28, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 6 });
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
    // 로봇은 색과 함께 모양으로도 구별: 빨강 네모, 초록 세모, 갈색 마름모, 파랑 동그라미, 문제 로봇은 테두리 있는 동그라미
    const mark = (px, py, r, c, shape) => {
      const X = mx(px), Y = my(py);
      ctx.fillStyle = c; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1;
      ctx.beginPath();
      if (shape === 'square') ctx.rect(X - r, Y - r, r * 2, r * 2);
      else if (shape === 'tri') { ctx.moveTo(X, Y - r * 1.2); ctx.lineTo(X + r * 1.1, Y + r * 0.8); ctx.lineTo(X - r * 1.1, Y + r * 0.8); ctx.closePath(); }
      else if (shape === 'diamond') { ctx.moveTo(X, Y - r * 1.3); ctx.lineTo(X + r, Y); ctx.lineTo(X, Y + r * 1.3); ctx.lineTo(X - r, Y); ctx.closePath(); }
      else ctx.arc(X, Y, r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    };
    for (const rb of this.robots) {
      if (rb.q) { if (rb.solved) dot(rb.x, rb.y, 2.5, '#9fb6c9'); else { dot(rb.x, rb.y, 4, '#fff'); dot(rb.x, rb.y, 3, '#1f6fc4'); } }   // 문제 로봇: 진한 파랑(풀면 흐리게)
      else if (rb.blue) mark(rb.x, rb.y, 2.5, '#4aa3e8', 'circle');      // 뛰어오르는 파란 장애물 로봇
      else if (rb.green) mark(rb.x, rb.y, 2.8, '#27ae60', 'tri');
      else if (rb.brown) mark(rb.x, rb.y, 2.6, '#9a6a3a', 'diamond');
      else mark(rb.x, rb.y, 2, '#c0392b', 'square');
    }
    for (const u of this.urchins) if (!u.got) dot(u.x, u.y, 2.2, '#5b2a7a');
    for (const g of this.gulls) { dot(g.x, g.y, 3.2, '#555'); dot(g.x, g.y, 2.2, '#fff'); }
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
      drawFit(img('dokdo_icon'), x + 4, y + 4, 50, 50, { frame: [160, 0, 160, 160], shade: got ? null : '#000' });   // 못 얻은 열쇠는 검정 그림자
      if (got && hit(x, y, 58, 58, 0)) this.modal = { type: 'key', n: k };
    }
    const sx = 14 + 3 * 66;
    panel(sx, 74, 58, 58, { r: 8, inner: false, fill: save.rescued[this.n - 1] ? '#d6f0c8' : '#bdb3a2', lw: 3 });
    if (this.d.spirit) { const info = spriteInfo(this.d.spirit.s); if (info?.im) drawFit(info.im, sx + 4, 78, 50, 50, { shade: save.rescued[this.n - 1] ? null : '#000' }); }   // 못 구한 정령은 검정 그림자
    if (this.p.shields.length) {
      // 보호막이 있을 때 위쪽 칸 옆에 표시
      const hx = 14 + 4 * 66, hy = 74;
      panel(hx, hy, 58, 58, { r: 8, inner: false, fill: '#d8f1ff', lw: 3 });
      ctx.strokeStyle = '#3aa0e0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(hx + 29, hy + 29, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(140,220,255,.5)'; ctx.fill();
      if (this.p.shields.length > 1) text('×' + this.p.shields.length, hx + 29, hy + 15, { size: 24, align: 'center', color: '#1f5f8f', stroke: '#fff', strokeW: 4 });
    }
    // 성게 남은 수
    if (this.urchins.length) {
      const ux = 14 + 5 * 66, done = this.urchins.filter(u => u.got).length, all = done === this.urchins.length;
      panel(ux, 74, 118, 58, { r: 8, inner: false, fill: all ? '#d6f0c8' : '#efe4cf', lw: 3 });
      this.drawUrchinAt(ux + 29, 106, 11, this.t);
      text(`${done}/${this.urchins.length}`, ux + 84, 88, { size: 26, align: 'center', color: all ? '#2f7a3a' : '#5b2a7a' });
    }
    // 걸린 시간 / 목표 시간 (별 하나)
    {
      const over = this.playTime > this.par;
      panel(536, 12, 236, 52, { r: 8, inner: false, fill: over ? '#e8d6cc' : '#f4e3c3' });
      text(`시간 ${fmtTime(this.playTime)} / 목표 ${fmtTime(this.par)}`, 654, 24, { size: 22, align: 'center', color: over ? '#9a3a2a' : '#2b2b2b' });
    }
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
      text('←/→ 이동  |  Space/↑ 점프 (공중에서 한 번 더: 더블 점프)  |  ↓ 아래 보기', 20, H - 40, { size: 20, color: '#fff', stroke: 'rgba(0,0,0,.55)', strokeW: 4 });
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
      if (info?.im) drawFit(info.im, 180, 240, 200, 200, { shade: save.rescued[this.n - 1] ? null : '#000' });   // 아직 구출하지 않은 정령은 검은 그림자
      textBox(d.hints[m.n - 1], 410, 196, W - 590, m.checkpoint ? 232 : 260, { size: 30 });   // 정령 그림 오른쪽 빈 곳 한가운데
      if (m.checkpoint) text('★ 이제 떨어지면 이 자리에서 다시 시작해요', 410 + (W - 590) / 2, 436, { size: 22, align: 'center', color: '#7a5a3a' });
      if (button('확인', W / 2 - 100, 470, 200, 60, { layer: L }) || keyHit('Enter', 'Space')) close();
    } else if (m.type === 'msg') {
      // 글이 길면(3줄 넘게) 창을 키워서 글자가 작아지지 않게
      const big = String(m.text).split('\n').length > 2 || String(m.text).length > 60;
      const ph = big ? 340 : 260, py = big ? 170 : 210;
      panel(110, py, W - 220, ph); face(m.face, 130, py + (ph - 90) / 2 - 85);
      textBox(m.text, 320, py + 16, W - 450, ph - 110, { size: 34 });   // 얼굴 오른쪽 빈 곳 한가운데
      if (button('확인', W / 2 - 100, py + ph - 80, 200, 60, { layer: L }) || keyHit('Enter', 'Space')) { close(); m.then?.(); }
    } else if (m.type === 'seq') {
      m.i = m.i || 0;
      panel(110, 210, W - 220, 260); face(m.face);
      textBox(m.texts[m.i], 320, 226, W - 450, 150, { size: 32 });
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
      const answers = d.answers, order = m.order || answers.map((_, i) => i);
      order.forEach((ai, k) => {
        const a = answers[ai];
        const x = 130 + (k % 2) * 520, y = 320 + Math.floor(k / 2) * 140;
        if (button(a.t, x, y, 500, 116, { layer: L, size: 32 })) this.answerGate(a);
      });
    } else if (m.type === 'save') {
      const bg = img('sp/' + d.saveBg);
      // 위: 제목, 가운데: 그림, 아래: 정령의 말 + 확인
      panel(140, 34, W - 280, 652, { fill: '#2d3a45' });
      text(`${game.data.hub.spiritNames[this.n - 1]}을(를) 구출했다!`, W / 2, 50, { size: 34, align: 'center', color: '#ffe066', stroke: '#2b2b2b', strokeW: 6 });
      text('독도 포인트 +10  |  ★ 이제 떨어지면 이 자리에서 다시 시작해요', W / 2, 94, { size: 24, align: 'center', color: '#fff' });
      if (bg) drawFit(bg, 170, 134, W - 340, 430);
      panel(200, 584, W - 590, 76, {});
      textBox(d.saveText, 220, 590, W - 630, 64, { size: 30 });
      if (button('확인', W - 370, 592, 170, 62, { layer: L, size: 28 }) || keyHit('Enter', 'Space')) close();
    } else if (m.type === 'guide') {
      panel(100, 30, W - 200, H - 60);
      drawFit(img('daddy_small'), 140, 44, 64, 64, { frame: [0, 0, 82, 82] });
      text('게임 방법 안내', 216, 56, { size: 40, color: '#7a3b12' });
      // 한 줄에 그림 하나 + 설명 하나
      const icons = [['boy_jump', [160, 0, 80, 80]], ['mover'], ['dokdo_icon', [160, 0, 160, 160]], ['spirit'], ['robo_blue', [0, 0, 80, 80]], ['robo_red', [0, 0, 80, 80]], ['robo_green', [0, 0, 80, 80]], ['robo_brown', [0, 0, 80, 80]], ['down'], ['urchin'], ['gull'], ['daddy_small', [0, 0, 82, 82]]];
      GUIDE.forEach((g, k) => {
        const y = 108 + k * 41;
        ctx.fillStyle = k % 2 ? 'rgba(122,59,18,.06)' : 'rgba(122,59,18,.12)'; ctx.fillRect(130, y, W - 260, 39);
        const [n, fr] = icons[k] || [];
        if (n === 'mover') { const t = spriteInfo('Platforms__Single'); if (t?.im) drawFit(t.im, 148, y + 5, 40, 30); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.strokeRect(148, y + 5, 40, 30); }
        else if (n === 'spirit') { const info = d.spirit ? spriteInfo(d.spirit.s) : null; if (info?.im) drawFit(info.im, 148, y + 1, 40, 37, { shade: save.rescued[this.n - 1] ? null : '#000' }); }
        else if (n === 'down') text('▼', 168, y + 2, { size: 30, align: 'center', color: '#7a3b12' });
        else if (n === 'urchin') this.drawUrchinAt(168, y + 21, 10, this.t);
        else if (n === 'gull') { const f = GULL.idle[0]; ctx.imageSmoothingEnabled = true; drawFit(img('gull'), 148, y + 1, 40, 37, { frame: [f.x, f.y, f.w, f.h] }); ctx.imageSmoothingEnabled = false; }
        else if (n) drawFit(img(n), 148, y + 1, 40, 37, { frame: fr });
        textBox(g, 214, y + 1, W - 360, 37, { size: 19, align: 'left' });
      });
      if (button('닫기', W / 2 - 90, H - 98, 180, 56, { layer: L }) || keyHit('Escape', 'Enter')) close();
    } else if (m.type === 'pause') {
      panel(W / 2 - 230, 180, 460, 360);
      text('잠깐 멈춤', W / 2, 206, { size: 40, align: 'center' });
      if (button('계속하기', W / 2 - 160, 280, 320, 70, { layer: L, size: 30 }) || (keyHit('Escape') && !soundPanel.isOpen)) close();
      if (button('스테이지 메뉴로', W / 2 - 160, 370, 320, 70, { layer: L, size: 30 })) go(nav.stageSelect());
      if (button('소리 설정', W / 2 - 160, 460, 320, 60, { layer: L, size: 26 })) soundPanel.open();
    } else if (m.type === 'clear') {
      panel(W / 2 - 380, 70, 760, 580);
      text(`스테이지${this.n} 클리어!`, W / 2, 96, { size: 54, align: 'center', color: '#3d7a2a' });
      // 별 3개: 하나씩 톡톡 나타남
      const el = this.t - (m.t0 ?? this.t), got = this.starGot || [false, false, false];
      const labels = [
        [`목표 시간 안에`, `${fmtTime(this.playTime)} / ${fmtTime(this.par)}`],
        ['독도 포인트 모두', `${this.coins.filter(c => c.got).length} / ${this.coins.length}`],
        ['로봇에게 안 잡히기', this.robotHits ? `${this.robotHits}번 잡힘` : '한 번도 안 잡힘'],
      ];
      for (let k = 0; k < 3; k++) {
        const cx = W / 2 + (k - 1) * 230, appear = el - 0.35 - k * 0.45;
        if (appear > 0 && (m.shown || 0) <= k) { m.shown = k + 1; if (got[k]) audio.sfx('star'); }
        const sc = appear <= 0 ? 0 : Math.min(1, appear / 0.18) * (1 + 0.25 * Math.max(0, 1 - appear / 0.35));
        if (sc > 0) {
          ctx.save(); ctx.translate(cx, 222); ctx.scale(sc, sc);
          text('★', 0, -50, { size: 96, align: 'center', color: got[k] ? '#ffcc33' : '#cfc4b3', stroke: got[k] ? '#9a6a10' : '#a99d8a', strokeW: 6 });
          ctx.restore();
        }
        text(labels[k][0], cx, 290, { size: 24, align: 'center', color: got[k] ? '#2b2b2b' : '#8a7a66' });
        text(labels[k][1], cx, 322, { size: 20, align: 'center', color: got[k] ? '#3d7a2a' : '#9a6a3a' });
      }
      const cnt = got.filter(Boolean).length;
      if (el > 1.8) text(cnt === 3 ? '별 3개! 완벽해요!' : (this.starBest > cnt ? `최고 기록은 별 ${this.starBest}개예요.` : '다시 도전해서 별을 모아 봐요!'), W / 2, 360, { size: 24, align: 'center', color: '#7a3b12' });
      textBox(save.rescued[this.n - 1] ? `${game.data.hub.spiritNames[this.n - 1]}도 구했어요!` : '이 스테이지의 정령을 아직 못 구했어요. 다시 와서 구해 주세요!', W / 2 - 330, 400, 660, 60, { size: 26 });
      textBox(`독도 석상에서 ${this.n}번 정령 퍼즐을 열 수 있어요!`, W / 2 - 330, 462, 660, 40, { size: 22, color: '#5a4a3a' });
      if (this.n < 10 && button('다음 스테이지', W / 2 - 300, 540, 280, 76, { layer: L, size: 30 })) go(nav.stage(this.n + 1));
      if (button('스테이지 메뉴', W / 2 + 20, 540, 280, 76, { layer: L, size: 30 })) go(nav.stageSelect());
    } else if (m.type === 'notpass') {
      panel(110, 190, W - 220, 320); face('daddy');
      textBox(NOT_PASS, 320, 206, W - 450, 196, { size: 30 });
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
    // 문제 이름이 어긋나도 번호(Q23 등)로 찾아가기 (원작 9스테이지에 'Q23_Stage8'로 잘못 적힌 로봇이 있었음)
    const qs = game.data.robotQuestions;
    this.q = qs[qid] || qs[Object.keys(qs).find(k => k.split('_')[0] === String(qid).split('_')[0])];
    this.back = back; this.onSolved = onSolved;
    if (!this.q) { this.broken = true; }
    else this.order = shuffled(this.q.choices.length);   // 정답 자리가 늘 같지 않게 보기 순서를 섞음
    this.i = 0; this.t = 0; this.state = 'intro'; this.msg = null;
    this.reveal = new CardReveal();
  }
  enter() { if (this.broken) { go(this.back); return; } audio.play('roboking_battle'); }
  update(dt) {
    this.t += dt;
    this.reveal.update(dt);
    if (this.state === 'intro' && this.t > 3.2) { this.t = 0; if (++this.i >= this.q.intro.length) this.state = 'question'; }
  }
  draw() {
    if (this.broken) return;
    const L = this.reveal.open ? 1 : 0;
    beginUI(L);
    drawCover(img('bg19'), 0, 0, W, H);
    const robot = (txt, withButton = true) => {
      panel(120, 470, W - 240, 200, { fill: 'rgba(235,245,255,.96)', line: '#1f3b5a' });
      drawFit(img('bg17'), 140, 330, 150, 180);
      textBox(txt, 310, 482, W - 450, withButton ? 110 : 176, { size: 36 });   // 로봇 오른쪽 빈 곳 한가운데 (버튼이 있으면 버튼 위)
    };
    if (this.state === 'intro') {
      robot(this.q.intro[this.i], false);
      if (button('넘기기', W - 220, 20, 190, 60) || keyHit('Space', 'Enter')) { this.state = 'question'; }
      else if (input.clicked && input.clickY > 120) { this.t = 0; if (++this.i >= this.q.intro.length) this.state = 'question'; }
    } else if (this.state === 'question') {
      panel(90, 60, W - 180, 300, { fill: 'rgba(235,245,255,.97)', line: '#1f3b5a' });
      text('문제', W / 2, 80, { size: 30, align: 'center', color: '#1f3b5a' });
      textBox(this.q.question, 130, 120, W - 260, 220, { size: 38 });
      this.order.forEach((ci, k) => {
        const c = this.q.choices[ci];
        if (button(c, 120 + k * 360, 400, 320, 200, { size: 34, fill: '#e8f2ff', hoverFill: '#fff' })) {
          if (ci === this.q.correct) {
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
          } else {
            // 틀리면: 웃으면서 정답을 알려 주고 끝 (보상 없음, 이 로봇은 이번 판에서 다시 문제를 내지 않음)
            audio.sfx('bad'); this.state = 'wrong';
            const ans = String(this.q.choices[this.q.correct]).replace(/\s*\n\s*/g, ' ');
            this.msg = `하.하.하.하.하.\n정답은 '${ans}' 이.다.`;
            this.onSolved?.();
          }
        }
      });
    } else if (this.state === 'wrong') {
      robot(this.msg);
      if (button('돌아가기', W - 360, 598, 220, 60) || keyHit('Enter', 'Space')) go(this.back);
    } else if (this.state === 'right') {
      if (!this.reveal.open) robot(this.q.right);
      if (!this.reveal.open && (button('돌아가기', W - 360, 598, 220, 60) || keyHit('Enter', 'Space'))) go(this.back);
    }
    this.reveal.draw(1);
  }
}
