// Procedural sprite atlas. Aircraft, ships and bullets are drawn as anti-aliased vector
// art at SS× resolution and mip-mapped; terrain tiles stay 1:1 pixel art.
const SS = 4;

export function buildAtlas() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const frames = {};
  let cx = 0, cy = 0, rowH = 0;

  function add(name, w, h, draw, scale = 1) {
    const pw = Math.ceil(w * scale), ph = Math.ceil(h * scale);
    if (cx + pw + 2 > S) { cx = 0; cy += rowH + 2; rowH = 0; }
    const ox = cx, oy = cy;
    g.save();
    g.translate(ox, oy); g.scale(scale, scale);
    g.beginPath(); g.rect(0, 0, w, h); g.clip();
    draw({
      w, h,
      px: (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); },
      rect: (x, y, rw, rh, col) => { g.fillStyle = col; g.fillRect(x, y, rw, rh); },
    });
    g.restore();
    frames[name] = { w, h, u0: ox / S, v0: oy / S, u1: (ox + pw) / S, v1: (oy + ph) / S };
    cx += pw + 2; rowH = Math.max(rowH, ph);
  }

  // ---- vector helpers ---------------------------------------------------
  function poly(pts, fill, stroke, lw = 0.45) {
    g.beginPath();
    pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
  }
  const mir = (pts, cx) => [...pts, ...pts.slice().reverse().map(([x, y]) => [2 * cx - x, y])];
  function grad(x0, x1, stops) {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    stops.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  }
  function radial(x, y, r, stops) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([p, col]) => gr.addColorStop(p, col));
    return gr;
  }
  function ellipse(x, y, rx, ry, fill, stroke) {
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 0.4; g.stroke(); }
  }
  function line(x0, y0, x1, y1, col, lw = 0.5) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = col; g.lineWidth = lw; g.stroke();
  }
  const swe = (x, y, r = 2.4) => { // Swedish roundel
    ellipse(x, y, r, r, '#1f5fc4', '#123a7a');
    for (const [dx, dy] of [[0, 0.7], [-0.9, -0.5], [0.9, -0.5]]) ellipse(x + dx * r * 0.42, y + dy * r * 0.42, r * 0.26, r * 0.26, '#f7d117');
  };
  const star = (x, y, r = 2.2) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fillStyle = '#e02020'; g.fill(); g.strokeStyle = '#7a0f0f'; g.lineWidth = 0.3; g.stroke();
  };
  function panelLines(pts, col) { for (let i = 0; i < pts.length; i += 2) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, 0.3); }

  // Generic top-down aircraft. All half-polygons are the RIGHT half (x >= cx), mirrored.
  function aircraft(d, o) {
    const w = d.w, cx = w / 2;
    const edge = o.edge;
    const wingFill = grad(0, w, [[0, o.wingDark], [0.5, o.wingLight], [1, o.wingDark]]);
    if (o.tail) poly(mir(o.tail, cx), wingFill, edge);
    poly(mir(o.wing, cx), wingFill, edge);
    if (o.wingLines) panelLines(mir(o.wingLines, cx), 'rgba(0,0,0,0.18)');
    if (o.nacelles) for (const [nx, ny, nw, nh] of o.nacelles) {
      for (const sx of [cx - nx, cx + nx]) {
        g.fillStyle = grad(sx - nw / 2, sx + nw / 2, [[0, o.bodyLight], [0.4, o.bodyMid], [1, o.bodyDark]]);
        g.beginPath(); g.roundRect(sx - nw / 2, ny, nw, nh, nw / 2); g.fill();
        g.strokeStyle = edge; g.lineWidth = 0.4; g.stroke();
        ellipse(sx, ny + 1.2, nw / 2 - 0.6, 1.1, '#1c2424');
      }
    }
    if (o.intakes) for (const [ix, iy, iw, ih] of o.intakes) for (const sx of [cx - ix - iw, cx + ix]) {
      g.fillStyle = grad(sx, sx + iw, [[0, o.bodyDark], [1, o.bodyMid]]);
      g.beginPath(); g.roundRect(sx, iy, iw, ih, 0.6); g.fill(); g.strokeStyle = edge; g.lineWidth = 0.35; g.stroke();
      g.fillStyle = '#141a1c'; g.fillRect(sx + 0.3, iy + 0.3, iw - 0.6, 1);
    }
    const br = o.bodyR;
    poly(mir(o.body, cx), grad(cx - br, cx + br, [[0, o.bodyLight], [0.45, o.bodyMid], [1, o.bodyDark]]), edge);
    if (o.fin) { line(cx, o.fin[0], cx, o.fin[1], o.edge, 1.1); line(cx - 0.25, o.fin[0], cx - 0.25, o.fin[1], o.bodyLight, 0.35); }
    if (o.canopy) {
      const [y, rx, ry] = o.canopy;
      ellipse(cx, y, rx, ry, radial(cx - rx * 0.4, y - ry * 0.4, ry * 1.6, [[0, '#9fd2ff'], [0.35, '#3b7fc4'], [1, '#132c4c']]), '#0d1f36');
    }
    if (o.nose) ellipse(cx, o.nose[0], o.nose[1], o.nose[1] * 0.9, '#22282c');
    if (o.exhaust) for (const [ex, ey, er] of o.exhaust) for (const sx of ex ? [cx - ex, cx + ex] : [cx]) ellipse(sx, ey, er, er * 0.8, radial(sx, ey, er, [[0, '#f0c070'], [0.5, '#3a2a20'], [1, '#111']]));
    if (o.roundels) for (const [rx, ry, rr] of o.roundels) o.roundel(rx, ry, rr);
  }
  const SWE = { bodyLight: '#e2e8ec', bodyMid: '#aeb8c0', bodyDark: '#5f6c75', wingLight: '#aab5bd', wingDark: '#66737b', edge: '#2e373d', roundel: swe };
  const RUS_GREEN = { bodyLight: '#c9ced0', bodyMid: '#98a0a4', bodyDark: '#525a5e', wingLight: '#6f8a63', wingDark: '#3a4d35', edge: '#1f2a1e', roundel: star };
  const RUS_GREY = { bodyLight: '#d5d9db', bodyMid: '#a3abae', bodyDark: '#5a6467', wingLight: '#8b9a9a', wingDark: '#4c5c5c', edge: '#222c2c', roundel: star };

  // ---- primitives -------------------------------------------------------
  add('white', 4, 4, d => d.rect(0, 0, 4, 4, '#fff'));
  frames.white.u0 += 1 / S; frames.white.v0 += 1 / S; frames.white.u1 -= 1 / S; frames.white.v1 -= 1 / S;

  // ---- aircraft ---------------------------------------------------------
  add('draken', 24, 28, d => aircraft(d, { ...SWE, bodyR: 2,
    wing: [[12, 1], [13.4, 6], [16.2, 14.5], [24, 22.5], [24, 24.2], [14.2, 24.2], [13.2, 26.5], [12, 26.5]],
    body: [[12, 0], [13.2, 4], [14, 10], [14, 23], [13.4, 27.5], [12, 28]],
    wingLines: [[15, 12], [21, 24], [17, 16], [19.5, 24]],
    intakes: [[2.2, 8.5, 1.5, 3]], canopy: [7.5, 1.5, 3], fin: [15, 24], exhaust: [[0, 27, 1.5]],
    roundels: [[6.3, 21, 2.3], [17.7, 21, 2.3]] }), SS);
  add('mig', 20, 20, d => aircraft(d, { ...RUS_GREEN, bodyR: 1.8,
    wing: [[11, 8], [19.5, 13.5], [19.5, 14.6], [11.5, 14.6]],
    tail: [[11, 16], [15.5, 18.5], [15.5, 19.3], [11.5, 19.3]],
    body: [[10, 0], [11, 3], [11.8, 8], [11.8, 16], [11, 19.5], [10, 20]],
    canopy: [5, 1.2, 2.2], fin: [12, 19], nose: [1, 1], exhaust: [[0, 19.3, 1.1]],
    roundels: [[15.8, 13.4, 1.6], [4.2, 13.4, 1.6]] }), SS);
  add('su', 26, 22, d => aircraft(d, { ...RUS_GREY, bodyR: 2.6,
    wing: [[15.5, 7], [26, 15.5], [26, 17], [16, 16]],
    tail: [[15.5, 17], [20, 20.5], [20, 21.3], [15.8, 21.3]],
    body: [[13, 0], [14.6, 4], [15.6, 9], [15.6, 17], [14.6, 21.5], [13, 22]],
    intakes: [[2.6, 6.5, 1.8, 4]], canopy: [4.5, 2, 2.6], fin: [13, 21], nose: [0.8, 1.2], exhaust: [[1.2, 21.3, 1.1]],
    roundels: [[20.5, 15.3, 1.8], [5.5, 15.3, 1.8]] }), SS);
  add('bomber', 40, 36, d => aircraft(d, { ...RUS_GREY, bodyR: 3,
    wing: [[22.5, 10], [40, 25], [40, 27.5], [23, 25]],
    tail: [[22.5, 28], [32, 33.5], [32, 35], [23, 34]],
    body: [[20, 0], [22, 5], [23, 12], [23, 30], [22, 35], [20, 36]],
    wingLines: [[27, 15], [32, 26], [31, 18.5], [36, 26.5]],
    intakes: [[3, 12, 2, 6]], canopy: [4, 1.8, 3], fin: [24, 35], nose: [0.8, 1.6], exhaust: [[1.6, 35.2, 1.4]],
    roundels: [[33, 25.2, 2], [7, 25.2, 2]] }), SS);
  add('boss', 96, 80, d => aircraft(d, { ...RUS_GREY, bodyR: 6,
    wing: [[54, 20], [96, 44], [96, 49], [55, 48]],
    tail: [[53.5, 62], [72, 73], [72, 76], [54, 75]],
    body: [[48, 0], [51, 6], [54, 14], [54, 60], [52, 74], [50, 79], [48, 80]],
    wingLines: [[60, 26], [64, 48], [70, 32], [72, 48], [80, 37], [82, 48], [90, 42], [90, 48]],
    nacelles: [[14, 22, 8, 30], [30, 30, 8, 26]],
    canopy: [7, 2.4, 4.5], fin: [56, 78], nose: [1.6, 2.6], exhaust: [[0, 79, 1.5]],
    roundels: [[80, 44.5, 3], [16, 44.5, 3]] }), SS);
  add('prop', 14, 2, () => { g.fillStyle = 'rgba(230,236,240,0.9)'; g.beginPath(); g.ellipse(7, 1, 7, 0.9, 0, 0, Math.PI * 2); g.fill(); }, SS);
  add('life', 12, 12, d => aircraft(d, { ...SWE, bodyR: 1,
    wing: [[6, 0.5], [6.7, 3], [8, 7], [12, 11.2], [12, 12], [6, 12]],
    body: [[6, 0], [6.8, 3], [7, 11], [6, 12]], canopy: [3.5, 0.7, 1.4] }), SS);
  add('flame', 6, 10, () => { g.fillStyle = radial(3, 1, 8, [[0, 'rgba(255,255,220,1)'], [0.3, 'rgba(255,190,80,0.9)'], [0.7, 'rgba(255,90,20,0.4)'], [1, 'rgba(255,60,0,0)']]); g.beginPath(); g.ellipse(3, 3, 3, 7, 0, 0, Math.PI * 2); g.fill(); }, SS);

  // ---- ships ------------------------------------------------------------
  function ship(d, o) {
    const w = d.w, h = d.h;
    const bow = h * 0.28;
    poly([[w / 2, 0], [w, bow], [w, h - 3], [w - 3, h], [3, h], [0, h - 3], [0, bow]], grad(0, w, [[0, '#7d868e'], [0.5, '#5a636b'], [1, '#3b434a']]), '#1f262b', 0.5);
    poly([[w / 2, 3], [w - 1.6, bow + 1], [w - 1.6, h - 3.5], [w - 3.5, h - 1.6], [3.5, h - 1.6], [1.6, h - 3.5], [1.6, bow + 1]], grad(0, w, [[0, '#a9b1b6'], [0.5, '#8d959b'], [1, '#6f7880']]));
    for (const [sx, sy, sw, sh] of o.blocks) {
      g.fillStyle = grad(sx, sx + sw, [[0, '#d4dadd'], [0.5, '#aeb6bb'], [1, '#6f787e']]);
      g.beginPath(); g.roundRect(sx, sy, sw, sh, 0.8); g.fill(); g.strokeStyle = '#2b3237'; g.lineWidth = 0.4; g.stroke();
      g.fillStyle = 'rgba(20,30,40,0.7)'; g.fillRect(sx + 1, sy + 1, sw - 2, 1.2);
    }
    if (o.funnel) ellipse(o.funnel[0], o.funnel[1], 1.6, 1.6, radial(o.funnel[0] - 0.5, o.funnel[1] - 0.5, 2, [[0, '#777'], [1, '#222']]), '#111');
    for (const [tx, ty] of o.turrets) {
      ellipse(tx, ty, 2.6, 2.6, radial(tx - 0.8, ty - 0.8, 3.2, [[0, '#8a949a'], [1, '#2e363c']]), '#151a1e');
      line(tx, ty, tx, ty - 5.5, '#1a2024', 1.1);
    }
    line(w / 2, 1.2, w / 2, 3.5, '#e02020', 0.8);
    line(1.6, bow + 2, 1.6, h - 4, 'rgba(255,255,255,0.25)', 0.4);
  }
  add('boat', 14, 36, d => ship(d, { blocks: [[4, 14, 6, 10]], turrets: [[7, 9]], funnel: [7, 27] }), SS);
  add('corvette', 24, 68, d => ship(d, { blocks: [[7, 24, 10, 16], [9, 44, 6, 8]], turrets: [[12, 14], [12, 58]], funnel: [12, 36] }), SS);
  add('turret', 10, 10, () => {
    ellipse(5, 5, 4.6, 4.6, radial(3.5, 3.5, 6, [[0, '#8a949a'], [0.6, '#4a5258'], [1, '#22282c']]), '#111');
    ellipse(5, 5, 2.4, 2.4, radial(4.3, 4.3, 3, [[0, '#a0aab0'], [1, '#3a4248']]), '#1a1f22');
    line(5, 5, 5, 0.4, '#1e2428', 1.6); line(5, 5, 5, 0.6, '#5a6268', 0.5);
  }, SS);

  // ---- bullets & particles (2x, smooth) ----------------------------------
  const B = 2;
  add('orb', 12, 12, () => { g.fillStyle = radial(6, 6, 6, [[0, '#fff'], [0.3, '#fff'], [0.55, 'rgba(255,255,255,0.85)'], [0.8, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, 12, 12); }, B);
  add('needle', 4, 12, () => { g.fillStyle = radial(2, 6, 6, [[0, '#fff'], [0.5, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]); g.save(); g.scale(1, 1); g.beginPath(); g.ellipse(2, 6, 1.6, 6, 0, 0, Math.PI * 2); g.fill(); g.restore(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(2, 6, 0.7, 4.5, 0, 0, Math.PI * 2); g.fill(); }, B);
  add('pshot', 4, 12, () => { g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(2, 6, 2, 6, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(2, 5.5, 0.9, 4.8, 0, 0, Math.PI * 2); g.fill(); }, B);
  add('spark', 3, 3, () => { g.fillStyle = radial(1.5, 1.5, 1.5, [[0, '#fff'], [0.5, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, 3, 3); }, B);
  add('smoke', 10, 10, () => { g.fillStyle = radial(5, 5, 5, [[0, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]); g.fillRect(0, 0, 10, 10); }, B);
  add('ring', 24, 24, () => { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(12, 12, 10, 0, Math.PI * 2); g.stroke(); }, B);

  // ---- terrain tiles (16x16, pixel) --------------------------------------
  add('cabin', 16, 16, d => {
    d.rect(3, 6, 10, 8, '#a3382b'); d.rect(3, 4, 10, 3, '#4a3a34'); d.rect(2, 6, 12, 1, '#2e2320');
    d.rect(5, 9, 2, 2, '#f2e9c9'); d.rect(9, 9, 2, 2, '#f2e9c9'); d.rect(3, 13, 10, 1, '#f2e9c9'); d.rect(9, 2, 2, 3, '#555');
  });
  add('lighthouse', 12, 24, d => {
    d.rect(4, 2, 4, 20, '#f2f2ea'); d.rect(3, 22, 6, 2, '#888'); d.rect(4, 10, 4, 4, '#d0302a'); d.rect(3, 2, 6, 3, '#444'); d.rect(4, 0, 4, 2, '#ffe680'); d.rect(5, 6, 2, 2, '#333');
  });

  // ---- pickups ------------------------------------------------------------
  const glyph = (d, rows, col) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '1') d.px(x + 3, y + 3, col); }));
  add('pow', 12, 12, d => { d.rect(0, 0, 12, 12, '#f7d117'); d.rect(1, 1, 10, 10, '#c98d00'); glyph(d, ['11110', '10001', '10001', '11110', '10000', '10000'], '#fff'); });
  add('bombp', 12, 12, d => { d.rect(0, 0, 12, 12, '#48d16a'); d.rect(1, 1, 10, 10, '#1e8a3d'); glyph(d, ['11110', '10001', '11110', '10001', '10001', '11110'], '#fff'); });

  return { canvas: c, frames };
}

