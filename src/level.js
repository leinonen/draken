import { G, W, H, after, addScore, dif } from './state.js';
import { spawnEnemy, spawnBoss } from './enemies.js';
import { isLand } from './terrain.js';
import { audio } from './audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
function seaX() { for (let i = 0; i < 10; i++) { const x = rnd(24, W - 24); if (!isLand(x, -40, G.scroll) && !isLand(x, -60, G.scroll)) return x; } return -1; }
function landX() { for (let i = 0; i < 10; i++) { const x = rnd(16, W - 16); if (isLand(x, -30, G.scroll)) return x; } return -1; }

const migV = cx => { const off = [0, -24, 24, -48, 48]; off.forEach((o, i) => after(i * 8 + 1, () => spawnEnemy('mig', Math.max(20, Math.min(W - 20, cx + o)), -20, { dir: o < 0 ? -1 : 1 }))); };
const migStream = (x, dir, n) => { for (let i = 0; i < n; i++) after(i * 11 + 1, () => spawnEnemy('mig', x, -20, { dir })); };
const su = fromLeft => spawnEnemy('su', fromLeft ? -30 : W + 30, rnd(60, 140), { vx: fromLeft ? 1.3 : -1.3 });
const bomber = x => spawnEnemy('bomber', x, -30);
const boats = n => { for (let i = 0; i < n; i++) after(i * 25 + 1, () => { const x = seaX(); if (x > 0) spawnEnemy('boat', x, -40); }); };
const turrets = n => { for (let i = 0; i < n; i++) after(i * 20 + 1, () => { const x = landX(); if (x > 0) spawnEnemy('turret', x, -30); }); };
const corvette = () => { const x = seaX(); if (x > 0) spawnEnemy('corvette', x, -60); };
const extra = () => { if (dif() > 0) { su(Math.random() < 0.5); } };

const script = [
  [1.5, () => migV(W / 2)],
  [6, () => migStream(50, 1, 5)],
  [9, () => su(true)],
  [13, () => boats(2)],
  [17, () => migV(W * 0.65)],
  [21, () => bomber(W / 2)],
  [25, () => { su(false); migStream(W - 50, -1, 5); }],
  [30, () => turrets(2)],
  [34, () => { migStream(40, 1, 8); migStream(W - 40, -1, 8); extra(); }],
  [40, () => corvette()],
  [46, () => { bomber(W * 0.3); bomber(W * 0.7); }],
  [52, () => { migV(W / 2); su(true); su(false); }],
  [58, () => { boats(3); turrets(2); extra(); }],
  [64, () => { bomber(W / 2); migStream(60, 1, 6); }],
  [70, () => { migV(W * 0.3); after(60, () => migV(W * 0.7)); }],
  [76, () => { corvette(); after(40, corvette); extra(); }],
  [84, () => { su(true); after(90, () => su(false)); bomber(W * 0.5); turrets(3); }],
  [92, () => { migStream(30, 1, 10); migStream(W - 30, -1, 10); boats(2); }],
  [100, () => { bomber(W * 0.25); bomber(W * 0.75); migV(W / 2); extra(); }],
  [108, () => { G.bossPending = true; }],
];

export function resetLevel() {
  G.levelT = 0; G.levelIdx = 0; G.bossPending = false; G.clearT = 0;
  G.onBossDead = stageCleared;
}
export function stageCleared() {
  addScore(10000 * G.stage);
  G.clearT = 300;
  G.msg = 'STAGE CLEAR';
  G.sub = `+${10000 * G.stage}`;
  audio.clear();
}
export function updateLevel() {
  if (G.clearT > 0) {
    G.clearT--;
    if (G.clearT === 0) { G.stage++; G.msg = ''; G.sub = ''; resetLevel(); G.msg = 'STAGE ' + G.stage; after(120, () => { G.msg = ''; }); }
    return;
  }
  if (G.boss) return;
  G.levelT += 1 / 60;
  while (G.levelIdx < script.length && script[G.levelIdx][0] <= G.levelT) { script[G.levelIdx][1](); G.levelIdx++; }
  if (G.bossPending && G.enemies.length === 0 && G.timers.length === 0) {
    G.bossPending = false;
    spawnBoss();
    G.sub = 'WARNING';
    after(150, () => { if (G.sub === 'WARNING') G.sub = ''; });
  }
}
