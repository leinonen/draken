import { G, W, H, addScore } from './state.js';
import { input } from './input.js';
import { audio } from './audio.js';

// ---------------- bullets (pooled) ----------------
const pool = [];
export function spawnBullet(arr, x, y, vx, vy, o = {}) {
  const b = pool.pop() || {};
  b.x = x; b.y = y; b.vx = vx; b.vy = vy; b.ax = o.ax || 0; b.ay = o.ay || 0; b.t = 0;
  b.frame = o.frame || 'orb'; b.sx = o.sx || 1;
  b.r = o.r ?? 1; b.g = o.g ?? 0.35; b.b = o.b ?? 0.35;
  b.rad = o.rad || 3; b.dmg = o.dmg || 1; b.grazed = false; b.fn = o.fn || null; b.life = o.life || 9999;
  b.orient = b.frame === 'needle' || b.frame === 'pshot';
  b.spin = o.spin || 0;
  b.rot = b.orient ? Math.atan2(vy, vx) + Math.PI / 2 : 0;
  arr.push(b);
  return b;
}
export function removeBullet(arr, i) {
  pool.push(arr[i]);
  arr[i] = arr[arr.length - 1];
  arr.pop();
}
export function updateBullets(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i];
    b.t++;
    if (b.fn) b.fn(b);
    b.vx += b.ax; b.vy += b.ay; b.x += b.vx; b.y += b.vy;
    if (b.orient) b.rot = Math.atan2(b.vy, b.vx) + Math.PI / 2; else b.rot += b.spin;
    if (b.x < -30 || b.x > W + 30 || b.y < -40 || b.y > H + 30 || b.t > b.life) removeBullet(arr, i);
  }
}
export function clearBullets(arr, toSparks) {
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i];
    if (toSparks) { spawnParticle(b.x, b.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 25, 'spark', 1.5, b.r, b.g, b.b, true, { drag: 0.95 }); addScore(10); }
    removeBullet(arr, i);
  }
}

// ---------------- particles ----------------
export function spawnParticle(x, y, vx, vy, life, frame, sx, r, g, b, add, o = {}) {
  G.parts.push({ x, y, vx, vy, t: 0, life, frame, sx, r, g, b, add, drag: o.drag ?? 1, grow: o.grow || 0, grav: o.grav || 0, spin: o.spin || 0, rot: o.rot || 0, fade: o.fade ?? 1 });
}
export function updateParticles() {
  const ps = G.parts;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.t++; p.vx *= p.drag; p.vy *= p.drag; p.vy += p.grav; p.x += p.vx; p.y += p.vy; p.sx += p.grow; p.rot += p.spin;
    if (p.t >= p.life) { ps[i] = ps[ps.length - 1]; ps.pop(); }
  }
}
export function explosion(x, y, size = 1) {
  const n = Math.floor(10 * size) + 6;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (1 + Math.random() * 3) * size;
    spawnParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 20 + Math.random() * 25, 'spark', 1 + size * 0.5, 1, 0.75 + Math.random() * 0.25, 0.3, true, { drag: 0.94 });
  }
  for (let i = 0; i < 4 * size; i++)
    spawnParticle(x + (Math.random() - 0.5) * 8 * size, y + (Math.random() - 0.5) * 8 * size, (Math.random() - 0.5) * 0.6, -0.2 - Math.random() * 0.5, 40 + Math.random() * 30, 'smoke', 0.8 + size * 0.6, 0.22, 0.22, 0.25, false, { grow: 0.04, drag: 0.98, fade: 0.8 });
  spawnParticle(x, y, 0, 0, 8, 'smoke', 2.5 * size, 1, 0.9, 0.6, true, { grow: 0.35 });
  spawnParticle(x, y, 0, 0, 18, 'ring', 0.4 * size, 1, 0.7, 0.3, true, { grow: 0.12 * size });
}

