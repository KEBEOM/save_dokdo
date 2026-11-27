// 시작 화면, 독도 마을(허브), 게임 선택 화면
import { W, H, ctx, img, sp, drawCover, drawFit, drawImg, panel, text, textBox, button, hit, input, keyHit, save, persist, resetSave, audio, game, go, fmt, dim, beginUI, ui, inside, font, skinned } from './core.js';
import { nav, drawPoints, Notice, Reader, iconButton, CardReveal, cardPicName, spiritSquash, soundPanel, creditsPanel } from './widgets.js';

export const SPIRIT_TITLES = ['독도의 높이', '화산섬이 생긴 순서', '독도와 울릉도의 거리', '독도의 보물', '독도의 여러 이름', '옛 이름이 나오는 기록', '옛 지도 속 독도', '고려 시대 기록', '조선 시대 기록', '독도와 일본'];
export const HERO_TITLES = ['이사부', '누군가 버리고 간 문서', '안용복', '홍순칠', '누군가 일부러 버린 문서'];
const HERO_COST = [30, 50, 80, 120, 150];
const HERO_PIC = [['hero_lee', ''], ['hero_leegyu', '이걸.. 찾았다네'], ['hero_ahn', ''], ['hero_hong', ''], ['hero_leegyu', '이걸.. 찾았다네']];
export const spiritMemCost = () => 20;
export const spiritShowCost = i => 10 * (i + 1);   // 마을에 정령 불러내기
export const cardPrice = buys => 30 + 10 * buys;    // 캐릭터·생물 카드 (점점 비싸짐)
const SPIRIT_FRAMES = [0, 0, 1, 2, 7, 5, 4, 6, 3, 8];
// 그림이 오른쪽을 보고 있는 정령 (독도 강치, 괭이갈매기). 나머지는 왼쪽을 봄

// 마을에서 정령이 다닐 수 있는 곳 (정령 몸 가운데 기준) — 석상 뒤쪽 풀밭까지
const AREA = { x0: 250, x1: 1030, y0: 160, y1: 640 };
// 버튼·글씨 위로는 올라가지 않게 피하는 곳: 정령 구출하기 아이콘, 석상 이름표·안내 글
const AVOID = [{ x0: 240, x1: 470, y0: 100, y1: 365 }, { x0: 470, x1: 810, y0: 430, y1: 525 }];
const STATUE_FEET = 444;   // 이 줄보다 위(뒤)에 선 정령은 석상 뒤에 가려짐
function keepInVillage(w) {
  if (w.x < AREA.x0 || w.x > AREA.x1) { w.vx = -(w.vx || 0); w.x = Math.max(AREA.x0, Math.min(AREA.x1, w.x)); }
  if (w.y < AREA.y0 || w.y > AREA.y1) { w.vy = -(w.vy || 0); w.y = Math.max(AREA.y0, Math.min(AREA.y1, w.y)); }
  for (const z of AVOID) {
    if (w.x > z.x0 && w.x < z.x1 && w.y > z.y0 && w.y < z.y1) {
      // 가장 가까운 가장자리로 밀어내고 반대로 돌아섬
      const d = [w.x - z.x0, z.x1 - w.x, w.y - z.y0, z.y1 - w.y], m = Math.min(...d);
      if (m === d[0]) w.x = z.x0; else if (m === d[1]) w.x = z.x1; else if (m === d[2]) w.y = z.y0; else w.y = z.y1;
      w.vx = -(w.vx || 0); w.vy = -(w.vy || 0);
    }
  }
}
function randomSpot() {
  for (let k = 0; k < 50; k++) {
    const w = { x: AREA.x0 + Math.random() * (AREA.x1 - AREA.x0), y: AREA.y0 + Math.random() * (AREA.y1 - AREA.y0) };
    if (!AVOID.some(z => w.x > z.x0 - 30 && w.x < z.x1 + 30 && w.y > z.y0 - 30 && w.y < z.y1 + 30)) return w;
  }
  return { x: 640, y: 600 };
}
export function spiritImage(i, skin = 0) {
  const base = i === 0 ? { im: img('water_mob'), frame: [0, 0, 160, 160] } : { im: img('spirits'), frame: [SPIRIT_FRAMES[i] * 160, 0, 160, 160] };
  if (!skin) return base;
  const c = skinned(base.im, base.frame, skin);   // 이로치(1)·황금(2) 정령
  return c ? { im: c, frame: [0, 0, 160, 160] } : base;
}
export const SKIN_NAMES = ['보통', '이로치', '황금'];

