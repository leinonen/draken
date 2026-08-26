import { G } from './state.js';
const $ = id => document.getElementById(id);
const el = { score: $('score'), hi: $('hi'), lives: $('lives'), bombs: $('bombs'), power: $('power'), stage: $('stage_n'), msg: $('msg'), sub: $('sub'), ctl: $('ctl') };
const bossbar = $('bossbar'), bossfill = $('bossfill');
const last = {};
function set(k, v) { if (last[k] !== v) { last[k] = v; el[k].textContent = v; } }

export function setFontSize(scale) { $('stage').style.setProperty('--fs', Math.max(6, Math.round(6 * scale)) + 'px'); }
export function updateHUD() {
  const p = G.player;
  set('score', String(G.score).padStart(7, '0'));
  set('hi', String(G.hi).padStart(7, '0'));
  set('stage', G.stage);
  set('lives', p ? 'LIFE ' + Math.max(0, p.lives) : '');
  set('bombs', p ? 'BOMB ' + p.bombs : '');
  set('power', p ? '|'.repeat(p.power) : '');
  set('msg', G.msg); set('sub', G.sub); set('ctl', G.ctl);
  const b = G.boss;
  const show = b && !b.dying ? 'block' : 'none';
  if (last.bossShow !== show) { last.bossShow = show; bossbar.style.display = show; }
  if (b) { const w = Math.max(0, b.hp / b.maxhp * 100).toFixed(1) + '%'; if (last.bw !== w) { last.bw = w; bossfill.style.width = w; } }
}
