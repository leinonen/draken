// WebAudio synth SFX. No samples.
let ctx = null, master = null, noiseBuf = null, shotN = 0;

function tone(freq, type, dur, vol, slideTo) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, cutoff, cutoffTo) {
  if (!ctx) return;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
  s.buffer = noiseBuf; s.loop = true;
  f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, t);
  if (cutoffTo) f.frequency.exponentialRampToValueAtTime(cutoffTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}

export const audio = {
  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.3; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  },
  shot() { if (++shotN % 2) tone(900, 'square', 0.05, 0.05, 300); },
  eshot() { tone(300, 'triangle', 0.06, 0.03, 200); },
  hit() { tone(180, 'square', 0.03, 0.04, 120); },
  graze() { tone(2400, 'sine', 0.04, 0.05, 3000); },
  explode(big) { noise(big ? 0.9 : 0.35, big ? 0.7 : 0.35, big ? 900 : 1800, 80); tone(big ? 90 : 170, 'triangle', big ? 0.5 : 0.25, 0.35, 30); },
  bomb() { noise(1.6, 0.9, 4000, 60); tone(70, 'sawtooth', 1.3, 0.4, 18); tone(1200, 'sine', 0.4, 0.2, 100); },
  pickup() { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 'square', 0.1, 0.08), i * 60)); },
  die() { noise(1.2, 0.8, 2500, 60); tone(420, 'sawtooth', 0.8, 0.35, 40); },
  bossHit() { tone(120, 'square', 0.05, 0.05, 80); },
  start() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => tone(f, 'square', 0.15, 0.08), i * 90)); },
  clear() { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 'square', 0.25, 0.1), i * 120)); },
};
