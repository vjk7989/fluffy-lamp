
function prismY(K, P, sec, y0, y1, smooth) {
  const a = (P.azimuth ?? 45) * Math.PI / 180;
  const e = (P.elevation ?? 30) * Math.PI / 180;
  const vx = Math.cos(a) * Math.cos(e), vz = Math.sin(e);
  const n = sec.length;
  let cx = 0, cz = 0;
  for (const [x, z] of sec) { cx += x / n; cz += z / n; }
  const far = sec.map(([x, z]) => K.iso([x, y0, z], P));
  const near = sec.map(([x, z]) => K.iso([x, y1, z], P));
  const hull = (pts) => {
    const s = [...pts].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
    const lo = [], hi = [];
    for (const p of s) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of s.reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  };
  const shades = [[], [], [], []];
  const tops = [K.pathOf(near, true)];
  const creases = [K.pathOf(near, true)];
  const vis = [];
  for (let i = 0; i < n; i++) {
    const [ax, az] = sec[i], [bx, bz] = sec[(i + 1) % n];
    let nx = bz - az, nz = -(bx - ax);
    const len = Math.hypot(nx, nz) || 1;
    nx /= len; nz /= len;
    if (nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
    const seen = nx * vx + nz * vz > 1e-9;
    vis.push(seen);
    if (!seen) continue;
    const quad = K.pathOf([far[i], far[(i + 1) % n], near[(i + 1) % n], near[i]], true);
    if (nz > 0.6) tops.push(quad);
    else shades[Math.max(0, Math.min(3, Math.floor(((nx * -Math.sin(a) + 1) / 2 + nz * 0.5) * 4)))].push(quad);
  }
  if (!smooth) for (let i = 0; i < n; i++) if (vis[i] && vis[(i + n - 1) % n]) creases.push(K.pathOf([far[i], near[i]]));
  return { fill: K.pathOf(hull([...far, ...near]), true), outline: K.pathOf(hull([...far, ...near]), true), crease: creases.join(''), top: tops.join(''), shades: shades.map((s) => s.join('')) };
}
function envelopeSvg(K, P, C, tilt, u0, u1) {
  const r = tilt * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const E = C.ENV;
  const xz = (u, w) => [u * c + w * s, -u * s + w * c];
  const sec = [xz(u0, 0), xz(u1, 0), xz(u1, E.t), xz(u0, E.t)];
  let out = K.solidSvg(prismY(K, P, sec, -E.half, E.half), { tone: 'hi', crease: 'lo' });
  if (u1 - u0 > E.len - 0.01) {
    const top = (u, y) => { const [x, z] = xz(u, E.t); return K.iso([x, y, z], P); };
    const flap = K.pathOf([top(u0, -E.half), top(u0 + 5.5, 0), top(u0, E.half)]);
    const stamp = K.pathOf([top(u1 - 4.6, 3.4), top(u1 - 1.6, 3.4), top(u1 - 1.6, 6.4), top(u1 - 4.6, 6.4)], true);
    out += K.lineSvg(flap, { tone: 'mid' }) + K.lineSvg(stamp, { tone: 'mid' });
  }
  return out;
}
function flapSvg(K, P, C, tilt) {
  const r = tilt * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const H = C.HINGE;
  const xz = (u, w) => [H.x + u * c + w * s, H.z - u * s + w * c];
  const sec = [xz(0, -1.2), xz(H.len, -1.2), xz(H.len, 0), xz(0, 0)];
  const body = K.solidSvg(prismY(K, P, sec, -11, 11), { tone: 'hi', crease: 'lo', lit: true });
  const top = (u, y) => { const [x, z] = xz(u, 0); return K.iso([x, y, z], P); };
  const ribs = [-5, 5].map((y) => K.pathOf([top(1.5, y), top(H.len - 1.5, y)]));
  return body + K.lineSvg(ribs.join(''), { tone: 'faint', free: true });
}
function teethSvg(K, P, C, turn) {
  const R = C.ROLLERS;
  const pts = [];
  R.xs.forEach((x, j) => {
    for (let i = 0; i < 8; i++) {
      const a = (j ? -turn : turn) + (i / 8) * Math.PI * 2;
      pts.push(K.iso([x + Math.cos(a) * (R.r - 0.7), R.y, R.z + Math.sin(a) * (R.r - 0.7)], P));
    }
  });
  return K.dotsSvg(pts, { size: 0.42, tone: 'hi' });
}
function tapeSvg(K, P, C, n, marks) {
  const T = C.TAPE, z0 = C.PRINTER.h;
  const h = 1.6 + n * T.pitch;
  const plan = { x: T.x, y: T.y, w: T.w, d: 0.5, r: 0.2 };
  let out = K.solidSvg(K.slabOf(plan, z0, h, P, 2), { tone: 'mid', crease: 'none' });
  const face = T.y + 0.5;
  const rules = [], dots = [];
  for (let i = 0; i < marks.length; i++) {
    const z = z0 + 1.4 + (n - 1 - i) * T.pitch;
    if (z < z0 + 0.9 || z > z0 + h - 0.6) continue;
    const x0 = T.x + (marks[i] ? 4.2 : 2.4);
    const x1 = T.x + (i % 3 === 1 ? 10.5 : 13.5);
    rules.push(K.pathOf([K.iso([x0, face, z], P), K.iso([x1, face, z], P)]));
    if (marks[i]) dots.push(K.iso([T.x + 2.6, face, z], P));
  }
  out += K.lineSvg(rules.join(''), { tone: 'lo', free: true });
  if (dots.length) out += K.dotsSvg(dots, { size: 0.55, tone: 'hi' });
  return out;
}
function crankSvg(K, P, C, tilt) {
  // The crank on the axle end turns with the flap.
  const H = C.HINGE, y = 14.2;
  const r = tilt * Math.PI / 180;
  const a = [H.x, y, H.z - 0.6];
  const b = [H.x + Math.cos(r) * 3.6, y, H.z - 0.6 - Math.sin(r) * 3.6];
  return K.lineSvg(K.pathOf([K.iso(a, P), K.iso(b, P)]), { tone: 'hi' }) + K.dotsSvg([K.iso(a, P), K.iso(b, P)], { size: 0.6, tone: 'hi' });
}
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
const P = {"origin":[399.1640638922736,243.1878511124946],"scale":1.661348409803026,"azimuth":56,"elevation":30};
const C = {"ENV":{"len":14,"half":8,"t":1.4},"HINGE":{"x":45,"z":22,"len":22,"tilt":40},"ROLLERS":{"xs":[62.6,68.1],"z":5,"r":2.6,"y0":-11,"y":16.5},"TAPE":{"x":126,"w":16,"y":28,"pitch":2.4,"max":8},"PRINTER":{"x":120,"y":20,"w":28,"d":18,"h":14},"CHUTE":{"x0":-156,"z0":46,"x1":-101,"z1":24.4,"y":12,"wall":5},"CHUTE_TILT":21.44128990729535,"CHUTE_LEN":59.08942375755581,"BELT_TOP":22,"GATE_NAMES":["injection","privacy","supply chain","budget","egress","output"],"CALLS":[{"gate":-1},{"gate":-1},{"gate":1},{"gate":-1},{"gate":4},{"gate":-1},{"gate":-1},{"gate":0}],"PERIOD":2.4,"LOOP":19.2,"SPEED":44,"A":{"emerge":[0,0.6],"slide":[0.6,1.45],"land":[1.45,1.7],"beltX":[-92,40],"beltEnd":4.7,"scanX":-42,"safe":{"flapEnd":5.2681818181818185,"settle":0.6,"fade":[7.4,7.9]},"block":{"onFlap":[4.7,5.15],"tilt":[5.3,5.65],"feed":[5.65,6.550000000000001],"spin":[5.75,6.75],"strips":[6,7.2],"back":[6.6,7]},"dur":7.9,"tear":2.2},"SERIAL":1202,"WINDOW":{"x0":53,"x1":69,"z0":3.6,"z1":14.4,"depth":1.2},"HOUSING":{"x":48,"y":-16,"w":34,"d":38,"h":19,"wall":4,"floor":2},"SCAN":{"x":-30,"tower":{"x":-40,"w":20,"d":6,"y":24},"hood":[44,53],"head":{"x":-36,"w":12,"y":11,"z":[33,44]}},"TRAY":{"x":82,"y":-14,"w":32,"d":28,"floor":17,"top":22,"back":20.4}};
const K = { solidSvg, slabOf, lineSvg, dotsSvg, pathOf, iso };
for (const stage of document.querySelectorAll('[data-figure="call-sorter"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const flapEl = q('flap'), crankEl = q('crank'), teethEl = q('teeth'), beamEl = q('beam');
  const stripsEl = q('strips'), tapeEl = q('tape'), tornEl = q('torn');
  const envEls = [...svg.querySelectorAll('[data-env]')];
  const lamps = [0, 1, 2, 3, 4, 5].map((i) => svg.querySelector('[data-gate="' + i + '"]'));
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const A = C.A, H = C.HINGE;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lampX = (j) => C.SCAN.x - 6 + j * 2.4;
  const ageAtX = (x) => A.land[1] + (x - A.beltX[0]) / C.SPEED;
  const decideAge = (gate) => (gate < 0 ? A.beltEnd : A.block.tilt[0]);
  const ageOf = (i, t) => (((t - i * C.PERIOD) % C.LOOP) + C.LOOP) % C.LOOP;
  const rad = Math.PI / 180;
  const last = {};
  const set = (key, value, apply) => { if (last[key] !== value) { last[key] = value; apply(value); } };

  // Strip lines that fall past the shredder window.
  const W = C.WINDOW, face = C.HOUSING.y + C.HOUSING.d - W.depth;
  const STRIPS = [0.0, 0.18, 0.34, 0.1, 0.46, 0.27, 0.6, 0.4].map((delay, i) => ({ delay, x: W.x0 + 2 + i * ((W.x1 - W.x0 - 4) / 7) }));
  stripsEl.innerHTML = STRIPS.map((s) => '<g opacity="0">' + lineSvg(pathOf([iso([s.x, face, W.z1 + 3.2], P), iso([s.x, face, W.z1 + 0.2], P)]), { tone: 'hi' }) + '</g>').join('');
  const stripEls = [...stripsEl.children];

  // Pose of one call at age a: { kind, x, z, tilt, u0, u1 } in world units.
  function pose(call, a) {
    const E = C.ENV, half = E.len / 2;
    const ch = C.CHUTE, tilt = C.CHUTE_TILT, cr = tilt * rad;
    const along = (s) => [ch.x0 + Math.cos(cr) * s, ch.z0 - Math.sin(cr) * s];
    if (a < A.slide[0]) {
      const s = -half + E.len * ease(span(a, A.emerge));
      const [x, z] = along(0);
      return { x, z, tilt, u0: Math.max(0, s - half), u1: Math.max(0.01, s + half), op: 1 };
    }
    if (a < A.land[0]) {
      const p = span(a, A.slide);
      const s = half + (C.CHUTE_LEN - E.len) * p * p;
      const [x, z] = along(s);
      return { x, z, tilt, u0: -half, u1: half, op: 1 };
    }
    if (a < A.land[1]) {
      const p = ease(span(a, A.land));
      const [x0, z0] = along(C.CHUTE_LEN - half);
      return { x: x0 + (A.beltX[0] - x0) * p, z: z0 + (C.BELT_TOP - z0) * p, tilt: tilt * (1 - p), u0: -half, u1: half, op: 1 };
    }
    if (a < A.beltEnd) return { x: A.beltX[0] + (a - A.land[1]) * C.SPEED, z: C.BELT_TOP, tilt: 0, u0: -half, u1: half, op: 1 };
    if (call.gate < 0) {
      const sf = A.safe;
      if (a < sf.flapEnd) return { x: A.beltX[1] + (a - A.beltEnd) * C.SPEED, z: C.BELT_TOP, tilt: 0, u0: -half, u1: half, op: 1 };
      const p = span(a, [sf.flapEnd, sf.flapEnd + sf.settle]);
      const x0 = A.beltX[1] + (sf.flapEnd - A.beltEnd) * C.SPEED;
      const x = x0 + (C.TRAY.x + C.TRAY.w / 2 - x0) * ease(p);
      const drop = Math.min(1, Math.max(0, (x - x0) / (C.TRAY.x + 6 - x0)));
      const z = C.BELT_TOP + (C.TRAY.floor - C.BELT_TOP) * drop * drop;
      return { x, z, tilt: 12 * Math.sin(Math.PI * drop), u0: -half, u1: half, op: 1 - span(a, sf.fade) };
    }
    // Blocked: onto the flap, ride it down, feed into the cutter nip.
    const b = A.block;
    const stop = 13;
    if (a < b.tilt[0]) {
      const p = span(a, b.onFlap);
      const x = A.beltX[1] + (H.x + stop - A.beltX[1]) * (1 - (1 - p) * (1 - p));
      return { x, z: C.BELT_TOP, tilt: 0, u0: -half, u1: half, op: 1 };
    }
    const th = H.tilt * ease(span(a, b.tilt));
    const s = stop + (H.len + half + 1 - stop) * Math.pow(span(a, b.feed), 2);
    const nip = H.len + 1;
    return { x: H.x, z: H.z, tilt: th, u0: s - half, u1: Math.min(s + half, nip), op: s - half < nip ? 1 : 0, hinge: true };
  }

  function flapTilt(t) {
    let th = 0;
    C.CALLS.forEach((call, i) => {
      if (call.gate < 0) return;
      const a = ageOf(i, t), b = A.block;
      if (a > b.tilt[0] && a < b.back[1]) th = Math.max(th, H.tilt * (a < b.back[0] ? ease(span(a, b.tilt)) : 1 - ease(span(a, b.back))));
    });
    return th;
  }

  // Events in the loop, for the readout, the labels and the receipt tape.
  const EVENTS = [];
  C.CALLS.forEach((call, i) => {
    const id = C.SERIAL + i;
    const scan = (i * C.PERIOD + ageAtX(lampX(0) - 2)) % C.LOOP;
    const dec = (i * C.PERIOD + decideAge(call.gate)) % C.LOOP;
    const verdict = (i * C.PERIOD + ageAtX(lampX(call.gate >= 0 ? call.gate : 5))) % C.LOOP;
    const bad = call.gate >= 0;
    EVENTS.push({ t: scan, kind: 'scan', text: 'call #' + id + ' · scanning', step: 'calls', on: ['calls', 'gates'] });
    EVENTS.push({ t: verdict, kind: 'verdict', text: 'call #' + id + ' · ' + (bad ? C.GATE_NAMES[call.gate] + ' gate · blocked' : '6 gates passed'), step: 'calls', on: ['gates'] });
    EVENTS.push({ t: dec, kind: 'decide', bad, text: 'call #' + id + ' · ' + (bad ? C.GATE_NAMES[call.gate] + ' gate · blocked' : '6 gates passed · delivered'), step: bad ? 'blocked' : 'delivered', on: bad ? ['diverter', 'shredder'] : ['diverter', 'tray'] });
    EVENTS.push({ t: (dec + 0.9) % C.LOOP, kind: 'print', text: null, step: 'receipt', on: ['receipt'] });
  });
  const since = (t, e) => (((t - e) % C.LOOP) + C.LOOP) % C.LOOP;
  const latest = (t, filter) => EVENTS.filter(filter).reduce((best, e) => (!best || since(t, e.t) < since(t, best.t) ? e : best), null);
  const DECISIONS = EVENTS.filter((e) => e.kind === 'decide').sort((p, q) => since(p.t, A.tear) - since(q.t, A.tear));
  const MARKS = DECISIONS.map((e) => e.bad);
  const tornSvg = tapeSvg(K, P, C, MARKS.length, MARKS);

  function draw(t) {
    // Envelopes: each call uses slot i % 4.
    const shown = [false, false, false, false];
    C.CALLS.forEach((call, i) => {
      const a = ageOf(i, t);
      if (a >= A.dur) return;
      const slot = i % 4, el = envEls[slot];
      shown[slot] = true;
      const p = pose(call, a);
      const bad = call.gate >= 0 && p.x >= lampX(call.gate) - 0.01 || (call.gate >= 0 && a >= A.beltEnd);
      set('shape' + slot, p.tilt.toFixed(2) + '|' + p.u0.toFixed(2) + '|' + p.u1.toFixed(2), () => { el.innerHTML = envelopeSvg(K, P, C, p.tilt, p.u0, p.u1); });
      set('bad' + slot, bad, (v) => el.classList.toggle('fig-bad', v));
      set('pos' + slot, p.x.toFixed(2) + '|' + p.z.toFixed(2), () => el.setAttribute('transform', translateAlong(P, [p.x, 0, p.z])));
      set('op' + slot, p.op.toFixed(2), (v) => el.setAttribute('opacity', v));
    });
    shown.forEach((on, slot) => { if (!on) set('op' + slot, '0', (v) => envEls[slot].setAttribute('opacity', v)); });

    // Lamps and beam follow the call that is under the scanner.
    const states = ['', '', '', '', '', ''];
    let beam = 0;
    C.CALLS.forEach((call, i) => {
      const a = ageOf(i, t);
      if (a < A.land[1] || a > (call.gate >= 0 ? A.block.feed[1] : A.beltEnd)) return;
      const x = Math.min(A.beltX[1], A.beltX[0] + (a - A.land[1]) * C.SPEED);
      if (x > lampX(0) - 4 && x < lampX(5) + 4 && a < A.beltEnd) beam = 1;
      const g = call.gate;
      if (g < 0 && x > lampX(5) + 0.5 * C.SPEED) return;
      for (let j = 0; j < 6; j++) {
        if (g >= 0 && j > g) break;
        if (x >= lampX(j)) states[j] = g === j ? 'bad' : 'ok';
      }
    });
    states.forEach((s, j) => set('lamp' + j, s, (v) => { lamps[j].dataset.state = v; lamps[j].setAttribute('opacity', v ? '1' : '0.25'); }));
    set('beam', beam, (v) => beamEl.setAttribute('opacity', v ? '1' : '0'));

    // Diverter flap and its crank.
    const th = flapTilt(t);
    set('flap', th.toFixed(2), () => { flapEl.innerHTML = flapSvg(K, P, C, th); crankEl.innerHTML = crankSvg(K, P, C, th); });

    // Cutter rollers turn whole teeth while a call is fed; strips fall.
    let turn = 0;
    const stripAge = [];
    C.CALLS.forEach((call, i) => {
      if (call.gate < 0) return;
      const a = ageOf(i, t);
      turn += ease(span(a, A.block.spin)) * 6 * (Math.PI / 4);
      if (a > A.block.strips[0] && a < A.block.strips[1]) stripAge.push(a - A.block.strips[0]);
    });
    set('teeth', turn.toFixed(3), () => { teethEl.innerHTML = teethSvg(K, P, C, turn); });
    STRIPS.forEach((s, j) => {
      const age = stripAge.length ? stripAge[0] - s.delay : -1;
      const fall = age > 0 ? Math.min(1, age / 0.55) : 0;
      const z = -(W.z1 - W.z0 + 3.6) * fall * fall;
      set('strip' + j, fall > 0 && fall < 1 ? z.toFixed(2) : 'off', (v) => {
        stripEls[j].setAttribute('opacity', v === 'off' ? '0' : '1');
        if (v !== 'off') stripEls[j].setAttribute('transform', translateAlong(P, [0, 0, z]));
      });
    });

    // Receipt tape: one line per decision since the last tear.
    let n = 0;
    for (const e of DECISIONS) n += ease(clamp((since(t, e.t) < since(t, A.tear) ? since(t, e.t) : -1) / 0.35, 0, 1));
    set('tape', n.toFixed(2), () => { tapeEl.innerHTML = tapeSvg(K, P, C, n, MARKS); });
    const tear = (((t - A.tear) % C.LOOP) + C.LOOP) % C.LOOP;
    const tp = tear < 0.6 ? tear / 0.6 : 1;
    set('torn', tp.toFixed(2), () => {
      if (tp >= 1) { tornEl.setAttribute('opacity', '0'); tornEl.innerHTML = ''; return; }
      if (!tornEl.firstChild) tornEl.innerHTML = tornSvg;
      tornEl.setAttribute('opacity', (1 - tp).toFixed(2));
      tornEl.setAttribute('transform', translateAlong(P, [0, 0, 8 * ease(tp)]));
    });

    // Readout and labels from the latest event.
    let word = latest(t, (e) => e.text);
    const told = latest(t, (e) => e.text && e.kind !== 'scan');
    if (word.kind === 'scan' && since(t, told.t) < 1.2) word = told;
    set('readout', word.text, (v) => { if (readout) readout.textContent = v; });
    let ev = latest(t, () => true);
    const acted = latest(t, (e) => e.kind !== 'scan');
    if (ev.kind === 'scan' && since(t, acted.t) < 1.2) ev = acted;
    set('focus', ev.step + ev.on.join(), () => {
      for (const [id, el] of Object.entries(pins)) { el.toggleAttribute('data-on', ev.on.includes(id)); el.toggleAttribute('data-dim', !ev.on.includes(id)); }
      for (const s of steps) s.toggleAttribute('data-on', s.dataset.step === ev.step);
    });
  }
  playFigure(stage, (t) => draw(t), {
    loop: C.LOOP,
    stillAt: 10.399999999999999,
    seek: {"calls":9.536363636363635,"delivered":4.3,"blocked":9.2,"receipt":11.999999999999998},
  });
}
