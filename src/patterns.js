import { G, spd } from './state.js';
import { spawnBullet } from './entities.js';

export function aimAngle(x, y) {
  const p = G.player;
  if (!p || p.dead) return Math.PI / 2;
  return Math.atan2(p.y - y, p.x - x);
}
export function shot(x, y, ang, speed, o) {
  const s = speed * spd();
  return spawnBullet(G.eb, x, y, Math.cos(ang) * s, Math.sin(ang) * s, o);
}
export function ring(x, y, n, speed, offset = 0, o) {
  for (let i = 0; i < n; i++) shot(x, y, offset + i * Math.PI * 2 / n, speed, o);
}
export function fan(x, y, ang, n, arc, speed, o) {
  for (let i = 0; i < n; i++) shot(x, y, n === 1 ? ang : ang - arc / 2 + arc * i / (n - 1), speed, o);
}
export function aimedFan(x, y, n, arc, speed, o) { fan(x, y, aimAngle(x, y), n, arc, speed, o); }
