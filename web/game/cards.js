// 생물 카드 뒤집기: 난이도 선택 화면과 게임 화면
import { W, H, ctx, img, drawCover, drawFit, panel, text, textBox, button, hit, save, persist, audio, go, fmt, dim, beginUI, shuffle } from './core.js';
import { nav, drawPoints, Notice } from './widgets.js';

const MODES = [
  { name: '이지모드', key: 'easy', pairs: 4, rows: 2, cols: 4, mult: 1, cards: ['GrassCard1', 'GrassCard2', 'GrassCard3', 'GrassCard4'], need: 0 },
  { name: '노멀모드', key: 'normal', pairs: 6, rows: 3, cols: 4, mult: 10, cards: [1, 2, 3, 4, 5, 6].map(i => 'SkyCard' + i), need: 1 },
  { name: '하드모드', key: 'hard', pairs: 9, rows: 3, cols: 6, mult: 100, cards: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => 'OceanCard' + i), need: 3 },
];
const heroCount = () => save.heroMem.filter(Boolean).length;

export class CardModeScene {
  constructor() { this.notice = new Notice(); }
  enter() { audio.play('card_game', false); }
  update() {}
  draw() {
    beginUI(this.notice.open ? 1 : 0);
    drawCover(img('bg2'), 0, 0, W, H);
    text('생물 카드 뒤집기!', 80, 60, { size: 64, color: '#fff', stroke: '#2b2b2b', strokeW: 10 });
    textBox('같은 생물 카드 두 장을 찾아 뒤집으세요! 처음 3초 동안 모든 카드를 보여 줘요.\n제한 시간은 40초예요.', 80, 150, 620, 90, { size: 26, align: 'left', color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 5 });
    MODES.forEach((m, i) => {
      const locked = heroCount() < m.need;
      const y = 280 + i * 130;
      if (button(`${m.name} 게임 시작`, 120, y, 520, 100, { size: 36, fill: locked ? '#cfc6b6' : undefined })) {
        if (locked) this.notice.push(`${m.name}는 독도퍼즐을 ${m.need}개이상 열어야 잠금해제 됩니다.\n\n<독도퍼즐 여는 방법>\n1. 메인화면의 독도석상 클릭!\n2. 영웅퍼즐로 들어가서 구입!`, { title: '<게임 잠김>', image: 'statue', h: 520 });
        else go(nav.cardGame(m));
      }
      text(`× ${m.mult}점`, 670, y + 34, { size: 30, color: '#fff', stroke: '#2b2b2b', strokeW: 6 });
      if (locked) drawFit(img('Lock'), 50, y + 20, 60, 60);
    });
    panel(860, 60, 380, 200, { fill: 'rgba(250,240,220,.95)' });
    text('획득한 점수:', 890, 86, { size: 28 }); text(fmt(save.lastCardScore || 0), 1210, 86, { size: 28, align: 'right' });
    text('카드 점수 합계:', 890, 140, { size: 28 }); text(fmt(save.hearts), 1210, 140, { size: 28, align: 'right' });
    drawFit(img('heart'), 890, 190, 50, 50);
    textBox('카드 점수로 독도 석상의 영웅 퍼즐을 열 수 있어요', 950, 186, 270, 60, { size: 20, align: 'left' });
    if (button('메인화면으로', W - 330, H - 120, 290, 80, { size: 30 })) go(nav.select());
    this.notice.draw(1);
  }
}

