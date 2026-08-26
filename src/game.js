import { G, addScore } from './state.js';
import { removeBullet, spawnParticle, killPlayer } from './entities.js';
import { killEnemy, killBoss } from './enemies.js';
import { audio } from './audio.js';

export function collisions() {
  const p = G.player, pb = G.pb, eb = G.eb, en = G.enemies, boss = G.boss;
  for (let i = pb.length - 1; i >= 0; i--) {
    const b = pb[i];
    let hit = false;
    for (let j = en.length - 1; j >= 0; j--) {
      const e = en[j], dx = e.x - b.x, dy = e.y - b.y, r = e.rad + 3;
      if (dx * dx + dy * dy < r * r) {
        e.hp -= b.dmg; e.flash = 3; hit = true;
        spawnParticle(b.x, b.y - 4, (Math.random() - 0.5) * 2, -1, 8, 'spark', 1.5, 0.7, 1, 1, true);
        audio.hit();
        if (e.hp <= 0) killEnemy(j);
        break;
      }
    }
    if (!hit && boss && !boss.dying && boss.y > 0) {
      const dx = boss.x - b.x, dy = boss.y - b.y;
      if (dx * dx + dy * dy < boss.rad * boss.rad || (Math.abs(dx) < 46 && Math.abs(dy) < 10)) {
        boss.hp -= b.dmg; boss.flash = 2; hit = true;
        spawnParticle(b.x, b.y - 4, (Math.random() - 0.5) * 2, -1, 8, 'spark', 1.5, 0.7, 1, 1, true);
        audio.bossHit();
        if (boss.hp <= 0) killBoss();
      }
    }
    if (hit) removeBullet(pb, i);
  }
  if (!p || p.dead) return;
  for (let i = eb.length - 1; i >= 0; i--) {
    const b = eb[i], dx = b.x - p.x, dy = b.y - p.y, d2 = dx * dx + dy * dy, hr = p.rad + b.rad;
    if (d2 < hr * hr) {
      if (p.inv === 0) { killPlayer(); return; }
      removeBullet(eb, i); continue;
    }
    if (!b.grazed && d2 < 16 * 16) {
      b.grazed = true; p.graze++; addScore(30); audio.graze();
      spawnParticle(p.x + dx * 0.5, p.y + dy * 0.5, -dx * 0.05, -dy * 0.05, 12, 'spark', 1.2, 1, 1, 0.6, true);
    }
  }
  if (p.inv === 0) {
    for (const e of en) {
      if (!e.def.air) continue;
      const dx = e.x - p.x, dy = e.y - p.y, r = e.rad + p.rad;
      if (dx * dx + dy * dy < r * r) { killPlayer(); return; }
    }
    if (boss && !boss.dying) {
      const dx = boss.x - p.x, dy = boss.y - p.y;
      if (dx * dx + dy * dy < boss.rad * boss.rad) { killPlayer(); return; }
    }
  }
}
