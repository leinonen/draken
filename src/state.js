export const W = 320, H = 480;

export const G = {
  state: 'title',      // title | play | gameover
  time: 0,             // frames since boot
  scroll: 0,
  scrollSpeed: 1,
  score: 0,
  hi: +(localStorage.getItem('draken_hi') || 0),
  stage: 1,
  shake: 0, chroma: 0, flash: 0,
  player: null,
  enemies: [], eb: [], pb: [], parts: [], pickups: [], timers: [],
  boss: null,
  levelT: 0, levelIdx: 0, bossPending: false, clearT: 0,
  msg: '', sub: '', ctl: '',
};

export const dif = () => G.stage - 1;
export const spd = () => 0.75 * (1 + 0.12 * dif());                // bullet speed scale
export const rate = () => 1.4 / (1 + 0.12 * dif());          // fire interval scale
export const hpMul = () => 0.8 * (1 + 0.25 * dif());

export function addScore(n) {
  G.score += n;
  if (G.score > G.hi) { G.hi = G.score; localStorage.setItem('draken_hi', G.hi); }
}
export function after(frames, fn) { G.timers.push({ t: frames, fn }); }
export function updateTimers() {
  for (let i = G.timers.length - 1; i >= 0; i--) {
    const t = G.timers[i];
    if (--t.t <= 0) { G.timers[i] = G.timers[G.timers.length - 1]; G.timers.pop(); t.fn(); }
  }
}
