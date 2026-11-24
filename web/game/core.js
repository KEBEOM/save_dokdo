// 구해줘 독도! — 웹 버전 공통 엔진: 화면, 입력, 소리, 저장, 그림, 글자, UI, 장면 전환
export const W = 1280, H = 720;
export const FONT = '"DoHyeon", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');

// ---------------------------------------------------------------- 화면 크기
let dpr = 1;
export function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
  canvas.style.width = cw + 'px';
  canvas.style.height = ch + 'px';
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
}
export function beginFrame() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

// ---------------------------------------------------------------- 입력
export const input = {
  x: 0, y: 0, down: false, pressed: false, released: false,
  clickX: -1, clickY: -1, clicked: false, wheel: 0,
  keys: new Set(), keyPressed: new Set(), touch: false,
  pointers: new Map(), // 멀티터치(이동 버튼용)
};
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}
canvas.addEventListener('pointerdown', e => {
  const [x, y] = toLogical(e);
  input.x = x; input.y = y; input.down = true; input.pressed = true;
  input.downX = x; input.downY = y;
  if (e.pointerType === 'touch') input.touch = true;
  input.pointers.set(e.pointerId, { x, y });
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  audio.unlock();
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => {
  const [x, y] = toLogical(e);
  input.x = x; input.y = y;
  if (input.pointers.has(e.pointerId)) input.pointers.set(e.pointerId, { x, y });
});
function endPointer(e) {
  const [x, y] = toLogical(e);
  input.pointers.delete(e.pointerId);
  if (input.pointers.size === 0) input.down = false;
  input.released = true;
  input.clicked = true; input.clickX = x; input.clickY = y;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', e => { input.pointers.delete(e.pointerId); if (!input.pointers.size) input.down = false; });
canvas.addEventListener('wheel', e => { input.wheel += e.deltaY; e.preventDefault(); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (!input.keys.has(e.code)) input.keyPressed.add(e.code);
  input.keys.add(e.code);
  audio.unlock();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => input.keys.delete(e.code));
window.addEventListener('blur', () => { input.keys.clear(); input.pointers.clear(); input.down = false; });
export function endInputFrame() {
  input.pressed = false; input.released = false; input.clicked = false; input.wheel = 0;
  input.keyPressed.clear();
}
export const keyDown = (...codes) => codes.some(c => input.keys.has(c));
export const keyHit = (...codes) => codes.some(c => input.keyPressed.has(c));

// ---------------------------------------------------------------- 저장
const SAVE_KEY = 'saveDokdo.v1';
export function defaultSave() {
  return {
    dp: 0, hearts: 0, savePts: 0,
    introSeen: false, runIntroSeen: false, leeSeen: false,
    unlockedStage: 1, cleared: Array(10).fill(false),
    rescued: Array(10).fill(false),      // 달리기에서 구한 정령 (isGetSpirit)
    shown: Array(10).fill(false),        // 마을에 불러낸 정령
    keys: {},                            // 스테이지별 열쇠 [bool,bool,bool]
    coins: {},                           // 스테이지별 먹은 독도 포인트 번호
    robotQ: {},                          // 파란 로봇 문제를 처음 맞혔는지
    creature: Array(24).fill(false), creatureBuys: 0,
    character: Array(10).fill(false), characterBuys: 0,
    spiritMem: Array(10).fill(false), heroMem: Array(5).fill(false),
    easter: 0, finalCleared: false, lastCardScore: 0,
  };
}
export let save = loadSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = Object.assign(defaultSave(), JSON.parse(raw));
      // 화폐를 독도 포인트 하나로 통일: 예전 카드 점수(÷10)와 구출 포인트를 옮겨 담음
      if (s.hearts || s.savePts) { s.dp += Math.floor((s.hearts || 0) / 10) + (s.savePts || 0); s.hearts = 0; s.savePts = 0; }
      return s;
    }
  } catch (_) {}
  return defaultSave();
}
export function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {}
}
export function resetSave() { save = defaultSave(); persist(); }

