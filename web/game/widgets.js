// 여러 화면에서 함께 쓰는 UI 조각: 포인트 표시, 알림 상자, 긴 글 읽기 창
import { W, H, ctx, img, drawFit, panel, text, textBox, button, wrap, font, input, hit, inside, save, fmt, dim, rrect, keyHit, ui, audio, opaqueBox } from './core.js';

export const nav = {}; // main.js가 화면 이동 함수를 채워 넣음

// 화면 위쪽 포인트 표시 (부드럽게 숫자가 바뀜)
const shown = { dp: null, hearts: null, savePts: null };
export function drawPoints(x, y, which = ['dp'], opts = {}) {
  const icons = { dp: 'dp', hearts: 'heart', savePts: 'savept' };
  const labels = { dp: '독도 포인트', hearts: '카드 점수', savePts: '구출 포인트' };
  const w = opts.w || 230;
  which.forEach((k, i) => {
    if (shown[k] === null) shown[k] = save[k];
    shown[k] += (save[k] - shown[k]) * 0.2;
    if (Math.abs(save[k] - shown[k]) < 0.5) shown[k] = save[k];
    const yy = y + i * (opts.vertical === false ? 0 : 62), xx = x + (opts.vertical === false ? i * (w + 12) : 0);
    panel(xx, yy, w, 52, { r: 8, fill: 'rgba(250,240,220,.95)' });
    drawFit(img(icons[k]), xx + 6, yy + 4, 44, 44);
    text(fmt(shown[k]), xx + w - 14, yy + 12, { size: 28, align: 'right' });
    if (opts.labels) text(labels[k], xx + 56, yy - 20, { size: 18, color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
  });
}

// 알림 상자: 한 번에 하나, 닫으면 다음 알림
export class Notice {
  constructor() { this.queue = []; }
  push(msg, opts = {}) { this.queue.push({ msg, ...opts }); }
  get open() { return this.queue.length > 0; }
  draw(layer) {
    const n = this.queue[0];
    if (!n) return;
    dim(0.45);
    const w = n.w || 760, h = n.h || (n.image ? 420 : 280);
    const x = (W - w) / 2, y = (H - h) / 2;
    panel(x, y, w, h);
    let ty = y + 24;
    if (n.title) { text(n.title, W / 2, ty, { size: 34, align: 'center', color: '#7a3b12' }); ty += 50; }
    if (n.image) { drawFit(img(n.image) || n.imageObj, x + 20, ty, w - 40, 150, { frame: n.frame }); ty += 160; }
    if (n.face) drawFit(img(n.face), x + 24, ty, 110, 110);
    textBox(n.msg, x + (n.face ? 150 : 40), ty, w - (n.face ? 190 : 80), y + h - 90 - ty, { size: n.size || 30 });
    const labels = n.buttons || ['확인'];
    const bw = 200, gap = 24, total = labels.length * bw + (labels.length - 1) * gap;
    labels.forEach((lb, i) => {
      if (button(lb, (W - total) / 2 + i * (bw + gap), y + h - 80, bw, 60, { layer, size: 26 }) || (labels.length === 1 && keyHit('Enter', 'Space', 'Escape'))) {
        this.queue.shift();
        n.onClose?.(i);
      }
    });
  }
}

// 긴 글 읽기 창 (마우스 휠·끌기·버튼으로 스크롤)
export class Reader {
  constructor() { this.item = null; this.scroll = 0; this.drag = null; }
  // item: { name(크게), sub(작은 분류), quote(대사), text(설명), image, frame, caption } — 예전처럼 title만 줘도 됨
  show(item) { this.item = item; this.scroll = 0; }
  get open() { return !!this.item; }
  draw(layer) {
    const it = this.item;
    if (!it) return;
    dim(0.6);
    const x = 70, y = 36, w = W - 140, h = H - 72;
    panel(x, y, w, h);
    // 머리: 작은 분류 + 큰 이름
    const name = it.name || it.title || '';
    if (it.sub) text(it.sub, x + 44, y + 22, { size: 22, color: '#9a7a5a' });
    text(name, x + 42, y + (it.sub ? 48 : 30), { size: 46, color: '#7a3b12' });
    // 내용 칸: 머리 아래 ~ 버튼 줄 위
    const cy0 = y + 118, cy1 = y + h - 96, chh = cy1 - cy0;
    ctx.fillStyle = 'rgba(122,59,18,.25)'; ctx.fillRect(x + 36, cy0 - 12, w - 72, 2);
    // 사진: 내용 칸 세로 가운데
    const picW = it.image ? 330 : 0, capH = it.image && it.caption ? 44 : 0;
    if (it.image) {
      const py = cy0 + (chh - picW - capH) / 2;
      panel(x + 40, py, picW, picW, { fill: '#2d3a45', line: '#3a2f28', inner: false });
      drawFit(img(it.image), x + 52, py + 12, picW - 24, picW - 24, { frame: it.frame });
      if (it.caption) text(it.caption, x + 40 + picW / 2, py + picW + 10, { size: 26, align: 'center', color: '#3a2f28' });
    }
    // 글 칸: 사진 오른쪽 빈 곳
    const tx = x + (it.image ? 40 + picW + 44 : 50), tw = x + w - 50 - tx, ty = cy0, th = chh;
    const qSize = 32, size = 27, lh = Math.round(size * 1.55), qlh = Math.round(qSize * 1.4);
    const hSize = 29, ind = 28;
    // 글 꾸미기: '# 제목' 줄은 소제목, '- ' 줄은 글머리표(둘째 줄부터 들여쓰기), 빈 줄은 문단 사이 띄우기
    const rows = [];
    if (it.quote) { for (const ln of wrap(it.quote, tw, qSize)) rows.push({ s: ln, size: qSize, h: qlh, color: '#2f6fa8' }); rows.push({ s: '', h: lh * 0.6 }); }
    for (const raw of String(it.text || '').split('\n')) {
      const ln = raw.trim();
      if (!ln) { if (rows.length && rows[rows.length - 1].s !== '') rows.push({ s: '', h: lh * 0.55 }); continue; }
      if (ln.startsWith('# ')) {
        if (rows.length && rows[rows.length - 1].s !== '') rows.push({ s: '', h: lh * 0.35 });
        wrap(ln.slice(2), tw, hSize).forEach(w => rows.push({ s: w, size: hSize, h: Math.round(hSize * 1.45), color: '#7a3b12' }));
      } else if (ln.startsWith('- ')) {
        wrap(ln.slice(2), tw - ind, size).forEach((w, k) => rows.push({ s: w, size, h: lh, color: '#2b2b2b', indent: ind, bullet: k === 0 }));
      } else wrap(ln, tw, size).forEach(w => rows.push({ s: w, size, h: lh, color: '#2b2b2b' }));
    }
    while (rows.length && rows[rows.length - 1].s === '') rows.pop();
    const total = rows.reduce((a, r) => a + r.h, 0);
    const fits = total <= th;
    const maxScroll = fits ? 0 : total - th;
    if (layer === ui.top && !fits) {
      if (input.wheel) this.scroll += input.wheel * 0.6;
      if (input.pressed && inside(input.x, input.y, tx, ty, tw, th)) this.drag = { y: input.y, s: this.scroll };
      if (this.drag && input.down) this.scroll = this.drag.s - (input.y - this.drag.y);
      if (!input.down) this.drag = null;
      if (keyHit('ArrowDown')) this.scroll += lh * 3;
      if (keyHit('ArrowUp')) this.scroll -= lh * 3;
    }
    this.scroll = Math.max(0, Math.min(maxScroll, this.scroll));
    // 짧은 글은 빈 곳의 가로·세로 한가운데에 한 덩어리로 (줄은 왼쪽 맞춤이라 읽기 쉬움), 긴 글은 위에서부터 읽고 넘기기
    let blockW = 0;
    for (const r of rows) if (r.s) { ctx.font = font(r.size); blockW = Math.max(blockW, (r.indent || 0) + ctx.measureText(r.s).width); }
    const bx = fits ? tx + Math.max(0, (tw - blockW) / 2) : tx;
    ctx.save();
    ctx.beginPath(); ctx.rect(tx - 4, ty, tw + 8, th); ctx.clip();
    let yy = fits ? ty + (th - total) / 2 : ty - this.scroll;
    for (const r of rows) {
      if (r.s && yy > ty - r.h && yy < ty + th) {
        if (r.bullet) { ctx.fillStyle = '#c0703a'; ctx.beginPath(); ctx.arc(bx + 9, yy + r.size * 0.55, 5, 0, Math.PI * 2); ctx.fill(); }
        text(r.s, bx + (r.indent || 0), yy, { size: r.size, color: r.color });
      }
      yy += r.h;
    }
    ctx.restore();
    if (!fits) {
      // 스크롤 막대
      ctx.fillStyle = 'rgba(58,47,40,.25)'; ctx.fillRect(x + w - 26, ty, 8, th);
      const bh = Math.max(40, th * th / (th + maxScroll));
      ctx.fillStyle = '#7a3b12'; ctx.fillRect(x + w - 26, ty + (th - bh) * (this.scroll / maxScroll), 8, bh);
      if (button('▲', x + w - 260, y + h - 80, 70, 56, { layer, size: 26 })) this.scroll -= lh * 4;
      if (button('▼', x + w - 180, y + h - 80, 70, 56, { layer, size: 26 })) this.scroll += lh * 4;
      text('아래로 넘겨서 더 읽기', tx, y + h - 64, { size: 22, color: '#7a5a3a' });
    }
    if (button('닫기', x + w - 100, y + h - 80, 80, 56, { layer, size: 26 }) || keyHit('Escape')) {
      const cb = it.onClose; this.item = null; cb?.();
    }
  }
}

// 작은 둥근 아이콘 버튼 + 이름표
export function iconButton(im, label, x, y, w, h, opts = {}) {
  const hov = inside(input.x, input.y, x, y, w, h) && !input.touch && (opts.layer || 0) === ui.top;
  const bob = opts.bob ? Math.sin(performance.now() / 300 + x) * 4 : 0;
  // 그림이 실제로 차지하는 곳 (투명한 여백 빼고) → 그림자와 이름표를 발끝에 붙임
  const iw = im ? (opts.frame ? opts.frame[2] : im.width) : 1, ih = im ? (opts.frame ? opts.frame[3] : im.height) : 1;
  const sc = Math.min(w / iw, h / ih), dw = iw * sc, dh = ih * sc, dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  const ob = opaqueBox(im, opts.frame);
  const feet = dy + ob[3] * dh, left = dx + ob[0] * dw, right = dx + ob[2] * dw;
  if (opts.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse((left + right) / 2, feet - 2, Math.max(24, (right - left) * 0.48), 9, 0, 0, Math.PI * 2); ctx.fill(); }
  drawFit(im, x - (hov ? 4 : 0), y + bob - (hov ? 6 : 0), w + (hov ? 8 : 0), h + (hov ? 8 : 0), { frame: opts.frame, flip: opts.flip });
  if (label) {
    ctx.font = font(24);
    const tw = Math.max(ctx.measureText(label).width + 28, 120);
    panel(x + w / 2 - tw / 2, feet + 12, tw, 40, { r: 8, fill: hov ? '#fff2d6' : '#f4e3c3', inner: false, lw: 3 });
    text(label, x + w / 2, feet + 19, { size: 24, align: 'center' });
  }
  if (hov) ui.cursor = 'pointer';
  return hit(left - 10, dy + ob[1] * dh - 10, right - left + 20, feet - (dy + ob[1] * dh) + 20 + (label ? 56 : 0), opts.layer || 0);
}

// 카드 그림 찾기 (생물 사진은 cr_, 나머지는 스프라이트)
export function cardPicName(pic) {
  if (!pic) return null;
  if (/^(Bird|Fish|Flower|GangChi)/.test(pic)) return 'cr_' + pic;
  return 'sp/' + pic;
}
const FRAME_IMG = { Panel: 'card_normal', NormalCard: 'card_normal', RareCard: 'card_rare', UniqueCard: 'card_unique' };

// 카드 뽑기 연출: 뒷면 카드가 흔들리다가, 누르면 뒤집히면서 무슨 카드인지 나옴
export class CardReveal {
  constructor() { this.item = null; }
  show(item) { this.item = { ...item, phase: 'closed', t: 0 }; }   // {pic, frame, name, kind, extra, onClose}
  get open() { return !!this.item; }
  update(dt) { if (this.item) this.item.t += dt; }
  draw(layer) {
    const it = this.item;
    if (!it) return;
    dim(0.8);
    const cx = W / 2, cy = 300, cw = 300, ch = 300;
    const t = it.t;
    if (it.phase === 'closed') {
      // 뒷면: 살짝 흔들리며 빛남
      const wob = Math.sin(t * 9) * 0.05 * (1 + Math.sin(t * 2));
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(wob);
      const glow = 0.35 + 0.25 * Math.sin(t * 4);
      ctx.shadowColor = `rgba(255,230,120,${glow})`; ctx.shadowBlur = 40;
      drawFit(img('cardback'), -cw / 2, -ch / 2, cw, ch);
      ctx.restore();
      text(it.kind === '보상' ? '보상을 얻었다!' : `${it.kind || '카드'}를 얻었다!`, cx, 470, { size: 40, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 8 });
      if (Math.floor(t * 2) % 2 === 0) text('카드를 눌러서 열어 보세요!', cx, 530, { size: 30, align: 'center', color: '#ffe066', stroke: '#2b2b2b', strokeW: 6 });
      if (hit(cx - cw / 2, cy - ch / 2, cw, ch, layer) || hit(0, 0, W, H, layer) || keyHit('Enter', 'Space')) {
        it.phase = 'flip'; it.t = 0; audio.sfx('flip');
      }
      return;
    }
    // 뒤집기 (0.5초) → 앞면 공개
    const f = it.phase === 'flip' ? Math.min(1, t / 0.5) : 1;
    if (it.phase === 'flip' && f >= 1) { it.phase = 'open'; it.t = 0; audio.sfx('reveal'); }
    const front = f >= 0.5;
    const sx = Math.max(0.02, Math.abs(Math.cos(f * Math.PI)));
    // 앞면이 나오면 뒤에서 빛줄기가 돎
    if (it.phase === 'open') {
      const a = Math.min(1, t * 3);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.6); ctx.globalAlpha = 0.5 * a;
      ctx.fillStyle = '#ffe9a0';
      for (let k = 0; k < 12; k++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -330); ctx.lineTo(40, -330); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    const pop = it.phase === 'open' ? 1 + 0.12 * Math.max(0, 1 - t * 4) : 1;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx * pop, pop);
    if (!front) drawFit(img('cardback'), -cw / 2, -ch / 2, cw, ch);
    else if (it.points) {
      // 독도 포인트 보상: 빈 카드 위에 큰 독도 포인트 그림
      const pw = cw * 0.64, ph = ch * 0.92;
      panel(-pw / 2, -ph / 2, pw, ph, { r: 14, fill: '#fff1b8', line: '#3a2f28' });
      drawFit(img('dp'), -pw * 0.36, -ph * 0.4, pw * 0.72, pw * 0.72);
      text(`+${it.points}`, 0, ph * 0.16, { size: 48, align: 'center', color: '#c0392b', stroke: '#fff', strokeW: 6 });
    } else {
      drawFit(img(FRAME_IMG[it.frame] || 'card_normal'), -cw / 2, -ch / 2, cw, ch);
      drawFit(img(cardPicName(it.pic)), -cw * 0.3, -ch * 0.32, cw * 0.6, ch * 0.6);
    }
    ctx.restore();
    if (it.phase !== 'open') return;
    // 카드 아래에 이름과 받은 것 (카드와 겹치지 않게)
    const a = Math.min(1, t * 2.5);
    ctx.save(); ctx.globalAlpha = a;
    panel(cx - 300, 470, 600, it.extra ? 150 : 100, { r: 14 });
    text(it.name || '', cx, 486, { size: 40, align: 'center', color: '#c0392b' });
    if (it.extra) text(it.extra, cx, 548, { size: 28, align: 'center', color: '#5a4a3a' });
    ctx.restore();
    if (t > 0.25 && (button('확인', cx - 100, H - 84, 200, 64, { layer, size: 30 }) || keyHit('Enter', 'Space'))) {
      const done = it.onClose; this.item = null; done?.();
    }
  }
}

// 정령 몸짓 (원작 Ac1 애니메이션: Idle·Walk·Touch 크기 곡선을 그대로 옮김)
//   가만히: 2초마다 살짝 납작(가로 +10%, 세로 -10%) · 걸을 때: 0.5초마다 통통(가로 +30%, 세로 -30%)
//   눌렀을 때: 0.25초 동안 쭉 늘어났다(0.8×1.4) 눌렸다(1.2×0.8) 돌아옴
export function spiritSquash(t, walking, touchLeft = 0) {
  if (touchLeft > 0) {
    const k = 0.25 - touchLeft;   // 0 ~ 0.25초
    const keys = [[0, 1, 1], [0.0333, 0.8, 1.4], [0.1667, 1.2, 0.8], [0.25, 1, 1]];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, x0, y0] = keys[i], [t1, x1, y1] = keys[i + 1];
      if (k <= t1) { const f = (k - t0) / (t1 - t0); return [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f]; }
    }
    return [1, 1];
  }
  const period = walking ? 0.5 : 2, amp = walking ? 0.3 : 0.1;
  const f = (1 - Math.cos((t % period) / period * Math.PI * 2)) / 2;   // 0 → 1 → 0 (부드럽게)
  return [1 + amp * f, 1 - amp * f];
}

