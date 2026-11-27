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
// 폰에서 꾹 누를 때 뜨는 선택·복사 메뉴, 두 번 눌러 확대 막기 (포인터 입력은 그대로 들어옴)
for (const t of ['touchstart', 'touchmove', 'touchend']) canvas.addEventListener(t, e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('contextmenu', e => e.preventDefault());
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
    unlockedStage: 1, cleared: Array(10).fill(false),   // 어느 난이도든 깬 기록 (마을·이야기용)
    byMode: {},                          // 난이도마다 따로: { easy: { unlocked, cleared[], stars[], best[] }, ... }
    rescued: Array(10).fill(false),      // 달리기에서 구한 정령 (isGetSpirit): 어느 난이도든 한 번이라도 구하면 true (마을·마지막 승부용)
    rescuedMode: { easy: Array(10).fill(false), normal: Array(10).fill(false), hard: Array(10).fill(false), veryhard: Array(10).fill(false) },   // 난이도마다 따로 구한 정령
    shown: Array(10).fill(false),        // 마을에 불러낸 정령
    keys: {},                            // 스테이지별 열쇠 [bool,bool,bool]
    coins: {},                           // 스테이지별 먹은 독도 포인트 번호
    robotQ: {},                          // 파란 로봇 문제를 처음 맞혔는지
    creature: Array(24).fill(false), creatureBuys: 0,
    character: Array(10).fill(false), characterBuys: 0,
    spiritMem: Array(10).fill(false), heroMem: Array(5).fill(false),
    easter: 0, finalCleared: false, lastCardScore: 0,
    stars: Array(10).fill(0),            // 스테이지마다 받은 별 (가장 많이 받은 개수)
    bestTime: Array(10).fill(0),         // 스테이지마다 가장 빨리 깬 시간(초), 0이면 아직 없음
    mode: 'normal',                      // 달리기 모드: easy(쉬움) · normal(보통) · hard(어려움) · veryhard(매우 어려움)
    shiny: Array(10).fill(0),            // 얻은 정령 모습: 1 = 어려움으로 깸(색이 다름), 2 = 매우 어려움으로 깸(황금), 4 = 쉬움으로 깸(흑백)
    skin: Array(10).fill(0),             // 마을에 데려온 정령 모습: 0 보통, 1 색이 다름, 2 황금, 3 흑백
    tips: {},                            // 한 번만 보여 주는 안내
  };
}
export let save = loadSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const s = Object.assign(defaultSave(), data);
      // 난이도별 구출 기록이 없던 예전 저장: 그때까지 구한 정령은 '보통'에서 구한 것으로 옮김
      if (!data.rescuedMode) s.rescuedMode.normal = (s.rescued || []).map(Boolean);
      for (const m of ['easy', 'normal', 'hard', 'veryhard']) if (!Array.isArray(s.rescuedMode[m])) s.rescuedMode[m] = Array(10).fill(false);
      // 예전에는 매우 어려움으로 깨면 색이 다른 정령까지 함께 줬음: 어려움에서 정령을 구한 적이 없으면 색이 다른 정령은 거둬들임 (한 번만)
      // 난이도별 스테이지 기록이 없던 예전 저장: 그때까지의 기록은 '보통'으로 옮김 (다른 난이도는 1스테이지부터)
      if (!data.byMode) s.byMode = { normal: { unlocked: s.unlockedStage || 1, cleared: (s.cleared || []).map(Boolean), stars: (s.stars || []).slice(), best: (s.bestTime || []).slice() } };
      if (!s.shinyFix1) {
        s.shinyFix1 = true;
        (s.shiny || []).forEach((v, i) => {
          if ((v & 2) && (v & 1) && !s.rescuedMode.hard[i]) { s.shiny[i] = v & ~1; if (s.skin[i] === 1) s.skin[i] = 2; }
        });
      }
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
// 그림에서 실제로 칠해진 부분의 범위 (투명한 여백 빼고) → [왼, 위, 오른, 아래] 비율. 한 번 재면 기억해 둠
const boxCache = new Map();
export function opaqueBox(im, frame) {
  if (!im || !im.width) return [0, 0, 1, 1];
  const key = (im.src || '') + '|' + (frame || []).join(',');
  let b = boxCache.get(key);
  if (b) return b;
  const [fx, fy, fw, fh] = frame || [0, 0, im.width, im.height];
  const c = document.createElement('canvas'); c.width = fw; c.height = fh;
  const g = c.getContext('2d'); g.drawImage(im, fx, fy, fw, fh, 0, 0, fw, fh);
  let x0 = fw, y0 = fh, x1 = 0, y1 = 0;
  try {
    const d = g.getImageData(0, 0, fw, fh).data;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  } catch (_) { x0 = 0; y0 = 0; x1 = fw - 1; y1 = fh - 1; }
  b = x1 >= x0 ? [x0 / fw, y0 / fh, (x1 + 1) / fw, (y1 + 1) / fh] : [0, 0, 1, 1];
  boxCache.set(key, b);
  return b;
}
// 그림 모양 그대로 한 가지 색으로 칠한 그림자 (원작에서 아직 얻지 못한 열쇠·정령을 검정으로 가린 방식)
// 캔버스 필터를 쓰지 않아 아이폰 사파리에서도 똑같이 보임
const shadeCache = new Map();
function shaded(im, frame, color) {
  const key = (im.src || '') + '|' + (frame || []).join(',') + '|' + color;
  let c = shadeCache.get(key);
  if (!c && im.width) {
    const [fx, fy, fw, fh] = frame || [0, 0, im.width, im.height];
    c = document.createElement('canvas'); c.width = fw; c.height = fh;
    const g = c.getContext('2d');
    g.drawImage(im, fx, fy, fw, fh, 0, 0, fw, fh);
    g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, fw, fh);
    shadeCache.set(key, c);
  }
  return c;
}
// 색이 다른 정령 그림: 1 = 다른 색(색상 돌리기), 2 = 황금빛. 테두리(아주 어두운 색)는 그대로 둠
const skinCache = new Map();
// mask를 주면 마스크가 칠해진 곳(정령 몸)만 색을 바꿈: 구출 장면 그림처럼 배경이 있는 그림용
export function skinned(im, frame, skin, mask) {
  if (!skin || !im || !im.complete || !im.naturalWidth) return null;
  if (mask && (!mask.complete || !mask.naturalWidth)) return null;
  const key = im.src + '|' + frame.join(',') + '|' + skin + (mask ? '|' + mask.src : '');
  if (skinCache.has(key)) return skinCache.get(key);
  const c = document.createElement('canvas'); c.width = frame[2]; c.height = frame[3];
  const g = c.getContext('2d'); g.drawImage(im, frame[0], frame[1], frame[2], frame[3], 0, 0, frame[2], frame[3]);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  let mk = null;
  if (mask) { const mc = document.createElement('canvas'); mc.width = c.width; mc.height = c.height; const mg = mc.getContext('2d'); mg.drawImage(mask, 0, 0, c.width, c.height); mk = mg.getImageData(0, 0, c.width, c.height).data; }
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3] || (mk && !mk[i + 3])) continue;
    let r = a[i] / 255, gg = a[i + 1] / 255, b = a[i + 2] / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2;
    if (l < 0.2) continue;   // 테두리
    let h = 0, s2 = 0;
    if (mx !== mn) {
      const dd = mx - mn; s2 = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
      h = mx === r ? (gg - b) / dd + (gg < b ? 6 : 0) : mx === gg ? (b - r) / dd + 2 : (r - gg) / dd + 4; h /= 6;
    }
    if (skin === 1) { if (s2 < 0.15) { h = 0.83; s2 = 0.35; } else { h = (h + 0.42) % 1; s2 = Math.min(1, s2 * 1.1); } }
    else if (skin === 3) { s2 = 0; }   // 흑백
    else { h = 0.12; s2 = 0.85; }   // 황금
    const ll = skin === 2 ? Math.min(0.92, 0.25 + l * 0.75) : l;
    const q = ll < 0.5 ? ll * (1 + s2) : ll + s2 - ll * s2, pp = 2 * ll - q;
    const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
    a[i] = Math.round(f(h + 1 / 3) * 255); a[i + 1] = Math.round(f(h) * 255); a[i + 2] = Math.round(f(h - 1 / 3) * 255);
  }
  g.putImageData(d, 0, 0);
  skinCache.set(key, c);
  return c;
}
export function drawImg(im, x, y, w, h, opts = {}) {
  if (!im) return;
  if (opts.shade) {
    // shade: 검정 그림자, shadeAlpha: 원래 그림 위에 그림자를 얼마나 덮을지 (1 = 완전히 검정)
    const c = shaded(im, opts.frame, opts.shade);
    if (!c) return;
    const a = opts.shadeAlpha ?? 1;
    if (a < 1) drawImg(im, x, y, w, h, { ...opts, shade: null });
    return drawImg(c, x, y, w, h, { flip: opts.flip, alpha: (opts.alpha ?? 1) * a });
  }
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
// 소리 크기 설정 (배경음·효과음 따로, 0~1). 저장 기록과 따로 브라우저에 보관해서 '처음부터 하기'를 해도 유지
const SOUND_KEY = 'saveDokdo.sound';
const soundPref = (() => { try { return { music: 0.7, sfx: 0.8, ...JSON.parse(localStorage.getItem(SOUND_KEY) || '{}') }; } catch (_) { return { music: 0.7, sfx: 0.8 }; } })();
export const audio = {
  ctx: null, music: null, musicName: null, muted: false, unlocked: false,
  musicVol: soundPref.music, sfxVol: soundPref.sfx,
  setVolume(kind, v) {
    v = Math.max(0, Math.min(1, Math.round(v * 20) / 20));   // 5% 단위
    if (kind === 'music') { this.musicVol = v; this.applyMusic(); } else this.sfxVol = v;
    try { localStorage.setItem(SOUND_KEY, JSON.stringify({ music: this.musicVol, sfx: this.sfxVol })); } catch (_) {}
  },
  applyMusic() {
    const a = this.music; if (!a) return;
    a.volume = 0.65 * this.musicVol;
    if (this.musicVol <= 0 || this.muted) a.pause(); else if (this.unlocked && a.paused && !(a.ended && !a.loop)) a.play().catch(() => {});
  },
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (_) {}
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
    a.loop = loop; a.volume = 0.65 * this.musicVol;
    this.music = a;
    if (this.unlocked && !this.muted && this.musicVol > 0) a.play().catch(() => {});
  },
  stop() { if (this.music) { this.music.pause(); this.music = null; } this.musicName = null; },
  toggleMute() {
    this.muted = !this.muted;
    if (this.music) { if (this.muted) this.music.pause(); else this.music.play().catch(() => {}); }
  },
  // 간단한 효과음 (파일 없이 소리 합성)
  // 효과음 (파일 없이 소리 합성). opts.vol: 0~1 크기 배율(거리에 따라), opts.pan: -1(왼쪽) ~ 1(오른쪽)
  sfx(kind, opts = {}) {
    if (this.muted || !this.ctx || this.sfxVol <= 0) return;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});   // 브라우저가 소리를 멈춰 뒀으면 다시 켬
    const sv = this.sfxVol * 1.25 * (opts.vol ?? 1);   // 효과음 크기
    if (sv < 0.01) return;
    const c = this.ctx, t = c.currentTime;
    // 소리가 나갈 길: 왼쪽·오른쪽 위치가 있으면 그쪽에서 들리게
    let out = c.destination;
    if (opts.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, opts.pan)); pn.connect(c.destination); out = pn; }
    const tone = (freq, dur, type = 'square', vol = 0.08, when = 0, slide = 0) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t + when);
      if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + when + dur);
      g.gain.setValueAtTime(vol * sv, t + when); g.gain.exponentialRampToValueAtTime(0.0001, t + when + dur);
      o.connect(g); g.connect(out); o.start(t + when); o.stop(t + when + dur + 0.02);
    };
    // 지지직·바스락 같은 잡음 (종이 소리)
    const noise = (dur, vol = 0.1, when = 0, freq = 2500, q = 1.2) => {
      if (!this.noiseBuf) { const n = c.sampleRate; this.noiseBuf = c.createBuffer(1, n, n); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(vol * sv, t + when); g.gain.exponentialRampToValueAtTime(0.0001, t + when + dur);
      src.connect(f); f.connect(g); g.connect(out); src.start(t + when, Math.random() * 0.5); src.stop(t + when + dur + 0.02);
    };
    // 로봇 목소리: 음이 뚝뚝 바뀌는 네모파에 빠른 떨림(지글거림)을 얹어 기계음처럼
    const robo = (freqs, step, vol = 0.1, when = 0, wave = 'square', buzz = 55) => {
      const o = c.createOscillator(), am = c.createGain(), g = c.createGain(), m = c.createOscillator(), depth = c.createGain();
      o.type = wave; freqs.forEach((f, i) => o.frequency.setValueAtTime(f, t + when + i * step));
      m.type = 'square'; m.frequency.value = buzz; depth.gain.value = 0.45; am.gain.value = 0.55;
      m.connect(depth); depth.connect(am.gain);
      const dur = freqs.length * step;
      g.gain.setValueAtTime(0.0001, t + when); g.gain.linearRampToValueAtTime(vol * sv, t + when + 0.01);
      g.gain.setValueAtTime(vol * sv, t + when + dur - 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + when + dur + 0.04);
      o.connect(am); am.connect(g); g.connect(out);
      o.start(t + when); m.start(t + when); o.stop(t + when + dur + 0.06); m.stop(t + when + dur + 0.06);
    };
    const pick = (lo, hi, n) => Array.from({ length: n }, () => Math.round(lo + Math.random() * (hi - lo)));
    switch (kind) {
      case 'click': tone(660, 0.06, 'square', 0.04); break;
      case 'jump': tone(380, 0.14, 'square', 0.05, 0, 380); break;
      case 'coin': tone(988, 0.07, 'square', 0.05); tone(1318, 0.12, 'square', 0.05, 0.07); break;
      case 'key': [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'triangle', 0.07, i * 0.07)); break;
      case 'good': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, i * 0.09)); break;
      case 'bad': tone(220, 0.25, 'sawtooth', 0.05, 0, -90); break;
      case 'hurt': tone(300, 0.2, 'square', 0.06, 0, -200); break;
      case 'flip': tone(520, 0.05, 'triangle', 0.06); break;
      case 'reveal': [784, 988, 1175, 1568, 2093].forEach((f, i) => tone(f, 0.18, 'triangle', 0.07, i * 0.06)); tone(2093, 0.4, 'sine', 0.05, 0.32); break;
      // 종이 뭉치에 맞음: 바스락 구겨지는 소리 + 퉁
      case 'bonk': noise(0.07, 0.35, 0, 3200, 0.8); noise(0.06, 0.28, 0.06, 2200, 0.8); noise(0.08, 0.22, 0.12, 4200, 1); tone(180, 0.12, 'triangle', 0.09, 0, -60); break;
      // 보호막 생김: 반짝반짝 올라가는 소리 + 웅 하는 막
      case 'shield': [784, 1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.22, 'sine', 0.06, i * 0.05)); tone(392, 0.45, 'triangle', 0.05, 0, 196); noise(0.3, 0.05, 0.05, 6000, 2); break;
      case 'pop': tone(900, 0.06, 'square', 0.05, 0, -500); tone(400, 0.12, 'triangle', 0.05, 0.05, -200); noise(0.1, 0.12, 0, 5000, 1.5); break;
      case 'throw': tone(240, 0.12, 'triangle', 0.06, 0, 260); noise(0.1, 0.06, 0, 1500, 0.7); break;
      case 'plane': noise(0.35, 0.05, 0, 1800, 3); tone(500, 0.3, 'sine', 0.03, 0, 300); break;              // 종이비행기 휙
      case 'crack': noise(0.12, 0.09, 0, 1200, 1.2); noise(0.1, 0.07, 0.14, 900, 1.2); noise(0.1, 0.06, 0.3, 1400, 1.2); break;   // 우지직 (블록에 금이 감)
      case 'crumble': noise(0.35, 0.12, 0, 600, 0.8); tone(140, 0.3, 'triangle', 0.06, 0, -70); break;   // 와르르 (블록이 무너짐)
      case 'stomp': tone(520, 0.07, 'square', 0.06, 0, -300); tone(880, 0.1, 'triangle', 0.05, 0.06, 300); break;   // 뿅 (로봇 머리 밟기)
      case 'clang': tone(1400, 0.18, 'triangle', 0.06, 0, -200); tone(2100, 0.12, 'sine', 0.04, 0.01, -300); noise(0.05, 0.06, 0, 5000, 2); break;   // 깡 (안전모)
      case 'seal': tone(260, 0.22, 'sawtooth', 0.045, 0, -110); tone(200, 0.2, 'sawtooth', 0.04, 0.2, -60); tone(420, 0.35, 'triangle', 0.05, 0.08, 520); break;   // 끄앙~ (강치가 튕겨 줌)
      case 'thud': noise(0.06, 0.2, 0, 2800, 0.9); noise(0.05, 0.15, 0.05, 1800, 0.9); break;                  // 종이 바스락 (떨어짐)
      // 로봇 소리 (가까울수록 크게)
      case 'robo_red': robo(pick(700, 1600, 5 + Math.floor(Math.random() * 2)), 0.05, 0.05, 0, 'triangle', 45); break;   // 삐리리빅 (작고 부드러운 기계음)
      case 'robo_green': { const sw = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
        sw.type = 'sawtooth'; sw.frequency.setValueAtTime(110, t); sw.frequency.linearRampToValueAtTime(320, t + 0.35); sw.frequency.linearRampToValueAtTime(180, t + 0.5);
        lfo.frequency.value = 18; lg.gain.value = 25; lfo.connect(lg); lg.connect(sw.frequency);
        g.gain.setValueAtTime(0.035 * sv, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        sw.connect(g); g.connect(out); sw.start(t); lfo.start(t); sw.stop(t + 0.56); lfo.stop(t + 0.56);
        robo([1000, 1300], 0.06, 0.045, 0.5, 'triangle', 40); break; }   // 위이잉(모터) + 삐빅
      case 'robo_brown': tone(800, 0.16, 'sine', 0.05, 0, 400); robo([1000, 700], 0.09, 0.045, 0.18, 'triangle', 35); break;   // 휘익 + 삐-뽀
      case 'robo_blue': robo([660, 990, 0, 1180], 0.06, 0.045, 0, 'triangle', 50); break;   // 띠딩 삐 (컴퓨터)
      case 'clank': noise(0.03, 0.1, 0, 3000, 4); tone(1700, 0.05, 'triangle', 0.02); break;   // 철컥 (작은 로봇 발소리)
      case 'boing': tone(260, 0.2, 'triangle', 0.06, 0, 380); break;                                              // 파란 로봇이 뜀
      case 'gull': tone(1500, 0.12, 'triangle', 0.05, 0, -650); tone(1750, 0.15, 'triangle', 0.05, 0.17, -800); noise(0.05, 0.02, 0, 4000, 2); break;   // 끼룩끼룩 (괭이갈매기)
      case 'star': tone(1318, 0.14, 'triangle', 0.07); tone(1760, 0.22, 'triangle', 0.06, 0.08); break;
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