// ================================================================ 시작 화면
export class TitleScene {
  constructor() { this.notice = new Notice(); this.t = 0; }
  enter() { audio.play('daddy_theme'); }
  update(dt) { this.t += dt; }
  draw() {
    beginUI(soundPanel.isOpen || creditsPanel.isOpen ? 2 : this.notice.open ? 1 : 0);
    drawCover(img('bg1'), 0, 0, W, H);
    ctx.fillStyle = 'rgba(20,30,40,.25)'; ctx.fillRect(0, 0, W, H);
    const bob = Math.sin(this.t * 2) * 6;
    text('구해줘 독도!', W / 2, 120 + bob, { size: 120, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 14, shadow: 'rgba(0,0,0,.4)' });
    drawFit(img('dokdo_icon'), W / 2 - 70, 290 + bob, 140, 140, { frame: [160, 0, 160, 160] });
    const started = save.introSeen;
    if (button(started ? '이어서 하기' : '여기를 클릭하여 시작하세요!', W / 2 - 330, 470, 660, 96, { size: 40 })) {
      if (save.introSeen) go(nav.hub());
      else go(nav.intro());
    }
    if (started && button('처음부터 하기', W / 2 - 150, 590, 300, 64, { size: 28 })) {
      this.notice.push('지금까지 모은 포인트, 정령, 퍼즐이 모두 지워지고 처음부터 시작해요.\n정말 처음부터 할까요?', {
        title: '처음부터 하기', buttons: ['처음부터', '취소'],
        onClose: i => { if (i === 0) { resetSave(); go(nav.intro()); } },
      });
    }
    soundButton();
    if (button('만든 사람', 20, H - 70, 150, 54, { size: 22 })) creditsPanel.open();
    this.notice.draw(1);
    soundPanel.draw(2);
    creditsPanel.draw(2, game.data.credits);
  }
}

export function soundButton(layer = 0) {
  if (button('소리 설정', W - 170, H - 70, 150, 54, { size: 22, layer })) soundPanel.open();
}

