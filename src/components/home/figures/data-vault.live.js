
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
function headRod(K, P, C, dz) {
  const top = C.CPU.rest + C.CPU.h + dz;
  return K.solidSvg(K.cylinder(C.CPU.x, 0, 2.4, top, C.CPU.housing - top, P, 20), { tone: 'hi', crease: 'none' });
}
function needle(K, P, C, angle) {
  const pivot = [C.CPU.x, 14.7, C.CPU.rest + 6];
  const a = (angle * Math.PI) / 180;
  const tip = [pivot[0] + Math.sin(a) * 5.4, 14.7, pivot[2] + Math.cos(a) * 5.4];
  return K.lineSvg(K.pathOf([K.iso(pivot, P), K.iso(tip, P)]), { tone: 'hi' }) + K.dotsSvg([K.iso(pivot, P)], { size: 0.7, tone: 'hi' });
}
function stampLive(K, P, C, fz, coil) {
  const s = C.STAMP;
  const top = fz + s.footH;
  const spring = coil(s.x, 0, 4.2, top + 0.6, s.housing[0] - 0.4, 6, P, K.iso, K.depthOf, K.pathOf);
  return [
    K.solidSvg(K.cylinder(s.x, 0, s.foot, fz, s.footH, P, 32, 0.5), { tone: 'mid' }),
    K.lineSvg(K.pathOf([K.iso([s.x - 3, 0, fz], P), K.iso([s.x + 3, 0, fz], P)]), { tone: 'faint', free: true }),
    K.lineSvg(spring.back, { tone: 'lo' }),
    K.solidSvg(K.cylinder(s.x, 0, 2, top, s.housing[0] - top, P, 18), { tone: 'hi', crease: 'none' }),
    K.lineSvg(spring.front, { tone: 'mid' }),
  ].join('');
}
function bolts(K, P, C, out) {
  // Three bolts on the vault's front face; out = 0 (flush) .. 1 (thrown).
  const d = 0.6 + out * 2.6;
  return [46, 33, 20]
    .map(z => K.solidSvg(K.slabOf({ x: 70, y: C.VAULT.y + C.VAULT.d, w: 7, d, r: 0.8 }, z - 2.5, 5, P, 2, 0.3), { tone: 'mid', crease: 'none' }))
    .join('');
}
function dial(K, P, C, turn) {
  const { x, z, face } = C.DIAL;
  const at = (a, r) => K.iso([x + Math.sin(a) * r, face, z + Math.cos(a) * r], P);
  const lines = [];
  const knobs = [];
  for (let i = 0; i < 3; i++) {
    const a = turn + (i * Math.PI * 2) / 3;
    lines.push(K.pathOf([at(a, 4.2), at(a, 9.5)]));
    knobs.push(at(a, 10.4));
  }
  const pointer = K.pathOf([at(turn + Math.PI / 3, 4.2), at(turn + Math.PI / 3, 7)]);
  return K.lineSvg(lines.join(''), { tone: 'mid' }) + K.lineSvg(pointer, { tone: 'hi' }) + K.dotsSvg(knobs, { size: 1.15, tone: 'hi' });
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
const P = {"origin":[400.298445646955,256.26373176982975],"scale":1.4889675257762625,"azimuth":56,"elevation":30};
const C = {"CPU":{"x":-60,"posts":[-44,44],"beam":[96,104],"rest":60,"h":16,"pin":4,"housing":84},"STAMP":{"x":4,"col":-46,"arm":[80,88],"housing":[68,80],"foot":7,"footH":6,"rest":50},"VAULT":{"x":66,"y":-40,"w":70,"d":80,"r":3,"h":66},"DIAL":{"x":98,"z":33,"face":40.4},"STATIONS":{"start":-139,"cpu":-60,"stamp":4,"vault":101},"LID_TOP":29,"CAR":{"x":-15,"y":-19,"w":30,"d":38,"r":3},"CAR_Z":[3,9],"HEAD_DOWN":33,"DOOR":{"x":61,"y":-27,"w":4,"d":54,"r":1,"z":[2,54],"open":50},"T":{"leave":[0.6,2],"headDown":[2,2.4],"compute":[2.4,3.4],"headUp":[3.4,3.8],"toStamp":[3.9,4.9],"stampDown":[4.9,5.15],"stampUp":[5.15,5.6],"unlock":[5.4,5.75],"doorUp":[5.75,6.25],"toVault":[6.25,7.35],"doorDown":[7.35,7.85],"lock":[7.85,8.3],"archive":[8.9,9.6],"loop":10.4},"STAGES":[{"id":"transit","until":2,"text":"in transit · X25519 + ML-KEM-768"},{"id":"use","until":3.9,"text":"in use · processed while encrypted"},{"id":"ledger","until":5.75,"text":"on the ledger · encrypted per party"},{"id":"rest","until":11.4,"text":"at rest · AES-256 · keys in HSM"}],"WIDTH":760,"HEIGHT":430,"PLATES":5};
const K = { cylinder, solidSvg, lineSvg, pathOf, iso, depthOf, dotsSvg, slabOf };
for (const stage of document.querySelectorAll('[data-figure="data-vault"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const car = q('car'), marks = q('marks'), headEl = q('head'), needleEl = q('needle'), rod = q('rod');
  const stamp = q('stamp'), doorEl = q('door'), boltsEl = q('bolts'), dialEl = q('dial');
  const led = q('led'), hsmLed = q('hsm-led');
  const platesEl = q('plates');
  const plates = [...platesEl.querySelectorAll('[data-plate]')];
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const T = C.T, S = C.STATIONS;
  let last = {};
  const set = (key, value, apply) => { if (last[key] !== value) { last[key] = value; apply(value); } };

  function carX(t) {
    if (t < T.leave[0]) return S.start;
    if (t < T.leave[1]) return S.start + (S.cpu - S.start) * ease(span(t, T.leave));
    if (t < T.toStamp[0]) return S.cpu;
    if (t < T.toStamp[1]) return S.cpu + (S.stamp - S.cpu) * ease(span(t, T.toStamp));
    if (t < T.toVault[0]) return S.stamp;
    return S.stamp + (S.vault - S.stamp) * ease(span(t, T.toVault));
  }
  function headDz(t) {
    const travel = C.CPU.rest - C.HEAD_DOWN;
    if (t < T.headDown[0] || t > T.headUp[1]) return 0;
    if (t < T.headDown[1]) return -travel * ease(span(t, T.headDown));
    if (t < T.headUp[0]) return -travel;
    return -travel * (1 - ease(span(t, T.headUp)));
  }
  function footZ(t) {
    const travel = C.STAMP.rest - C.LID_TOP;
    if (t < T.stampDown[0] || t > T.stampUp[1]) return C.STAMP.rest;
    if (t < T.stampDown[1]) { const s = span(t, T.stampDown); return C.STAMP.rest - travel * s * s; }
    return C.STAMP.rest - travel * (1 - ease(span(t, T.stampUp)));
  }
  function doorDz(t) {
    if (t < T.doorUp[0] || t > T.doorDown[1]) return 0;
    if (t < T.doorUp[1]) return C.DOOR.open * ease(span(t, T.doorUp));
    if (t < T.doorDown[0]) return C.DOOR.open;
    return C.DOOR.open * (1 - ease(span(t, T.doorDown)));
  }
  function locked(t) {
    if (t < T.unlock[0]) return 1;
    if (t < T.unlock[1]) return 1 - ease(span(t, T.unlock));
    if (t < T.lock[0]) return 0;
    return ease(span(t, T.lock));
  }
  function place(el, point) {
    const [x, y] = iso(point, P);
    el.style.left = (x / C.WIDTH) * 100 + '%';
    el.style.top = (y / C.HEIGHT) * 100 + '%';
  }

  // Every part is touched only when its value changes (most of the loop,
  // most parts stand still), so an idle frame costs almost nothing.
  function draw(t) {
    const x = carX(t);
    set('car', x.toFixed(2), () => car.setAttribute('transform', translateAlong(P, [x, 0, 0])));
    set('marks', t >= T.stampDown[1], (on) => marks.setAttribute('opacity', on ? '1' : '0'));
    // Compute head comes down; the needle swings while it works.
    const dz = headDz(t);
    set('head', dz.toFixed(2), () => {
      headEl.setAttribute('transform', translateAlong(P, [0, 0, dz]));
      rod.innerHTML = headRod(K, P, C, dz);
    });
    const working = t >= T.compute[0] && t < T.compute[1];
    const swing = working ? Math.abs(Math.sin(((t - T.compute[0]) / (T.compute[1] - T.compute[0])) * Math.PI * 3)) : 0;
    set('needle', swing.toFixed(2), () => { needleEl.innerHTML = needle(K, P, C, -50 + 100 * swing); });
    // The stamp presses the keys onto the lid; a copy is filed.
    const fz = footZ(t);
    set('foot', fz.toFixed(2), () => { stamp.innerHTML = stampLive(K, P, C, fz, vcoil); });
    const filed = span(t, [T.stampDown[1] - 0.05, T.stampUp[1]]);
    const newest = plates[plates.length - 1];
    set('newest', t >= T.stampDown[1] - 0.05, (on) => newest.setAttribute('opacity', on ? '1' : '0'));
    set('filed', filed.toFixed(3), () => newest.setAttribute('transform', translateAlong(P, [0, 0, 18 * (1 - ease(filed))])));
    // Before the loop ends the stack sinks one record into the tray: the
    // oldest is archived and the stack looks as it did at the start.
    const sink = ease(span(t, T.archive));
    set('sink', sink.toFixed(3), () => platesEl.setAttribute('transform', translateAlong(P, [0, 0, -3 * sink])));
    // The vault opens, takes the box, closes and bolts.
    const door = doorDz(t);
    set('door', door.toFixed(2), () => doorEl.setAttribute('transform', translateAlong(P, [0, 0, door])));
    const lock = locked(t);
    set('lock', lock.toFixed(3), () => {
      boltsEl.innerHTML = bolts(K, P, C, lock);
      dialEl.innerHTML = dial(K, P, C, lock * Math.PI * 0.75);
      led.setAttribute('opacity', lock > 0.98 ? '1' : '0.15');
      hsmLed.setAttribute('opacity', lock > 0.98 ? '1' : '0.15');
    });
    // Labels: the current station is lit; the record's tag rides with it.
    const index = C.STAGES.findIndex((s) => t < s.until);
    const current = C.STAGES[index];
    set('stage', index, () => {
      for (const s of C.STAGES) {
        const on = s.id === current.id;
        pins[s.id]?.toggleAttribute('data-on', on);
        pins[s.id]?.toggleAttribute('data-dim', !on);
      }
      for (const step of steps) step.toggleAttribute('data-on', step.dataset.step === current.id);
      if (readout) readout.textContent = 'stage ' + (index + 1) + ' of 4 · ' + current.text;
    });
    if (pins.record) {
      set('recordPin', x.toFixed(1), () => place(pins.record, [x, C.CAR.y + C.CAR.d, C.CAR_Z[0]]));
      set('recordHidden', x < -104 || x > 58, (hidden) => pins.record.toggleAttribute('data-hidden', hidden));
    }
  }
  playFigure(stage, (t) => draw(t), {
    loop: T.loop,
    stillAt: T.stampDown[1] + 0.05,
    seek: { transit: 0.6, use: T.headDown[0], ledger: T.toStamp[0], rest: T.doorUp[0] },
  });
}