// 소리 설정 창: 배경음·효과음 크기를 막대로 조절 (끌기, 누르기, －/＋)
class SoundPanel {
  constructor() { this.isOpen = false; this.drag = null; }
  open() { this.isOpen = true; }
  get open_() { return this.isOpen; }
  draw(layer) {
    if (!this.isOpen) return;
    dim(0.55);
    const w = 720, h = 360, x = (W - w) / 2, y = (H - h) / 2;
    panel(x, y, w, h);
    text('소리 설정', W / 2, y + 26, { size: 40, align: 'center', color: '#7a3b12' });
    const rows = [['music', '배경음'], ['sfx', '효과음']];
    rows.forEach(([k, label], i) => {
      const ry = y + 110 + i * 100, bx = x + 228, bw = 300;   // 이름 | － | 막대 | ＋ | 크기
      const v = k === 'music' ? audio.musicVol : audio.sfxVol;
      text(label, x + 40, ry - 4, { size: 30 });
      // 막대
      const by = ry + 14;
      ctx.fillStyle = '#d9cdb8'; rrect(bx, by - 8, bw, 16, 8); ctx.fill();
      ctx.fillStyle = k === 'music' ? '#6aa84f' : '#3b8ede'; rrect(bx, by - 8, Math.max(16, bw * v), 16, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3a2f28'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bx + bw * v, by, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      text(v <= 0 ? '끔' : Math.round(v * 100) + '%', x + w - 36, ry - 2, { size: 26, align: 'right' });
      if (layer === ui.top) {
        if (input.pressed && inside(input.x, input.y, bx - 20, by - 26, bw + 40, 52)) this.drag = { k, bx, bw };
        if (this.drag && this.drag.k === k && input.down) audio.setVolume(k, (input.x - bx) / bw);
      }
      if (button('－', bx - 76, ry - 12, 52, 52, { layer, size: 30 })) { audio.setVolume(k, v - 0.1); if (k === 'sfx') audio.sfx('coin'); }
      if (button('＋', bx + bw + 24, ry - 12, 52, 52, { layer, size: 30 })) { audio.setVolume(k, v + 0.1); if (k === 'sfx') audio.sfx('coin'); }
    });
    if (!input.down && this.drag) { if (this.drag.k === 'sfx') audio.sfx('coin'); this.drag = null; }
    if (button('닫기', W / 2 - 90, y + h - 84, 180, 60, { layer, size: 28 }) || keyHit('Escape')) { this.isOpen = false; this.drag = null; }
  }
}

export const soundPanel = new SoundPanel();   // 어느 화면에서 열어도 같은 창
