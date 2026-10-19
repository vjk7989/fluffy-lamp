
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
function polySolid(K, P, faces) {
  const { sinA, cosA, sinE, cosE } = K.cameraOf(P);
  const V = [cosA * cosE, sinA * cosE, sinE];
  const all = faces.flat();
  const mid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  const c = mid(all);
  const info = faces.map((f) => {
    const u = [f[1][0] - f[0][0], f[1][1] - f[0][1], f[1][2] - f[0][2]];
    const v = [f[2][0] - f[0][0], f[2][1] - f[0][1], f[2][2] - f[0][2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    n = n.map((x) => x / len);
    const fc = mid(f);
    if (n[0] * (fc[0] - c[0]) + n[1] * (fc[1] - c[1]) + n[2] * (fc[2] - c[2]) < 0) n = n.map((x) => -x);
    return { f, n, vis: n[0] * V[0] + n[1] * V[1] + n[2] * V[2] > 1e-6 };
  });
  const pr = (p) => K.iso(p, P);
  const tops = [];
  const shades = [[], [], [], []];
  for (const { f, n, vis } of info) {
    if (!vis) continue;
    const d = K.pathOf(f.map(pr), true);
    if (n[2] > 0.55) { tops.push(d); continue; }
    const h = Math.hypot(n[0], n[1]) || 1;
    const lit = ((n[0] / h) * -sinA + (n[1] / h) * cosA + 1) / 2;
    shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))].push(d);
  }
  const key = (p) => p.map((x) => x.toFixed(3)).join(',');
  const edges = new Map();
  info.forEach((F, i) => F.f.forEach((p, j) => {
    const q = F.f[(j + 1) % F.f.length];
    const id = [key(p), key(q)].sort().join('|');
    const e = edges.get(id) || { p, q, faces: [] };
    e.faces.push(i);
    edges.set(id, e);
  }));
  const outline = [];
  const crease = [];
  for (const e of edges.values()) {
    const v = e.faces.map((i) => info[i].vis);
    const seg = K.pathOf([pr(e.p), pr(e.q)]);
    if (v[0] && v[1]) crease.push(seg);
    else if (v[0] || v[1]) outline.push(seg);
  }
  // Fill: the convex hull of the projected corners.
  const pts = all.map(pr).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = [];
  for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return { fill: K.pathOf(hull, true), outline: outline.join(''), crease: crease.join(''), top: tops.join(''), shades: shades.map((s) => s.join('')) };
}
function screwSvg(K, P, C, z0, z1, coil) {
  if (z1 - z0 < 0.4) return '';
  const { x, y } = C.HEAD;
  const rod = K.solidSvg(K.cylinder(x, y, 2.2, z0, z1 - z0, P, 20), { tone: 'mid', crease: 'none' });
  const thread = coil(x, y, 2.25, z0, z1, (z1 - z0) / 1.7, P, K.iso, K.depthOf, K.pathOf);
  return rod + K.lineSvg(thread.front, { tone: 'lo' });
}
function wheelSvg(K, P, C, z, ang) {
  const { x, y } = C.HEAD;
  const hubR = 4.2;
  const hubD = K.depthOf([x, y, 0], P);
  const items = [];
  for (let i = 0; i < 3; i++) {
    const a = ang + (i * Math.PI * 2) / 3;
    const ca = Math.cos(a), sa = Math.sin(a), w = 1.15, r0 = hubR, r1 = 16.6;
    const ring = [[x + ca * r0 - sa * w, y + sa * r0 + ca * w], [x + ca * r1 - sa * w, y + sa * r1 + ca * w], [x + ca * r1 + sa * w, y + sa * r1 - ca * w], [x + ca * r0 + sa * w, y + sa * r0 - ca * w]];
    const kx = x + ca * 18.4, ky = y + sa * 18.4;
    let svg = K.solidSvg(K.extrude(ring, z + 1.7, 2.1, P, { convex: true, bevel: 0.25 }), { tone: 'mid' });
    svg += K.solidSvg(K.cylinder(kx, ky, 2.6, z + 0.8, 4, P, 22, 0.4), { tone: 'mid' });
    if (i === 0) {
      svg += K.solidSvg(K.cylinder(kx, ky, 1.5, z + 4.8, 6.4, P, 16), { tone: 'mid', crease: 'none' });
      svg += K.solidSvg(K.cylinder(kx, ky, 1.9, z + 11.2, 1.4, P, 16, 0.3), { tone: 'mid' });
    }
    items.push({ d: K.depthOf([x + ca * 10, y + sa * 10, 0], P), svg });
  }
  items.sort((a, b) => a.d - b.d);
  const hub = K.solidSvg(K.cylinder(x, y, hubR, z, 5.6, P, 28, 0.5), { tone: 'mid' }) + K.lineSvg(K.ring(x, y, 2.4, z + 5.6, P, 18), { tone: 'lo' }) + K.dotsSvg([K.iso([x, y, z + 5.6], P)], { size: 0.6 });
  return items.filter((it) => it.d < hubD).map((it) => it.svg).join('') + hub + items.filter((it) => it.d >= hubD).map((it) => it.svg).join('');
}
function leverSvg(K, P, C, phi, coil, poly) {
  const L = C.LEVER;
  const pt = (s, t) => [L.y + s * Math.cos(phi) - t * Math.sin(phi), L.z + s * Math.sin(phi) + t * Math.cos(phi)];
  const sec = [pt(L.len[0], -2), pt(L.len[1], -1.6), pt(L.len[1], 1.6), pt(L.len[0], 2)];
  const faces = [sec.map(([y, z]) => [L.x[0], y, z]), sec.map(([y, z]) => [L.x[1], y, z])];
  for (let i = 0; i < sec.length; i++) {
    const a = sec[i], b = sec[(i + 1) % sec.length];
    faces.push([[L.x[0], a[0], a[1]], [L.x[1], a[0], a[1]], [L.x[1], b[0], b[1]], [L.x[0], b[0], b[1]]]);
  }
  const cx = (L.x[0] + L.x[1]) / 2;
  const [sy, sz] = pt(7, -2);
  const spring = coil(cx, C.PED.y + C.PED.d - 2.2, 2, C.PED.h, sz, 5, P, K.iso, K.depthOf, K.pathOf);
  const [dy, dz] = pt(L.die, -2);
  const [ky, kz] = pt(L.knob, 1.8);
  return [
    K.lineSvg(spring.back, { tone: 'lo' }),
    K.lineSvg(spring.front, { tone: 'mid' }),
    K.solidSvg(K.cylinder(cx, dy, 4.6, dz - 9, 4, P, 32, 0.5), { tone: 'mid' }),
    K.lineSvg(K.knurl(cx, dy, 4.6, dz - 8.6, dz - 5.4, 30, P), { tone: 'lo' }),
    K.solidSvg(K.cylinder(cx, dy, 1.5, dz - 5, 5.2, P, 16), { tone: 'mid', crease: 'none' }),
    K.solidSvg(poly(K, P, faces), { tone: 'mid' }),
    K.dotsSvg([K.iso([L.x[1], dy, dz + 2], P)], { size: 0.45 }),
    K.solidSvg(K.cylinder(cx, ky, 3.2, kz - 0.4, 4.4, P, 26, 0.6), { tone: 'mid' }),
    K.lineSvg(K.ring(cx, ky, 1.6, kz + 4, P, 16), { tone: 'lo' }),
  ].join('');
}
function keySvg(K, P, C, open) {
  const { x, z } = C.KEY;
  const face = C.FRONT + 1;
  const th = open * Math.PI / 2;
  const u = [Math.cos(th), 0, Math.sin(th)];
  const at = (cy, a, r) => K.iso([x + u[0] * r * Math.cos(a), cy + r * Math.sin(a), z + u[2] * r * Math.cos(a)], P);
  const bow = (r, cy) => K.pathOf(Array.from({ length: 28 }, (_, i) => at(cy, (i / 28) * Math.PI * 2, r)), true);
  const shank = K.solidSvg(K.slabOf({ x: x - 0.5, y: face, w: 1, d: 3, r: 0.3 }, z - 0.5, 1, P, 2, 0.1), { tone: 'mid', crease: 'none' });
  return shank + `<path class="iso-fill" d="${bow(2.3, face + 5.2)}"/>` + K.lineSvg(bow(2.3, face + 5.2), { tone: 'hi' }) + K.lineSvg(bow(0.9, face + 5.2), { tone: 'mid' });
}
function vcoil(cx, cy, r, z0, z1, turns, P, iso, depthOf, pathOf) {
  const count = Math.max(8, Math.round(turns * 18));
  const back = [];
  const front = [];
  let run = [];
  let near = null;
  for (let i = 0; i <= count; i++) {
    const s = i / count;
    const a = s * turns * Math.PI * 2;
    const p = iso([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + (z1 - z0) * s], P);
    const facing = depthOf([Math.cos(a), Math.sin(a), 0], P) > 0;
    if (near === null) near = facing;
    if (facing !== near) {
      run.push(p);
      (near ? front : back).push(pathOf(run));
      run = [p];
      near = facing;
      continue;
    }
    run.push(p);
  }
  if (run.length > 1) (near ? front : back).push(pathOf(run));
  return { back: back.join(''), front: front.join('') };
}
const P = {"origin":[403.3377266791723,259.4317463429049],"scale":1.483655549514963,"azimuth":56,"elevation":30};
const C = {"HEAD":{"x":-55,"y":-5,"die":46,"travel":19.4},"LEVER":{"x":[1,9],"y":-44,"z":50,"die":39,"len":[-5,56],"knob":52},"PED":{"x":-4,"y":-56,"w":18,"d":22,"r":2,"h":44},"KEY":{"x":74,"z":8},"FRONT":48,"STATION":{"start":-103,"gate":-55,"seal":-3,"end":62},"T":{"fade":[0,0.35],"feed":[0.4,1.4],"toGate":[1.6,2.9],"headDown":[3,3.45],"headUp":[3.8,4.3],"toSeal":[4.4,5.4],"leverDown":[5.5,5.8],"leverUp":[5.95,6.35],"toEnd":[6.4,7.4],"toBox":[7.5,8.1],"drop":[8.1,8.4],"unlock":[8.15,8.45],"toMouth":[8.5,9.1],"sink":[9.1,9.5],"lock":[9.6,10],"back":[10.1,11.1],"stackSink":[10.4,11],"loop":11.6},"STAGES":[{"id":"in","until":3,"text":"prompt comes in · 2 personal fields","pins":["prompt"]},{"id":"mask","until":4.4,"text":"personal data masked","pins":["gate"]},{"id":"proof","until":6.4,"text":"proof replaces the data","pins":["proof"]},{"id":"safe","until":12.6,"text":"provider gets safe data only","pins":["outbox","drawer"]}],"WIDTH":760,"HEIGHT":430,"HUB0":101.6,"ARM":{"x":-64,"y":-52,"w":18,"d":57,"r":2,"z":[66,76]},"PHI_PRESS":-0.32650000000000023,"FEED_X":-148,"FEED_DZ":3.2,"BOX_X":114,"BOX_DZ":-6.400000000000002,"MOUTH_DY":35.5,"CASE_DZ":-7,"TOP_Z":25.8,"LT":0.8};
const K = { cylinder, solidSvg, lineSvg, pathOf, iso, depthOf, dotsSvg, slabOf, extrude, cameraOf, ring, knurl };
for (const stage of document.querySelectorAll('[data-figure="privacy-press"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const tableEl = q('table'), leavesEl = q('leaves'), copy = q('copy'), orig = q('orig'), mouth = q('mouth');
  const stack = q('stack'), barsEl = q('bars'), sealEl = q('seal');
  const headEl = q('head'), screwLo = q('screw-lo'), screwHi = q('screw-hi'), wheel = q('wheel');
  const lever = q('lever'), keyEl = q('key'), led = q('led');
  const copySolid = copy.querySelector('.iso-solid');
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const T = C.T, S = C.STATION;
  const last = {};
  const set = (key, value, apply) => { if (last[key] !== value) { last[key] = value; apply(value); } };
  const move = (a, b, t, w) => a + (b - a) * ease(span(t, w));

  function tableX(t) {
    if (t < T.toGate[0]) return S.start;
    if (t < T.toSeal[0]) return move(S.start, S.gate, t, T.toGate);
    if (t < T.toEnd[0]) return move(S.gate, S.seal, t, T.toSeal);
    if (t < T.back[0]) return move(S.seal, S.end, t, T.toEnd);
    return move(S.end, S.start, t, T.back);
  }
  // Where the leaf set rides before it is split: on the feed stack, then the bed.
  function setPos(t) {
    if (t < T.feed[0]) return [C.FEED_X, C.FEED_DZ];
    if (t < T.feed[1]) { const s = ease(span(t, T.feed)); return [C.FEED_X + (S.start - C.FEED_X) * s, C.FEED_DZ * (1 - s)]; }
    return [tableX(Math.min(t, T.back[0] - 0.001)), 0];
  }
  function copyPos(t) {
    if (t < T.toBox[0]) return setPos(t);
    const x = move(S.end, C.BOX_X, t, T.toBox);
    const s = span(t, T.drop);
    return [x, C.BOX_DZ * s * s];
  }
  function origPos(t) {
    if (t < T.toMouth[0]) { const [x, z] = setPos(t); return [x, 0, z]; }
    const s = span(t, T.toMouth);
    const dy = C.MOUTH_DY * ease(s);
    const dz = C.CASE_DZ * ease(clamp((s - 0.45) / 0.45, 0, 1));
    const f = span(t, T.sink);
    return [S.end + 1.5 * ease(s), dy, dz - 26 * f * f];
  }
  function headDz(t) {
    const d = C.HEAD.travel;
    if (t < T.headDown[0] || t > T.headUp[1]) return 0;
    if (t < T.headDown[1]) return -d * ease(span(t, T.headDown));
    if (t < T.headUp[0]) return -d;
    return -d * (1 - ease(span(t, T.headUp)));
  }
  function leverPhi(t) {
    if (t < T.leverDown[0] || t > T.leverUp[1]) return 0;
    if (t < T.leverDown[1]) { const s = span(t, T.leverDown); return C.PHI_PRESS * s * s; }
    if (t < T.leverUp[0]) return C.PHI_PRESS;
    return C.PHI_PRESS * (1 - ease(span(t, T.leverUp)));
  }
  function keyOpen(t) {
    if (t < T.unlock[0] || t > T.lock[1]) return 0;
    if (t < T.unlock[1]) return ease(span(t, T.unlock));
    if (t < T.lock[0]) return 1;
    return 1 - ease(span(t, T.lock));
  }
  function place(el, point) {
    const [x, y] = iso(point, P);
    el.style.left = (x / C.WIDTH) * 100 + '%';
    el.style.top = (y / C.HEIGHT) * 100 + '%';
  }

  // Every part is touched only when its value changes.
  function draw(t) {
    const tx = tableX(t);
    set('table', tx.toFixed(2), () => tableEl.setAttribute('transform', translateAlong(P, [tx, 0, 0])));
    // The leaf set: fades in on the feed stack at the start of each cycle.
    set('fade', ease(span(t, T.fade)).toFixed(2), (o) => leavesEl.setAttribute('opacity', o));
    const [cx, cz] = copyPos(t);
    set('copy', cx.toFixed(2) + ',' + cz.toFixed(2), () => copy.setAttribute('transform', translateAlong(P, [cx, 0, cz])));
    // In the outbox the copy joins the stack (clipped by the tray) and is no longer the lit part.
    const boxed = t >= T.drop[0];
    set('boxed', boxed, (on) => {
      (on ? stack : leavesEl).appendChild(copy);
      copySolid.toggleAttribute('data-lit', !on);
      if (!on && orig.parentNode === leavesEl) leavesEl.insertBefore(orig, copy);
    });
    set('bars', t >= T.headDown[1], (on) => barsEl.setAttribute('opacity', on ? '1' : '0'));
    set('seal', t >= T.leverDown[1], (on) => sealEl.setAttribute('opacity', on ? '1' : '0'));
    const [ox, oy, oz] = origPos(t);
    set('orig', ox.toFixed(2) + ',' + oy.toFixed(2) + ',' + oz.toFixed(2), () => orig.setAttribute('transform', translateAlong(P, [ox, oy, oz])));
    set('mouth', t >= T.toMouth[0], (on) => { if (on) mouth.appendChild(orig); else leavesEl.insertBefore(orig, leavesEl.firstChild); });
    set('origHidden', t >= T.sink[1], (on) => orig.setAttribute('opacity', on ? '0' : '1'));
    // The outbox stack sinks one leaf before the cycle ends.
    const sink = ease(span(t, T.stackSink));
    set('sink', sink.toFixed(3), () => stack.setAttribute('transform', translateAlong(P, [0, 0, -C.LT * sink])));
    // Hand wheel, screw and redaction head.
    const dz = headDz(t);
    set('head', dz.toFixed(2), () => {
      headEl.setAttribute('transform', translateAlong(P, [0, 0, dz]));
      screwLo.innerHTML = screwSvg(K, P, C, C.HEAD.die + 18.5 + dz, C.ARM.z[0], vcoil);
      screwHi.innerHTML = screwSvg(K, P, C, C.ARM.z[1] + 4, C.HUB0 + dz, vcoil);
      wheel.innerHTML = wheelSvg(K, P, C, C.HUB0 + dz, (dz / C.HEAD.travel) * Math.PI * 2.2);
    });
    const phi = leverPhi(t);
    set('lever', phi.toFixed(4), () => { lever.innerHTML = leverSvg(K, P, C, phi, vcoil, polySolid); });
    const open = keyOpen(t);
    set('key', open.toFixed(3), () => {
      keyEl.innerHTML = keySvg(K, P, C, open);
      led.setAttribute('opacity', open < 0.02 ? '1' : '0.15');
    });
    // Labels, step cards and readout follow the stage.
    const index = C.STAGES.findIndex((s) => t < s.until);
    const current = C.STAGES[index];
    set('stage', index, () => {
      for (const [id, el] of Object.entries(pins)) {
        const on = current.pins.includes(id);
        el.toggleAttribute('data-on', on);
        el.toggleAttribute('data-dim', !on);
      }
      for (const step of steps) step.toggleAttribute('data-on', step.dataset.step === current.id);
      if (readout) readout.textContent = 'stage ' + (index + 1) + ' of 4 · ' + current.text;
    });
    if (pins.prompt) {
      set('promptPin', cx.toFixed(1) + ',' + cz.toFixed(1), () => place(pins.prompt, [cx, -5, C.TOP_Z + C.LT + cz]));
      set('promptHidden', t >= T.toBox[0], (hidden) => pins.prompt.toggleAttribute('data-hidden', hidden));
    }
  }
  playFigure(stage, (t) => draw(t), {
    loop: T.loop,
    stillAt: T.leverUp[1] + 0.03,
    seek: { in: 0.4, mask: T.headDown[0], proof: T.toSeal[0], safe: T.toEnd[1] },
  });
}
