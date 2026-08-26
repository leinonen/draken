const map = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'fire', Space: 'fire', KeyJ: 'fire', KeyX: 'bomb', KeyK: 'bomb', ShiftLeft: 'focus', ShiftRight: 'focus', Enter: 'start', KeyP: 'pause',
};
const keys = {}, cur = {}, prev = {};
export const input = {
  left: 0, right: 0, up: 0, down: 0, fire: 0, bomb: 0, focus: 0, start: 0, pause: 0,
  ax: 0, ay: 0,
  anyKey: false,
  update() {
    Object.assign(prev, cur);
    for (const name of ['left', 'right', 'up', 'down', 'fire', 'bomb', 'focus', 'start', 'pause']) cur[name] = keys[name] ? 1 : 0;
    let ax = 0, ay = 0;
    const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
    if (gp) {
      ax = Math.abs(gp.axes[0]) > 0.2 ? gp.axes[0] : 0;
      ay = Math.abs(gp.axes[1]) > 0.2 ? gp.axes[1] : 0;
      const b = i => gp.buttons[i] && gp.buttons[i].pressed;
      if (b(14)) ax = -1; if (b(15)) ax = 1; if (b(12)) ay = -1; if (b(13)) ay = 1;
      if (b(0) || b(2)) cur.fire = 1;
      if (b(1) || b(3)) cur.bomb = 1;
      if (b(6) || b(7) || b(4) || b(5)) cur.focus = 1;
      if (b(9)) cur.start = 1;
    }
    for (const k in cur) this[k] = cur[k];
    this.ax = ax || (cur.right - cur.left);
    this.ay = ay || (cur.down - cur.up);
  },
  pressed(name) { return cur[name] && !prev[name]; },
};
window.addEventListener('keydown', e => {
  const k = map[e.code];
  input.anyKey = true;
  if (k) { keys[k] = true; e.preventDefault(); }
});
window.addEventListener('keyup', e => { const k = map[e.code]; if (k) keys[k] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
