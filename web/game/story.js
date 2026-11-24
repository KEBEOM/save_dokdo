// 이야기 장면(인트로·중간 이야기·엔딩)의 대사와, 대사를 넘기며 보여 주는 장면
import { W, H, ctx, img, drawCover, drawFit, panel, textBox, text, button, hit, input, keyHit, audio, beginUI, ui, dim } from './core.js';

const DADDY = { img: 'daddy', x: 40, y: 70, w: 420, h: 420 };
const LEE = { img: 'generallee', x: 40, y: 60, w: 430, h: 430 };
const KING = { img: 'bg18', x: 470, y: 40, w: 340, h: 340 };
const BOY = { img: 'boy_jump', frame: [0, 0, 80, 80], x: 60, y: 300, w: 200, h: 200 };

// 처음 시작할 때: 독도가 잊혀 가는 이야기
export const MAIN_INTRO = [
  { bg: 'bg1', text: '때는 2XXX년 언제부터인지\n사람들이 독도에 대한 관심을 끊기 시작했다.' },
  { bg: 'bg6', text: '모든 매체에선 독도에 대한 \n내용을 전혀 다루지 않았고' },
  { bg: 'bg4', text: '심지어 독도에 대한 기억을 잃은 \n사람들이 증가하기 시작했다.' },
  { bg: 'bg1', text: '독도는 사람들에게 점점 잊혀 \n존재 자체가 사라질 위기에 처했다!' },
  { bg: 'bg5', text: '', auto: 2.5 },
];
// 독도아저씨와의 첫 만남
export const MAIN_INTRO2 = [
  ['???', '아!!!!!!!!!!! 원통하다!!!!!!!!!!!', true],
  ['???', '사람들의 기억속에서 \n독도가 사라지다니...!!!!', true],
  ['???', '음...? 자네는 누구지?', true],
  ['???', '아! 설마 독도를 구하러 온건가?', true],
  ['독도아저씨', "난 '독도아저씨'라고 한다네"],
  ['독도아저씨', '어떤 이유에서인지 사람들의 기억에서\n독도에 대한 정보가 사라졌다네...'],
  ['독도아저씨', '보아하니 자네도 독도에 대해\n기억이 나질 않는 것 같군..'],
  ['독도아저씨', '독도를 다시 원래대로 돌려놓는 방법은\n독도를 다시 기억하는 것!!'],
  ['독도아저씨', '즉, 독도에 대한 지식을 쌓아야하지!!'],
  ['독도아저씨', '막무가내라 미안하지만 그렇게 됐네\n독도에 대한 지식을 쌓아주게나!!'],
  ['독도아저씨', '그럼 독도를 잘 부탁하네----!!!!'],
].map(([speaker, t, shadow]) => ({ bg: 'bg3', speaker, text: t, chars: [{ ...DADDY, shadow: !!shadow }] }));

// 달리기 게임을 처음 할 때
export const RUN_INTRO = [
  { bg: 'bg14', text: '언제부터 인가 독도에 로봇들이 출몰하더니,\n결국 독도를 점령해 버리고 말았다..!' },
  { bg: 'bg16', text: '사람들이 독도에 대해 까먹은 것도 \n이것과 관련이 있다고 생각한다..!', speaker: '독도아저씨', chars: [DADDY] },
  { bg: 'bg15', text: '내가 도와줄 테니, \n로봇들로부터 독도를 구해보자!', speaker: '독도아저씨', chars: [DADDY] },
];

// 8스테이지를 깬 뒤: 독도아저씨의 정체
export const LEE_REVEAL = [
  { bg: 'bg3', speaker: '독도아저씨', chars: [DADDY], text: '여기까지 잘 따라와 주었다. 이제 더는 내가 널 도와줄 수 없다! \n이 앞은 순수한 마음을 가진 어린이만 들어갈 수 있지...!' },
  { bg: 'bg3', speaker: '독도아저씨', chars: [DADDY], text: '이제 나의 원래 모습을 보여줄 때가 되었구나..' },
  { bg: 'bg3', chars: [{ img: 'boom', x: 40, y: 60, w: 440, h: 440 }], text: '', auto: 1.2 },
  { bg: 'bg3', speaker: '이사부 장군', chars: [LEE], text: '나의 후손이여, 너의 안전이 나는 너무도 걱정이 되는구나...' },
  { bg: 'bg3', speaker: '이사부 장군', chars: [LEE], text: '여기서 쌓은 독도의 지식과 추억이 있기에 \n너는 반드시 해낼 수 있을 거라 믿는다.' },
  { bg: 'bg3', speaker: '이사부 장군', chars: [LEE], text: '부디 로봇들의 왕을 물리치고 독도를 구해주길 바란다!' },
];

