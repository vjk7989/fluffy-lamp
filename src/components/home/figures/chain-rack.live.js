
function packetSvg(K, P) {
  return K.solidSvg(K.slabOf({ x: -2.6, y: -2.6, w: 5.2, d: 5.2, r: 0.8 }, 0, 5, P, 2, 0.3), { tone: 'hi', crease: 'lo' });
}
function blockSvg(K, P, n) {
  const len = 4 + n * 4.6;
  const plan = { x: 0, y: -8, w: len, d: 16, r: 1.5 };
  const rings = [];
  for (let i = 0; i < n; i++) rings.push(K.ring(4.3 + i * 4.6, 0, 1.3, 8, P, 12));
  return K.solidSvg(K.slabOf(plan, 0, 8, P, 3, 0.5), { tone: 'hi', crease: 'lo' }) + K.lineSvg(K.planOutline(K.insetPlan(plan, 1.8), 8, P, 3), { tone: 'faint' }) + K.lineSvg(rings.join(''), { tone: 'mid' });
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
const P = {"origin":[383.6835862601172,223.07884133244823],"scale":1.4953762317831591,"azimuth":56,"elevation":30};
const C = {"CUBE":5.6,"MODS":[{"id":"bank","x":-162,"w":36,"h":56,"period":1.5,"offset":0.2},{"id":"fintech","x":-114,"w":30,"h":40,"period":1.15,"offset":0.7},{"id":"ai","x":-72,"w":34,"h":54,"period":1.8,"offset":1.1},{"id":"asset","x":-24,"w":30,"h":38,"period":2.2,"offset":0.4},{"id":"new","x":12,"w":32,"h":48,"period":1.3,"offset":0.1}],"MOD_Y":{"y":-27,"d":22},"SOCKET_Z":3,"LIFT":34,"BUS":{"x":-168,"y":10,"w":226,"d":12},"LANE_Z":4,"TRAY_X":58,"CHAIN_X":94,"CHAIN_END":168,"FIRST_BLOCK":48213,"LOOP":16,"PHASES":[{"until":4,"step":"l1","pins":["l1"]},{"until":8,"step":"l2","pins":["bank","fintech","ai","asset"]},{"until":12.5,"step":"new","pins":["new"]},{"until":16,"step":"blocks","pins":["blocks","ai"]}],"NEW":{"down":[8,9.2],"up":[14.4,15.4]},"BURST":[12.4,14],"WIDTH":760,"HEIGHT":400};
const K = { slabOf, solidSvg, lineSvg, planOutline, insetPlan, ring };
for (const stage of document.querySelectorAll('[data-figure="chain-rack"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const packetsEl = q('packets'), chainEl = q('chain'), count = q('count'), seal = q('seal');
  const cubes = [...q('tray').querySelectorAll('[data-cube]')];
  const newMod = svg.querySelector('[data-module="new"]');
  const leds = Object.fromEntries([...svg.querySelectorAll('[data-led]')].map((el) => [el.dataset.led, el]));
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const packetMarkup = packetSvg(K, P);
  const SEAL = 2.6, SPEED = 78, DROP = 0.4, GAP = 5;
  const mods = C.MODS.map((m) => ({ ...m, cx: m.x + m.w / 2, next: m.offset, blink: -1 }));
  let clock = 0, lastSeal = 0, tray = 0, height = C.FIRST_BLOCK, lastSize = 0;
  let packets = [], chain = [], phase = '';

  function newState(t) {
    if (t < C.NEW.down[0] || t >= C.NEW.up[1]) return { lift: 1, seated: false };
    if (t < C.NEW.down[1]) return { lift: 1 - ease(span(t, C.NEW.down)), seated: false };
    if (t < C.NEW.up[0]) return { lift: 0, seated: true };
    return { lift: ease(span(t, C.NEW.up)), seated: false };
  }
  function emit(m) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    el.innerHTML = packetMarkup;
    packetsEl.appendChild(el);
    packets.push({ el, m, t0: clock });
    m.blink = clock;
  }
  function sealBlock() {
    if (!tray) return;
    const n = tray;
    tray = 0;
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    el.innerHTML = blockSvg(K, P, n);
    chainEl.insertBefore(el, chainEl.firstChild);
    chain.unshift({ el, n, len: 4 + n * 4.6, x: C.TRAY_X, op: 1 });
    chain.forEach((b) => b.el.querySelector('.iso-solid')?.toggleAttribute('data-lit', b === chain[0]));
    height++;
    lastSize = n;
    const label = String(height).slice(-4);
    const text = count.querySelector('text');
    if (text) text.textContent = label;
    seal.setAttribute('opacity', '1');
    setTimeout(() => seal.setAttribute('opacity', '0.2'), 260);
  }
  function step(dt) {
    clock += dt;
    const t = clock % C.LOOP;
    // The new L2 drops in, runs, and lifts out again.
    const ns = newState(t);
    newMod.setAttribute('transform', translateAlong(P, [0, 0, C.LIFT * ns.lift]));
    newMod.setAttribute('opacity', String(clamp(1.6 - ns.lift * 1.6, 0, 1).toFixed(2)));
    const burst = t >= C.BURST[0] && t < C.BURST[1];
    for (const m of mods) {
      const live = m.id !== 'new' || ns.seated;
      if (!live) { m.next = clock + 0.4; continue; }
      if (clock >= m.next) {
        emit(m);
        const rate = burst && (m.id === 'ai' || m.id === 'bank') ? 0.3 : 1;
        m.next = clock + m.period * rate * (0.85 + ((m.next * 7.31) % 0.3));
      }
      leds[m.id]?.setAttribute('opacity', clock - m.blink < 0.22 ? '1' : '0.2');
    }
    // Packets: down the feeder, then along the bus into the tray.
    packets = packets.filter((p) => {
      const age = clock - p.t0;
      let x = p.m.cx, y;
      if (age < DROP) y = C.MOD_Y.y + C.MOD_Y.d + 2 + (16 - (C.MOD_Y.y + C.MOD_Y.d + 2)) * ease(age / DROP);
      else { y = 16; x = p.m.cx + (age - DROP) * SPEED; }
      if (x >= C.TRAY_X + 4 + Math.min(tray, 5) * C.CUBE) { p.el.remove(); tray = Math.min(tray + 1, 6); return false; }
      p.el.setAttribute('transform', translateAlong(P, [x, y, C.LANE_Z]));
      return true;
    });
    cubes.forEach((c, i) => c.setAttribute('opacity', i < tray ? '1' : '0'));
    if (clock - lastSeal >= SEAL) { lastSeal = clock; sealBlock(); }
    // Blocks follow their place in the chain; the oldest fade off the end.
    let target = C.CHAIN_X;
    const follow = 1 - Math.exp(-dt * 5);
    chain = chain.filter((b) => {
      b.x += (target - b.x) * follow;
      target += b.len + GAP;
      const over = b.x + b.len - C.CHAIN_END;
      b.op = clamp(1 - over / 10, 0, 1);
      if (b.op <= 0) { b.el.remove(); return false; }
      b.el.setAttribute('transform', translateAlong(P, [b.x, 16, C.LANE_Z]));
      b.el.setAttribute('opacity', b.op.toFixed(2));
      return true;
    });
    // Labels and steps follow the loop's phases.
    // In the L2 phase the modules light one at a time, so each note reads.
    const index = Math.max(0, C.PHASES.findIndex((p) => t < p.until));
    const on = C.PHASES[index];
    let lit = on.pins;
    if (on.step === 'l2') lit = [on.pins[Math.min(on.pins.length - 1, Math.floor(t - C.PHASES[index - 1].until))]];
    const key = index + ':' + lit.join();
    if (key !== phase) {
      phase = key;
      for (const [id, el] of Object.entries(pins)) {
        el.toggleAttribute('data-on', lit.includes(id));
        el.toggleAttribute('data-dim', !lit.includes(id));
      }
      for (const s of steps) s.toggleAttribute('data-on', s.dataset.step === on.step);
    }
    pins.new?.toggleAttribute('data-hidden', ns.lift > 0.5);
    const liveCount = 4 + (ns.seated ? 1 : 0);
    const msg = 'block #' + height.toLocaleString('en-US') + ' · ' + (lastSize || '-') + ' tx · ' + liveCount + ' L2s live';
    if (readout && readout.textContent !== msg) readout.textContent = msg;
  }
  if (still.matches) {
    // One still frame: every L2 seated and a chain of blocks of mixed sizes.
    clock = 10;
    newMod.setAttribute('transform', '');
    newMod.setAttribute('opacity', '1');
    for (const n of [2, 4, 3]) { tray = n; sealBlock(); }
    let x = C.CHAIN_X;
    for (const b of chain) { b.x = x; x += b.len + GAP; b.el.setAttribute('transform', translateAlong(P, [b.x, 16, C.LANE_Z])); }
    if (readout) readout.textContent = 'block #' + height.toLocaleString('en-US') + ' · 3 tx · 5 L2s live';
    continue;
  }
  // Steps and pins jump the loop to their phase.
  const SEEK = { l1: 0, l2: C.PHASES[0].until, new: C.PHASES[1].until, blocks: C.PHASES[2].until };
  playFigure(stage, (t, dt) => step(dt), {
    onSeek: (id) => {
      if (SEEK[id] == null) return;
      const t = clock % C.LOOP;
      clock += ((SEEK[id] - t) + C.LOOP) % C.LOOP;
      lastSeal = clock;
      mods.forEach((m) => { m.next = clock + m.offset; });
      step(0);
    },
  });
}
