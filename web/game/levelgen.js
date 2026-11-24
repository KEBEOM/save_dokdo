// 랜덤 스테이지 만들기: 들어갈 때마다 발판 배치가 새로 나오고, 스테이지가 오를수록 어려워짐
// 모든 발판은 (더블) 점프로 닿을 수 있는 거리 안에서만 만들어짐
//   한 번 점프: 약 2.4칸 위, 더블 점프: 약 3.4칸 이상 위 / 달리기 속도 5칸/초

const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function generateLevel(orig, n) {
  const d = (n - 1) / 9;                       // 난이도 0(1스테이지) ~ 1(10스테이지)
  const pathCount = 6 + n * 2;                 // 길을 이루는 발판 개수 (1스테이지 8개 ~ 10스테이지 26개)
  const plats = [];                            // {x0, w, top, kind}
  let x = -3, top = 0;

  // 시작 발판 (넓게)
  plats.push({ x0: x, w: 7, top, kind: 'start' });
  x += 7;
  for (let i = 0; i < pathCount; i++) {
    const last = i === pathCount - 1;
    let dy = last ? rand(-1, 1) : rand(-2.2, 0.8 + 2.2 * d);
    dy = Math.min(dy, 3.0);
    let gap = rand(1.2, 1.6 + 2.0 * d);
    if (dy > 2.2) gap = Math.min(gap, 2.6);    // 높이 올라갈 때는 간격을 좁게
    if (dy < -1.5) gap = Math.min(gap + 0.4, 4); // 내려갈 때는 조금 더 멀리
    top = Math.max(-1, Math.min(18 + n, top + dy));
    const w = last ? 10 : Math.max(2, Math.round(rand(5, 8) - 4.2 * d + rand(-1, 1)));
    x += gap;
    plats.push({ x0: Math.round(x), w, top: Math.round(top * 2) / 2, kind: last ? 'end' : 'path', i });
    x = Math.round(x) + w;
  }
  const path = plats.filter(p => p.kind === 'path');
  const end = plats[plats.length - 1];

  // 위로 올라가야 하는 보너스 발판 (열쇠·정령 자리)
  const overlaps = (a) => plats.some(p => a.x0 < p.x0 + p.w + 1 && a.x0 + a.w + 1 > p.x0 && Math.abs(a.top - p.top) < 2.2);
  function bonusAbove(base) {
    for (let t = 0; t < 8; t++) {
      const w = irand(2, 3);
      const b = { x0: Math.round(base.x0 + rand(-1, base.w - 1)), w, top: base.top + Math.round(rand(2.0, 2.0 + 1.0 * d) * 2) / 2, kind: 'bonus' };
      if (!overlaps(b)) { plats.push(b); return b; }
    }
    return base;
  }
  const at = f => path[Math.min(path.length - 1, Math.max(0, Math.floor(path.length * f)))];
  const keyPlats = [0.22, 0.5, 0.78].map(f => (Math.random() < 0.45 + 0.4 * d ? bonusAbove(at(f + rand(-0.06, 0.06))) : at(f)));
  const spiritPlat = bonusAbove(at(rand(0.55, 0.9)));

  // 타일·충돌 상자로 바꾸기
  const platforms = [];
  for (const p of plats) {
    for (let k = 0; k < p.w; k++) {
      const s = p.w === 1 ? 'Platforms__Single' : k === 0 ? 'Platforms__Single_Left' : k === p.w - 1 ? 'Platforms__Single_Right' : 'Platforms__Single';
      const cx = p.x0 + k + 0.5, cy = p.top - 0.5;
      platforms.push({ s, x: cx, y: cy, sx: 1, sy: 1, box: [cx - 0.5, cy - 0.5, 1, 1] });
    }
  }
  const onTop = (p, off = 0) => [p.x0 + p.w / 2 + off, p.top];

  // 독도 포인트: 발판 위와 점프 길목에
  const coins = [];
  for (let i = 1; i < plats.length; i++) {
    const a = plats[i - 1], b = plats[i];
    if (a.kind === 'bonus' || b.kind === 'bonus') continue;
    if (Math.random() < 0.55) {
      const mx = (a.x0 + a.w + b.x0) / 2, my = Math.max(a.top, b.top) + 1.6;
      coins.push([mx, my]);
    }
    if (Math.random() < 0.35 && b.w >= 3) for (let k = 0; k < Math.min(3, b.w - 1); k++) coins.push([b.x0 + 1 + k, b.top + 0.7]);
  }

  // 로봇: 빨간 로봇(걸어 다님)은 스테이지가 오를수록 많고 빠르게
  const robots = [];
  const roomy = path.filter(p => p.w >= 3 && p.i > 1 && p.i < pathCount - 2);
  const redCount = Math.min(roomy.length, 1 + Math.round(n * 1.4));
  const shuffled = roomy.slice().sort(() => Math.random() - 0.5);
  for (let k = 0; k < redCount; k++) {
    const p = shuffled[k];
    robots.push({ x: p.x0 + p.w / 2, y: p.top + 0.4, blue: false, walk: true, q: null, flip: Math.random() < 0.5, speed: 1 + 0.18 * n });
  }
  // 문제를 내는 파란 로봇은 원작 스테이지의 문제 그대로
  const qs = [...new Set(orig.robots.filter(r => r.q).map(r => r.q))];
  const qSpots = path.filter(p => p.i > 2 && p.i < pathCount - 1 && !shuffled.slice(0, redCount).includes(p));
  qs.forEach((q, k) => {
    const p = qSpots[Math.floor((k + 1) * qSpots.length / (qs.length + 1))] || pick(path);
    robots.push({ x: p.x0 + p.w - 0.8, y: p.top + 0.4, blue: true, walk: false, q, flip: false });
  });
  // 높은 스테이지에는 가만히 서 있는 파란 로봇(장애물)도
  const blockers = Math.floor(n / 3);
  for (let k = 0; k < blockers; k++) {
    const p = pick(path.filter(q => q.w >= 3 && q.i > 2));
    if (p) robots.push({ x: p.x0 + 1, y: p.top + 0.4, blue: true, walk: false, q: null, flip: true });
  }

  const keys = keyPlats.map((p, k) => ({ n: k + 1, x: p.x0 + p.w / 2, y: p.top + 0.7, s: 'Dokdo_Icon__Dokdo_Icon_1' }));
  const sInfoH = 1.0;
  const spirit = orig.spirit ? { ...orig.spirit, x: spiritPlat.x0 + spiritPlat.w / 2, y: spiritPlat.top + sInfoH * 0.6 } : null;
  const doorX = end.x0 + 3, flagX = end.x0 + end.w - 2;
  const door = { ...orig.door, x: doorX, y: end.top + 0.93, box: [doorX - 0.566, end.top, 1.132, 30] };
  const flag = { ...orig.flag, x: flagX, y: end.top + 0.8, box: [flagX - 0.5, end.top, 1, 1] };
  const ys = plats.map(p => p.top);
  const start = [0, 1.2];
  const deco = [{ s: 'StartGuide__StartGuide_' + (n - 1), x: -1.8, y: 0.55, sx: 1.376, sy: 1.376 }];
  return {
    platforms, coins, robots, keys, spirit, door, flag, start, deco,
    topLeft: [-4, Math.max(...ys) + 6], bottomRight: [end.x0 + end.w + 2, Math.min(...ys) - 1],
    generated: true,
  };
}