// 마지막 승부 전에 이사부 장군이 묻는 장면
export const BEFORE_FINAL = [
  { bg: 'bg9', speaker: '이사부 장군', chars: [LEE], text: '잠깐...!!!!!!!!!' },
  { bg: 'bg9', speaker: '이사부 장군', chars: [LEE], text: '석상에서 독도에 대한 정보는\n전부 다 읽고 가는건가?', statue: true },
  { bg: 'bg9', speaker: '이사부 장군', chars: [LEE], text: '로보킹과의 결전에 필요한 지식이니 꼭 읽기를 바라네!', statue: true },
  { bg: 'bg9', speaker: '이사부 장군', chars: [LEE], text: '', choices: ['아직 전부 읽지를 못해서..\n제대로 읽고 오겠습니다!!!', '전부 다 읽었습니다!!!\n그럼 다녀오겠습니다!!!!'] },
];

// 엔딩
const kingPage = t => ({ bg: 'bg9', speaker: '로보킹', chars: [KING], text: t });
const daddy2 = { img: 'daddy2', x: 330, y: 30, w: 620, h: 310 };
export const ENDING = [
  kingPage('이럴수가...'),
  kingPage('독도의 자원은 우리 로봇들이 살아가는데 굉장히 필요했다..'),
  kingPage('독도를 침략하기 위해 열심히 공부했거늘...!'),
  kingPage('너한테 패배한 것은 굴욕적이지만..!\n약속은 약속... 깨끗하게 물러나겠다.'),
  kingPage('침략한 입장에서 이런 말 하는 것도 웃기지만'),
  kingPage('다른 이들도 우리처럼 독도를 \n노릴 수 있다는 것을 명심해라.'),
  kingPage('너희가 독도에 크게 관심이 없었기 때문에\n우리가 쉽게 침략하고 빼앗을 수 있었다...'),
  kingPage('다시는 독도를 빼앗기지 않도록 독도를 사랑하고 \n관심을 가져주기 바란다.. 그럼 이만...'),
  { bg: 'bg9', speaker: '나', chars: [KING, BOY], text: '잠깐만!!!!!!!!!!!!!!!' },
  { bg: 'bg9', speaker: '나', chars: [KING, BOY], text: '', choices: ['나에게 좋은 생각이 있어!!!'] },
  { bg: 'bg9', speaker: '나', chars: [KING, BOY], text: '반성의 의미로 사람들을 도와주면 좋을 것 같아!!' },
  { bg: 'bg10', text: '앵커 : 속보입니다. 독도 사건을 일으킨 로봇 일당이 \n대국민 사과를 위한 기자회견을 열었습니다.' },
  { bg: 'bg10', text: '앵커 : 또한 로봇들은 사과의 의미로 사람들을 도와주겠다고 약속했습니다.' },
  { bg: 'bg11', text: '사람의 힘으로 탐사하기 힘든 바닷속을 \n로봇이 대신 탐사해 주며\n다양한 데이터를 사람들에게 제공해 주고 있다.' },
  { bg: 'bg12', text: '또한, 독도로봇수비대로 활동하며 \n사람들과 함께 독도를 지키는 중이다.' },
  { bg: 'bg13', text: '로봇은 공로를 인정받아 독도에서 거주하게 되었고,\n현재까지 로봇들은 사람들을 도와 \n외부의 침입으로 부터 독도를 지키고 있다.' },
  { bg: 'bg5', text: '', auto: 1.5 },
  { bg: 'bg5', speaker: '독도아저씨', chars: [daddy2], text: '잠깐!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!' },
  { bg: 'bg5', speaker: '독도아저씨', chars: [daddy2], text: '마지막으로 할 말이 있어서 왔다!!!!!' },
  { bg: 'bg5', speaker: '독도아저씨', chars: [daddy2], text: '이 일을 끝으로 독도에 대한 관심이\n끊기지 않길 바란다!!!!!!!!!!!!!!!' },
  { bg: 'bg5', speaker: '독도아저씨', chars: [daddy2], text: '너희도 독도에 대해 꾸준히 관심을 \n가지고 사랑해주길 바란다!!!!' },
  { bg: 'bg5', speaker: '독도아저씨', chars: [daddy2], text: '할 수 있겠나?!!!!!!!!!!!!!!!!!!!!!!!!!' },
  { bg: 'bg5', speaker: '독도아저씨', chars: [daddy2], text: '', choices: ['네! 독도를 항상 \n사랑하며 살겠습니다!!!', '물론이죠!!! \n독도는 저에게 맏겨주십쇼!!!'], replies: ['좋은 대답이구나!!!!!!!!!!!!', '그럼 그럼!! 당연히 그래야지!!!!'] },
  { bg: 'bg5', speaker: '독도아저씨', chars: [daddy2], text: '', reply: true },
  { bg: 'bg5', speaker: '독도아저씨', chars: [daddy2], text: '앞으로도 독도를 잘 부탁한다..' },
];

