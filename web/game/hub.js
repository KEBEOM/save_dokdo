// 시작 화면, 독도 마을(허브), 게임 선택 화면
import { W, H, ctx, img, sp, drawCover, drawFit, drawImg, panel, text, textBox, button, hit, input, keyHit, save, persist, resetSave, audio, game, go, fmt, dim, beginUI, ui, inside, font } from './core.js';
import { nav, drawPoints, Notice, Reader, iconButton } from './widgets.js';

export const SPIRIT_TITLES = ['독도의 높이편', '화산섬의 탄생순서', '독도와 울릉도의 거리편', '독도의 지하자원', '독도의 이름편 -1-', '독도의 이름편 -2-', '독도와 지도편', '독도의 역사편 -1-', '독도의 역사편 -2-', '독도와 일본편'];
export const HERO_TITLES = ['이사부편', '누군가가 버리고간 문서', '안용복편', '홍순칠편', '누군가가 고의로 버린 문서'];
const HERO_COST = [20, 120, 240, 1800, 3600];
const HERO_PIC = [['hero_lee', ''], ['hero_leegyu', '이걸.. 찾았다네'], ['hero_ahn', ''], ['hero_hong', ''], ['hero_leegyu', '이걸.. 찾았다네']];
export const spiritMemCost = i => (i === 8 ? 120 : 20);
const SPIRIT_FRAMES = [0, 0, 1, 2, 7, 5, 4, 6, 3, 8];
// 그림이 오른쪽을 보고 있는 정령 (독도 강치, 괭이갈매기). 나머지는 왼쪽을 봄
const FACES_RIGHT = new Set([6, 7]); // 정령 그림 (spirits 시트 칸 번호, 1번은 물의 정령 시트)

export function spiritImage(i) {
  return i === 0 ? { im: img('water_mob'), frame: [0, 0, 160, 160] } : { im: img('spirits'), frame: [SPIRIT_FRAMES[i] * 160, 0, 160, 160] };
}

// ================================================================ 시작 화면
export class TitleScene {
  constructor() { this.notice = new Notice(); this.t = 0; }
  enter() { audio.play('daddy_theme'); }
  update(dt) { this.t += dt; }
  draw() {
    beginUI(this.notice.open ? 1 : 0);
    drawCover(img('bg1'), 0, 0, W, H);
    ctx.fillStyle = 'rgba(20,30,40,.25)'; ctx.fillRect(0, 0, W, H);
    text('<4, 5학년 독도 교육>', W / 2, 90, { size: 36, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 8 });
    const bob = Math.sin(this.t * 2) * 6;
    text('구해줘 독도!', W / 2, 150 + bob, { size: 120, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 14, shadow: 'rgba(0,0,0,.4)' });
    drawFit(img('dokdo_icon'), W / 2 - 70, 300 + bob, 140, 140, { frame: [160, 0, 160, 160] });
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
    this.notice.draw(1);
  }
}

export function soundButton(layer = 0) {
  if (button(audio.muted ? '소리 켜기' : '소리 끄기', W - 170, H - 70, 150, 54, { size: 22, layer })) audio.toggleMute();
}

