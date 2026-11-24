// 랜덤 스테이지 만들기: 들어갈 때마다 발판 배치가 새로 나오고, 스테이지가 오를수록 어려워짐
// 맵은 여러 구역을 이어 붙여 만듦
//   달리기(오르락내리락) · 탑 오르기(지그재그) · 낭떠러지(뚝 떨어지기)
//   엘리베이터(위로 움직이는 발판) · 나룻배 발판(옆으로 움직이는 발판) · 기둥 건너기(좁은 발판)
// 모든 발판은 (더블) 점프로 닿을 수 있는 거리 안에서만 만들어짐
//   한 번 점프: 약 2.4칸 위, 더블 점프: 약 4칸 위 / 달리기 속도 5칸/초

const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const half = v => Math.round(v * 2) / 2;

export function generateLevel(orig, n) {
  const d = (n - 1) / 9;                       // 0(1스테이지) ~ 1(10스테이지)
  const e = Math.min(1, 0.35 + 0.75 * d);      // 실제 난이도: 1스테이지부터 예전 중간 난이도, 7스테이지쯤 최고
  const minW = n >= 5 ? 1 : 2;
  const plats = [];                            // {x0, w, top, kind}
  const seq = [];                              // 주인공이 지나가는 순서대로 놓인 발판
  const movers = [];                           // 움직이는 발판
  const reserved = [];                         // 움직이는 발판이 지나가는 자리 (다른 발판을 놓지 않음)
  const coins = [];
  let x = -3, top = 0, last = null;

  const add = (x0, w, t, kind, onPath = true) => {
    const p = { x0: Math.round(x0), w: Math.max(1, Math.round(w)), top: half(t), kind };
    plats.push(p); if (onPath) seq.push(p);
    return p;
  };
  const endOf = p => p.x0 + p.w;
  const coinBetween = (a, b) => {
    if (Math.random() < 0.6) coins.push([(endOf(a) + b.x0) / 2, Math.max(a.top, b.top) + 1.5]);
  };

  // 시작 발판 (넓게)
  last = add(x, 7, top, 'start');

  // ---------------------------------------------------------------- 구역들
  const segs = {
    // 오르락내리락 달리기
    run() {
      const k = irand(3, 4 + Math.round(2 * e));
      for (let i = 0; i < k; i++) {
        let dy = rand(-2.0, 1.0 + 2.0 * e);
        if (top > 14) dy -= 1.2; if (top < -6) dy += 1.2;
        dy = clampN(dy, -3, 3.2);
        let gap = rand(1.4, 2.0 + 2.4 * e);
        if (dy > 2.2) gap = Math.min(gap, 2.6); else if (dy > 1.2) gap = Math.min(gap, 3.4);
        if (dy < -1) gap = Math.min(gap + 0.5, 4.8);
        const w = clampN(Math.round(rand(3, 6) - 1.6 * e + rand(-1, 1)), minW, 7);
        const p = add(endOf(last) + gap, w, top + dy, 'path');
        coinBetween(last, p);
        last = p; top = p.top;
      }
    },
    // 지그재그 탑 오르기
    climb() {
      const steps = irand(3, 4 + Math.round(3 * e));
      const wA = e > 0.6 ? 2 : irand(2, 3), wB = e > 0.6 ? 2 : irand(2, 3);
      const ax = endOf(last) + irand(1, 2), bx = ax + wA + irand(1, 2);
      let t = top + rand(-0.5, 1.0);
      let p = add(ax, wA, t, 'climb');
      coinBetween(last, p);
      for (let s = 0; s < steps; s++) {
        t += rand(1.9, 2.2) + 1.2 * e * Math.random();       // 2칸 남짓 ~ 3.4칸: 높을수록 더블 점프가 필요
        const q = add(s % 2 === 0 ? bx : ax, s % 2 === 0 ? wB : wA, t, 'climb');
        if (Math.random() < 0.5) coins.push([(Math.max(endOf(p), endOf(q)) + Math.min(p.x0, q.x0)) / 2, q.top + 0.8]);
        p = q;
      }
      last = { ...p, x0: p.x0, w: p.w };
      // 탑 꼭대기에서 오른쪽으로 나가기: 다음 구역은 탑 오른쪽 끝에서 시작
      last = p; last.exitX = bx + wB; top = p.top;
      if (p.x0 === ax) {
        // 왼쪽 기둥에서 끝났으면 오른쪽에 나가는 발판 하나 더
        const q = add(bx, wB, top + rand(1.6, 2.2), 'climb');
        last = q; top = q.top;
      }
    },
    // 낭떠러지: 아래로 뚝 떨어지기
    drop() {
      if (last.w < 2) { const p = add(endOf(last) + rand(1.4, 2.2), 3, top + rand(-0.5, 0.5), 'path'); coinBetween(last, p); last = p; top = p.top; }
      const D = rand(5, 7 + 6 * e);
      const edge = endOf(last);
      const p = add(edge + rand(0.4, 1.6), irand(3, 5), top - D, 'land');
      for (let yy = top + 0.5; yy > p.top + 1.2; yy -= 1.6) coins.push([edge + 1.2, yy]);
      last = p; top = p.top;
    },
    // 엘리베이터: 위아래로 움직이는 발판을 타고 높이 올라가기
    lift() {
      const R = rand(5, 7 + 3 * e);
      const mx = endOf(last) + 1;
      const m = { x0: mx, w: 2, top, ax: 0, ay: R, speed: 1.5 + 0.6 * e, phase: Math.random() * Math.PI * 2 };
      movers.push(m); reserved.push({ x0: mx, w: 2, top: top + R, bottom: top - 1 });
      for (let yy = top + 1.5; yy < top + R; yy += 1.8) coins.push([mx + 1, yy]);
      const q = add(mx + 2 + 1, irand(3, 5), top + R - rand(0, 0.5), 'ledge');
      last = q; top = q.top;
    },
    // 나룻배 발판: 옆으로 움직이는 발판을 타고 건너기
    ferry() {
      const D = rand(4, 6 + 4 * e), w = e > 0.6 ? 2 : irand(2, 3);
      const mx = endOf(last) + 0.5;
      const m = { x0: mx, w, top, ax: D, ay: 0, speed: 1.6 + 0.8 * e, phase: Math.random() * Math.PI * 2 };
      movers.push(m); reserved.push({ x0: mx, w: D + w, top: top + 0.5, bottom: top - 1 });
      for (let k = 1; k < 4; k++) coins.push([mx + w / 2 + D * k / 4, top + 1.3]);
      const q = add(mx + D + w + rand(0.6, 1.2), irand(3, 5), top + rand(-0.5, 1.0), 'path');
      last = q; top = q.top;
    },
    // 좁은 기둥 건너기
    pillars() {
      const k = irand(3, 3 + Math.round(3 * e));
      let up = Math.random() < 0.5;
      for (let i = 0; i < k; i++) {
        const dy = (up ? 1 : -1) * rand(0.8, 1.6 + 1.0 * e); up = !up;
        const p = add(endOf(last) + rand(1.5, 2.2 + 1.2 * e), Math.random() < 0.5 + 0.4 * e ? 1 : 2, top + dy, 'pillar');
        coinBetween(last, p);
        last = p; top = p.top;
      }
    },
  };

  // 어떤 구역을 몇 개나: 스테이지가 오를수록 많고 다양하게
  const segCount = 4 + n;
  const pool = ['run', 'run', 'climb', 'drop'];
  if (n >= 2) pool.push('lift', 'climb');
  if (n >= 3) pool.push('ferry', 'drop');
  if (n >= 4) pool.push('pillars', 'lift');
  if (n >= 6) pool.push('ferry', 'pillars');
  const plan = ['run', 'climb', 'drop'];
  if (n >= 2) plan.push('lift');
  if (n >= 3) plan.push('ferry');
  while (plan.length < segCount) plan.push(pick(pool));
  // 첫 구역은 달리기, 나머지는 섞되 같은 구역이 연달아 나오지 않게
  const rest = plan.slice(1).sort(() => Math.random() - 0.5);
  for (let i = 1; i < rest.length; i++) if (rest[i] === rest[i - 1]) { const j = rest.findIndex((s, k) => k > i && s !== rest[i]); if (j > 0) [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const order = [plan[0], ...rest];
  for (let s of order) {
    // 너무 높으면 떨어지는 구역, 너무 낮으면 올라가는 구역으로 바꾸기
    if (top > 18 && (s === 'climb' || s === 'lift')) s = 'drop';
    if (top < -10 && s === 'drop') s = n >= 2 ? 'lift' : 'climb';
    segs[s]();
  }

  // 도착 발판 (넓게)
  const end = add(endOf(last) + rand(1.5, 2.2), 10, top + rand(-1, 1), 'end');
  coinBetween(last, end);
  const path = seq.filter(p => p.kind !== 'start' && p.kind !== 'end');

  // 위로 올라가야 하는 보너스 발판 (열쇠·정령 자리)
  const hits = (a, b, gapY) => a.x0 < b.x0 + b.w + 1 && a.x0 + a.w + 1 > b.x0 && a.top < b.top + gapY && a.top > (b.bottom ?? b.top) - gapY;
  const overlaps = a => plats.some(p => hits(a, p, 3.2)) || reserved.some(r => hits(a, r, 2.5));
  function bonusAbove(base) {
    for (let t = 0; t < 10; t++) {
      const w = irand(2, 3);
      const b = { x0: Math.round(base.x0 + rand(-1, base.w - 1)), w, top: base.top + half(rand(2.0, 2.4 + 1.2 * e)), kind: 'bonus' };
      if (!overlaps(b)) { plats.push(b); return b; }
    }
    return base;
  }
  const at = f => path[clampN(Math.floor(path.length * f), 0, path.length - 1)];
  const keyPlats = [0.22, 0.5, 0.78].map(f => (Math.random() < 0.5 + 0.4 * e ? bonusAbove(at(f + rand(-0.05, 0.05))) : at(f)));
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
  // 발판 위에 줄지은 독도 포인트
  for (const p of path) if (p.w >= 3 && Math.random() < 0.3) for (let k = 0; k < Math.min(3, p.w - 1); k++) coins.push([p.x0 + 1 + k, p.top + 0.7]);

  // 로봇: 빨간 로봇(걸어 다님)은 예전보다 두 배 많고 빠르게
  const robots = [];
  const used = new Set();
  const roomy = path.filter(p => p.w >= (n >= 4 ? 2 : 3) && p.kind !== 'ledge' && p.kind !== 'climb' && p !== at(0) && !keyPlats.includes(p));
  const redCount = Math.min(roomy.length, 2 + Math.round(2.2 * n));
  const shuffled = roomy.slice().sort(() => Math.random() - 0.5);
  for (let k = 0; k < redCount; k++) {
    const p = shuffled[k]; used.add(p);
    robots.push({ x: p.x0 + p.w / 2, y: p.top + 0.4, blue: false, walk: true, q: null, flip: Math.random() < 0.5, speed: 1.3 + 0.2 * n });
  }
  // 문제를 내는 파란 로봇은 원작 스테이지의 문제 그대로
  const qs = [...new Set(orig.robots.filter(r => r.q).map(r => r.q))];
  const freeSpots = path.filter(p => p.w >= 2 && !used.has(p) && p.kind !== 'ledge' && p.kind !== 'climb' && p.kind !== 'pillar');
  qs.forEach((q, k) => {
    const p = freeSpots[Math.floor((k + 1) * freeSpots.length / (qs.length + 1))] || pick(path.filter(q => q.kind !== 'climb' && q.kind !== 'pillar')) || pick(path);
    used.add(p);
    robots.push({ x: p.x0 + p.w - 0.8, y: p.top + 0.4, blue: true, walk: false, q, flip: false });
  });
  // 가만히 서 있다가 가끔 뛰어오르는 파란 로봇(장애물)
  const blockers = Math.round(2 * n / 3);
  const blockSpots = path.filter(p => p.w >= 3 && !used.has(p) && p.kind !== 'ledge' && p.kind !== 'climb' && p.kind !== 'pillar').sort(() => Math.random() - 0.5);
  for (let k = 0; k < Math.min(blockers, blockSpots.length); k++) {
    const p = blockSpots[k];
    robots.push({ x: p.x0 + p.w / 2, y: p.top + 0.4, blue: true, walk: false, q: null, flip: true });
  }

  const keys = keyPlats.map((p, k) => ({ n: k + 1, x: p.x0 + p.w / 2, y: p.top + 0.7, s: 'Dokdo_Icon__Dokdo_Icon_1' }));
  const spirit = orig.spirit ? { ...orig.spirit, x: spiritPlat.x0 + spiritPlat.w / 2, y: spiritPlat.top + 0.6 } : null;
  const doorX = end.x0 + 3, flagX = end.x0 + end.w - 2;
  const door = { ...orig.door, x: doorX, y: end.top + 0.93, box: [doorX - 0.566, end.top, 1.132, 80] };
  const flag = { ...orig.flag, x: flagX, y: end.top + 0.8, box: [flagX - 0.5, end.top, 1, 1] };
  const ys = plats.map(p => p.top).concat(movers.map(m => m.top + m.ay));
  const start = [0, 1.2];
  const deco = [{ s: 'StartGuide__StartGuide_' + (n - 1), x: -1.8, y: 0.55, sx: 1.376, sy: 1.376 }];
  return {
    platforms, movers, coins, robots, keys, spirit, door, flag, start, deco,
    topLeft: [-4, Math.max(...ys) + 6], bottomRight: [end.x0 + end.w + 2, Math.min(...ys) - 1],
    generated: true,
  };
}
