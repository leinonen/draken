// Procedural Swedish coast: JS generates a scrolling heightfield ring texture,
// the terrain shader turns it into smooth shaded land. Decorations are sprites.
import { W, H } from './state.js';
import { makeTexture } from './gl.js';
const T = 16, COLS = W / T, SUB = 4, TW = COLS * SUB, TH = 256;

function hash(x, y) {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (x, y) => noise(x, y) * 0.55 + noise(x * 2.1 + 5.3, y * 2.1 + 3.7) * 0.3 + noise(x * 4.3 + 9.1, y * 4.3 + 1.3) * 0.15;
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Height 0..1 in tile units (continuous); >=0.5 is land. Mainland west, Baltic east, skerries.
export function heightAt(tx, ty) {
  let coast = 3 + 4 * noise(ty * 0.03, 11.7);
  coast -= 5 * sstep(0.6, 0.72, noise(ty * 0.012, 3.3));
  let h = fbm(tx * 0.11, ty * 0.11) * 0.5 + 0.25 + (coast - tx) * 0.06;
  const isl = fbm(tx * 0.09 + 40, ty * 0.09 + 40);
  if (isl > 0.64) h = Math.max(h, 0.5 + (isl - 0.64) * 1.6);
  return h;
}
const variety = (tx, ty) => fbm(tx * 0.2 + 80, ty * 0.2 + 80);

// ---- heightfield ring texture ----
let gl = null, tex = null, genRow = -1e9;
const rowBuf = new Uint8Array(TW * 4);
export function initTerrain(ctx) {
  gl = ctx;
  tex = makeTexture(gl, TW, TH, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  genRow = -1e9;
}
export const terrainTex = () => tex;
export const terrainRows = () => TH;
export function updateTerrain(scroll) {
  const r0 = Math.floor((scroll - 32) / SUB), r1 = Math.floor((scroll + H + 64) / SUB);
  if (genRow < r0 - 1) genRow = r0 - 1;
  if (genRow >= r1) return;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  for (let r = genRow + 1; r <= r1; r++) {
    const ty = (r + 0.5) / SUB;
    for (let j = 0; j < TW; j++) {
      const tx = (j + 0.5) / SUB;
      rowBuf[j * 4] = Math.max(0, Math.min(255, Math.round(heightAt(tx, ty) * 255)));
      rowBuf[j * 4 + 1] = Math.round(variety(tx, ty) * 255);
      rowBuf[j * 4 + 2] = 0; rowBuf[j * 4 + 3] = 255;
    }
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, ((r % TH) + TH) % TH, TW, 1, gl.RGBA, gl.UNSIGNED_BYTE, rowBuf);
  }
  genRow = r1;
}

// ---- per-tile info for spawning + decorations ----
const rows = new Map();
function row(ty) {
  let r = rows.get(ty);
  if (r) return r;
  const land = new Uint8Array(COLS), deco = new Uint8Array(COLS);
  for (let tx = 0; tx < COLS; tx++) {
    const h = heightAt(tx + 0.5, ty + 0.5);
    land[tx] = h >= 0.5 ? 1 : 0;
    const nbSea = (heightAt(tx - 0.5, ty + 0.5) < 0.5) + (heightAt(tx + 1.5, ty + 0.5) < 0.5) + (heightAt(tx + 0.5, ty - 0.5) < 0.5) + (heightAt(tx + 0.5, ty + 1.5) < 0.5);
    const hh = hash(tx * 7 + 13, ty * 3 + 29);
    if (h >= 0.535 && h < 0.6 && nbSea === 0 && hh < 0.09) deco[tx] = 1;
    else if (h >= 0.5 && h < 0.545 && nbSea > 0 && nbSea < 4 && hh > 0.975) deco[tx] = 2;
  }
  r = { land, deco };
  rows.set(ty, r);
  if (rows.size > 90) rows.delete(Math.min(...rows.keys()));
  return r;
}
export function isLand(x, y, scroll) {
  const tx = Math.floor(x / T), ty = Math.floor((scroll + H - y) / T);
  if (tx < 0 || tx >= COLS) return false;
  return row(ty).land[tx] === 1;
}
export function drawDecos(R, scroll) {
  const t0 = Math.floor(scroll / T) - 1, t1 = Math.floor((scroll + H) / T) + 1, f = R.f;
  for (let ty = t0; ty <= t1; ty++) {
    const r = row(ty), cy = H - ((ty + 1) * T - scroll) + T / 2;
    for (let tx = 0; tx < COLS; tx++) {
      const dc = r.deco[tx];
      if (dc === 1) R.sprite(f.cabin, tx * T + T / 2, cy);
      else if (dc === 2) R.sprite(f.lighthouse, tx * T + T / 2, cy - 4);
    }
  }
}