// ================================================================ 독도 마을
export class HubScene {
  constructor() {
    this.notice = new Notice(); this.reader = new Reader();
    this.panel = null; this.page = 0; this.t = 0;
    this.walkers = [];
    this.bubble = null;
  }
  enter() {
    audio.play('quiet_forest');
    this.walkers = [];
    save.shown.forEach((on, i) => {
      if (on) this.walkers.push({ i, x: 260 + Math.random() * 760, y: 520 + Math.random() * 80, vx: 0, tNext: Math.random() * 2, clicks: 0, flip: false });
    });
  }
  get layer() { return this.notice.open ? 3 : this.reader.open ? 2 : this.panel ? 1 : 0; }
  update(dt) {
    this.t += dt;
    for (const w of this.walkers) {
      w.tNext -= dt;
      if (w.tNext <= 0) { w.vx = w.vx ? 0 : (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40); w.tNext = 1 + Math.random() * 2.5; }
      w.x += w.vx * dt;
      if (w.x < 200 || w.x > 1080) { w.vx = -w.vx; w.x = Math.max(200, Math.min(1080, w.x)); }
      if (w.vx) w.flip = FACES_RIGHT.has(w.i) ? w.vx < 0 : w.vx > 0;
    }
    if (this.bubble) { this.bubble.t -= dt; if (this.bubble.t <= 0) this.bubble = null; }
  }
  draw() {
    beginUI(this.layer);
    drawCover(img('forest'), 0, 0, W, H);
    ctx.fillStyle = 'rgba(255,240,200,.08)'; ctx.fillRect(0, 0, W, H);
    drawPoints(20, 20, ['dp', 'hearts', 'savePts'], { w: 220 });

    // 독도 석상
    if (iconButton(img('statue'), '독도 석상', 530, 180, 220, 220, { layer: 0 })) this.panel = 'memories';
    text('퍼즐을 열고 독도에 대하여 알아봅시다', 640, 460, { size: 20, align: 'center', color: '#fff', stroke: 'rgba(0,0,0,.6)', strokeW: 4 });
    // 정령 구출
    if (iconButton(img('water_icon'), '정령 구출하기', 290, 150, 130, 130, { layer: 0, frame: [Math.floor(this.t * 4) % 6 * 160, 0, 160, 160], bob: true })) { this.panel = 'spirits'; this.page = 0; }
    // 카드
    if (iconButton(img('card_icon'), '독도 캐릭터 카드', 60, 250, 140, 140, { layer: 0, frame: [0, 0, 162, 162] })) this.panel = 'character';
    if (iconButton(img('card_icon'), '독도 생물 카드', 60, 450, 140, 140, { layer: 0, frame: [162, 0, 162, 162] })) this.panel = 'creature';
    // 독도아저씨 (도움말)
    if (iconButton(img('daddy_small'), '독도 아저씨', 1080, 150, 130, 130, { layer: 0, frame: [Math.floor(this.t * 2) % 2 * 82, 0, 82, 82] })) this.panel = 'help';
    // 독도 구출하러 가기
    if (iconButton(img('dokdo_icon'), '독도 구출하러 가기', 1060, 400, 170, 170, { layer: 0, frame: [160, 0, 160, 160], bob: true })) go(nav.select());

    // 마을에 나온 정령들
    for (const w of this.walkers) {
      const s = spiritImage(w.i);
      const hop = w.vx ? Math.abs(Math.sin(this.t * 8 + w.i)) * 8 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 40, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
      drawImg(s.im, w.x - 45, w.y - 50 - hop, 90, 90, { frame: s.frame, flip: w.flip });
      if (hit(w.x - 45, w.y - 50, 90, 90, 0)) this.talk(w);
    }
    if (this.bubble) {
      const b = this.bubble, w = 420;
      const bx = Math.max(10, Math.min(W - w - 10, b.x - w / 2)), by = Math.max(10, b.y - 170);
      panel(bx, by, w, 110, { r: 14, fill: '#fff' });
      textBox(b.msg, bx + 16, by + 8, w - 32, 94, { size: 24 });
    }
    if (button('처음 화면', W - 170, 20, 150, 54, { size: 22 })) go(nav.title());
    soundButton();

    if (this.panel) { dim(0.5); this['draw_' + this.panel](); }
    this.reader.draw(2);
    this.notice.draw(3);
  }
  talk(w) {
    const d = game.data;
    w.clicks++;
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
      text(title, x + 250, 160, { size: 34, align: 'center' });
      drawFit(img(icon), x + 150, 210, 200, 140, { frame });
      textBox(desc, x + 30, 360, 440, 80, { size: 22 });
      textBox(how, x + 30, 440, 440, 60, { size: 20, color: '#7a5a3a' });
      if (button('살펴보기', x + 150, 500, 200, 54, { layer: L, size: 26 })) onClick();
    };
    box(130, '정령들과의 추억', '독도에 있으면서 귀여운 정령들을 많이 만났다.\n어디한번 정령들과의 추억을 살펴볼까?', '독도 포인트를 사용하는 곳입니다.\n달리고 구하고 풀어라! 게임으로 추억을 얻어요.', 'spirits', [0, 0, 160, 160], () => { this.panel = 'spiritMem'; });
    box(650, '영웅들과의 추억', '독도에서 모르고 있었던 영웅들을 알게되었다.\n영웅들의 사진들을 다시한번 살펴볼까?', '카드 점수를 사용하는 곳입니다.\n생물 카드 뒤집기 게임으로 추억을 얻어요.', 'hero_lee', null, () => { this.panel = 'heroMem'; });
    drawPoints(130, 580, ['dp', 'hearts'], { vertical: false, w: 200 });
    if (button('닫기', W - 260, H - 130, 150, 56, { layer: L })) this.panel = null;
  }
  memGrid(kind) {
    const L = 1, d = game.data;
    const isSpirit = kind === 'spirit';
    const n = isSpirit ? 10 : 5;
    panel(60, 40, W - 120, H - 80);
    text(isSpirit ? '정령들과의 추억' : '영웅들과의 추억', 100, 62, { size: 38, color: '#7a3b12' });
    drawPoints(560, 56, isSpirit ? ['dp'] : ['hearts'], { w: 200 });
    const cols = isSpirit ? 5 : 5, cw = 210, ch = isSpirit ? 250 : 400, gx = 14;
    const x0 = (W - (cols * cw + (cols - 1) * gx)) / 2, y0 = 130;
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i % cols) * (cw + gx), cy = y0 + Math.floor(i / cols) * (ch + 14);
      const opened = isSpirit ? save.spiritMem[i] : save.heroMem[i];
      panel(cx, cy, cw, ch, { fill: opened ? '#fff8ea' : '#d9cdb8', r: 8 });
      const im = img((isSpirit ? (opened ? 'sp_on' : 'sp_off') : (opened ? 'hp_on' : 'hp_off')) + (i + 1));
      drawFit(im, cx + 10, cy + 10, cw - 20, ch - 100);
      text(`${i + 1}번 퍼즐`, cx + cw / 2, cy + ch - 86, { size: 22, align: 'center', color: '#7a3b12' });
      textBox(isSpirit ? SPIRIT_TITLES[i] : HERO_TITLES[i], cx + 6, cy + ch - 62, cw - 12, 30, { size: 22 });
      if (!opened) {
        const need = isSpirit ? `${spiritMemCost(i)} 독도 포인트` : `${fmt(HERO_COST[i])} 카드 점수`;
        text(isSpirit && !save.cleared[i] ? `${i + 1}스테이지를 깨면 열려요` : need, cx + cw / 2, cy + ch - 30, { size: 18, align: 'center', color: '#5a4a3a' });
      }
      if (hit(cx, cy, cw, ch, L)) this.openMem(kind, i);
    }
    textBox(isSpirit ? '달리고 구하고 풀어라! 에서 스테이지를 깨면 정령 퍼즐을 열 수 있어요.' : '게임 난이도가 높을 수록 높은 카드 점수를 받을 수 있습니다.\n영웅 퍼즐을 1개 열면 노멀모드, 3개 열면 하드모드가 열려요.', 90, H - 140, W - 420, 80, { size: 22, align: 'left', color: '#5a4a3a' });
    if (button('뒤로가기', W - 290, H - 128, 190, 60, { layer: L })) this.panel = 'memories';
  }
  draw_spiritMem() { this.memGrid('spirit'); }
  draw_heroMem() { this.memGrid('hero'); }
  openMem(kind, i) {
    const d = game.data;
    if (kind === 'spirit') {
      if (save.spiritMem[i]) {
        const s = spiritImage(i);
        this.reader.show({ title: `정령들과의 추억 ${i + 1} · ${SPIRIT_TITLES[i]}`, text: d.spiritPuzzleTexts[i], image: i === 0 ? 'water_mob' : 'spirits', frame: s.frame, caption: d.hub.spiritNames[i] });
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
        this.reader.show({ title: `영웅들과의 추억 ${i + 1} · ${HERO_TITLES[i]}`, text: d.heroTexts[i], image: pic, caption: cap });
      } else {
        const cost = HERO_COST[i];
        if (save.hearts < cost) this.notice.push(`${i + 1}번 퍼즐은 카드 점수가 ${fmt(cost)}점 필요합니다.\n게임 난이도가 높을 수록 높은 점수를 받을 수 있습니다.`, { face: 'heart' });
        else this.notice.push(`퍼즐을 ${fmt(cost)}점 사용하여 열람하겠습니까?\n(카드 점수 사용)`, {
          buttons: ['열람하기', '취소'], face: 'heart',
          onClose: k => { if (k === 0) { save.hearts -= cost; save.heroMem[i] = true; persist(); audio.sfx('buy'); this.openMem('hero', i); } },
        });
      }
    }
  }

  // ---------------------------------------------------------------- 패널: 정령 구출 (마을에 불러내기)
  draw_spirits() {
    const L = 1, d = game.data.hub, i = this.page;
    panel(240, 40, 800, H - 80);
    text('정령 구출', 640, 62, { size: 40, align: 'center', color: '#7a3b12' });
    const shown = save.shown[i];
    const s = spiritImage(i);
    panel(440, 120, 400, 300, { fill: '#2d3a45', inner: false });
    ctx.save(); if (!shown) ctx.filter = 'brightness(0.25)';
    drawFit(s.im, 480, 130, 320, 280, { frame: s.frame });
    ctx.restore();
    if (!shown) drawFit(img('Lock'), 580, 210, 120, 120);
    text(d.spiritNames[i], 640, 432, { size: 36, align: 'center' });
    text(save.rescued[i] ? '달리기에서 구출한 정령이에요' : `${i + 1}스테이지에 숨어 있는 정령이에요`, 640, 474, { size: 22, align: 'center', color: '#5a4a3a' });
    if (shown) {
      panel(490, 520, 300, 70, { fill: '#c8e6b0' });
      text('구출 성공!', 640, 538, { size: 32, align: 'center' });
    } else {
      const c1 = d.spiritCostDP[i], c2 = d.spiritCostSave[i];
      if (button(`${fmt(c1)}`, 340, 520, 280, 70, { layer: L, icon: img('dp'), size: 30 })) this.buySpirit(i, 'dp', c1);
      if (button(`${fmt(c2)}`, 660, 520, 280, 70, { layer: L, icon: img('savept'), size: 30 })) this.buySpirit(i, 'savePts', c2);
    }
    if (button('◀', 260, 230, 70, 90, { layer: L, size: 34 }) || (keyHit('ArrowLeft') && L === ui.top)) this.page = (i + 9) % 10;
    if (button('▶', 950, 230, 70, 90, { layer: L, size: 34 }) || (keyHit('ArrowRight') && L === ui.top)) this.page = (i + 1) % 10;
    text(`${i + 1} / 10`, 640, 612, { size: 26, align: 'center' });
    textBox('정령들을 포인트를 주고 풀어줄 수 있어요. 풀어준 정령은 마을에 나와 이야기를 들려줘요!', 270, 640, 560, 50, { size: 20, align: 'left', color: '#5a4a3a' });
    if (button('닫기', 880, 620, 140, 56, { layer: L })) this.panel = null;
  }
  buySpirit(i, kind, cost) {
    const name = kind === 'dp' ? '독도 포인트' : '구출 포인트';
    if (save[kind] < cost) { this.notice.push(`${name}가 부족해요. (${fmt(cost)}점 필요)`, { face: kind === 'dp' ? 'dp' : 'savept' }); return; }
    this.notice.push(`${name} ${fmt(cost)}점으로 ${game.data.hub.spiritNames[i]}을(를) 구출할까요?`, {
      buttons: ['구출하기', '취소'],
      onClose: k => {
        if (k !== 0) return;
        save[kind] -= cost; save.shown[i] = true; persist(); audio.sfx('good');
        this.walkers.push({ i, x: 640, y: 560, vx: 0, tNext: 1, clicks: 0, flip: false });
      },
    });
  }

  // ---------------------------------------------------------------- 패널: 카드 모음
  cardPanel(kind) {
    const L = 1, d = game.data.hub;
    const isChar = kind === 'character';
    const cards = isChar ? d.characterCards : d.creatureCards;
    const owned = isChar ? save.character : save.creature;
    const price = 100 * ((isChar ? save.characterBuys : save.creatureBuys) + 1);
    const cur = isChar ? 'dp' : 'hearts';
    panel(60, 30, W - 120, H - 60);
    text(isChar ? '독도 캐릭터 카드' : '독도 생물 카드', 100, 50, { size: 38, color: '#7a3b12' });
    panel(470, 46, 260, 54, { r: 8, inner: false });
    drawFit(img(isChar ? 'dp' : 'heart'), 478, 50, 46, 46);
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
        if (owned[i]) this.reader.show({ title: isChar ? c.title : `${c.quote} · ${c.title}`, text: (isChar ? c.quote + '\n\n' : '') + c.desc, image: cardPicName(c.pic) });
        else if (save[cur] < price) this.notice.push(`${isChar ? '독도 포인트' : '카드 점수'}가 ${fmt(price)}점 필요해요.\n${isChar ? '' : '파란 로봇의 퀴즈를 풀어도 생물 카드를 얻을 수 있어요!'}`, { face: isChar ? 'dp' : 'heart' });
        else this.notice.push(`${i + 1}번 카드를 ${fmt(price)}점에 살까요?\n(카드의 가격은 점점 비싸져요)`, {
          buttons: ['사기', '취소'],
          onClose: k => {
            if (k !== 0) return;
            save[cur] -= price; owned[i] = true;
            if (isChar) save.characterBuys++; else save.creatureBuys++;
            persist(); audio.sfx('buy');
          },
        });
      }
    });
    textBox(isChar ? '열리지 않은 카드를 클릭하면 독도 포인트로 카드를 살 수 있어요. 독도 캐릭터에 대한 정보들을 알 수 있어요!'
      : '게임을 진행하며 만나는 파란 로봇의 퀴즈를 풀면 카드를 얻을 수 있어요! 카드 점수로 살 수도 있어요.', 100, H - 110, W - 400, 60, { size: 21, align: 'left', color: '#5a4a3a' });
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
      ['독도 석상', '퍼즐을 열고 독도에 대하여 알아봅시다. 정령 퍼즐은 독도 포인트, 영웅 퍼즐은 카드 점수로 열어요.'],
      ['정령 구출하기', '포인트로 정령들을 마을에 불러낼 수 있어요. 정령을 누르면 이야기를 들려줘요.'],
      ['독도 캐릭터 카드', '독도 캐릭터들에 대한 정보를 알 수 있습니다.'],
      ['독도 생물 카드', '독도에 살고있는 생물들에 대한 정보를 얻을 수 있습니다.'],
      ['마지막 승부', '10스테이지까지 정령 10명을 모두 구하면 로보킹과 독도를 건 퀴즈 배틀을 할 수 있어요!'],
    ];
    lines.forEach(([h, d], i) => {
      text('• ' + h, 360, 130 + i * 82, { size: 28, color: '#2b2b2b' });
      textBox(d, 390, 164 + i * 82, W - 520, 44, { size: 21, align: 'left', valign: 'top', color: '#5a4a3a' });
    });
    if (button('닫기', W - 270, H - 120, 150, 56, { layer: L })) this.panel = null;
  }
}

function cardPicName(pic) {
  if (!pic) return null;
  if (/^(Bird|Fish|Flower|GangChi)/.test(pic)) return 'cr_' + pic;
  return 'sp/' + pic;
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