// ---------------- pickups ----------------
export function spawnPickup(x, y, type) { G.pickups.push({ x, y, type, t: 0 }); }
export function updatePickups() {
  const p = G.player, ps = G.pickups;
  for (let i = ps.length - 1; i >= 0; i--) {
    const k = ps[i];
    k.t++; k.y += 0.7; k.x += Math.sin(k.t * 0.05) * 0.5;
    if (k.y > H + 20) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
    if (p && !p.dead) {
      const dx = p.x - k.x, dy = p.y - k.y;
      const near = dx * dx + dy * dy < 60 * 60;
      if (near) { k.x += dx * 0.1; k.y += dy * 0.1; }
      if (dx * dx + dy * dy < 14 * 14) {
        if (k.type === 'pow') { if (p.power < 3) p.power++; else addScore(1000); }
        else { if (p.bombs < 4) p.bombs++; else addScore(1000); }
        addScore(200);
        audio.pickup();
        for (let j = 0; j < 8; j++) spawnParticle(k.x, k.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 20, 'spark', 1.5, 1, 1, 0.5, true);
        ps[i] = ps[ps.length - 1]; ps.pop();
      }
    }
  }
}

// ---------------- player ----------------
export function newPlayer() {
  return { x: W / 2, y: H - 50, power: 1, lives: 4, bombs: 3, inv: 120, dead: 0, shotT: 0, bombT: 0, graze: 0, rad: 2.5, tilt: 0 };
}
function fire(p) {
  const o = { frame: 'pshot', r: 0.6, g: 0.95, b: 1, rad: 2, dmg: 1 };
  const v = 9;
  spawnBullet(G.pb, p.x - 5, p.y - 8, 0, -v, o);
  spawnBullet(G.pb, p.x + 5, p.y - 8, 0, -v, o);
  if (p.power >= 2) {
    spawnBullet(G.pb, p.x - 9, p.y - 4, -Math.sin(0.14) * v, -Math.cos(0.14) * v, o);
    spawnBullet(G.pb, p.x + 9, p.y - 4, Math.sin(0.14) * v, -Math.cos(0.14) * v, o);
  }
  if (p.power >= 3) {
    spawnBullet(G.pb, p.x, p.y - 12, 0, -v, { ...o, sx: 1.4, dmg: 2, r: 1, g: 1, b: 0.8 });
    spawnBullet(G.pb, p.x - 12, p.y, -Math.sin(0.3) * v, -Math.cos(0.3) * v, o);
    spawnBullet(G.pb, p.x + 12, p.y, Math.sin(0.3) * v, -Math.cos(0.3) * v, o);
  }
  audio.shot();
}
export function bomb(p) {
  p.bombs--; p.bombT = 90; p.inv = Math.max(p.inv, 110);
  clearBullets(G.eb, true);
  for (const e of G.enemies) { e.hp -= 40; e.flash = 10; }
  if (G.boss && !G.boss.dying) { G.boss.hp -= 120; G.boss.flash = 10; }
  G.flash = 1; G.chroma = 1.5; G.shake = 14;
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
    spawnParticle(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp, 40, 'spark', 2, 0.6, 0.9, 1, true, { drag: 0.97 });
  }
  spawnParticle(p.x, p.y, 0, 0, 40, 'ring', 1, 0.6, 0.9, 1, true, { grow: 0.6 });
  spawnParticle(p.x, p.y, 0, 0, 50, 'ring', 0.5, 1, 1, 1, true, { grow: 0.5 });
  audio.bomb();
}
export function killPlayer() {
  const p = G.player;
  if (!p || p.dead) return;
  explosion(p.x, p.y, 2.2);
  audio.die();
  p.dead = 110; p.lives--;
  clearBullets(G.eb, true);
  G.shake = 18; G.chroma = 1.5; G.flash = 0.5;
}
export function updatePlayer(p) {
  if (p.dead) {
    p.dead--;
    if (p.dead === 0) {
      if (p.lives < 0) { G.state = 'gameover'; return; }
      p.x = W / 2; p.y = H - 40; p.inv = 160; p.bombs = Math.max(p.bombs, 3); p.shotT = 0; p.bombT = 0;
    }
    return;
  }
  const sp = input.focus ? 1.5 : 3.2;
  p.x += input.ax * sp; p.y += input.ay * sp;
  p.x = Math.max(8, Math.min(W - 8, p.x)); p.y = Math.max(16, Math.min(H - 12, p.y));
  p.tilt += (input.ax - p.tilt) * 0.2;
  if (p.inv > 0) p.inv--;
  if (p.bombT > 0) p.bombT--;
  if (p.shotT > 0) p.shotT--;
  if (input.fire && p.shotT === 0) { fire(p); p.shotT = p.power >= 3 ? 4 : 5; }
  if (input.bomb && p.bombT === 0 && p.bombs > 0) bomb(p);
}
