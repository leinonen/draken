import { initGL } from './gl.js';
import { Renderer } from './renderer.js';
import { buildAtlas } from './atlas.js';
import { G, W, H, updateTimers } from './state.js';
import { input } from './input.js';
import { audio } from './audio.js';
import { initTerrain, updateTerrain, drawDecos, terrainTex, terrainRows } from './terrain.js';
import * as E from './entities.js';
import { updateEnemies, updateBoss } from './enemies.js';
import { updateLevel, resetLevel } from './level.js';
import { collisions } from './game.js';
import { updateHUD, setFontSize } from './hud.js';

const canvas = document.getElementById('c');
const gl = initGL(canvas);
const R = new Renderer(gl, buildAtlas());
initTerrain(gl);
const F = R.f;
const DEBUG = location.search.includes('debug');
const AUTO = location.search.includes('auto'); // headless smoke test: autoplay
const dbg = document.getElementById('dbg');
if (DEBUG) dbg.style.display = 'block';

function resize() {
  // Fill the viewport (fractional scale); snap to 0.5 steps above 1x so pixels stay near-uniform.
  let s = Math.min(innerWidth / W, innerHeight / H);
  if (s >= 1) s = Math.floor(s * 2) / 2;
  const cw = Math.round(W * s), ch = Math.round(H * s), dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  setFontSize(s);
}
addEventListener('resize', resize);
resize();

function showTitle() {
  G.state = 'title'; G.player = null; G.boss = null;
  G.msg = 'DRAKEN'; G.sub = '0400 HOURS. UNIDENTIFIED\nAIRCRAFT OVER THE ARCHIPELAGO.\nTHEY ARE NOT UNIDENTIFIED.\nSCRAMBLE. DEFEND THE COAST.\n\nPRESS Z / SPACE';
  G.ctl = 'ARROWS / WASD  MOVE\nZ  FIRE     X  BOMB\nSHIFT  FOCUS';
}
function startGame() {
  G.score = 0; G.stage = 1;
  G.player = E.newPlayer(); E.startIntro(G.player);
  G.enemies.length = 0; G.parts.length = 0; G.pickups.length = 0; G.timers.length = 0;
  E.clearBullets(G.eb, false); E.clearBullets(G.pb, false);
  G.boss = null; G.shake = 0; G.chroma = 0; G.flash = 0;
  resetLevel();
  G.msg = ''; G.sub = ''; G.ctl = '';
  G.state = 'play';
  audio.start();
}
showTitle();

let lastStage = 0;
function update() {
  input.update();
  if (AUTO) {
    if (G.state === 'title' && G.time > 10) startGame();
    if (G.state === 'play' && G.player) { if (location.search.includes('god')) G.player.inv = 2; input.fire = 1; input.ax = Math.sin(G.time * 0.03); input.ay = Math.cos(G.time * 0.017) * 0.5; if (G.time % 900 === 0) input.bomb = 1; }
    if (G.time % 600 === 0 && G.state === 'play') G.levelT += 20; // fast-forward
  }
  if (input.anyKey) audio.init();
  G.time++;
  G.scroll += G.scrollSpeed;
  if (G.state === 'title') {
    if (input.pressed('fire') || input.pressed('start')) startGame();
    E.updateParticles();
  } else if (G.state === 'play') {
    updateLevel(); updateTimers();
    E.updatePlayer(G.player);
    updateEnemies(); updateBoss();
    E.updateBullets(G.eb); E.updateBullets(G.pb);
    E.updateParticles(); E.updatePickups();
    collisions();
    if (G.state === 'gameover') { G.msg = 'GAME OVER'; G.sub += '\n\nPRESS Z TO RETRY'; G.gameoverT = 0; }
  } else {
    G.gameoverT++;
    updateEnemies(); updateBoss(); E.updateBullets(G.eb); E.updateParticles();
    if (G.gameoverT > 40 && (input.pressed('fire') || input.pressed('start'))) startGame();
  }
  if (DEBUG && G.stage !== lastStage) { console.log(`stage ${G.stage} time ${G.time} levelT ${G.levelT.toFixed(1)} boss ${!!G.boss} score ${G.score}`); lastStage = G.stage; }
  G.shake *= 0.86; G.chroma *= 0.93; G.flash *= 0.85;
}

