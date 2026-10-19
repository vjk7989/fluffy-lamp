
function playFigure(stage, draw, opts) {
  const { loop = 0, seek = {}, onSeek, stillAt = 0 } = opts || {};
  const figure = stage.closest('.iso-figure') || stage;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = 0, prev = 0, clock = 0, visible = false, failed = false;
  // Phones and tablets draw at 30 frames a second: the motion stays smooth
  // and the main thread gets half the work.
  const minStep = matchMedia('(pointer: coarse)').matches ? 1000 / 30 - 2 : 0;
  const run = (dt) => {
    try { draw(clock, dt); } catch (err) { if (!failed) { failed = true; console.warn('figure frame', err); } }
  };
  function tick(now) {
    frame = visible ? requestAnimationFrame(tick) : 0;
    if (minStep && prev && now - prev < minStep) return;
    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0;
    prev = now;
    clock = loop ? (clock + dt) % loop : clock + dt;
    run(dt);
  }
  const jump = (id) => {
    if (seek[id] != null) { clock = seek[id]; prev = 0; run(0); }
    if (onSeek) onSeek(id);
    if (!still && visible && !frame) frame = requestAnimationFrame(tick);
  };
  for (const el of figure.querySelectorAll('[data-step]')) el.addEventListener('click', () => jump(el.dataset.step));
  for (const el of stage.querySelectorAll('[data-pin][data-seek]')) el.addEventListener('click', () => jump(el.dataset.seek));
  clock = still ? stillAt : 0;
  run(0);
  if (still) return;
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    prev = 0;
    if (visible && !frame) frame = requestAnimationFrame(tick);
  }, { rootMargin: '120px 0px' }).observe(stage);
}
function polySolid(K, P, V, F) {
  const cam = K.cameraOf(P);
  const view = [cam.cosA * cam.cosE, cam.sinA * cam.cosE, cam.sinE];
  const light = [-cam.sinA, cam.cosA];
  const pr = V.map((p) => K.iso(p, P));
  const mid = [0, 1, 2].map((i) => V.reduce((s, p) => s + p[i], 0) / V.length);
  const shades = [[], [], [], []];
  const top = [];
  const facing = [];
  const normals = [];
  for (const f of F) {
    let n = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = V[f[i]], b = V[f[(i + 1) % f.length]];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const c = [0, 1, 2].map((i) => f.reduce((s, j) => s + V[j][i], 0) / f.length);
    if (n[0] * (c[0] - mid[0]) + n[1] * (c[1] - mid[1]) + n[2] * (c[2] - mid[2]) < 0) n = n.map((x) => -x);
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    n = n.map((x) => x / len);
    normals.push(n);
    const on = n[0] * view[0] + n[1] * view[1] + n[2] * view[2] > 1e-6;
    facing.push(on);
    if (!on) continue;
    const d = K.pathOf(f.map((j) => pr[j]), true);
    if (n[2] > 0.55) { top.push(d); continue; }
    const h = Math.hypot(n[0], n[1]) || 1;
    const lit = ((n[0] / h) * light[0] + (n[1] / h) * light[1] + 1) / 2;
    shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))].push(d);
  }
  const edges = new Map();
  F.forEach((f, fi) => f.forEach((a, i) => {
    const b = f[(i + 1) % f.length];
    const key = a < b ? a + '_' + b : b + '_' + a;
    (edges.get(key) || edges.set(key, []).get(key)).push(fi);
  }));
  const crease = [];
  for (const [key, list] of edges) {
    const [na, nb] = list.length === 2 ? [normals[list[0]], normals[list[1]]] : [];
    if (list.length === 2 && facing[list[0]] && facing[list[1]] && na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2] < 0.94) {
      const [a, b] = key.split('_').map(Number);
      crease.push(K.pathOf([pr[a], pr[b]]));
    }
  }
  const pts = [...pr].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = K.pathOf([...lower.slice(0, -1), ...upper.slice(0, -1)], true);
  return { fill: hull, shades: shades.map((s) => s.join('')), top: top.join(''), crease: crease.join(''), outline: hull };
}
function prismOf(K, P, pts, O, a, b, n, t0, t1) {
  const at = ([u, v], t) => [0, 1, 2].map((i) => O[i] + a[i] * u + b[i] * v + n[i] * t);
  const V = [...pts.map((p) => at(p, t0)), ...pts.map((p) => at(p, t1))];
  const m = pts.length;
  const F = [pts.map((_, i) => i), pts.map((_, i) => m + i)];
  for (let i = 0; i < m; i++) F.push([i, (i + 1) % m, m + ((i + 1) % m), m + i]);
  return polySolid(K, P, V, F);
}
function roundOf(r, steps, from) {
  return Array.from({ length: steps }, (_, i) => { const a = (from || 0) + (i / steps) * Math.PI * 2; return [r * Math.cos(a), r * Math.sin(a)]; });
}
function roundY(K, P, x, z, r, y0, y1, steps) {
  return prismOf(K, P, roundOf(r, steps || 32), [x, 0, z], [1, 0, 0], [0, 0, 1], [0, 1, 0], y0, y1);
}
function boxOf(K, P, c, u, v, w, hu, hv, hw) {
  return prismOf(K, P, [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]], c, u, v, w, -hw, hw);
}
function chainAt(C, s) {
  const { x, zd, zi, rc } = C.LOOM;
  const run = zd - zi;
  const q = (Math.PI / 2) * rc;
  const total = 2 * run + 2 * Math.PI * rc;
  s = ((s % total) + total) % total;
  const arc = (cz, phi) => ({ c: [x + rc * Math.cos(phi), 0, cz + rc * Math.sin(phi)], n: [Math.cos(phi), 0, Math.sin(phi)] });
  if (s < q) return arc(zd, Math.PI / 2 + s / rc);
  s -= q;
  if (s < run) return { c: [x - rc, 0, zd - s], n: [-1, 0, 0] };
  s -= run;
  if (s < Math.PI * rc) return arc(zi, Math.PI + s / rc);
  s -= Math.PI * rc;
  if (s < run) return { c: [x + rc, 0, zi + s], n: [1, 0, 0] };
  s -= run;
  return arc(zd, s / rc);
}
function chainSvg(K, P, C, offset, topCard) {
  const L0 = C.LOOM;
  const cam = K.cameraOf(P);
  const view = [cam.cosA * cam.cosE, cam.sinA * cam.cosE, cam.sinE];
  const total = 2 * (L0.zd - L0.zi) + 2 * Math.PI * L0.rc;
  const pitch = total / L0.cards;
  const back = [], front = [];
  for (let i = 0; i < L0.cards; i++) {
    const { c, n } = chainAt(C, (i - offset) * pitch);
    const t = [-n[2], 0, n[0]];
    const y = [0, 1, 0];
    const paths = boxOf(K, P, c, t, y, n, L0.len / 2, L0.half, L0.th / 2);
    const facesUs = n[0] * view[0] + n[2] * view[2] > 0;
    // Holes are punched through, so they show on whichever big face we see.
    const side = facesUs ? 1 : -1;
    const fc = c.map((v, j) => v + n[j] * side * (L0.th / 2 + 0.05));
    const holes = [];
    C.HOLES[i].split('').forEach((bit, j) => {
      if (bit !== '1') return;
      const pts = [];
      for (let a = 0; a < 14; a++) {
        const th = (a / 14) * Math.PI * 2;
        pts.push(K.iso([fc[0] + t[0] * Math.cos(th) * 1.5, L0.holes[j] + Math.sin(th) * 1.5, fc[2] + t[2] * Math.cos(th) * 1.5], P));
      }
      holes.push(K.pathOf(pts, true));
    });
    const lace = [];
    for (const e of [-1, 1]) for (const yy of [-15.4, 15.4]) lace.push(K.iso([fc[0] + t[0] * e * 4.4, yy, fc[2] + t[2] * e * 4.4], P));
    const seen = facesUs || n[0] * -view[0] + n[2] * -view[2] > 0;
    const marks = seen
      ? `<path class="iso-shade" data-shade="0" d="${holes.join('')}"/>` + K.lineSvg(holes.join(''), { tone: 'mid' }) + K.dotsSvg(lace, { size: 0.4, tone: 'mid' })
      : '';
    const svg = K.solidSvg(paths, { tone: 'hi', crease: 'lo', lit: i === topCard }) + marks;
    (facesUs ? front : back).push({ d: K.depthOf(c, P), svg });
  }
  const sort = (list) => list.sort((a, b) => a.d - b.d).map((e) => e.svg).join('');
  const core = (z) => K.solidSvg(roundY(K, P, L0.x, z, L0.core, -L0.half - 0.5, L0.half + 0.5, 36), { tone: 'mid', crease: 'faint' });
  return sort(back) + core(L0.zi) + core(L0.zd) + sort(front);
}
function pegsSvg(K, P, C, angle) {
  const L0 = C.LOOM;
  const y = L0.half + 0.5;
  const out = [];
  for (const z of [L0.zi, L0.zd]) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = angle + (i / 8) * Math.PI * 2;
      pts.push(K.iso([L0.x + Math.cos(a) * 8.6, y, z + Math.sin(a) * 8.6], P));
    }
    out.push(K.dotsSvg(pts, { size: 0.55, tone: 'mid' }));
  }
  return out.join('');
}
function crankSvg(K, P, C, angle) {
  const L0 = C.LOOM;
  const y0 = L0.half + 10;
  const disc = roundY(K, P, L0.x, L0.zd, 8, y0, y0 + 2.4, 36);
  const px = L0.x + Math.cos(angle) * 5.6, pz = L0.zd + Math.sin(angle) * 5.6;
  const pin = roundY(K, P, px, pz, 1.1, y0 + 2.4, y0 + 5, 14);
  const knob = roundY(K, P, px, pz, 1.9, y0 + 5, y0 + 8.4, 18);
  const spoke = K.pathOf([K.iso([L0.x, y0 + 2.4, L0.zd], P), K.iso([px, y0 + 2.4, pz], P)]);
  return K.solidSvg(disc, { tone: 'mid' }) + K.lineSvg(spoke, { tone: 'lo' }) + K.dotsSvg([K.iso([L0.x, y0 + 2.4, L0.zd], P)], { size: 0.8, tone: 'mid' }) + K.solidSvg(pin, { tone: 'mid', crease: 'none' }) + K.solidSvg(knob, { tone: 'mid' });
}
function pinsSvg(K, P, C, lift) {
  const L0 = C.LOOM, H = C.HEAD;
  const cardTop = L0.zd + L0.core + L0.th;
  const bodies = [], tails = [];
  lift.forEach((dz, j) => {
    const y = L0.holes[j];
    const tip = Math.max(cardTop, cardTop + dz);
    bodies.push(K.solidSvg(K.cylinder(L0.x, y, 0.9, tip, H.z0 - tip, P, 12), { tone: 'mid', crease: 'none' }));
    bodies.push(K.solidSvg(K.cylinder(L0.x, y, 1.5, H.z0 - 1.6, 1.6, P, 14), { tone: 'mid', crease: 'none' }));
    tails.push(K.solidSvg(K.cylinder(L0.x, y, 0.9, H.z1, 2.2 + dz, P, 12), { tone: 'hi', crease: 'none' }));
  });
  return { bodies: bodies.join(''), tails: tails.join('') };
}
function leverSvg(K, P, C, deg) {
  const Lv = C.LEVER;
  const a = (deg * Math.PI) / 180;
  const d = [0, Math.sin(a), Math.cos(a)];
  const side = [0, Math.cos(a), -Math.sin(a)];
  const x = Lv.x + 1.4;
  const c = [x, Lv.y + d[1] * Lv.len / 2, Lv.z + d[2] * Lv.len / 2];
  const bar = boxOf(K, P, c, d, side, [1, 0, 0], Lv.len / 2, 0.8, 0.6);
  const tip = [x, Lv.y + d[1] * Lv.len, Lv.z + d[2] * Lv.len];
  const knob = prismOf(K, P, roundOf(2, 16), tip, [0, 1, 0], [0, 0, 1], [1, 0, 0], -1.2, 1.2);
  const hub = prismOf(K, P, roundOf(2.4, 18), [Lv.x, Lv.y, Lv.z], [0, 1, 0], [0, 0, 1], [1, 0, 0], 0.6, 2.8);
  return K.solidSvg(bar, { tone: 'mid' }) + K.solidSvg(knob, { tone: 'hi' }) + K.solidSvg(hub, { tone: 'mid' }) + K.dotsSvg([K.iso([Lv.x + 2.8, Lv.y, Lv.z], P)], { size: 0.6, tone: 'hi' });
}
function tangentOf(cx, cy, r, ex, ey) {
  const dx = ex - cx, dy = ey - cy;
  const d = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const al = Math.acos(Math.min(1, r / d));
  const p1 = [cx + r * Math.cos(base + al), cy + r * Math.sin(base + al)];
  const p2 = [cx + r * Math.cos(base - al), cy + r * Math.sin(base - al)];
  return p1[1] > p2[1] ? p1 : p2;
}
function ribbon(K, P, C, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const u = [dx / len, dy / len, 0];
  const w = [-u[1], u[0], 0];
  const zc = (C.TZ[0] + C.TZ[1]) / 2;
  return K.solidSvg(boxOf(K, P, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, zc], u, [0, 0, 1], w, len / 2, (C.TZ[1] - C.TZ[0]) / 2, 0.15), { tone: 'mid', crease: 'none' });
}
function packSvg(K, P, C, sp, r) {
  return K.solidSvg(K.cylinder(sp.x, sp.y, r, C.TZ[0] - 0.5, C.TZ[1] - C.TZ[0] + 1, P, 44), { tone: 'mid', crease: 'none' }) +
    K.lineSvg(K.sideArc(sp.x, sp.y, r, (C.TZ[0] + C.TZ[1]) / 2, P, 30), { tone: 'faint' });
}
function tapeSides(K, P, C, rs, rt) {
  const g0 = [C.GUIDES[0], C.YT], g1 = [C.GUIDES[1], C.YT];
  return ribbon(K, P, C, tangentOf(C.SUPPLY.x, C.SUPPLY.y, rs, g0[0], g0[1]), g0) + ribbon(K, P, C, g1, tangentOf(C.TAKE.x, C.TAKE.y, rt, g1[0], g1[1]));
}
function spoolMarks(K, P, C, sp, angle) {
  const z = C.TZ[1] + 2;
  const holes = [];
  for (let i = 0; i < 3; i++) {
    const a = angle + (i / 3) * Math.PI * 2;
    const pts = [];
    for (let j = 0; j <= 10; j++) { const b = a - 0.42 + (j / 10) * 0.84; pts.push([sp.x + Math.cos(b) * 13.2, sp.y + Math.sin(b) * 13.2]); }
    for (let j = 10; j >= 0; j--) { const b = a - 0.42 + (j / 10) * 0.84; pts.push([sp.x + Math.cos(b) * 8.4, sp.y + Math.sin(b) * 8.4]); }
    holes.push(K.onTop(pts, z, P, true));
  }
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const slot = K.onTop([[-2.6, -0.45], [2.6, -0.45], [2.6, 0.45], [-2.6, 0.45]].map(([u, v]) => [sp.x + u * ca - v * sa, sp.y + u * sa + v * ca]), z + 3.5, P, true);
  return `<path class="iso-shade" data-shade="0" d="${holes.join('')}"/>` + K.lineSvg(holes.join(''), { tone: 'lo' }) + K.lineSvg(slot, { tone: 'mid' });
}
const P = {"origin":[391.3395873973938,233.61202143083176],"scale":1.7158803335098047,"azimuth":56,"elevation":30};
const C = {"LOOM":{"x":72,"zd":66,"zi":24.6,"rc":12.6,"core":12,"cards":12,"len":11,"th":1.2,"half":17,"flange":15,"holes":[-12.5,-7.5,-2.5,2.5,7.5,12.5]},"HEAD":{"x0":63,"x1":81,"y0":-19,"y1":19,"z0":96,"z1":109},"LEVER":{"x":81,"y":0,"z":100,"len":17,"swing":27},"TZ":[8,22],"YT":20,"GUIDES":[-80,-18],"SUPPLY":{"x":-102,"y":6},"TAKE":{"x":4,"y":6},"HOLES":["101001","010110","110010","001101","100110","011001","101100","010011","110101","001010","100011","011100"],"T":{"cycle":1.5,"advance":0.5,"run":16,"loop":18,"v":5,"start":0.6},"BLOCK":[false,false,true,false,false,false,true,false,false,true,false,false],"STAGES":[{"id":"rules","until":4,"pins":["cards"]},{"id":"fills","until":10.6,"pins":["tape","spool"]},{"id":"applies","until":13.5,"pins":["reader","cards"]},{"id":"decides","until":19,"pins":["lever"]}],"SPOOL":{"flange":18,"r0":7,"r1":15},"D_MAX":80,"D0":3,"X_HEAD":-61,"WIN":{"x0":-62,"x1":-23,"post":3}};
const K = { iso, depthOf, pathOf, cameraOf, solidSvg, lineSvg, dotsSvg, cylinder, sideArc, onTop };
for (const stage of document.querySelectorAll('[data-figure="rule-loom"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const el = {};
  for (const name of ['chain', 'pegs', 'crank', 'pins', 'tails', 'lever', 'allow', 'block', 'pack-s', 'pack-t', 'sides', 'text', 'marks-s', 'marks-t']) el[name] = q(name);
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((p) => [p.dataset.pin, p]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const T = C.T, L0 = C.LOOM;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const total = 2 * (L0.zd - L0.zi) + 2 * Math.PI * L0.rc;
  const pitch = total / L0.cards;
  const last = {};
  const set = (key, value, apply) => { if (last[key] !== value) { last[key] = value; apply(value); } };

  // Tape travel: runs at a steady speed, then rewinds for a new session.
  function travel(t) {
    if (t < T.run) return T.v * t;
    return C.D_MAX * (1 - ease(span(t, T.run + 0.2, T.loop - 0.2)));
  }
  const radius = (wound) => Math.sqrt(C.SPOOL.r0 * C.SPOOL.r0 + wound * (C.SPOOL.r1 * C.SPOOL.r1 - C.SPOOL.r0 * C.SPOOL.r0) / C.D_MAX);

  function draw(t) {
    // The chain: one card per cycle, eased; pins drop while it dwells.
    const cyc = Math.floor(t / T.cycle);
    const u = t - cyc * T.cycle;
    const offset = cyc + (u < T.advance ? ease(u / T.advance) : 1);
    const top = (cyc + 1) % L0.cards;
    const turn = -(offset * pitch) / L0.rc;
    set('chain', offset.toFixed(3), () => {
      el.chain.innerHTML = chainSvg(K, P, C, offset, u < T.advance ? -1 : top);
      el.pegs.innerHTML = pegsSvg(K, P, C, turn);
      el.crank.innerHTML = crankSvg(K, P, C, Math.PI / 2 + turn);
    });
    const down = u < T.advance ? 0 : ease(span(u, T.advance, T.advance + 0.25)) * (1 - ease(span(u, T.cycle - 0.22, T.cycle)));
    const holes = C.HOLES[top];
    const lift = L0.holes.map((_, j) => 3.8 - down * (holes[j] === '1' ? 6.5 : 3.8));
    set('pins', down.toFixed(3), () => {
      const p = pinsSvg(K, P, C, lift);
      el.pins.innerHTML = p.bodies;
      el.tails.innerHTML = p.tails;
    });
    // The lever: the request meets the card, then the lever swings.
    const block = C.BLOCK[cyc % C.BLOCK.length];
    const swing = u < T.advance ? 0 : ease(span(u, T.advance + 0.25, T.advance + 0.6)) * (1 - ease(span(u, T.cycle - 0.25, T.cycle)));
    set('lever', (block ? -swing : swing).toFixed(3), (v) => { el.lever.innerHTML = leverSvg(K, P, C, C.LEVER.swing * Number(v)); });
    const lit = swing > 0.9;
    set('lamps', lit ? (block ? 'b' : 'a') : '', (v) => {
      el.allow.setAttribute('opacity', v === 'a' ? '1' : '0.2');
      el.allow.dataset.state = v === 'a' ? 'ok' : '';
      el.block.setAttribute('opacity', v === 'b' ? '1' : '0.2');
      el.block.dataset.state = v === 'b' ? 'bad' : '';
    });
    // The tape: packs grow and shrink, text slides through the window.
    const d = travel(t);
    const rs = radius(C.D_MAX - d), rt = radius(d);
    // The text slides by a transform every frame; the packs, the free tape
    // and the turning flanges are redrawn only in small steps.
    set('tape', d.toFixed(2), () => el.text.setAttribute('transform', translateAlong(P, [d, 0, 0])));
    set('packs', rt.toFixed(1), () => {
      el['pack-s'].innerHTML = packSvg(K, P, C, C.SUPPLY, rs);
      el['pack-t'].innerHTML = packSvg(K, P, C, C.TAKE, rt);
      el.sides.innerHTML = tapeSides(K, P, C, rs, rt);
    });
    const spin = Math.round(d / 0.6) * 0.06;
    set('spin', spin.toFixed(2), () => {
      el['marks-s'].innerHTML = spoolMarks(K, P, C, C.SUPPLY, -spin * 1.2);
      el['marks-t'].innerHTML = spoolMarks(K, P, C, C.TAKE, -spin);
    });
    const fade = t < T.run ? 1 : 1 - span(t, T.run, T.run + 0.6);
    set('fade', fade.toFixed(2), (v) => el.text.setAttribute('opacity', v));
    // Readout and labels.
    const front = C.X_HEAD + (d - C.D0);
    const inner = [C.WIN.x0 + 3, C.WIN.x1 - 3];
    const fill = t >= T.run ? 0 : clamp((front - inner[0]) / (inner[1] - inner[0]), 0, 1);
    const pct = Math.round(fill * 100);
    const promptGone = t < T.run && d > C.D0 + (C.GUIDES[1] - C.X_HEAD) + 14;
    const verdict = u < T.advance + 0.4 ? 'reading' : block ? 'block' : 'allow';
    const ctx = t >= T.run ? 'new session' : pct >= 100 ? (promptGone ? 'context full · prompt rules gone' : 'context full') : 'context ' + pct + '% full';
    set('readout', ctx + '|' + top + '|' + verdict, () => {
      if (readout) readout.textContent = ctx + ' · rule ' + (top + 1) + ' · ' + verdict;
    });
    const index = C.STAGES.findIndex((s) => t < s.until);
    set('stage', index, () => {
      const on = C.STAGES[index].pins;
      for (const [id, p] of Object.entries(pins)) { p.toggleAttribute('data-on', on.includes(id)); p.toggleAttribute('data-dim', !on.includes(id)); }
      for (const s of steps) s.toggleAttribute('data-on', s.dataset.step === C.STAGES[index].id);
    });
  }
  playFigure(stage, (t) => draw(t), {
    loop: T.loop,
    stillAt: 14.6,
    seek: { rules: 0.5, fills: 6.2, applies: 11.2, decides: 14.0 },
  });
}