// ---------------------------------------------------------------- 그림
const images = new Map();
export function img(name) {
  let e = images.get(name);
  if (!e) {
    const im = new Image();
    e = { im, ok: false };
    im.onload = () => { e.ok = true; };
    im.src = name.includes('/') ? `assets/${name}.png` : `assets/img/${name}.png`;
    images.set(name, e);
  }
  return e.ok ? e.im : null;
}
export const sp = key => key ? img('sp/' + key) : null;
export function preload(names) {
  return Promise.all(names.map(n => new Promise(res => {
    img(n); const e = images.get(n);
    if (e.ok) return res();
    e.im.addEventListener('load', res, { once: true });
    e.im.addEventListener('error', res, { once: true });
  })));
}
export function drawImg(im, x, y, w, h, opts = {}) {
  if (!im) return;
  ctx.save();
  if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
  if (opts.flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); x = 0; y = 0; }
  if (opts.frame) {
    const [fx, fy, fw, fh] = opts.frame;
    ctx.drawImage(im, fx, fy, fw, fh, x, y, w, h);
  } else ctx.drawImage(im, x, y, w, h);
  ctx.restore();
}
// 비율을 지키며 상자 안에 맞춰 그리기
export function drawFit(im, x, y, w, h, opts = {}) {
  if (!im) return;
  const iw = opts.frame ? opts.frame[2] : im.width, ih = opts.frame ? opts.frame[3] : im.height;
  const s = Math.min(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  drawImg(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, opts);
}
export function drawCover(im, x, y, w, h) {
  if (!im) return;
  const s = Math.max(w / im.width, h / im.height);
  const dw = im.width * s, dh = im.height * s;
  ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

// ---------------------------------------------------------------- 글자
export function font(size, weight = '') { return `${weight} ${size}px ${FONT}`; }
export function wrap(text, maxW, size) {
  ctx.font = font(size);
  const out = [];
  for (const para of String(text).split('\n')) {
    if (para === '') { out.push(''); continue; }
    let line = '';
    const words = para.split(/(\s+)/);
    for (const wd of words) {
      const test = line + wd;
      if (ctx.measureText(test).width <= maxW || line === '') {
        if (ctx.measureText(test).width > maxW) {
          // 한 단어가 너무 길면 글자 단위로 자르기
          for (const ch of wd) {
            if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ''; }
            line += ch;
          }
        } else line = test;
      } else {
        out.push(line.trimEnd());
        line = wd.trimStart();
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}
export function text(str, x, y, opts = {}) {
  const size = opts.size || 28;
  ctx.font = font(size);
  ctx.textAlign = opts.align || 'left';
  ctx.textBaseline = opts.baseline || 'top';
  if (opts.shadow) { ctx.fillStyle = opts.shadow; ctx.fillText(str, x + Math.max(2, size / 14), y + Math.max(2, size / 14)); }
  if (opts.stroke) { ctx.lineWidth = opts.strokeW || 6; ctx.strokeStyle = opts.stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = opts.color || '#2b2b2b';
  ctx.fillText(str, x, y);
}
// 상자 안에 여러 줄 글자 (가운데/왼쪽 정렬), 넘치면 글자 크기를 줄임
export function textBox(str, x, y, w, h, opts = {}) {
  let size = opts.size || 28;
  let lines, lh;
  for (;;) {
    lines = wrap(str, w, size);
    lh = Math.round(size * (opts.lineH || 1.35));
    if (lines.length * lh <= h || size <= (opts.minSize || 14)) break;
    size -= 1;
  }
  const total = lines.length * lh;
  let yy = opts.valign === 'top' ? y : y + (h - total) / 2;
  const align = opts.align || 'center';
  const xx = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
  for (const ln of lines) { text(ln, xx, yy, { ...opts, size, align }); yy += lh; }
  return { size, lines: lines.length };
}

// ---------------------------------------------------------------- 패널(9-slice 대신 도트풍 상자)
export function panel(x, y, w, h, opts = {}) {
  const r = opts.r ?? 10;
  ctx.save();
  ctx.fillStyle = opts.shadow ?? 'rgba(0,0,0,.35)';
  rrect(x + 5, y + 6, w, h, r); ctx.fill();
  ctx.fillStyle = opts.fill || '#f4e3c3';
  rrect(x, y, w, h, r); ctx.fill();
  ctx.lineWidth = opts.lw || 4;
  ctx.strokeStyle = opts.line || '#3a2f28';
  rrect(x, y, w, h, r); ctx.stroke();
  if (opts.inner !== false) {
    ctx.lineWidth = 2; ctx.strokeStyle = opts.innerLine || 'rgba(255,255,255,.55)';
    rrect(x + 6, y + 6, w - 12, h - 12, Math.max(2, r - 5)); ctx.stroke();
  }
  ctx.restore();
}
export function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function dim(a = 0.55) { ctx.fillStyle = `rgba(0,0,0,${a})`; ctx.fillRect(0, 0, W, H); }

// ---------------------------------------------------------------- UI (즉시 모드 버튼)
// layer: 모달이 열려 있으면 아래층 버튼은 눌리지 않음
export const ui = { layer: 0, top: 0, hover: false, cursor: 'default' };
export function beginUI(top) { ui.top = top; ui.cursor = 'default'; }
export function inside(px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; }
export function hit(x, y, w, h, layer = 0) {
  if (layer !== ui.top) return false;
  if (inside(input.x, input.y, x, y, w, h) && !input.touch) ui.cursor = 'pointer';
  return input.clicked && inside(input.clickX, input.clickY, x, y, w, h) && inside(input.downX ?? -1, input.downY ?? -1, x - 30, y - 30, w + 60, h + 60);
}
export function button(label, x, y, w, h, opts = {}) {
  const layer = opts.layer || 0;
  const active = layer === ui.top && !opts.disabled;
  const hov = active && inside(input.x, input.y, x, y, w, h) && !input.touch;
  const press = active && input.down && inside(input.x, input.y, x, y, w, h);
  const dy = press ? 3 : 0;
  panel(x, y + dy, w, h, {
    fill: opts.disabled ? '#b9b2a5' : (hov ? (opts.hoverFill || '#fff2d6') : (opts.fill || '#f4e3c3')),
    line: opts.line || '#3a2f28', r: opts.r ?? 10, lw: opts.lw, shadow: press ? 'rgba(0,0,0,.15)' : undefined,
  });
  if (opts.icon) drawFit(opts.icon, x + 10, y + dy + 8, h - 16, h - 16, { frame: opts.iconFrame });
  const tx = opts.icon ? x + h : x, tw = opts.icon ? w - h - 8 : w;
  if (label) textBox(label, tx + 8, y + dy + 4, tw - 16, h - 8, { size: opts.size || 26, color: opts.disabled ? '#6d665c' : (opts.color || '#2b2b2b'), minSize: 12 });
  if (hov) ui.cursor = 'pointer';
  if (!opts.disabled && hit(x, y, w, h, layer)) { audio.sfx('click'); return true; }
  return false;
}

// ---------------------------------------------------------------- 소리
export const audio = {
  ctx: null, music: null, musicName: null, muted: false, unlocked: false,
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    if (this.music && this.music.paused && !this.muted) this.music.play().catch(() => {});
  },
  play(name, loop = true) {
    if (this.musicName === name && this.music) {
      this.music.loop = loop;
      if (this.music.ended && loop) { this.music.currentTime = 0; if (this.unlocked && !this.muted) this.music.play().catch(() => {}); }
      return;
    }
    this.stop();
    this.musicName = name;
    if (!name) return;
    const a = new Audio(`assets/music/${name}.mp3`);
    a.loop = loop; a.volume = 0.45;
    this.music = a;
    if (this.unlocked && !this.muted) a.play().catch(() => {});
  },
  stop() { if (this.music) { this.music.pause(); this.music = null; } this.musicName = null; },
  toggleMute() {
    this.muted = !this.muted;
    if (this.music) { if (this.muted) this.music.pause(); else this.music.play().catch(() => {}); }
  },
  // 간단한 효과음 (파일 없이 소리 합성)
  sfx(kind) {
    if (this.muted || !this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const tone = (freq, dur, type = 'square', vol = 0.08, when = 0, slide = 0) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t + when);
      if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + when + dur);
      g.gain.setValueAtTime(vol, t + when); g.gain.exponentialRampToValueAtTime(0.0001, t + when + dur);
      o.connect(g); g.connect(c.destination); o.start(t + when); o.stop(t + when + dur + 0.02);
    };
    switch (kind) {
      case 'click': tone(660, 0.06, 'square', 0.04); break;
      case 'jump': tone(380, 0.14, 'square', 0.05, 0, 380); break;
      case 'coin': tone(988, 0.07, 'square', 0.05); tone(1318, 0.12, 'square', 0.05, 0.07); break;
      case 'key': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.07, i * 0.07)); break;
      case 'good': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, i * 0.09)); break;
      case 'bad': tone(220, 0.25, 'sawtooth', 0.05, 0, -90); break;
      case 'hurt': tone(300, 0.2, 'square', 0.06, 0, -200); break;
      case 'flip': tone(520, 0.05, 'triangle', 0.06); break;
      case 'buy': [659, 880, 1318].forEach((f, i) => tone(f, 0.1, 'square', 0.05, i * 0.06)); break;
    }
  },
};

// ---------------------------------------------------------------- 장면 관리 (화면 전환 페이드)
export const game = { scene: null, next: null, fade: 0, fadeDir: 0, data: null, time: 0 };
export function go(scene) {
  if (game.fadeDir === 1) return;
  game.next = scene; game.fadeDir = 1;
}
export function setScene(scene) {
  game.scene = scene;
  scene.enter?.();
}
export function stepScene(dt) {
  if (game.fadeDir === 1) {
    game.fade = Math.min(1, game.fade + dt * 4);
    if (game.fade >= 1) { setScene(game.next); game.next = null; game.fadeDir = -1; }
  } else if (game.fadeDir === -1) {
    game.fade = Math.max(0, game.fade - dt * 4);
    if (game.fade <= 0) game.fadeDir = 0;
  }
}

// ---------------------------------------------------------------- 숫자 표시
export const fmt = n => Math.round(n).toLocaleString('ko-KR');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
