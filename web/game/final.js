// 독도를 건 마지막 승부: 로보킹과의 퀴즈 배틀
import { W, H, ctx, img, drawCover, drawFit, panel, text, textBox, button, hit, keyHit, save, persist, audio, go, game, fmt, dim, beginUI, shuffle } from './core.js';
import { nav, Notice, Reader } from './widgets.js';
import { SPIRIT_TITLES, HERO_TITLES } from './hub.js';

// 난이도: 8문제 맞히면 승리, 8번 틀리면 패배, 문제당 90초, 힌트 8번
const MY_HP = 800, OP_HP = 800, Q_TIME = 90, HINTS = 8;

export class FinalBattleScene {
  constructor() {
    const qs = game.data.finalQuiz.map((q, i) => ({ ...q, i }));
    // 처음 두 문제는 꼭 나오고, 나머지는 섞어서
    this.queue = [qs[0], qs[1], ...shuffle(qs.slice(2))];
    this.my = MY_HP; this.op = OP_HP; this.state = 'intro'; this.t = 0; this.num = 0;
    this.hints = HINTS; this.notice = new Notice(); this.reader = new Reader(); this.lib = false;
  }
  enter() { audio.play('roboking_battle'); }
  next() {
    if (!this.queue.length) { this.state = 'lose'; return; }
    this.q = this.queue.shift(); this.num++; this.time = Q_TIME; this.state = 'question'; this.t = 0;
  }
  answer(k) {
    const ok = k === this.q.correct;
    this.result = { ok, picked: k, t: 0 };
    this.state = 'feedback';
    if (ok) { this.op -= 100; audio.sfx('good'); } else { this.my -= 100; audio.sfx('bad'); }
  }
  update(dt) {
    this.t += dt;
    if (this.lib || this.reader.open || this.notice.open) return;
    if (this.state === 'question') { this.time -= dt; if (this.time <= 0) this.answer(-1); }
    if (this.state === 'feedback') {
      this.result.t += dt;
    }
  }
  get layer() { return this.notice.open ? 3 : this.reader.open ? 2 : this.lib ? 1 : 0; }
  draw() {
    beginUI(this.layer);
    drawCover(img('bg8'), 0, 0, W, H);
    if (this.state === 'intro') return this.drawIntro();
    // 체력
    const bar = (x, label, hp, max, icon, right) => {
      drawFit(img(icon), right ? x - 130 : x, 14, 130, 130);
      const bx = right ? x - 470 : x + 140;
      panel(bx, 30, 330, 90, { r: 8 });
      text(label, bx + 16, 40, { size: 24 });
      text(`남은 에너지: ${Math.max(0, hp)}`, bx + 314, 40, { size: 22, align: 'right' });
      ctx.fillStyle = '#3a2f28'; ctx.fillRect(bx + 16, 76, 298, 28);
      ctx.fillStyle = right ? '#c0392b' : '#3d9a4a'; ctx.fillRect(bx + 18, 78, 294 * Math.max(0, hp) / max, 24);
    };
    bar(20, '나', this.my, MY_HP, this.my > MY_HP * 0.35 ? 'playericon' : 'playericon2', false);
    const kingFace = 'roboking' + Math.min(5, 1 + Math.floor((OP_HP - this.op) / (OP_HP / 5)));
    bar(W - 20, '로보킹', this.op, OP_HP, kingFace, true);
    if (this.state === 'question' || this.state === 'feedback') this.drawQuestion();
    if (this.state === 'feedback') this.drawFeedback();
    if (this.state === 'win' || this.state === 'lose') this.drawEnd();
    if (this.lib) this.drawLibrary();
    this.reader.draw(2);
    this.notice.draw(3);
  }
  drawIntro() {
    dim(0.35);
    text('독도의 운명을 건', W / 2, 150, { size: 44, align: 'center', color: '#fff', stroke: '#2b2b2b', strokeW: 8 });
    text('독도 퀴즈 배틀', W / 2, 210, { size: 96, align: 'center', color: '#ffe066', stroke: '#2b2b2b', strokeW: 12 });
    drawFit(img('playericon'), 220, 330, 200, 200);
    drawFit(img('roboking1'), W - 420, 330, 200, 200);
    text('VS', W / 2, 400, { size: 80, align: 'center', color: '#fff', stroke: '#c0392b', strokeW: 10 });
    textBox(`문제를 맞히면 로보킹의 에너지가 100 줄고, 틀리거나 시간이 지나면 내 에너지가 100 줄어요.\n${OP_HP / 100}문제를 맞혀 로보킹의 에너지 ${OP_HP}을 모두 없애면 승리! (문제마다 ${Q_TIME}초, 힌트 ${HINTS}번)`, 200, 540, W - 400, 80, { size: 24, color: '#fff', stroke: 'rgba(0,0,0,.7)', strokeW: 5 });
    if (button('시작', W / 2 - 150, 630, 300, 70, { size: 36 }) || keyHit('Enter')) this.next();
    if (button('뒤로가기', 30, 640, 200, 60, { size: 26 })) go(nav.hub());
  }
  drawQuestion() {
    const L = 0, q = this.q;
    // 문제 번호 · 남은 시간 (문제 칸 위에 한 줄로)
    panel(60, 126, 150, 44, { fill: '#3a2f28', line: '#f4e3c3', inner: false });
    text(`문제 ${this.num}`, 135, 133, { size: 26, color: '#fff', align: 'center' });
    panel(226, 130, 760, 36, { r: 8, fill: 'rgba(58,47,40,.92)', line: '#f4e3c3', inner: false, lw: 2 });
    ctx.fillStyle = this.time > 20 ? '#e0b040' : '#e06040'; ctx.fillRect(234, 138, 744 * Math.max(0, this.time) / Q_TIME, 20);
    text(`남은 시간 ${Math.ceil(Math.max(0, this.time))}초`, 1000, 132, { size: 26, color: '#fff', stroke: '#2b2b2b', strokeW: 6 });
    panel(60, 178, W - 120, 246, { fill: 'rgba(250,240,220,.97)' });
    textBox(q.q, 90, 192, W - 180, 218, { size: 30 });
    q.a.forEach((a, k) => {
      const x = 60 + (k % 2) * 590, y = 436 + Math.floor(k / 2) * 112;
      let fill;
      if (this.state === 'feedback') fill = k === q.correct ? '#c8e6b0' : (k === this.result.picked ? '#f2c0b0' : '#e5dccb');
      if (button(a, x, y, 570, 100, { size: 24, layer: this.state === 'question' ? L : 9, fill, minSize: 14 })) this.answer(k);
    });
    if (this.state === 'question') {
      if (button(`도와주세요! 독도아저씨! (힌트 ${this.hints})`, 60, 664, 470, 50, { size: 22 })) this.lib = true;
      if (button('퀴즈 포기하기', W - 260, 664, 200, 50, { size: 22 })) this.notice.push('진행중인 퀴즈를 포기하고 밖으로 나갑니다.\n현재까지 진행된 내용은 저장되지 않습니다.', { title: '<경고>', buttons: ['나가기', '게임으로 돌아가기'], onClose: i => { if (i === 0) go(nav.hub()); } });
    }
  }
  drawFeedback() {
    const r = this.result;
    const msg = r.ok ? '받아라!\n독도에서 쌓은 우리들의 추억을!' : (r.t < 1.6 ? (r.picked < 0 ? '시간이 다 됐다...!' : '하하하하하하하\n독도에서 이것밖에 배우지 못했느냐?\n가엾구나......') : '독도 에너지를 100 잃었다...!');
    panel(W / 2 - 330, 250, 660, 200, { fill: r.ok ? '#eaf6e0' : '#fbe6e0' });
    textBox(msg, W / 2 - 300, 270, 600, 160, { size: 34 });
    if (r.t > 1.2 && (button('다음 문제', W / 2 - 130, 470, 260, 70, { size: 30 }) || keyHit('Enter', 'Space'))) {
      if (this.op <= 0) { this.state = 'win'; save.finalCleared = true; persist(); }
      else if (this.my <= 0) this.state = 'lose';
      else this.next();
    }
  }
  drawEnd() {
    dim(0.6);
    panel(W / 2 - 380, 150, 760, 420);
    if (this.state === 'win') {
      drawFit(img('RobokingDefeated'), W / 2 - 110, 170, 220, 220);
      text('승리!', W / 2, 400, { size: 60, align: 'center', color: '#3d7a2a' });
      if (button('계속', W / 2 - 130, 480, 260, 70, { size: 32 })) go(nav.ending());
    } else {
      textBox('하하하하하하하\n모자란 네 녀석 덕분에\n이렇게 쉽게 독도를 가져가는구나\n고.맙.다.', W / 2 - 340, 170, 680, 170, { size: 30 });
      textBox('나는 허무하게 패배하고 말았다...\n내가.. 놓친것이 무엇일까...? 독도퍼즐들을 다시 살펴봐야겠다.', W / 2 - 340, 340, 680, 110, { size: 26, color: '#5a4a3a' });
      if (button('다시 도전', W / 2 - 300, 480, 280, 70, { size: 30 })) go(nav.final());
      if (button('독도 마을로', W / 2 + 20, 480, 280, 70, { size: 30 })) go(nav.hub());
    }
  }
  drawLibrary() {
    const L = 1, d = game.data;
    dim(0.6);
    panel(60, 30, W - 120, H - 60, { fill: '#e9dcc0' });
    text('독도 도서관', W / 2, 50, { size: 42, align: 'center', color: '#7a3b12' });
    text('책에 낙서 금지', 110, 60, { size: 20, color: '#7a5a3a' });
    text(`남은 힌트: ${this.hints}개`, W - 110, 60, { size: 26, align: 'right' });
    const books = [...SPIRIT_TITLES.map((t, i) => ({ t, open: save.spiritMem[i], text: d.spiritPuzzleTexts[i], kind: '정령들의 추억 ' + (i + 1) })),
      ...HERO_TITLES.map((t, i) => ({ t, open: save.heroMem[i], text: d.heroTexts[i], kind: '영웅들의 추억 ' + (i + 1) }))];
    books.forEach((b, k) => {
      const x = 100 + (k % 5) * 218, y = 120 + Math.floor(k / 5) * 160;
      panel(x, y, 200, 140, { fill: b.open ? (k < 10 ? '#cfe3f5' : '#f5d6cf') : '#a99f8f', r: 6 });
      text(b.kind, x + 100, y + 14, { size: 18, align: 'center', color: '#5a4a3a' });
      textBox(b.open ? b.t : '잠김', x + 10, y + 40, 180, 90, { size: 24, color: b.open ? '#2b2b2b' : '#eee' });
      if (hit(x, y, 200, 140, L)) {
        if (!b.open) this.notice.push('<열람 불가 안내>\n독도 도서관의 모든 자료는 퍼즐을 획득한 후에 열람하실 수 있습니다.\n독도석상의 퍼즐을 열고 자료를 열람해 봅시다!');
        else if (this.hints <= 0) this.notice.push('힌트를 모두 사용했어요.');
        else { this.hints--; this.reader.show({ sub: b.kind, name: b.t, text: b.text }); }
      }
    });
    if (button('도서관 닫기', W - 300, H - 110, 220, 60, { layer: L, size: 26 }) || keyHit('Escape')) this.lib = false;
  }
}
