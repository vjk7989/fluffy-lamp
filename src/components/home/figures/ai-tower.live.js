
function prismX(K, P, sec, x0, x1) {
  const a = (P.azimuth ?? 45) * Math.PI / 180;
  const e = (P.elevation ?? 30) * Math.PI / 180;
  const vy = Math.sin(a) * Math.cos(e), vz = Math.sin(e);
  const n = sec.length;
  let cy = 0, cz = 0;
  for (const [y, z] of sec) { cy += y / n; cz += z / n; }
  const far = sec.map(([y, z]) => K.iso([x0, y, z], P));
  const near = sec.map(([y, z]) => K.iso([x1, y, z], P));
  const hull = (pts) => {
    const s = [...pts].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
    const lo = [], hi = [];
    for (const p of s) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of s.reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  };
  const shades = [[], [], [], []];
  const tops = [];
  const creases = [];
  const vis = [];
  // The +x end cap faces the viewer: it takes the top tone.
  tops.push(K.pathOf(near, true));
  creases.push(K.pathOf(near, true));
  for (let i = 0; i < n; i++) {
    const [ay, az] = sec[i], [by, bz] = sec[(i + 1) % n];
    let ny = bz - az, nz = -(by - ay);
    const len = Math.hypot(ny, nz) || 1;
    ny /= len; nz /= len;
    if (ny * ((ay + by) / 2 - cy) + nz * ((az + bz) / 2 - cz) < 0) { ny = -ny; nz = -nz; }
    const seen = ny * vy + nz * vz > 1e-9;
    vis.push(seen);
    if (!seen) continue;
    const quad = K.pathOf([far[i], far[(i + 1) % n], near[(i + 1) % n], near[i]], true);
    if (nz > 0.6) tops.push(quad);
    else shades[Math.max(0, Math.min(3, Math.floor(((ny * Math.cos(a) + 1) / 2 + nz * 0.5) * 4)))].push(quad);
  }
  for (let i = 0; i < n; i++) if (vis[i] && vis[(i + n - 1) % n]) creases.push(K.pathOf([far[i], near[i]]));
  const outline = K.pathOf(hull([...far, ...near]), true);
  return { fill: outline, outline, crease: creases.join(''), top: tops.join(''), shades: shades.map((s) => s.join('')) };
}
function boomSvg(K, P, C, lift) {
  const B = C.BARRIER;
  const r = lift * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const [hy, hz] = B.hinge;
  const yz = (u, w) => [hy - (u * c - w * s), hz + (u * s + w * c)];
  const sec = [yz(0, -B.t / 2), yz(B.len, -B.t / 2), yz(B.len, B.t / 2), yz(0, B.t / 2)];
  const body = K.solidSvg(prismX(K, P, sec, B.x + 1, B.x + 3), { tone: 'hi', crease: 'lo', lit: true });
  const mark = (u) => { const [y, z] = yz(u, B.t / 2); return K.iso([B.x + 3, y, z], P); };
  const stripes = [2.4, 5.6, 8.8].map((u) => K.pathOf([mark(u), K.iso([B.x + 3, ...yz(u, -B.t / 2)], P)]));
  return body + K.lineSvg(stripes.join(''), { tone: 'mid' });
}
function needleSvg(K, P, C, deg) {
  const Dl = C.DIAL, y = C.BIN.y + C.BIN.d + 1.4;
  const r = deg * Math.PI / 180;
  const tip = [Dl.x + Math.sin(r) * (Dl.r - 1.6), y, Dl.z + Math.cos(r) * (Dl.r - 1.6)];
  const tail = [Dl.x - Math.sin(r) * 2.2, y, Dl.z - Math.cos(r) * 2.2];
  const hub = K.iso([Dl.x, y, Dl.z], P);
  return K.lineSvg(K.pathOf([K.iso(tail, P), K.iso(tip, P)]), { tone: 'hi', free: true }) + K.dotsSvg([hub], { size: 1, tone: 'hi' });
}
function barSvg(K, P, C, share, zb) {
  const a = [C.WIN.x0 + 3, C.FY, zb], b = [C.WIN.x0 + 3 + (C.WIN.x1 - C.WIN.x0 - 6) * share, C.FY, zb];
  return share > 0.01 ? K.lineSvg(K.pathOf([K.iso(a, P), K.iso(b, P)]), { tone: 'hi' }) : '';
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
const P = {"origin":[423.6230058527193,364.703271679549],"scale":2.0363729391812986,"azimuth":56,"elevation":30};
const C = {"BARRIER":{"x":-60,"w":4,"farY":19.5,"nearY":35,"d":3.5,"h":22,"hinge":[35,19.5],"len":11.5,"t":2.2},"DIAL":{"x":84,"z":13,"r":8},"BIN":{"x":74,"y":-9,"w":38,"d":18,"h":24,"wall":2,"floor":2},"WIN":{"x0":-31,"x1":31,"lo":2,"hi":15},"FY":21.2,"BELT_TOP":12,"BELT_Y":29,"REQS":[{"bad":-1},{"bad":-1},{"bad":2},{"bad":-1},{"bad":-1},{"bad":1},{"bad":-1},{"bad":-1}],"PERIOD":2.4,"LOOP":19.2,"CHECKS":["injection","privacy","tool","egress"],"A":{"startX":-121,"speed":36,"stopX":-70,"lamp0":1.5,"lampGap":0.22,"pass":2.45,"goX":-5,"go":2.7,"goSpeed":50,"boomUp":[2.45,2.75],"boomDown":[3.35,3.7],"push":[2.55,3.2],"pull":[3.25,3.75],"pulse":[4.35,5.9],"hatch":[5.9,6.15],"cross":[6.15,8.1],"fall":[8.1,8.75],"land":[8.75,9.1],"needle":[8.75,9.25],"dur":9.2,"arrive":1.4166666666666667,"turn":[4,4.35]},"SERIAL":1204,"CRATE":{"x":-77,"y":36,"w":14,"d":20,"h":9,"wall":1.2,"floor":2},"PUSH":{"x":-74,"w":8,"housing":{"y":13.5,"d":6.5},"pad":{"y":20,"d":1.6,"z":[13,19]}},"PKT":{"hx":4.5,"hy":4,"h":4.6},"PARCEL":{"half":3.5,"h":4.4},"FZ":[22,39,56,73,90,107],"ROOM_Z":[30.5,47.5,64.5,81.5,98.5,115.5],"ROOM_IDS":["compute","assistant","llm","research","code","video"],"ROOM_TITLES":["Compute","AI assistant","Custom LLMs","Research","Coding","Video generation"],"ROOF_TOP":128,"SX":38,"RISER_Y":15,"BLOCK":{"w":5.6,"d":10,"h":4.4,"pitch":7.1,"x0":64.6},"PLINTH":{"x":62,"y":28,"w":62,"d":22,"h":7},"HATCH_X":20,"GIRDER_TOP":128,"FACE":20};
const K = { solidSvg, slabOf, lineSvg, dotsSvg, pathOf, iso };
for (const stage of document.querySelectorAll('[data-figure="ai-tower"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const boomEl = q('boom'), padEl = q('pad'), beamEl = q('beam'), needleEl = q('needle');
  const slotEls = [...svg.querySelectorAll('[data-slot]')];
  const rejEls = [...svg.querySelectorAll('[data-rej]')];
  const parcelEls = [...svg.querySelectorAll('[data-parcel]')];
  const blkEls = [...svg.querySelectorAll('[data-blk]')];
  const lamps = [0, 1, 2, 3].map((i) => svg.querySelector('[data-gate="' + i + '"]'));
  const roomEls = [0, 1, 2, 3, 4, 5].map((i) => svg.querySelector('[data-room="' + i + '"]'));
  const progEls = [0, 1, 2, 3, 4, 5].map((i) => svg.querySelector('[data-prog="' + i + '"]'));
  const glowEls = [0, 1, 2, 3, 4, 5].map((i) => svg.querySelector('[data-glow="' + i + '"]'));
  const sglowEls = [0, 1, 2, 3, 4, 5].map((i) => svg.querySelector('[data-sglow="' + i + '"]'));
  const pulseEl = svg.querySelector('[data-pulse]');
  const beaconEl = svg.querySelector('[data-beacon]');
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const A = C.A;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const ageOf = (i, t) => (((t - i * C.PERIOD) % C.LOOP) + C.LOOP) % C.LOOP;
  const decAge = (bad) => (bad < 0 ? A.pass : A.lamp0 + A.lampGap * bad + 0.05);
  const last = {};
  const set = (key, value, apply) => { if (last[key] !== value) { last[key] = value; apply(value); } };
  const move = (el, x, y, z) => el.setAttribute('transform', translateAlong(P, [x, y, z]));
  const slotOf = (i) => i % 4;
  const cy = C.BELT_Y;
  const arriveAge = A.arrive;
  const climbZ = (a) => 8 + (C.ROOF_TOP - 6) * span(a, A.pulse);
  const roomHit = (n) => A.pulse[0] + ((C.ROOM_Z[n] - 8) / (C.ROOF_TOP - 6)) * (A.pulse[1] - A.pulse[0]);

  // Pose of one request at age a: x, y, z, opacity, where (belt or crate).
  function pose(req, a) {
    if (a < A.arrive) return { x: A.startX + A.speed * a, y: cy, z: C.BELT_TOP, op: span(a, [0, 0.25]), rej: false };
    const bad = req.bad >= 0;
    if (!bad) {
      if (a < A.go) return { x: C.A.stopX, y: cy, z: C.BELT_TOP, op: 1, rej: false };
      if (a < A.turn[0]) return { x: A.stopX + (a - A.go) * A.goSpeed, y: cy, z: C.BELT_TOP, op: 1, rej: false };
      if (a < A.turn[1]) {
        const p = span(a, A.turn);
        return { x: A.goX, y: cy - (cy - 16) * ease(p), z: C.BELT_TOP, op: 1 - span(p, [0.45, 1]), rej: false };
      }
      return { x: A.goX, y: 16, z: C.BELT_TOP, op: 0, rej: false };
    }
    // Leaking: held under the scanner, pushed off the belt, dropped into the crate.
    const s = pad(a);
    const contact = 20 + 1.6 + C.PKT.hy;
    const y = Math.max(cy, cy + (20 + 1.6 + s) - (cy - C.PKT.hy));
    void contact;
    const drop = span(y, [C.CRATE.y + C.CRATE.wall + C.PKT.hy + 0.5, C.CRATE.y + C.CRATE.wall + C.PKT.hy + 5]);
    const z = C.BELT_TOP - (C.BELT_TOP - C.CRATE.floor) * drop * drop;
    return { x: A.stopX, y, z, op: 1 - span(a, [A.pull[1] + 0.2, A.pull[1] + 0.7]), rej: drop > 0 };
  }
  // The pad's travel at age a, for a leaking request.
  function pad(a) {
    return 24 * (a < A.pull[0] ? ease(span(a, A.push)) : 1 - ease(span(a, A.pull)));
  }
  // Boom lift (degrees) over all requests.
  function boomLift(t) {
    let lift = 0;
    C.REQS.forEach((req, i) => {
      if (req.bad >= 0) return;
      const a = ageOf(i, t);
      if (a > A.boomUp[0] && a < A.boomDown[1]) lift = Math.max(lift, 78 * (a < A.boomDown[0] ? ease(span(a, A.boomUp)) : 1 - ease(span(a, A.boomDown))));
    });
    return lift;
  }
  const padTravel = (t) => {
    let s = 0;
    C.REQS.forEach((req, i) => { if (req.bad >= 0) s = Math.max(s, pad(ageOf(i, t))); });
    return s;
  };

  // Events in the loop, for the readout, the labels and the step cards.
  const EVENTS = [];
  C.REQS.forEach((req, i) => {
    const id = C.SERIAL + i;
    const bad = req.bad >= 0;
    const base = i * C.PERIOD;
    const txt = (s) => 'request #' + id + ' · ' + s;
    EVENTS.push({ t: base + 0.1, text: txt('arriving'), step: 'arrive', on: ['hopper'] });
    EVENTS.push({ t: base + A.lamp0, text: txt('checking'), step: 'check', on: ['gate'] });
    if (bad) {
      EVENTS.push({ t: base + decAge(req.bad), text: txt(C.CHECKS[req.bad] + ' leak · stopped at the gate'), step: 'check', on: ['gate'] });
      EVENTS.push({ t: base + decAge(req.bad) + 0.7, text: txt(C.CHECKS[req.bad] + ' leak · stopped at the gate'), step: 'receipt', on: ['ledger', 'gate'] });
    } else {
      EVENTS.push({ t: base + A.pass, text: txt('checked · passed'), step: 'check', on: ['gate'] });
      EVENTS.push({ t: base + A.pass + 0.7, text: txt('checked · passed'), step: 'receipt', on: ['ledger'] });
      EVENTS.push({ t: base + A.pulse[0], text: txt('services at work'), step: 'work', on: [] });
      EVENTS.push({ t: base + A.fall[1], text: txt('checked · delivered'), step: 'receipt', on: ['results', 'ledger'] });
    }
  });
  EVENTS.forEach((e) => { e.t = ((e.t % C.LOOP) + C.LOOP) % C.LOOP; });
  const since = (t, e) => (((t - e) % C.LOOP) + C.LOOP) % C.LOOP;
  const latest = (t) => EVENTS.reduce((best, e) => (!best || since(t, e.t) < since(t, best.t) ? e : best), null);
  // Delivery times: the dial adds one tick for each.
  const DELIVERIES = [];
  C.REQS.forEach((req, i) => { if (req.bad < 0) DELIVERIES.push((i * C.PERIOD + A.needle[0]) % C.LOOP); });

  function draw(t) {
    // Requests on the belt and in the crate.
    const shown = [false, false, false, false];
    C.REQS.forEach((req, i) => {
      const a = ageOf(i, t);
      if (a >= A.dur) return;
      const slot = slotOf(i);
      const p = pose(req, a);
      const bad = req.bad >= 0 && a >= A.lamp0 + A.lampGap * req.bad;
      const belt = !p.rej, el = slotEls[slot], rej = rejEls[slot];
      shown[slot] = true;
      set('bad' + slot, bad, (v) => { el.classList.toggle('fig-bad', v); rej.classList.toggle('fig-bad', v); });
      set('pos' + slot, p.x.toFixed(2) + '|' + p.y.toFixed(2) + '|' + p.z.toFixed(2), () => { move(el, p.x, p.y, p.z); move(rej, p.x, p.y, p.z); });
      set('op' + slot, (belt ? p.op : 0).toFixed(2) + '|' + (belt ? 0 : p.op).toFixed(2), () => { el.setAttribute('opacity', (belt ? p.op : 0).toFixed(2)); rej.setAttribute('opacity', (belt ? 0 : p.op).toFixed(2)); });
    });
    shown.forEach((on, slot) => { if (!on) set('op' + slot, '0.00|0.00', () => { slotEls[slot].setAttribute('opacity', '0'); rejEls[slot].setAttribute('opacity', '0'); }); });

    // Gate lamps, scan beam, boom and pusher.
    const states = ['', '', '', ''];
    let beamOn = 0;
    C.REQS.forEach((req, i) => {
      const a = ageOf(i, t);
      if (a < A.lamp0 - 0.1 || a > (req.bad >= 0 ? A.pull[1] : A.boomDown[1])) return;
      if (a < A.lamp0 + A.lampGap * 4) beamOn = 1;
      for (let j = 0; j < 4; j++) {
        if (req.bad >= 0 && j > req.bad) break;
        if (a >= A.lamp0 + A.lampGap * j) states[j] = req.bad === j ? 'bad' : 'ok';
      }
    });
    states.forEach((s, j) => set('lamp' + j, s, (v) => { lamps[j].dataset.state = v; lamps[j].setAttribute('opacity', v ? '1' : '0.25'); }));
    set('beam', beamOn, (v) => beamEl.setAttribute('opacity', v ? '1' : '0'));
    const lift = boomLift(t);
    set('boom', lift.toFixed(1), () => { boomEl.innerHTML = boomSvg(K, P, C, lift); });
    const s = padTravel(t);
    set('pad', s.toFixed(2), () => move(padEl, 0, s, 0));

    // Ledger: one block per checked request, dropping in at the verdict.
    C.REQS.forEach((req, i) => {
      const a = ageOf(i, t);
      const d0 = decAge(req.bad) + 0.05;
      const drop = ease(span(a, [d0, d0 + 0.55]));
      const out = 1 - span(a, [C.LOOP - 0.4, C.LOOP]);
      const op = (a >= d0 ? Math.min(1, drop * 3) : 0) * out;
      set('blk' + i, op.toFixed(2) + '|' + drop.toFixed(2) + '|' + (req.bad >= 0 ? 1 : 0), () => {
        blkEls[i].setAttribute('opacity', op.toFixed(2));
        blkEls[i].classList.toggle('fig-bad', req.bad >= 0);
        move(blkEls[i], 0, 0, (1 - drop) * 22);
      });
    });

    // The riser pulse, the rooms and their side windows.
    const glow = [0, 0, 0, 0, 0, 0], work = [0, 0, 0, 0, 0, 0];
    let pulseZ = null;
    C.REQS.forEach((req, i) => {
      if (req.bad >= 0) return;
      const a = ageOf(i, t);
      if (a >= A.pulse[0] && a <= A.pulse[1] + 0.05) pulseZ = climbZ(a);
      for (let n = 0; n < 6; n++) {
        const tau = a - roomHit(n);
        if (tau < 0 || tau > 1.4) continue;
        const e = tau < 0.18 ? tau / 0.18 : Math.max(0, 1 - (tau - 0.18) / 1.2);
        glow[n] = Math.max(glow[n], e);
        work[n] = Math.max(work[n], clamp(tau / 1.0, 0, 1));
      }
    });
    set('pulse', pulseZ === null ? 'off' : pulseZ.toFixed(1), (v) => {
      if (v === 'off') { pulseEl.setAttribute('opacity', '0'); return; }
      const [px, py] = iso([C.SX + 1.4, C.RISER_Y, pulseZ], P);
      pulseEl.setAttribute('cx', px.toFixed(1)); pulseEl.setAttribute('cy', py.toFixed(1)); pulseEl.setAttribute('opacity', '1');
    });
    glow.forEach((g, n) => {
      set('glow' + n, g.toFixed(2), () => {
        glowEls[n].setAttribute('opacity', (g * 0.3).toFixed(2));
        sglowEls[n].setAttribute('opacity', (g * 0.3).toFixed(2));
        roomEls[n].setAttribute('opacity', (0.55 + 0.45 * Math.min(1, g * 1.4)).toFixed(2));
        roomEls[n].style.setProperty('--anatomy-hi', g > 0.05 ? 'var(--fig-accent,#7c3aed)' : '');
      });
      set('prog' + n, (Math.round(work[n] * 40) / 40).toFixed(3) + '|' + (g > 0.01), () => {
        progEls[n].innerHTML = g > 0.01 ? barSvg(K, P, C, work[n], C.ROOM_Z[n] - 5.3) : '';
      });
    });

    // Parcels: out of the hatch, across the bridge, into the bin.
    const parcelShown = [false, false, false, false];
    let beacon = 0;
    C.REQS.forEach((req, i) => {
      if (req.bad >= 0) return;
      const a = ageOf(i, t);
      if (a < A.hatch[0] || a >= A.land[1]) return;
      const slot = slotOf(i), el = parcelEls[slot];
      parcelShown[slot] = true;
      let x, z, op = 1;
      if (a < A.hatch[1]) { const p = span(a, A.hatch); x = C.HATCH_X; z = C.ROOF_TOP - 0.5 + 1.2 * ease(p); op = ease(p); beacon = 1; }
      else if (a < A.cross[1]) { const p = span(a, A.cross); x = C.HATCH_X + (102 - C.HATCH_X) * p; z = C.ROOF_TOP + 0.7 - 0.7 * clamp(p / 0.1, 0, 1); beacon = 1; }
      else if (a < A.fall[1]) { const p = span(a, A.fall); x = 102 + 3 * p; z = C.GIRDER_TOP - (C.GIRDER_TOP - 3) * p * p; }
      else { x = 105; z = 3; op = 1 - span(a, A.land); }
      set('par' + slot, x.toFixed(2) + '|' + z.toFixed(2) + '|' + op.toFixed(2), () => { move(el, x, 0, z); el.setAttribute('opacity', op.toFixed(2)); });
    });
    parcelShown.forEach((on, slot) => { if (!on) set('par' + slot, 'off', () => parcelEls[slot].setAttribute('opacity', '0')); });
    set('beacon', beacon, (v) => beaconEl.setAttribute('opacity', v ? '1' : '0.3'));

    // The results dial: one tick for each delivered result.
    let f = 0;
    for (const d of DELIVERIES) f += ease(clamp((t - d) / (A.needle[1] - A.needle[0]), 0, 1));
    const deg = (f % 6) * 60;
    set('needle', deg.toFixed(1), () => { needleEl.innerHTML = needleSvg(K, P, C, deg); });

    // Readout and labels from the latest event.
    const ev = latest(t);
    set('readout', ev.text, (v) => { if (readout) readout.textContent = v; });
    const rooms = new Set(glow.map((g, n) => (g > 0.15 ? C.ROOM_IDS[n] : null)).filter(Boolean));
    set('focus', ev.step + ev.on.join() + [...rooms].join(), () => {
      for (const [id, el] of Object.entries(pins)) {
        const on = ev.on.includes(id) || rooms.has(id);
        el.toggleAttribute('data-on', on);
        el.toggleAttribute('data-dim', !on);
      }
      for (const stepEl of steps) stepEl.toggleAttribute('data-on', stepEl.dataset.step === ev.step);
    });
  }
  playFigure(stage, (t) => draw(t), {
    loop: C.LOOP,
    stillAt: 9.8,
    seek: {"arrive":0.2,"check":7.75,"work":4.85,"receipt":2.85,"deliver":7.95},
  });
}
