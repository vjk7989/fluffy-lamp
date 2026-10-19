
function ringMarks(K, P, C, ring, phi) {
  // Cell dividers round the ring's side, the alignment mark beside the index
  // bar, and the tick scale on the ring's exposed top rim; all turn with phi.
  const { z0, z1 } = ring;
  const view = [Math.cos(Math.PI / 4), Math.sin(Math.PI / 4)];
  const side = [];
  const marks = [];
  for (let k = 0; k < 16; k++) {
    const a = phi + (k / 16) * Math.PI * 2;
    if (Math.cos(a) * view[0] + Math.sin(a) * view[1] < 0.2) continue;
    side.push(K.pathOf([K.iso([C.R * Math.cos(a), C.R * Math.sin(a), z0 + 2.4], P), K.iso([C.R * Math.cos(a), C.R * Math.sin(a), z1 - 2.4], P)]));
  }
  for (const d of [-0.07, 0.07]) {
    const a = phi + C.BAR + d;
    if (Math.cos(a) * view[0] + Math.sin(a) * view[1] < 0.05) continue;
    marks.push(K.pathOf([K.iso([C.R * Math.cos(a), C.R * Math.sin(a), z0 + 1.6], P), K.iso([C.R * Math.cos(a), C.R * Math.sin(a), z1 - 1.6], P)]));
  }
  const ticks = K.radialTicks(0, 0, C.R - 0.6, 32, 4, z1, [1.4, 2.8], P, phi);
  return K.lineSvg(side.join(''), { tone: 'faint' }) + K.lineSvg(ticks.minor, { tone: 'lo' }) + K.lineSvg(ticks.major, { tone: 'mid' }) + K.lineSvg(marks.join(''), { tone: 'hi' });
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
const P = {"origin":[280,295.83784852366534],"scale":1.9859814273846816,"azimuth":45,"elevation":30};
const C = {"R":40,"BAR":1.2566370614359172,"rings":[{"i":0,"z0":51,"z1":64},{"i":1,"z0":36,"z1":49},{"i":2,"z0":21,"z1":34},{"i":3,"z0":6,"z1":19}],"SCRAMBLE":[2.2689280275926285,-2.6179938779914944,3.5779249665883754,-2.007128639793479],"T":{"drop":[0.1,1.1],"lock":[[1.2,1.8],[1.9,2.5],[2.6,3.2],[3.3,3.9]],"key":[5.6,6],"unlock":[[6.9,7.4],[6.6,7.1],[6.3,6.8],[6,6.5]],"rise":[7.5,8.4],"loop":9.2},"LAYERS":["transit","use","ledger","rest"],"TEXT":["in transit · X25519 + ML-KEM-768","in use · processed sealed","on the ledger · per-party keys","at rest · AES-256-GCM"],"CORE":{"r":9,"z":[72,85]},"CHIP":{"w":12,"h":3,"top":109}};
const K = { pathOf, iso, lineSvg, radialTicks };
for (const stage of document.querySelectorAll('[data-figure="cipher-tower"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const chipEl = q('chip'), keyEl = q('key'), hsmLed = q('hsm-led');
  const marks = C.rings.map((r) => svg.querySelector('[data-marks="' + r.i + '"]'));
  const leds = C.rings.map((r) => svg.querySelector('[data-led="' + r.i + '"]'));
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const T = C.T;
  let last = [], lastState = '';

  function angle(i, t) {
    const locked = ease(span(t, T.lock[i]));
    const open = ease(span(t, T.unlock[i]));
    return C.SCRAMBLE[i] * locked * (1 - open);
  }
  function draw(t) {
    // The record drops in, and later rises out.
    const down = ease(span(t, T.drop));
    const up = ease(span(t, T.rise));
    const depth = (C.CHIP.top - C.CORE.z[1] + 2) * (down - up);
    chipEl.setAttribute('transform', translateAlong(P, [0, 0, -depth]));
    const inside = depth > C.CHIP.top - C.CORE.z[1] - 2;
    chipEl.setAttribute('opacity', inside ? '0' : '1');
    pins.data?.toggleAttribute('data-hidden', inside);
    // Each ring spins to its scrambled position, then back.
    C.rings.forEach((r, i) => {
      const phi = angle(i, t);
      if (last[i] !== phi.toFixed(3)) { last[i] = phi.toFixed(3); marks[i].innerHTML = ringMarks(K, P, C, r, phi); }
      const on = t >= T.lock[i][1] && t < T.unlock[i][0];
      leds[i].setAttribute('opacity', on ? '1' : '0.18');
    });
    const keyIn = ease(span(t, T.key)) * (1 - ease(span(t, T.rise)));
    keyEl.setAttribute('transform', translateAlong(P, [0, -3.5 * keyIn, 0]));
    hsmLed.setAttribute('opacity', keyIn > 0.9 ? '1' : '0.18');
    // Labels, steps and readout.
    let state, on = [];
    const locking = T.lock.findIndex(([a, b]) => t >= a && t < b + 0.15);
    if (t < T.lock[0][0]) { state = 'your data goes in'; on = ['data']; }
    else if (locking >= 0 && t < T.lock[3][1] + 0.15) { state = 'layer ' + (locking + 1) + ' of 4 · ' + C.TEXT[locking]; on = [C.LAYERS[locking]]; }
    else if (t < T.key[0]) { state = 'four layers locked'; on = C.LAYERS; }
    else if (t < T.rise[0]) { state = 'owner key from the HSM · unlocking'; on = ['hsm']; }
    else { state = 'record returned to its owner'; on = ['data']; }
    if (state !== lastState) {
      lastState = state;
      for (const [id, el] of Object.entries(pins)) { el.toggleAttribute('data-on', on.includes(id)); el.toggleAttribute('data-dim', !on.includes(id)); }
      for (const s of steps) s.toggleAttribute('data-on', on.includes(s.dataset.step));
      if (readout) readout.textContent = state;
    }
  }
  playFigure(stage, (t) => draw(t), {
    loop: T.loop,
    stillAt: 4.6,
    seek: { transit: T.lock[0][0], use: T.lock[1][0], ledger: T.lock[2][0], rest: T.lock[3][0] },
  });
}
