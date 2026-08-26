import { G, W, H, hpMul, rate, addScore } from './state.js';
import * as P from './patterns.js';
import { explosion, spawnPickup, spawnParticle, clearBullets } from './entities.js';
import { audio } from './audio.js';

const every = (e, n, phase = 0) => (e.t + phase) % Math.max(1, Math.round(n * rate())) === 0;
const NEEDLE = { frame: 'needle', r: 0.5, g: 0.9, b: 1, rad: 2 };
function wake(e, len) {
  if (e.t % 3 === 0 && e.y > -10 && e.y < H)
    spawnParticle(e.x + (Math.random() - 0.5) * 4, e.y + len, (Math.random() - 0.5) * 0.4, G.scrollSpeed * 0.9, 50, 'smoke', 0.8, 0.85, 0.95, 1, false, { grow: 0.03, fade: 0.5 });
}

export const TYPES = {
  mig: { frame: 'mig', hp: 5, rad: 8, score: 100, air: true, drop: 0.06, update(e) {
    e.y += 2.0; e.x += Math.sin(e.t * 0.05) * 1.4 * e.dir;
    if (e.y > 0 && e.y < H * 0.55 && every(e, 70, e.seed % 70)) { P.aimedFan(e.x, e.y + 8, 3, 0.35, 3, { r: 1, g: 0.4, b: 0.3 }); audio.eshot(); }
  } },
  su: { frame: 'su', hp: 14, rad: 11, score: 300, air: true, drop: 0.3, update(e) {
    e.x += e.vx; e.y = e.y0 + Math.sin(e.t * 0.03) * 18;
    if (every(e, 34)) { P.fan(e.x, e.y + 8, Math.PI / 2, 3, 0.7, 3.2, NEEDLE); audio.eshot(); }
  } },
  bomber: { frame: 'bomber', hp: 45, rad: 16, score: 800, air: true, drop: 0.9, update(e) {
    e.y += 0.7;
    if (e.y < 0) return;
    if (every(e, 90, 30)) { P.ring(e.x, e.y, 12, 2, e.t * 0.01, { r: 1, g: 0.55, b: 0.2 }); audio.eshot(); }
    if (every(e, 90, 75)) P.aimedFan(e.x, e.y, 5, 0.6, 2.8, { r: 1, g: 0.3, b: 0.5 });
  } },
  boat: { frame: 'boat', hp: 12, rad: 9, score: 250, air: false, drop: 0.1, update(e) {
    e.y += G.scrollSpeed; wake(e, 18);
    if (e.y > 10 && e.y < H - 40 && every(e, 70, e.seed % 70)) { P.aimedFan(e.x, e.y - 14, 2, 0.25, 2.6, { r: 1, g: 0.8, b: 0.3 }); audio.eshot(); }
  } },
  corvette: { frame: 'corvette', hp: 90, rad: 14, score: 1500, air: false, drop: 1, dropType: 'bombp', update(e) {
    e.y += G.scrollSpeed * 0.85; wake(e, 34);
    if (e.y < 10 || e.y > H - 30) return;
    if (every(e, 40)) { e.turn = !e.turn; P.aimedFan(e.x, e.turn ? e.y - 20 : e.y + 24, 5, 0.8, 2.8, { r: 1, g: 0.6, b: 0.2 }); audio.eshot(); }
    if (every(e, 120, 60)) P.ring(e.x, e.y, 12, 1.8, e.t * 0.02, NEEDLE);
  } },
  turret: { frame: 'turret', hp: 8, rad: 6, score: 200, air: false, drop: 0.05, update(e) {
    e.y += G.scrollSpeed; const a = P.aimAngle(e.x, e.y); e.rot = a + Math.PI / 2;
    if (e.y > 10 && e.y < H - 30 && every(e, 80, e.seed % 80)) P.shot(e.x, e.y, a, 2.2, { sx: 1.2, r: 1, g: 0.9, b: 0.4, rad: 4 });
  } },
};

