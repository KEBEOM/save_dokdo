// 여러 화면에서 함께 쓰는 UI 조각: 포인트 표시, 알림 상자, 긴 글 읽기 창
import { W, H, ctx, img, drawFit, panel, text, textBox, button, wrap, font, input, hit, inside, save, fmt, dim, rrect, keyHit, ui } from './core.js';

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
  show(item) { this.item = item; this.scroll = 0; }
  get open() { return !!this.item; }
  draw(layer) {
    const it = this.item;
    if (!it) return;
    dim(0.6);
    const x = 70, y = 40, w = W - 140, h = H - 80;
    panel(x, y, w, h);
    text(it.title || '', x + 40, y + 26, { size: 36, color: '#7a3b12' });
    const picW = it.image ? 340 : 0;
    if (it.image) {
      panel(x + 30, y + 90, picW, picW, { fill: '#2d3a45', line: '#3a2f28', inner: false });
      drawFit(img(it.image), x + 40, y + 100, picW - 20, picW - 20, { frame: it.frame });
      if (it.caption) textBox(it.caption, x + 30, y + 100 + picW, picW, 70, { size: 24 });
    }
    const tx = x + 50 + picW, tw = w - 90 - picW, ty = y + 90, th = h - 190;
    const size = 27, lh = Math.round(size * 1.5);
    const lines = wrap(it.text, tw, size);
    const maxScroll = Math.max(0, lines.length * lh - th);
    if (layer === ui.top) {
      if (input.wheel) this.scroll += input.wheel * 0.6;
      if (input.pressed && inside(input.x, input.y, tx, ty, tw, th)) this.drag = { y: input.y, s: this.scroll };
      if (this.drag && input.down) this.scroll = this.drag.s - (input.y - this.drag.y);
      if (!input.down) this.drag = null;
      if (keyHit('ArrowDown')) this.scroll += lh * 3;
      if (keyHit('ArrowUp')) this.scroll -= lh * 3;
    }
    this.scroll = Math.max(0, Math.min(maxScroll, this.scroll));
    ctx.save();
    ctx.beginPath(); ctx.rect(tx - 4, ty, tw + 8, th); ctx.clip();
    let yy = ty - this.scroll;
    for (const ln of lines) { if (yy > ty - lh && yy < ty + th) text(ln, tx, yy, { size }); yy += lh; }
    ctx.restore();
    if (maxScroll > 0) {
      // 스크롤 막대
      ctx.fillStyle = 'rgba(58,47,40,.25)'; ctx.fillRect(x + w - 26, ty, 8, th);
      const bh = Math.max(40, th * th / (th + maxScroll));
      ctx.fillStyle = '#7a3b12'; ctx.fillRect(x + w - 26, ty + (th - bh) * (this.scroll / maxScroll), 8, bh);
      if (button('▲', x + w - 260, y + h - 84, 70, 60, { layer, size: 26 })) this.scroll -= lh * 4;
      if (button('▼', x + w - 180, y + h - 84, 70, 60, { layer, size: 26 })) this.scroll += lh * 4;
      text('아래로 넘겨서 더 읽기', x + 50 + picW, y + h - 66, { size: 22, color: '#7a5a3a' });
    }
    if (button('닫기', x + w - 100 - (maxScroll > 0 ? 0 : 0), y + h - 84, 80, 60, { layer, size: 26 }) || keyHit('Escape')) {
      const cb = it.onClose; this.item = null; cb?.();
    }
  }
}

// 작은 둥근 아이콘 버튼 + 이름표
export function iconButton(im, label, x, y, w, h, opts = {}) {
  const hov = inside(input.x, input.y, x, y, w, h) && !input.touch && (opts.layer || 0) === ui.top;
  const bob = opts.bob ? Math.sin(performance.now() / 300 + x) * 4 : 0;
  if (opts.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 4, w * 0.35, 9, 0, 0, Math.PI * 2); ctx.fill(); }
  drawFit(im, x - (hov ? 4 : 0), y + bob - (hov ? 6 : 0), w + (hov ? 8 : 0), h + (hov ? 8 : 0), { frame: opts.frame });
  if (label) {
    ctx.font = font(24);
    const tw = Math.max(ctx.measureText(label).width + 28, 120);
    panel(x + w / 2 - tw / 2, y + h + 12, tw, 40, { r: 8, fill: hov ? '#fff2d6' : '#f4e3c3', inner: false, lw: 3 });
    text(label, x + w / 2, y + h + 19, { size: 24, align: 'center' });
  }
  if (hov) ui.cursor = 'pointer';
  return hit(x, y, w, h + (label ? 56 : 0), opts.layer || 0);
}