// ================================================================ 독도 마을
export class HubScene {
  constructor() {
    this.notice = new Notice(); this.reader = new Reader(); this.reveal = new CardReveal();
    this.panel = null; this.page = 0; this.t = 0;
    this.walkers = [];
    this.bubble = null;
  }
  enter() {
    audio.play('quiet_forest');
    this.walkers = [];
    save.shown.forEach((on, i) => {
      if (on) this.walkers.push({ i, ...randomSpot(), vx: 0, vy: 0, tNext: Math.random() * 2, clicks: 0, flip: false });
    });
  }
  get layer() { return soundPanel.isOpen ? 5 : this.reveal.open ? 4 : this.notice.open ? 3 : this.reader.open ? 2 : this.panel ? 1 : 0; }
  update(dt) {
    this.t += dt;
    this.reveal.update(dt);
    this.updateDrag(dt);
    for (const w of this.walkers) {
      if (w.touch > 0) w.touch = Math.max(0, w.touch - dt);
      if (w.held) continue;                                   // 손으로 들고 있는 정령은 걷지 않음
      w.tNext -= dt;
      if (w.tNext <= 0) {
        // 쉬었다가, 아무 방향으로나 걸어감 (위아래는 조금 느리게 → 앞뒤로 걷는 느낌)
        if (w.vx || w.vy) { w.vx = 0; w.vy = 0; }
        else { const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 40; w.vx = Math.cos(a) * sp; w.vy = Math.sin(a) * sp * 0.6; }
        w.tNext = 1 + Math.random() * 2.5;
      }
      w.x += w.vx * dt; w.y += w.vy * dt;
      keepInVillage(w);
      if (Math.abs(w.vx) > 3) w.flip = w.vx < 0;   // 정령 그림은 모두 오른쪽을 보고 있음
    }
    // 정령끼리 너무 붙으면 서로 살짝 비켜서기 (겹쳐 보이지 않게)
    for (const a of this.walkers) for (const b of this.walkers) {
      if (a === b || a.held || b.held) continue;
      const dx = b.x - a.x, dy = (b.y - a.y) * 1.6, d = Math.hypot(dx, dy) || 1;
      if (d < 78) { const push = (78 - d) * 0.5 * Math.min(1, dt * 6); a.x -= dx / d * push; b.x += dx / d * push; a.y -= dy / d * push * 0.6; b.y += dy / d * push * 0.6; }
    }
    for (const w of this.walkers) if (!w.held) keepInVillage(w);
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
  }
  draw() {
    beginUI(this.layer);
    drawCover(img('forest'), 0, 0, W, H);
    ctx.fillStyle = 'rgba(255,240,200,.08)'; ctx.fillRect(0, 0, W, H);
    drawPoints(20, 20, ['dp'], { w: 220 });

    // 석상보다 뒤(위쪽)에 있는 정령은 석상보다 먼저 그려서 석상에 가려지게
    const order = [...this.walkers].sort((a, b) => a.y - b.y);
    for (const w of order) if (w.y + 40 < STATUE_FEET && !w.held) this.drawWalker(w);
    // 독도 석상
    if (iconButton(img('statue'), '독도 석상', 420, 22, 440, 440, { layer: 0 })) this.panel = 'memories';   // 예전의 2배 크기
    text('퍼즐을 열고 독도에 대하여 알아봅시다', 640, 504, { size: 20, align: 'center', color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
    // 정령 구출
    if (iconButton(img('water_icon'), '정령 구출하기', 290, 150, 130, 130, { layer: 0, frame: [Math.floor(this.t * 4) % 6 * 160, 0, 160, 160], bob: true })) { this.panel = 'spirits'; this.page = 0; }
    // 카드
    if (iconButton(img('card_icon'), '독도 캐릭터 카드', 60, 250, 140, 140, { layer: 0, frame: [0, 0, 162, 162] })) this.panel = 'character';
    if (iconButton(img('card_icon'), '독도 생물 카드', 60, 450, 140, 140, { layer: 0, frame: [162, 0, 162, 162] })) this.panel = 'creature';
    // 독도아저씨 (도움말)
    if (iconButton(img('daddy_small'), '독도 아저씨', 1080, 150, 130, 130, { layer: 0, frame: [Math.floor(this.t * 2) % 2 * 82, 0, 82, 82], flip: true })) this.panel = 'help';   // 그림은 오른쪽을 봐서 뒤집어 왼쪽(마을 쪽)을 보게
    // 독도 구출하러 가기
    if (iconButton(img('dokdo_icon'), '독도 구출하러 가기', 1060, 400, 170, 170, { layer: 0, frame: [160, 0, 160, 160], bob: true })) go(nav.select());

    // 마을에 나온 정령들 (석상 앞쪽, 들고 있는 정령은 맨 앞)
    for (const w of order) if (w.y + 40 >= STATUE_FEET && !w.held) this.drawWalker(w);
    for (const w of order) if (w.held) this.drawWalker(w);
    this.drawBubble();
    if (button('처음 화면', W - 170, 20, 150, 54, { size: 22 })) go(nav.title());
    soundButton();

    if (this.panel) { dim(0.5); this['draw_' + this.panel](); }
    this.reader.draw(2);
    this.notice.draw(3);
    this.reveal.draw(4);
    soundPanel.draw(5);
  }
  // 정령 하나 그리기 (발바닥 기준으로 늘였다 줄였다, 누르면 말하기)
  drawWalker(w) {
    const skin = (save.skin || [])[w.i] || 0;
    const s = spiritImage(w.i, skin);
    // 원작처럼 몸을 늘였다 줄였다 (발바닥 기준)
    const [sx, sy] = w.held ? [1.08, 1.08] : spiritSquash(this.t + w.i * 0.37, !!(w.vx || w.vy), w.touch || 0);
    const lift = w.held ? 18 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 40, 30 * sx, 8, 0, 0, Math.PI * 2); ctx.fill();
    drawImg(s.im, w.x - 45 * sx, w.y + 40 - 90 * sy - lift, 90 * sx, 90 * sy, { frame: s.frame, flip: w.flip });
    if (skin) {   // 이로치 정령은 반짝반짝
      ctx.fillStyle = skin === 2 ? '#ffe066' : '#ffd6f5';
      for (let k = 0; k < 3; k++) { const ph = this.t * 1.3 + k * 2.1 + w.i; const tw = (Math.sin(ph * 3) + 1) / 2; if (tw < 0.4) continue; const r = 3 + tw * 3; const px = Math.round(w.x + Math.cos(ph) * 40), py = Math.round(w.y - 10 + Math.sin(ph * 1.3) * 34 - lift); ctx.fillRect(px - r, py - 1, r * 2, 2); ctx.fillRect(px - 1, py - r, 2, r * 2); }
    }
    // 석상 뒤에 가려진 부분을 누르면 석상이 열리도록, 정령은 보이는 곳만 눌림
    const behind = w.y + 40 < STATUE_FEET && inside(input.clickX, input.clickY, 559, 70, 158, 374);
    if (!this.dropped && !w.held && !behind && hit(w.x - 45, w.y - 50, 90, 90, 0)) this.talk(w);
  }
  drawBubble() {
    if (this.bubble) {
      const b = this.bubble, w = 420;
      const bx = Math.max(10, Math.min(W - w - 10, b.x - w / 2)), by = Math.max(10, b.y - 170);
      panel(bx, by, w, 110, { r: 14, fill: '#fff' });
      textBox(b.msg, bx + 16, by + 8, w - 32, 94, { size: 24 });
    }
  }
  // 정령을 꾹 누르고(0.35초) 있으면 들어 올려 원하는 곳으로 옮길 수 있음
  updateDrag(dt) {
    this.dropped = false;
    if (this.layer !== 0) { this.press = null; return; }
    if (input.pressed && !this.press) {
      const w = [...this.walkers].sort((a, b) => b.y - a.y).find(w => inside(input.x, input.y, w.x - 45, w.y - 50, 90, 90));
      if (w) this.press = { w, t: 0, x: input.x, y: input.y, grab: false };
    }
    const pr = this.press;
    if (!pr) return;
    if (input.down) {
      pr.t += dt;
      if (!pr.grab && pr.t > 0.35) { pr.grab = true; pr.w.held = true; pr.w.vx = 0; audio.sfx('click'); }
      if (pr.grab) {
        const nx = Math.max(AREA.x0, Math.min(AREA.x1, input.x));
        if (nx < pr.w.x - 1) pr.w.flip = true; else if (nx > pr.w.x + 1) pr.w.flip = false;   // 옮기는 쪽을 바라봄
        pr.w.x = nx;
        pr.w.y = Math.max(AREA.y0, Math.min(AREA.y1, input.y - 10));   // 마을 풀밭 안에서만
      }
    } else {
      if (pr.grab) { keepInVillage(pr.w); pr.w.vx = pr.w.vy = 0; pr.w.held = false; pr.w.tNext = 2 + Math.random() * 2; pr.w.touch = 0.25; this.dropped = true; }
      this.press = null;
    }
  }
  talk(w) {
    const d = game.data;
    w.clicks++; w.touch = 0.25;
    let msg;
    if (w.clicks % 21 === 0 && save.easter < 6) {
      msg = d.spiritAnnoyed[save.easter];
      if (save.easter === 5) { save.dp += 20; audio.sfx('buy'); }
      save.easter++; persist();
    } else if (save.easter >= 6 && w.clicks % 21 === 0) {
      msg = d.spiritAfterEgg[Math.floor(Math.random() * d.spiritAfterEgg.length)];
    } else {
      const lines = d.spiritTalk[w.i];
      msg = lines[Math.floor(Math.random() * lines.length)];
    }
    this.bubble = { msg, x: w.x, y: w.y, t: 3.5 };
  }

  // ---------------------------------------------------------------- 패널: 독도 석상 (기억 퍼즐)
  draw_memories() {
    const L = 1;
    panel(80, 50, W - 160, H - 100);
    text('독도에서의 소중한 기억들', W / 2, 74, { size: 40, align: 'center', color: '#7a3b12' });
    const box = (x, title, desc, how, icon, frame, onClick) => {
      panel(x, 140, 500, 420, { fill: '#fff8ea' });
      text(title, x + 250, 160, { size: 36, align: 'center', color: '#7a3b12' });
      drawFit(img(icon), x + 160, 206, 180, 130, { frame });
      textBox(desc, x + 30, 346, 440, 76, { size: 25 });
      ctx.fillStyle = 'rgba(122,59,18,.2)'; ctx.fillRect(x + 60, 428, 380, 2);
      textBox(how, x + 30, 436, 440, 56, { size: 21, color: '#7a5a3a' });
      if (button('살펴보기', x + 150, 500, 200, 54, { layer: L, size: 26 })) onClick();
    };
    box(130, '정령들과의 추억', '독도에서 만난 정령들이\n독도 이야기를 들려줘요.', '스테이지를 깨고 독도 포인트로 퍼즐을 열어요.', 'spirits', [0, 0, 160, 160], () => { this.panel = 'spiritMem'; });
    box(650, '영웅들과의 추억', '독도를 지킨 영웅들과\n수상한 문서 이야기를 읽어 봐요.', '독도 포인트로 퍼즐을 열어요.\n카드 뒤집기 게임으로 포인트를 모아요.', 'hero_lee', null, () => { this.panel = 'heroMem'; });
    drawPoints(130, 580, ['dp'], { w: 220 });
    if (button('닫기', W - 260, H - 130, 150, 56, { layer: L })) this.panel = null;
  }
  memGrid(kind) {
    const L = 1;
    const isSpirit = kind === 'spirit';
    const n = isSpirit ? 10 : 5;
    const pz = game.puzzles[kind], pre = isSpirit ? 'spz' : 'hpz';
    const opened = i => (isSpirit ? save.spiritMem[i] : save.heroMem[i]);
    panel(40, 24, W - 80, H - 48);
    text(isSpirit ? '정령들과의 추억' : '영웅들과의 추억', 80, 44, { size: 38, color: '#7a3b12' });
    drawPoints(W - 300, 38, ['dp'], { w: 220 });
    text(`${Array.from({ length: n }, (_, i) => opened(i)).filter(Boolean).length} / ${n} 조각`, 420, 54, { size: 24, color: '#7a5a3a' });

    // 왼쪽: 원작처럼 조각을 맞춘 큰 그림 (열린 조각은 색, 닫힌 조각은 흑백)
    const fx = 64, fy = 104, fw = 600, fh = 560;
    panel(fx, fy, fw, fh, { fill: '#3a3f47', inner: false, r: 10 });
    const s = Math.min((fw - 24) / pz.w, (fh - 24) / pz.h), ox = fx + (fw - pz.w * s) / 2, oy = fy + (fh - pz.h * s) / 2;
    // 마우스가 가리키는 조각
    let hover = -1;
    if (ui.top === L && inside(input.x, input.y, ox, oy, pz.w * s, pz.h * s)) {
      const [gw, gh] = pz.grid, gx = Math.floor((input.x - ox) / (pz.w * s) * gw), gy = Math.floor((input.y - oy) / (pz.h * s) * gh);
      hover = pz.map.charCodeAt(gy * gw + gx) - 49;
    }
    if (this.hoverRow !== undefined && this.hoverRow >= 0) hover = this.hoverRow;
    for (let i = 0; i < n; i++) {
      const r = pz.rects[i];
      const im = img(pre + (opened(i) ? '_on' : '_off') + (i + 1));
      if (!im) continue;
      ctx.save();
      if (i === hover) { ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 18; }
      ctx.drawImage(im, ox + r[0] * s, oy + r[1] * s, (r[2] - r[0]) * s, (r[3] - r[1]) * s);
      ctx.restore();
    }
    if (hover >= 0) ui.cursor = 'pointer';
    if (hover >= 0 && hit(ox, oy, pz.w * s, pz.h * s, L)) this.openMem(kind, hover);

    // 오른쪽: 퍼즐 목록
    const lx = 690, lw = W - 64 - lx, top = 104;
    const rowH = isSpirit ? 44 : 88, gap = isSpirit ? 6 : 14;
    this.hoverRow = -1;
    for (let i = 0; i < n; i++) {
      const y = top + i * (rowH + gap), on = opened(i);
      const over = ui.top === L && inside(input.x, input.y, lx, y, lw, rowH);
      if (over) this.hoverRow = i;
      panel(lx, y, lw, rowH, { r: 8, fill: on ? '#fff8ea' : over ? '#efe4cf' : '#e3d6bf', inner: false, lw: 3 });
      ctx.fillStyle = on ? '#7a3b12' : '#8a7a66';
      ctx.beginPath(); ctx.arc(lx + 26, y + rowH / 2, 16, 0, Math.PI * 2); ctx.fill();
      text(String(i + 1), lx + 26, y + rowH / 2 - 12, { size: 20, align: 'center', color: '#fff' });
      const title = isSpirit ? SPIRIT_TITLES[i] : HERO_TITLES[i];
      text(title, lx + 54, y + (isSpirit ? 10 : 14), { size: 24, color: on ? '#3a2f28' : '#5a4a3a' });
      // 오른쪽 끝: 상태
      let status, col = '#5a4a3a';
      if (on) { status = '열림 ●'; col = '#3d8a3a'; }
      else if (isSpirit && !save.cleared[i]) { status = `${i + 1}스테이지 깨기`; col = '#9a6a3a'; }
      else status = `${fmt(isSpirit ? spiritMemCost(i) : HERO_COST[i])} 포인트`;
      if (isSpirit) text(status, lx + lw - 14, y + 12, { size: 20, align: 'right', color: col });
      else {
        text(status, lx + 54, y + 50, { size: 20, color: col });
        if (on) text('눌러서 읽기', lx + lw - 14, y + 50, { size: 18, align: 'right', color: '#7a5a3a' });
      }
      if (hit(lx, y, lw, rowH, L)) this.openMem(kind, i);
    }
    textBox(isSpirit ? '스테이지를 깨면 같은 번호 퍼즐을 열 수 있어요. 그림이나 목록을 눌러 보세요!'
      : '영웅 퍼즐을 1개 열면 카드 뒤집기 노멀, 3개 열면 하드 모드가 열려요.', lx, H - 102, lw - 210, 60, { size: 19, align: 'left', color: '#7a5a3a' });
    if (button('뒤로가기', W - 64 - 190, H - 100, 190, 56, { layer: L, size: 26 })) this.panel = 'memories';
  }
  draw_spiritMem() { this.memGrid('spirit'); }
  draw_heroMem() { this.memGrid('hero'); }
  openMem(kind, i) {
    const d = game.data;
    if (kind === 'spirit') {
      if (save.spiritMem[i]) {
        const s = spiritImage(i);
        this.reader.show({ sub: `정령들과의 추억 ${i + 1}`, name: SPIRIT_TITLES[i], text: d.spiritPuzzleTexts[i], image: i === 0 ? 'water_mob' : 'spirits', frame: s.frame, caption: d.hub.spiritNames[i] });
      } else if (!save.cleared[i]) {
        this.notice.push(`${i + 1}스테이지를 클리어해야\n${i + 1}번 퍼즐을 열 수 있어요.`, { title: '구해줘 독도정령!' });
      } else {
        const cost = spiritMemCost(i);
        if (save.dp < cost) this.notice.push(`포인트가 부족합니다.\n${i + 1}번 퍼즐은 독도 포인트가 ${cost}점 필요해요.`, { face: 'dp' });
        else this.notice.push(`${i + 1}번 퍼즐을 독도 포인트 ${cost}점을 사용하여\n구매하시겠습니까?`, {
          buttons: ['구입하기', '취소'], face: 'dp',
          onClose: k => { if (k === 0) { save.dp -= cost; save.spiritMem[i] = true; persist(); audio.sfx('buy'); this.openMem('spirit', i); } },
        });
      }
    } else {
      if (save.heroMem[i]) {
        const [pic, cap] = HERO_PIC[i];
        this.reader.show({ sub: `영웅들과의 추억 ${i + 1}`, name: HERO_TITLES[i], text: d.heroTexts[i], image: pic, caption: cap });
      } else {
        const cost = HERO_COST[i];
        if (save.dp < cost) this.notice.push(`${i + 1}번 퍼즐은 독도 포인트가 ${fmt(cost)}점 필요합니다.\n게임 난이도가 높을 수록 높은 점수를 받을 수 있습니다.`, { face: 'dp' });
        else this.notice.push(`퍼즐을 ${fmt(cost)}점 사용하여 열람하겠습니까?\n(독도 포인트 사용)`, {
          buttons: ['열람하기', '취소'], face: 'dp',
          onClose: k => { if (k === 0) { save.dp -= cost; save.heroMem[i] = true; persist(); audio.sfx('buy'); this.openMem('hero', i); } },
        });
      }
    }
  }

  // ---------------------------------------------------------------- 패널: 정령 구출 (마을에 불러내기)
  draw_spirits() {
    const L = 1, d = game.data.hub, i = this.page;
    panel(240, 30, 800, H - 60);
    text('정령 구출', 640, 46, { size: 40, align: 'center', color: '#7a3b12' });
    const shown = save.shown[i];
    const s = spiritImage(i, shown ? (save.skin[i] || 0) : 0);
    panel(440, 100, 400, 280, { fill: '#2d3a45', inner: false });
    ctx.save();
    { const [qx, qy] = spiritSquash(this.t, false); const bw = 260 * qx, bh = 260 * qy; drawImg(s.im, 640 - bw / 2, 370 - bh, bw, bh, { frame: s.frame, shade: shown ? null : '#000' }); }
    ctx.restore();
    if (!shown) drawFit(img('Lock'), 580, 180, 120, 120);
    text(`${i + 1} / 10`, 820, 108, { size: 22, align: 'right', color: '#f4e3c3' });
    text(d.spiritNames[i], 640, 392, { size: 36, align: 'center' });
    text(save.rescued[i] ? `${i + 1}스테이지에서 구출한 정령이에요` : `${i + 1}스테이지에 숨어 있는 정령이에요`, 640, 436, { size: 22, align: 'center', color: '#5a4a3a' });
    if (shown) {
      // 마을에서 보일 모습 고르기: 보통 / 이로치(어려움으로 깸) / 황금(매우 어려움으로 깸)
      text('구출 성공!', 460, 108, { size: 22, color: '#a8e08a' });
      for (let k = 0; k < 3; k++) {
        const bx = 452 + k * 128, by = 470, have = k === 0 || ((save.shiny[i] || 0) & k) !== 0, sel = (save.skin[i] || 0) === k;
        panel(bx, by, 120, 92, { r: 10, inner: false, lw: sel ? 5 : 3, fill: sel ? '#fff2c0' : have ? '#f4e3c3' : '#cfc6b6', line: sel ? '#c0702a' : '#3a2f28' });
        const sk = spiritImage(i, k);
        drawImg(sk.im, bx + 30, by + 4, 60, 60, { frame: sk.frame, shade: have ? null : '#000' });
        text(SKIN_NAMES[k], bx + 60, by + 64, { size: 20, align: 'center', color: have ? '#3a2f28' : '#6d665c' });
        if (hit(bx, by, 120, 92, L)) {
          if (have) { save.skin[i] = k; persist(); audio.sfx('click'); }
          else this.notice.push(`${i + 1}스테이지를 '${k === 1 ? '어려움' : '매우 어려움'}' 모드로 깨면\n${k === 1 ? '이로치(다른 색)' : '황금'} ${d.spiritNames[i]}을(를) 얻어요!\n(스테이지 메뉴 위에서 모드를 고를 수 있어요)`, { title: `${SKIN_NAMES[k]} 정령` });
        }
      }
    } else {
      const c1 = spiritShowCost(i);
      if (!save.rescued[i] || !save.cleared[i]) {
        // 그 스테이지를 깨고, 그 스테이지의 정령도 구출해야 마을로 데려올 수 있음
        const need = !save.cleared[i] && !save.rescued[i] ? `${i + 1}스테이지를 깨고 정령을 구출해야 해요` : !save.cleared[i] ? `${i + 1}스테이지를 깨야 해요` : `${i + 1}스테이지에서 정령을 구출해야 해요`;
        if (button(need, 440, 484, 400, 70, { layer: L, size: 24, fill: '#cfc6b6' })) this.notice.push(`${d.spiritNames[i]}을(를) 마을로 데려오려면\n${i + 1}스테이지를 깨고, 그 스테이지에 숨어 있는\n${d.spiritNames[i]}도 구출해야 해요.\n(스테이지 ${save.cleared[i] ? '깸' : '아직'}, 정령 ${save.rescued[i] ? '구출함' : '아직'})`, { title: '아직 데려올 수 없어요' });
      } else if (button(`${fmt(c1)} 포인트로 구출`, 440, 484, 400, 70, { layer: L, icon: img('dp'), size: 30 })) this.buySpirit(i, 'dp', c1);
    }
    if (button('◀', 270, 195, 80, 90, { layer: L, size: 34 }) || (keyHit('ArrowLeft') && L === ui.top)) this.page = (i + 9) % 10;
    if (button('▶', 930, 195, 80, 90, { layer: L, size: 34 }) || (keyHit('ArrowRight') && L === ui.top)) this.page = (i + 1) % 10;
    textBox('스테이지에서 구출한 정령은 포인트를 주고 마을로 데려올 수 있어요. 마을에 나온 정령은 이야기를 들려줘요!', 280, 584, 560, 64, { size: 20, align: 'left', color: '#5a4a3a' });
    if (button('닫기', 870, 588, 140, 56, { layer: L })) this.panel = null;
  }
  buySpirit(i, kind, cost) {
    const name = kind === 'dp' ? '독도 포인트' : '구출 포인트';
    if (save[kind] < cost) { this.notice.push(`${name}가 부족해요. (${fmt(cost)}점 필요)`, { face: kind === 'dp' ? 'dp' : 'savept' }); return; }
    this.notice.push(`${name} ${fmt(cost)}점으로 ${game.data.hub.spiritNames[i]}을(를) 구출할까요?`, {
      buttons: ['구출하기', '취소'],
      onClose: k => {
        if (k !== 0) return;
        save[kind] -= cost; save.shown[i] = true; persist(); audio.sfx('good');
        this.walkers.push({ i, x: 640, y: 600, vx: 0, vy: 0, tNext: 1, clicks: 0, flip: false });
      },
    });
  }

  // ---------------------------------------------------------------- 패널: 카드 모음
  cardPanel(kind) {
    const L = 1, d = game.data.hub;
    const isChar = kind === 'character';
    const cards = isChar ? d.characterCards : d.creatureCards;
    const owned = isChar ? save.character : save.creature;
    const price = cardPrice(isChar ? save.characterBuys : save.creatureBuys);
    const cur = 'dp';
    panel(60, 30, W - 120, H - 60);
    text(isChar ? '독도 캐릭터 카드' : '독도 생물 카드', 100, 50, { size: 38, color: '#7a3b12' });
    panel(470, 46, 260, 54, { r: 8, inner: false });
    drawFit(img('dp'), 478, 50, 46, 46);
    text(`다음 카드 ${fmt(price)}`, 720, 58, { size: 24, align: 'right' });
    drawPoints(760, 46, [cur], { w: 200 });
    const cols = isChar ? 5 : 8, cw = isChar ? 180 : 128, ch = isChar ? 200 : 150, gx = isChar ? 30 : 12, gy = isChar ? 24 : 12;
    const x0 = (W - (cols * cw + (cols - 1) * gx)) / 2, y0 = 120;
    cards.forEach((c, i) => {
      const cx = x0 + (i % cols) * (cw + gx), cy = y0 + Math.floor(i / cols) * (ch + gy);
      const frameName = { Panel: 'card_normal', NormalCard: 'card_normal', RareCard: 'card_rare', UniqueCard: 'card_unique' }[c.frame] || 'card_normal';
      drawFit(img(owned[i] ? frameName : 'card_normal'), cx, cy, cw, ch - 26);
      if (owned[i]) drawFit(cardPic(c.pic), cx + cw * 0.2, cy + (ch - 26) * 0.18, cw * 0.6, (ch - 26) * 0.6);
      else { ctx.save(); ctx.globalAlpha = 0.6; drawFit(img('Lock'), cx + cw * 0.3, cy + (ch - 26) * 0.25, cw * 0.4, (ch - 26) * 0.4); ctx.restore(); }
      text(owned[i] ? (isChar ? c.title.split(' [')[0] : c.quote) : String(i + 1), cx + cw / 2, cy + ch - 24, { size: isChar ? 20 : 18, align: 'center' });
      if (hit(cx, cy, cw, ch, L)) {
        if (owned[i]) this.reader.show(isChar ? { sub: '독도 캐릭터 카드 ' + (c.title.match(/\[.*\]/)?.[0] || ''), name: c.title.split(' [')[0], quote: c.quote, text: c.desc, image: cardPicName(c.pic) } : { sub: '독도 생물 카드 | ' + c.title.replace('독도의 ', ''), name: c.quote, text: c.desc, image: cardPicName(c.pic) });
        else if (save[cur] < price) this.notice.push(`독도 포인트가 ${fmt(price)}점 필요해요.\n${isChar ? '' : '파란 로봇의 퀴즈를 풀어도 생물 카드를 얻을 수 있어요!'}`, { face: 'dp' });
        else this.notice.push(`${i + 1}번 카드를 ${fmt(price)}점에 살까요?\n(카드의 가격은 점점 비싸져요)`, {
          buttons: ['사기', '취소'],
          onClose: k => {
            if (k !== 0) return;
            save[cur] -= price; owned[i] = true;
            if (isChar) save.characterBuys++; else save.creatureBuys++;
            persist(); audio.sfx('buy');
            this.reveal.show({ pic: c.pic, frame: c.frame, kind: isChar ? '캐릭터 카드' : '생물 카드', name: isChar ? c.title.split(' [')[0] : c.quote, extra: isChar ? '' : c.title });
          },
        });
      }
    });
    textBox(isChar ? '열리지 않은 카드를 클릭하면 독도 포인트로 카드를 살 수 있어요. 독도 캐릭터에 대한 정보들을 알 수 있어요!'
      : '게임을 진행하며 만나는 파란 로봇의 퀴즈를 풀면 카드를 얻을 수 있어요! 독도 포인트로 살 수도 있어요.', 100, H - 110, W - 400, 60, { size: 21, align: 'left', color: '#5a4a3a' });
    if (button('닫기', W - 260, H - 110, 150, 56, { layer: L })) this.panel = null;
  }
  draw_character() { this.cardPanel('character'); }
  draw_creature() { this.cardPanel('creature'); }

  // ---------------------------------------------------------------- 패널: 도움말
  draw_help() {
    const L = 1;
    panel(90, 40, W - 180, H - 80);
    drawFit(img('daddy'), 110, 60, 220, 220);
    text('독도 아저씨의 도움말', 360, 70, { size: 38, color: '#7a3b12' });
    const lines = [
      ['독도 구출하러 가기', '생물 카드 뒤집기, 달리고 구하고 풀어라!, 독도를 건 마지막 승부를 할 수 있어요.'],
      ['독도 석상', '퍼즐을 열고 독도에 대하여 알아봅시다. 정령 퍼즐과 영웅 퍼즐 모두 독도 포인트로 열어요.'],
      ['정령 구출하기', '스테이지에서 구출한 정령을 포인트로 마을에 불러낼 수 있어요. 정령을 누르면 이야기를 들려줘요.'],
      ['독도 캐릭터 카드', '독도 캐릭터들에 대한 정보를 알 수 있습니다.'],
      ['독도 생물 카드', '독도에 살고있는 생물들에 대한 정보를 얻을 수 있습니다.'],
      ['마지막 승부', '10스테이지까지 정령 10명을 모두 구하면 로보킹과 독도를 건 퀴즈 배틀을 할 수 있어요!'],
    ];
    lines.forEach(([h, d], i) => {
      const y = 122 + i * 76;
      text('● ' + h, 360, y, { size: 27, color: '#2b2b2b' });
      textBox(d, 384, y + 34, W - 520, 34, { size: 20, align: 'left', valign: 'top', color: '#5a4a3a' });
    });
    if (button('닫기', W - 270, H - 112, 150, 56, { layer: L })) this.panel = null;
  }
}

function cardPic(pic) { const n = cardPicName(pic); return n ? img(n) : null; }

// ================================================================ 게임 선택 (생물 카드 / 달리기 / 마지막 승부)
export class SelectScene {
  constructor() { this.notice = new Notice(); this.t = 0; }
  enter() { audio.play('run_intro'); }
  update(dt) { this.t += dt; }
  draw() {
    beginUI(this.notice.open ? 1 : 0);
    drawCover(img('bg1'), 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(0, 0, W, H);
    text('독도 구출하러 가기', W / 2, 60, { size: 54, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 10 });
    const allSpirits = save.rescued.every(Boolean);
    const tiles = [
      { t: '생물 카드\n뒤집기!', go: () => go(nav.cardMode()) },
      { t: '달리고\n구하고\n풀어라!', go: () => go(save.runIntroSeen ? nav.stageSelect() : nav.runIntro()) },
      { t: allSpirits ? '독도를 건\n마지막 승부' : '???', locked: !allSpirits, go: () => go(nav.beforeFinal()) },
    ];
    tiles.forEach((tl, i) => {
      const x = 160 + i * 340, y = 190;
      const bob = Math.sin(this.t * 2 + i) * 5;
      drawFit(img(tl.locked ? 'TitleBlockBlack' : (i === 2 ? 'sub_title_3' : 'titleblock')), x, y + bob, 280, 280);
      textBox(tl.t, x + 30, y + 60 + bob, 220, 160, { size: 40, color: tl.locked ? '#ddd' : '#fff', stroke: '#2b2b2b', strokeW: 8 });
      if (hit(x, y, 280, 280, 0)) {
        audio.sfx('click');
        if (tl.locked) this.notice.push(`정령을 모두 구출해야 마지막 승부를 할 수 있어요.\n(구출한 정령 ${save.rescued.filter(Boolean).length} / 10)`, { face: 'water_icon' });
        else tl.go();
      }
    });
    drawFit(img('boy_stand'), 40, H - 200, 160, 160, { frame: [Math.floor(this.t * 6) % 9 * 80, 0, 80, 80] });
    if (button('돌아가기', W - 240, H - 100, 200, 70, { size: 30 })) go(nav.hub());
    this.notice.draw(1);
  }
}