export function spawnEnemy(type, x, y, o = {}) {
  const d = TYPES[type];
  const hp = Math.ceil(d.hp * hpMul());
  const e = { type, def: d, x, y, t: 0, hp, maxhp: hp, rad: d.rad, dir: 1, vx: 0, y0: y, seed: (Math.random() * 1000) | 0, flash: 0, rot: 0, ...o };
  G.enemies.push(e);
  return e;
}
export function killEnemy(i) {
  const e = G.enemies[i], d = e.def;
  explosion(e.x, e.y, d.air ? 1 : 1.6);
  audio.explode(!d.air || d.hp > 30);
  addScore(d.score);
  if (Math.random() < d.drop) spawnPickup(e.x, e.y, d.dropType || 'pow');
  if (d.hp > 30) G.shake = Math.max(G.shake, 6);
  G.enemies[i] = G.enemies[G.enemies.length - 1];
  G.enemies.pop();
}
export function updateEnemies() {
  const en = G.enemies;
  for (let i = en.length - 1; i >= 0; i--) {
    const e = en[i];
    e.t++;
    e.def.update(e);
    if (e.flash) e.flash--;
    if (e.hp <= 0) { killEnemy(i); continue; }
    if (e.y > H + 60 || e.x < -60 || e.x > W + 60 || (e.y < -100 && e.t > 200)) { en[i] = en[en.length - 1]; en.pop(); }
  }
}

// ---------------- boss ----------------
export function spawnBoss() {
  const hp = Math.ceil(1000 * hpMul());
  G.boss = { x: W / 2, y: -70, t: 0, hp, maxhp: hp, rad: 34, flash: 0, dying: 0, prop: 0, arm: 0, phase: 0 };
}
export function killBoss() {
  const b = G.boss;
  b.dying = 1;
  clearBullets(G.eb, true);
  addScore(20000 * G.stage);
  audio.explode(true);
}
export function updateBoss() {
  const b = G.boss;
  if (!b) return;
  b.t++; b.prop += 0.6;
  if (b.flash) b.flash--;
  if (b.dying) {
    b.dying++;
    if (b.dying % 6 === 0) { explosion(b.x + (Math.random() - 0.5) * 90, b.y + (Math.random() - 0.5) * 60, 1.4); audio.explode(false); G.shake = 5; }
    b.y += 0.3; b.x += Math.sin(b.dying * 0.3) * 0.8;
    if (b.dying === 170) {
      explosion(b.x, b.y, 4); explosion(b.x - 30, b.y + 10, 3); explosion(b.x + 30, b.y - 10, 3);
      G.shake = 26; G.flash = 1; G.chroma = 2;
      audio.explode(true);
      G.boss = null;
      if (G.onBossDead) G.onBossDead();
    }
    return;
  }
  if (b.y < 100) { b.y += 0.8; return; }
  b.x = W / 2 + Math.sin(b.t * 0.011) * 80;
  b.y = 100 + Math.sin(b.t * 0.017) * 14;
  const fr = b.hp / b.maxhp;
  const phase = fr > 0.66 ? 0 : fr > 0.33 ? 1 : 2;
  if (phase !== b.phase) { b.phase = phase; clearBullets(G.eb, true); G.flash = 0.4; G.shake = 8; }
  const nac = [b.x - 30, b.x - 14, b.x + 14, b.x + 30], ny = b.y + 14;
  if (phase === 0) {
    if (every(b, 72)) { P.ring(b.x, b.y, 18, 2.2, b.t * 0.02, { r: 1, g: 0.5, b: 0.2 }); audio.eshot(); }
    if (every(b, 26, 13)) for (const x of [nac[0], nac[3]]) P.aimedFan(x, ny, 3, 0.3, 3.2, NEEDLE);
  } else if (phase === 1) {
    if (every(b, 7)) { b.arm += 0.29; for (let k = 0; k < 2; k++) P.shot(b.x, b.y, b.arm + k * Math.PI, 2.5, { r: 1, g: 0.3, b: 0.6 }); }
    if (every(b, 80)) { P.aimedFan(b.x, ny, 9, 1.3, 3, { r: 1, g: 0.8, b: 0.3 }); audio.eshot(); }
    if (every(b, 45, 20)) for (const x of [nac[1], nac[2]]) P.aimedFan(x, ny, 1, 0, 3.8, NEEDLE);
  } else {
    if (every(b, 6)) { b.arm -= 0.25; for (let k = 0; k < 3; k++) P.shot(b.x, b.y, b.arm + k * Math.PI * 2 / 3, 2.7, { r: 0.6, g: 0.4, b: 1 }); }
    if (every(b, 60)) { P.ring(b.x, b.y, 22, 2, b.t * 0.03, NEEDLE); audio.eshot(); }
    if (every(b, 30, 15)) for (const x of nac) P.aimedFan(x, ny, 3, 0.4, 3.5, { r: 1, g: 0.4, b: 0.3 });
  }
}
