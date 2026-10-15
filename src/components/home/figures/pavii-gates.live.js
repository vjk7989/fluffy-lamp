
function puckSvg(K, P, kind) {
  if (kind === 'prompt') return K.solidSvg(K.cylinder(0, 0, 5, 0, 5, P, 28, 0.4), { tone: 'hi', crease: 'lo' }) + K.lineSvg(K.ring(0, 0, 2.6, 5, P, 18), { tone: 'mid' });
  return K.solidSvg(K.slabOf({ x: -4.6, y: -4.6, w: 9.2, d: 9.2, r: 1.2 }, 0, 5, P, 2, 0.4), { tone: 'hi', crease: 'lo' }) + K.lineSvg(K.planOutline({ x: -2.4, y: -2.4, w: 4.8, d: 4.8, r: 0.6 }, 5, P, 2), { tone: 'mid' });
}
function halvesSvg(K, P, kind, gap) {
  // A broken call: two halves lying apart in the trough.
  const pieces = [];
  if (kind === 'prompt') {
    for (const side of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const a = -Math.PI / 2 + (i / 12) * Math.PI;
        pts.push([side * (gap + 5 * Math.cos(a)), 5 * Math.sin(a)]);
      }
      pieces.push(K.solidSvg(K.extrude(pts, 0, 4, P, { convex: true }), { tone: 'hi', crease: 'none' }));
    }
  } else {
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -4.6 - gap : gap;
      pieces.push(K.solidSvg(K.slabOf({ x: x0, y: -4.6, w: 4.6, d: 9.2, r: 0.8 }, 0, 4, P, 2, 0.3), { tone: 'hi', crease: 'none' }));
    }
  }
  return pieces.join('');
}
function paperSvg(K, P, C, lines) {
  // The receipt: a strip coming out of the printer, one rule per decision.
  const len = 4 + lines * 3.2;
  const plan = { x: C.PRINTER.x + 7, y: C.PRINTER.y + C.PRINTER.d - 2, w: C.PRINTER.w - 14, d: len, r: 0.6 };
  const rules = [];
  for (let i = 0; i < lines; i++) {
    const y = plan.y + 3 + i * 3.2;
    rules.push(K.pathOf([K.iso([plan.x + 3, y, C.PRINTER.h + 0.4], P), K.iso([plan.x + (i % 3 === 2 ? 12 : 18), y, C.PRINTER.h + 0.4], P)]));
  }
  return K.solidSvg(K.slabOf(plan, C.PRINTER.h, 0.4, P, 2), { tone: 'mid', crease: 'none', flat: true }) + K.lineSvg(rules.join(''), { tone: 'lo', free: true });
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
const P = {"origin":[383.3216445349911,204.31315728556675],"scale":1.5837584832931748,"azimuth":56,"elevation":30};
const C = {"PRINTER":{"x":96,"y":28,"w":36,"d":22,"h":16},"GATES":[-112,-76,-40,-4,32,68],"GATE_NAMES":["injection","privacy","supply chain","budget","egress","output"],"CALLS":[{"kind":"prompt","gate":-1},{"kind":"tool","gate":0},{"kind":"prompt","gate":-1,"redact":true},{"kind":"tool","gate":-1},{"kind":"tool","gate":4},{"kind":"prompt","gate":-1},{"kind":"tool","gate":3},{"kind":"tool","gate":-1,"redact":true}],"START_X":-152,"END_X":136,"BELT_Z":[6,9],"BIN":{"x":-132,"y":-52,"w":226,"d":26,"h":8},"TRAY":{"x":138,"y":-20,"w":30,"d":40,"h":6}};
const K = { solidSvg, cylinder, slabOf, extrude, lineSvg, ring, planOutline, pathOf, iso };
for (const stage of document.querySelectorAll('[data-figure="pavii-gates"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const pucksEl = q('pucks'), rejectsEl = q('rejects'), paper = q('paper');
  const lamps = C.GATES.map((_, i) => svg.querySelector('[data-gate="' + i + '"]'));
  const pushers = C.GATES.map((_, i) => svg.querySelector('[data-pusher="' + i + '"]'));
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const SPAWN = 1.5, SPEED = 42, HOLD = 0.55, PUSH = 0.4, FALL = 0.35;
  const svgNS = 'http://www.w3.org/2000/svg';
  let clock = 0, nextSpawn = 0, serial = 1200, lines = 3;
  let pucks = [], broken = [], lampUntil = C.GATES.map(() => 0), lampState = C.GATES.map(() => ''), focusUntil = 0, shown = '';

  function spawn() {
    const call = C.CALLS[serial % C.CALLS.length];
    const el = document.createElementNS(svgNS, 'g');
    el.innerHTML = puckSvg(K, P, call.kind);
    pucksEl.appendChild(el);
    pucks.push({ el, call, id: ++serial, t0: clock, x: C.START_X, y: 0, z: C.BELT_Z[1], state: 'ride', stopAt: call.gate >= 0 ? C.GATES[call.gate] + 10 : null, passed: -1 });
  }
  function light(i, state) {
    lampUntil[i] = clock + 0.45;
    if (lampState[i] !== state) { lampState[i] = state; lamps[i].dataset.state = state; }
    lamps[i].setAttribute('opacity', '1');
  }
  function decide(p, blocked) {
    lines = lines >= 9 ? 3 : lines + 1;
    paper.innerHTML = paperSvg(K, P, C, lines);
    const msg = 'call #' + p.id + ' · ' + (blocked ? C.GATE_NAMES[p.call.gate] + ' gate · blocked' : 'passed 6 gates · delivered');
    if (readout) readout.textContent = msg;
    setFocus(blocked ? ['blocked', 'g' + p.call.gate] : ['delivered', 'receipt']);
  }
  // Labels: a decision lights the gate that made it; between decisions the
  // gates take turns, so each one's note can be read.
  function show(ids) {
    const key = ids.join();
    if (key === shown) return;
    shown = key;
    for (const [id, el] of Object.entries(pins)) { el.toggleAttribute('data-on', ids.includes(id)); el.toggleAttribute('data-dim', !ids.includes(id)); }
    for (const s of steps) s.toggleAttribute('data-on', ids.includes(s.dataset.step));
  }
  function setFocus(ids, hold = 1.4) {
    focusUntil = clock + hold;
    show(ids);
  }
  function step(dt) {
    clock += dt;
    if (clock >= nextSpawn) { spawn(); nextSpawn = clock + SPAWN; }
    pucks = pucks.filter((p) => {
      if (p.state === 'ride') {
        p.x += SPEED * dt;
        // Gates it passes flash green; the privacy gate marks redacted calls.
        C.GATES.forEach((g, i) => {
          if (p.passed < i && p.x >= g && (p.stopAt === null || g < p.stopAt - 5)) {
            p.passed = i;
            light(i, 'ok');
            if (i === 1 && p.call.redact) p.el.insertAdjacentHTML('beforeend', lineSvg(planOutline({ x: -3.6, y: -0.8, w: 7.2, d: 1.6, r: 0.6 }, 5.1, P, 2), { tone: 'hi' }));
          }
        });
        if (p.stopAt !== null && p.x >= p.stopAt) { p.x = p.stopAt; p.state = 'caught'; p.tc = clock; light(p.call.gate, 'bad'); p.el.classList.add('fig-bad'); }
        if (p.x >= C.END_X) { p.state = 'drop'; p.tc = clock; decide(p, false); }
      } else if (p.state === 'caught') {
        lampUntil[p.call.gate] = clock + 0.3;
        if (clock - p.tc > HOLD) { p.state = 'push'; p.tc = clock; decide(p, true); }
      } else if (p.state === 'push') {
        const s = clamp((clock - p.tc) / PUSH, 0, 1);
        p.y = -38 * ease(s);
        pushers[p.call.gate].setAttribute('transform', translateAlong(P, [0, -16 * Math.sin(s * Math.PI), 0]));
        if (p.y < -26 && p.el.parentNode !== rejectsEl) rejectsEl.appendChild(p.el);
        if (s >= 1) { p.state = 'fall'; p.tc = clock; pushers[p.call.gate].setAttribute('transform', ''); }
      } else if (p.state === 'fall') {
        const s = clamp((clock - p.tc) / FALL, 0, 1);
        p.z = C.BELT_Z[1] - (C.BELT_Z[1] - 0.8) * s * s;
        if (s >= 1) {
          // It breaks in two in the trough; old pieces fade away.
          p.el.innerHTML = halvesSvg(K, P, p.call.kind, 1.4);
          p.el.classList.add('fig-bad');
          broken.push({ el: p.el, t: clock });
          p.el.setAttribute('transform', translateAlong(P, [p.x, p.y, 0.8]));
          return false;
        }
      } else if (p.state === 'drop') {
        const s = clamp((clock - p.tc) / 0.45, 0, 1);
        p.x = C.END_X + 10 * s;
        p.z = C.BELT_Z[1] - (C.BELT_Z[1] - 1) * s * s;
        p.el.setAttribute('opacity', String(1 - s));
        if (s >= 1) { p.el.remove(); return false; }
      }
      p.el.setAttribute('transform', translateAlong(P, [p.x, p.y, p.z]));
      return true;
    });
    broken = broken.filter((b) => {
      const age = clock - b.t;
      if (age > 4) { b.el.remove(); return false; }
      if (age > 3) b.el.setAttribute('opacity', String(4 - age));
      return true;
    });
    lamps.forEach((lamp, i) => { if (clock > lampUntil[i] && lamp.getAttribute('opacity') !== '0.25') { lamp.setAttribute('opacity', '0.25'); lamp.dataset.state = ''; lampState[i] = ''; } });
    if (clock > focusUntil) show(['calls', 'g' + (Math.floor(clock / 1.8) % C.GATES.length)]);
  }
  if (still.matches) {
    // A still moment: calls on the belt, one caught red at the egress gate.
    for (let i = 0; i < 160; i++) step(0.05);
    for (const pin of Object.values(pins)) { pin.removeAttribute('data-dim'); }
    continue;
  }
  const FOCUS = { calls: ['calls', 'g0'], delivered: ['delivered', 'receipt'], blocked: ['blocked', 'g0'], receipt: ['receipt'] };
  show(['calls', 'g0']);
  playFigure(stage, (t, dt) => step(dt), {
    onSeek: (id) => setFocus(FOCUS[id] || [id], 3),
  });
}