export class CardGameScene {
  constructor(mode) {
    this.m = mode;
    const ids = [];
    mode.cards.forEach((_, i) => ids.push(i, i));
    shuffle(ids);
    this.cards = ids.map(id => ({ id, open: false, done: false, flip: 0 }));
    this.time = 40; this.t = 0; this.phase = 'preview'; this.first = null; this.lock = 0; this.pairs = 0;
  }
  enter() { audio.play('card_game'); }
  update(dt) {
    this.t += dt;
    for (const c of this.cards) c.flip += ((c.open || c.done || this.phase === 'preview' && this.t > 0.5 && this.t < 3.5 ? 1 : 0) - c.flip) * Math.min(1, dt * 12);
    if (this.phase === 'preview' && this.t >= 4) this.phase = 'play';
    if (this.phase === 'play') {
      this.time -= dt;
      if (this.lock > 0) {
        this.lock -= dt;
        if (this.lock <= 0 && this.pending) { this.pending.forEach(c => c.open = false); this.pending = null; }
      }
      if (this.time <= 0) this.finish(false);
    }
  }
  finish(win) {
    if (this.phase === 'end') return;
    this.phase = 'end'; this.win = win;
    this.score = this.pairs * this.m.mult;
    save.hearts += this.score; save.lastCardScore = this.score; persist();
    audio.sfx(win ? 'good' : 'bad');
  }
  pick(c) {
    if (this.phase !== 'play' || this.lock > 0 || c.open || c.done) return;
    audio.sfx('flip');
    c.open = true;
    if (!this.first) { this.first = c; return; }
    const a = this.first; this.first = null;
    if (a.id === c.id) {
      a.done = c.done = true; this.pairs++; audio.sfx('coin');
      if (this.pairs === this.m.pairs) this.finish(true);
    } else { this.pending = [a, c]; this.lock = 1.0; }
  }
  draw() {
    beginUI(this.phase === 'end' ? 1 : 0);
    drawCover(img('bg3'), 0, 0, W, H);
    // 시간 막대
    text('남은 시간', 40, 24, { size: 30, color: '#fff', stroke: '#2b2b2b', strokeW: 6 });
    panel(200, 20, 860, 44, { r: 8, inner: false });
    const ratio = Math.max(0, this.time / 40);
    ctx.fillStyle = ratio > 0.3 ? '#6aa84f' : '#e06040';
    ctx.fillRect(208, 28, 844 * ratio, 28);
    text(`${this.pairs} / ${this.m.pairs}`, 1220, 24, { size: 32, color: '#fff', stroke: '#2b2b2b', strokeW: 6, align: 'right' });
    const { rows, cols } = this.m;
    const cw = Math.min(170, (W - 120) / cols - 16), ch = cw;
    const x0 = (W - (cols * cw + (cols - 1) * 16)) / 2, y0 = 100 + (600 - (rows * ch + (rows - 1) * 16)) / 2;
    this.cards.forEach((c, i) => {
      const x = x0 + (i % cols) * (cw + 16), y = y0 + Math.floor(i / cols) * (ch + 16);
      const f = c.flip, sx = Math.abs(Math.cos(f * Math.PI));
      const face = f > 0.5;
      ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(Math.max(0.04, sx), 1);
      drawFit(img(face ? 'cg_' + this.m.cards[c.id] : 'cardback'), -cw / 2, -ch / 2, cw, ch);
      if (c.done) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#fff'; ctx.fillRect(-cw / 2, -ch / 2, cw, ch); }
      ctx.restore();
      if (hit(x, y, cw, ch, 0)) this.pick(c);
    });
    if (this.phase === 'preview') text(this.t < 3.5 ? '카드를 기억하세요!' : '시작!', W / 2, H - 70, { size: 44, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 8 });
    if (this.phase === 'end') {
      dim(0.55);
      panel(W / 2 - 330, 120, 660, 470);
      text(this.win ? 'GAME CLEAR' : 'GAME OVER', W / 2, 160, { size: 72, align: 'center', color: this.win ? '#3d7a2a' : '#a33' });
      text(`맞힌 짝: ${this.pairs} / ${this.m.pairs}`, W / 2, 270, { size: 34, align: 'center' });
      drawFit(img('heart'), W / 2 - 170, 330, 70, 70);
      text(`카드 점수 + ${fmt(this.score)}`, W / 2 - 80, 345, { size: 40 });
      text(`합계: ${fmt(save.hearts)}`, W / 2, 420, { size: 30, align: 'center', color: '#5a4a3a' });
      if (button('다시 하기', W / 2 - 300, 490, 280, 76, { layer: 1, size: 30 })) go(nav.cardGame(this.m));
      if (button('메뉴로 나가기', W / 2 + 20, 490, 280, 76, { layer: 1, size: 30 })) go(nav.cardMode());
    } else if (button('그만하기', W - 200, H - 80, 170, 60, { size: 26 })) go(nav.cardMode());
  }
}
