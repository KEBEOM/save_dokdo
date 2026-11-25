// 구해줘 독도! 웹 버전 시작점: 데이터 불러오기, 화면 연결, 게임 루프
import { canvas, ctx, W, H, resize, beginFrame, endInputFrame, game, setScene, stepScene, go, save, persist, preload, ui } from './core.js';
import { nav } from './widgets.js';
import { StoryScene, MAIN_INTRO, MAIN_INTRO2, RUN_INTRO, LEE_REVEAL, BEFORE_FINAL, ENDING } from './story.js';
import { TitleScene, HubScene, SelectScene } from './hub.js';
import { CardModeScene, CardGameScene } from './cards.js';
import { StageSelectScene, StageScene, RobotQuizScene } from './stage.js';
import { FinalBattleScene } from './final.js';

// 화면 이동 함수
Object.assign(nav, {
  title: () => new TitleScene(),
  intro: () => new StoryScene(MAIN_INTRO, { music: 'daddy_reveal', onDone: () => go(nav.intro2()) }),
  intro2: () => new StoryScene(MAIN_INTRO2, { music: 'daddy_theme', onDone: () => { save.introSeen = true; persist(); go(nav.hub()); } }),
  hub: () => new HubScene(),
  select: () => new SelectScene(),
  cardMode: () => new CardModeScene(),
  cardGame: m => new CardGameScene(m),
  runIntro: () => new StoryScene(RUN_INTRO, { music: 'run_intro', onDone: () => { save.runIntroSeen = true; persist(); go(nav.stage(1)); } }),
  stageSelect: () => new StageSelectScene(),
  stage: n => new StageScene(n),
  robotQuiz: (q, back, onSolved) => new RobotQuizScene(q, back, onSolved),
  leeReveal: () => new StoryScene(LEE_REVEAL, { music: 'daddy_reveal', onDone: () => go(nav.stage(9)) }),
  beforeFinal: () => new StoryScene(BEFORE_FINAL, { music: 'daddy_theme', skip: false, onDone: c => go(c === 1 ? nav.final() : nav.hub()) }),
  final: () => new FinalBattleScene(),
  ending: () => new StoryScene(ENDING, { music: 'roboking_defeat', onDone: () => go(nav.title()) }),
});

// 시험·문제 확인용 (브라우저 개발자 도구에서 사용)
window.__dokdo = { game, nav, go, get save() { return save; }, persist };

async function boot() {
  resize();
  window.addEventListener('resize', resize);
  const bar = document.getElementById('load-fill');
  const status = document.getElementById('load-text');
  try {
    const font = new FontFace('DoHyeon', 'url(assets/dohyeon.woff?v=2)');
    document.fonts.add(await font.load());
  } catch (_) { /* 글꼴을 못 불러와도 기본 글꼴로 계속 */ }
  if (bar) bar.style.width = '30%';
  game.data = await (await fetch('game/data/gamedata.json')).json();
  game.puzzles = await (await fetch('game/data/puzzles.json')).json();
  if (bar) bar.style.width = '50%';
  // 처음 화면에 바로 필요한 그림 먼저
  const first = ['bg1', 'bg3', 'bg5', 'bg6', 'bg4', 'dokdo_icon', 'daddy', 'forest', 'statue', 'water_icon', 'card_icon', 'daddy_small', 'dp', 'heart', 'savept', 'Lock'];
  let done = 0;
  await Promise.all(first.map(n => preload([n]).then(() => { done++; if (bar) bar.style.width = (50 + 50 * done / first.length) + '%'; })));
  // 나머지는 뒤에서 미리 받아 두기
  preload(['bg2', 'bg8', 'bg9', 'bg10', 'bg11', 'bg12', 'bg13', 'bg14', 'bg15', 'bg16', 'bg17', 'bg18', 'bg19', 'runbg_morning', 'boy_stand', 'boy_walk', 'boy_jump', 'robo_red', 'robo_blue', 'roboking', 'spirits', 'water_mob', 'cardback', 'titleblock', 'selecticon', 'daddy4', 'generallee', 'boom', 'card_normal']);
  document.getElementById('loading')?.remove();
  setScene(nav.title());
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    game.time += dt;
    stepScene(dt);
    game.scene.update?.(dt);
    beginFrame();
    ctx.clearRect(0, 0, W, H);
    game.scene.draw();
    if (game.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${game.fade})`; ctx.fillRect(0, 0, W, H); }
    canvas.style.cursor = ui.cursor;
    endInputFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
boot().catch(err => {
  console.error(err);
  const t = document.getElementById('load-text');
  if (t) t.textContent = '게임을 불러오지 못했어요. 새로고침(F5)을 해 주세요.';
});