function drawEnemy(e) {
  const f = F[e.def.frame];
  const sx = e.def.air ? 1 - Math.abs(e.tilt) * 0.35 : 1;
  if (e.def.air) R.sprite(f, e.x + 10, e.y + 16, e.rot, sx, 0, 0, 0, 0.35, 1, 1);
  R.sprite(f, e.x, e.y, e.rot, sx, 1, 1, 1, 1, 0, 1);
  if (e.flash) R.sprite(f, e.x, e.y, e.rot, sx, 1, 1, 1, Math.min(0.8, 0.25 * e.flash), 1, 1);
}
function render() {
  const t = G.time / 60;
  R.beginFrame();
  R.drawWater(t, G.scroll);
  updateTerrain(G.scroll);
  R.drawTerrain(t, G.scroll, terrainTex(), terrainRows());
  drawDecos(R, G.scroll);
  for (const e of G.enemies) if (!e.def.air) drawEnemy(e);
  for (const p of G.parts) if (!p.add) R.sprite(F[p.frame], p.x, p.y, p.rot, p.sx, p.r, p.g, p.b, p.fade * (1 - p.t / p.life));
  for (const k of G.pickups) R.sprite(F[k.type], k.x, k.y, 0, 1 + 0.1 * Math.sin(k.t * 0.2));
  for (const e of G.enemies) if (e.def.air) drawEnemy(e);
  const b = G.boss;
  if (b) {
    R.sprite(F.boss, b.x + 14, b.y + 24, Math.PI, 1, 0, 0, 0, 0.35, 1);
    R.sprite(F.boss, b.x, b.y, Math.PI);
    for (const [nx, ny] of [[-30, 10], [-14, 18], [14, 18], [30, 10]]) R.sprite(F.prop, b.x + nx, b.y + ny, b.prop + nx, 1, 1, 1, 1, 0.6);
    if (b.flash) R.sprite(F.boss, b.x, b.y, Math.PI, 1, 1, 1, 1, 0.18 * b.flash, 1);
  }
  const p = G.player;
  if (G.state === 'title') {
    const s = E.SHOW.scale, bob = Math.sin(t * 2) * 2;
    R.sprite(F.draken, E.SHOW.x + 8 * s, E.SHOW.y + bob + 14 * s, 0, s, 0, 0, 0, 0.35, 1, s);
    R.sprite(F.draken, E.SHOW.x, E.SHOW.y + bob, 0, s, 1, 1, 1, 1, 0, s);
  }
  if (p && !p.dead && G.state === 'play') {
    const s = p.scale, sx = s * (1 - Math.abs(p.tilt) * 0.35), a = p.inv > 0 && !p.intro && (p.inv % 8 < 4) ? 0.45 : 1;
    R.sprite(F.draken, p.x + 8 * s, p.y + 14 * s, 0, sx, 0, 0, 0, 0.35, 1, s);
    R.sprite(F.draken, p.x, p.y, 0, sx, 1, 1, 1, a, 0, s);
  }
  R.setAdditive(true);
  if (G.state === 'title') { const s = E.SHOW.scale; R.sprite(F.flame, E.SHOW.x, E.SHOW.y + Math.sin(t * 2) * 2 + 17 * s, 0, s * (0.8 + Math.random() * 0.4), 1, 0.8, 0.5, 0.9, 0, s * (1 + Math.random() * 0.6)); }
  if (p && !p.dead && G.state === 'play') {
    const s = p.scale;
    R.sprite(F.flame, p.x, p.y + 17 * s, 0, s * (0.8 + Math.random() * 0.4), 1, 0.8, 0.5, 0.9, 0, s * (1 + Math.random() * 0.6));
    if (input.focus) { R.sprite(F.ring, p.x, p.y, t * 3, 0.5, 1, 1, 1, 0.6); R.sprite(F.spark, p.x, p.y, 0, 1.3, 1, 0.3, 0.3, 1); }
  }
  for (const k of G.pb) R.sprite(F[k.frame], k.x, k.y, k.rot, k.sx, k.r, k.g, k.b, 0.9);
  for (const k of G.eb) R.sprite(F[k.frame], k.x, k.y, k.rot, k.sx, k.r, k.g, k.b, 1);
  for (const q of G.parts) if (q.add) R.sprite(F[q.frame], q.x, q.y, q.rot, q.sx, q.r, q.g, q.b, q.fade * (1 - q.t / q.life));
  R.setAdditive(false);
  R.endFrame({
    time: t, shakeX: (Math.random() - 0.5) * G.shake, shakeY: (Math.random() - 0.5) * G.shake,
    chroma: Math.min(2, G.chroma), flash: Math.min(1, G.flash),
  }, canvas.width, canvas.height);
}

let last = performance.now(), acc = 0, fpsT = 0, fpsN = 0, fps = 0;
const DT = 1000 / 60;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  let steps = 0;
  while (acc >= DT && steps < 4) { update(); acc -= DT; steps++; }
  if (acc >= DT) acc = 0;
  render();
  updateHUD();
  if (DEBUG) { fpsN++; if (now - fpsT > 500) { fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsT = now; fpsN = 0; } dbg.textContent = `fps ${fps} eb ${G.eb.length} pb ${G.pb.length} parts ${G.parts.length} en ${G.enemies.length} t ${G.levelT.toFixed(1)}`; }
  { const m = location.search.match(/skip=(\d+)/); if (m) for (let i = 0; i < +m[1]; i++) update(); }
requestAnimationFrame(frame);
}
{ const m = location.search.match(/skip=(\d+)/); if (m) for (let i = 0; i < +m[1]; i++) update(); }
requestAnimationFrame(frame);