// ---------------------------------------------------------------- 이야기 장면
export class StoryScene {
  constructor(pages, { music, onDone, skip = true } = {}) {
    this.pages = pages; this.i = 0; this.t = 0; this.music = music; this.onDone = onDone; this.skip = skip;
    this.choice = null; this.reply = '';
  }
  enter() { if (this.music) audio.play(this.music, false); }
  next() {
    this.i++; this.t = 0;
    if (this.i >= this.pages.length) { this.i = this.pages.length - 1; this.done(); }
  }
  done() { if (!this.finished) { this.finished = true; this.onDone?.(this.choice); } }
  update(dt) {
    this.t += dt;
    const p = this.pages[this.i];
    if (p.auto && this.t >= p.auto) this.next();
  }
  draw() {
    beginUI(0);
    const p = this.pages[this.i];
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    drawCover(img(p.bg), 0, 0, W, H);
    for (const c of p.chars || []) {
      const im = img(c.img);
      if (!im) continue;
      if (c.shadow) {
        ctx.save(); ctx.filter = 'brightness(0)'; drawFit(im, c.x, c.y, c.w, c.h, { frame: c.frame }); ctx.restore();
      } else drawFit(im, c.x, c.y, c.w, c.h, { frame: c.frame });
    }
    if (p.statue) drawFit(img('statue'), 860, 70, 300, 300);
    const appear = Math.min(1, this.t * 4);
    let txt = p.reply ? this.reply : p.text;
    if (p.choices) {
      const n = p.choices.length, bw = n === 1 ? 760 : 560, gap = 40;
      const x0 = (W - (bw * n + gap * (n - 1))) / 2;
      p.choices.forEach((c, k) => {
        if (button(c, x0 + k * (bw + gap), 520, bw, 150, { size: 32 })) {
          this.choice = k;
          if (p.replies) this.reply = p.replies[k];
          this.next();
        }
      });
    } else if (txt) {
      ctx.globalAlpha = appear;
      panel(90, 500, W - 180, 190, { fill: 'rgba(250,240,220,.96)' });
      if (p.speaker) {
        panel(120, 452, 230, 62, { fill: '#3a2f28', line: '#f4e3c3', inner: false });
        text(p.speaker, 235, 465, { size: 30, color: '#fff', align: 'center' });
      }
      textBox(txt, 130, 520, W - 260, 150, { size: 38 });
      ctx.globalAlpha = 1;
      text('* 대사를 터치해서 넘기기', 100, 20, { size: 24, color: '#fff', stroke: 'rgba(0,0,0,.6)' });
    }
    if (this.skip && button('넘어가기', W - 230, 18, 200, 64, { size: 28 })) { this.done(); return; }
    if (!p.choices && !p.auto && this.t > 0.25 && (keyHit('Space', 'Enter') || (input.clicked && !(input.clickX > W - 240 && input.clickY < 90)))) this.next();
  }
}
