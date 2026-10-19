
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
function drawerSvg(K, P, C, r, c, o, locked) {
  const cx = C.COLX[c], b = 6 + 14 * r, t = b + 14, f = C.FACE, y1 = f + o;
  const S = (plan, z0, z1, style, steps = 2, bevel = 0.3) => K.solidSvg(K.slabOf(plan, z0, z1 - z0, P, steps, bevel), style);
  const seg = (a, bb) => K.pathOf([K.iso(a, P), K.iso(bb, P)]);
  const out = [];
  if (o > 0.4) {
    const wt = t - 2.5, ct = t - 3.5;
    out.push(S({ x: cx - 12, y: f, w: 1, d: o, r: 0.2 }, b + 2, wt, { tone: 'mid', crease: 'none' }, 2, 0));
    out.push(S({ x: cx - 11, y: f, w: 22, d: o, r: 0.2 }, b + 2, ct, { tone: 'mid', crease: 'none' }, 2, 0));
    const lines = [];
    const tabs = [];
    let i = 0;
    for (let yy = y1 - 1.4; yy > f + 0.6; yy -= 1.6, i++) {
      lines.push(seg([cx - 11, yy, ct], [cx + 11, yy, ct]));
      if (i % 4 === 1) tabs.push(S({ x: cx - 7 + (i % 8 === 1 ? 0 : 8), y: yy - 0.25, w: 5, d: 0.5, r: 0.2 }, ct, ct + 1.6, { tone: 'mid', crease: 'none' }, 2, 0));
    }
    out.push(K.lineSvg(lines.join(''), { tone: 'lo' }));
    out.push(tabs.join(''));
    out.push(S({ x: cx + 11, y: f, w: 1, d: o, r: 0.2 }, b + 2, wt, { tone: 'mid', crease: 'none' }, 2, 0));
  }
  const fy = y1 + 1;
  out.push(S({ x: cx - 13, y: y1, w: 26, d: 1, r: 0.6 }, b + 1.5, t - 1.5, { tone: 'mid' }, 2, 0.3));
  // Label holder with its card, and the pull.
  out.push(K.lineSvg(K.pathOf([[cx - 5, t - 6.2], [cx + 5, t - 6.2], [cx + 5, t - 3.4], [cx - 5, t - 3.4]].map(([x, z]) => K.iso([x, fy, z], P)), true), { tone: 'lo' }));
  out.push(K.lineSvg(seg([cx - 3.4, fy, t - 4.8], [cx + 2.4, fy, t - 4.8]), { tone: 'faint', free: true }));
  out.push(S({ x: cx - 4, y: fy, w: 8, d: 1.6, r: 0.7 }, b + 3.4, b + 5.2, { tone: 'mid', crease: 'none' }, 3, 0.2));
  out.push(K.dotsSvg([K.iso([cx - 5.4, fy, b + 4.3], P), K.iso([cx + 5.4, fy, b + 4.3], P)], { size: 0.45 }));
  if (locked) {
    out.push(S({ x: cx + 6.6, y: fy, w: 4.4, d: 0.5, r: 0.4 }, b + 3.6, b + 9.6, { tone: 'mid', crease: 'none' }, 2, 0.2));
    const kz = b + 7.4, kx = cx + 8.8, ky = fy + 0.5;
    const ring = [];
    for (let a = 0; a < 18; a++) { const w = (a / 18) * Math.PI * 2; ring.push(K.iso([kx + Math.cos(w), ky, kz + Math.sin(w)], P)); }
    out.push(K.lineSvg(K.pathOf(ring, true), { tone: 'hi' }));
    out.push(K.lineSvg(seg([kx, ky, kz - 1], [kx, ky, kz - 2.6]), { tone: 'hi', free: true }));
    out.push(K.dotsSvg([K.iso([kx, ky, b + 4.4], P), K.iso([kx, ky, b + 9], P)], { size: 0.35 }));
  }
  return out.join('');
}
function cardSvg(K, P, C, cx, row, lift) {
  if (lift <= 0.05) return '';
  const y0 = C.CARD_Y - 0.3, z0 = 6 + 14 * row + 0.5 + lift, fy = y0 + 0.6;
  const rules = [[7.6, 7], [6.2, 5], [4.8, 6.5], [3.4, 2]].map(([dz, len]) => K.pathOf([K.iso([cx - 7, fy, z0 + dz], P), K.iso([cx - 7 + len * 1.6, fy, z0 + dz], P)]));
  return K.solidSvg(K.slabOf({ x: cx - 9, y: y0, w: 18, d: 0.6, r: 0.2 }, z0, 10, P, 2, 0), { tone: 'hi', crease: 'lo' }) + K.lineSvg(rules.join(''), { tone: 'lo', free: true });
}
function rodSvg(K, P, C, cx, hb) {
  const z0 = hb + C.HEAD.collar;
  const h = C.HOUSING_Z[0] - z0;
  if (h < 0.2) return '';
  return K.solidSvg(K.cylinder(cx, C.ARM_Y, 1.8, z0, h, P, 18), { tone: 'mid', crease: 'none' });
}
function paperSvg(K, P, C, n) {
  const { x, y } = C.PAPER;
  const top = C.READER.z[1];
  const low = top - 4 - n * 3;
  const tx = C.ROLL.x + C.ROLL.r;
  const pts = (list) => K.pathOf(list.map((p) => K.iso(p, P)), true);
  const teeth = [];
  for (let i = 0; i <= 8; i++) teeth.push([x, y[1] - (i / 8) * (y[1] - y[0]), low - (i % 2 ? 0.7 : 0)]);
  const lip = pts([[tx, y[0], C.ROLL.z], [tx, y[1], C.ROLL.z], [x, y[1], top], [x, y[0], top]]);
  const hang = pts([[x, y[0], top], [x, y[1], top], ...teeth]);
  const rules = [];
  for (let i = 0; i < n; i++) {
    const z = top - 3 - i * 3;
    rules.push(K.pathOf([K.iso([x, y[0] + 1.2, z], P), K.iso([x, y[0] + (i % 3 === 1 ? 4.6 : 6.4), z], P)]));
  }
  return `<path class="iso-fill" d="${lip}${hang}"/><path class="iso-line iso-edge" data-tone="mid" d="${lip}${hang}"/>` + K.lineSvg(rules.join(''), { tone: 'lo', free: true });
}
const P = {"origin":[391.2030183626152,295.58833007836006],"scale":1.7875400286773873,"azimuth":56,"elevation":30};
const C = {"COLX":[-65,-35,-5,25],"FACE":10,"ARM_Y":18,"CARD_Y":22,"HEAD":{"body":[6,12],"collar":13.5},"HOUSING_Z":[80,88],"PAPER":{"y":[-9,-1],"x":68.15},"READER":{"x":52,"y":-16,"w":16,"d":22,"r":1.5,"z":[2,34]},"ROLL":{"x":64,"z":37.6,"r":3.4,"y":[-12.5,2.5]},"REQUESTS":[{"id":87,"col":0,"row":1,"ok":true},{"id":88,"col":2,"row":0,"ok":true},{"id":89,"col":1,"row":3,"ok":false},{"id":90,"col":3,"row":1,"ok":true}],"D":4.4,"T":{"move":[0,1],"badgeIn":[1,1.4],"decide":1.9,"badgeOut":[2.15,2.55],"open":[2,2.5],"lift":[2.5,2.95],"sink":[3.35,3.75],"close":[3.75,4.2],"tug":[2,2.7],"retract":[2.7,3.6],"lampOff":3.5},"HB_MAX":66,"OUT":14,"LIFT":12,"BADGE":{"y":[-9,1],"h":14,"rest":28,"down":22},"WIDTH":760,"HEIGHT":440};
const K = { slabOf, solidSvg, lineSvg, dotsSvg, pathOf, iso, cylinder };
for (const stage of document.querySelectorAll('[data-figure="brain-cabinet"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const bridgeEl = q('bridge'), rodEl = q('rod'), backEl = q('head-back'), frontEl = q('head-front');
  const cardEl = q('card'), clipEl = q('card-clip'), badgeEl = q('badge'), paperEl = q('paper'), lamp = q('lamp');
  const drawersEl = q('drawers');
  const drawers = Object.fromEntries([...svg.querySelectorAll('[data-drawer]')].map((el) => [el.dataset.drawer, el]));
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const T = C.T, N = C.REQUESTS.length;
  const hbOf = (row) => 6 + 14 * row + 14 + 0.5;
  const endHb = (r) => (r.ok ? hbOf(r.row) : C.HB_MAX);
  let last = {};
  const set = (key, value, apply) => { if (last[key] !== value) { last[key] = value; apply(value); } };
  function place(el, point) {
    const [x, y] = iso(point, P);
    el.style.left = (x / C.WIDTH) * 100 + '%';
    el.style.top = (y / C.HEIGHT) * 100 + '%';
  }

  function draw(t) {
    const i = Math.min(N - 1, Math.floor(t / C.D));
    const u = t - i * C.D;
    const req = C.REQUESTS[i], prev = C.REQUESTS[(i + N - 1) % N];
    const m = ease(span(u, T.move));
    const x = C.COLX[prev.col] + (C.COLX[req.col] - C.COLX[prev.col]) * m;
    let hb = endHb(prev) + (hbOf(req.row) - endHb(prev)) * m;
    if (!req.ok) hb += (C.HB_MAX - hbOf(req.row)) * ease(span(u, T.retract));
    const decided = u >= T.decide;
    // Gantry and arm.
    set('x', x.toFixed(2), () => bridgeEl.setAttribute('transform', translateAlong(P, [x, 0, 0])));
    set('head', x.toFixed(2) + ',' + hb.toFixed(2), () => {
      const tr = translateAlong(P, [x, 0, hb]);
      backEl.setAttribute('transform', tr);
      frontEl.setAttribute('transform', tr);
      rodEl.innerHTML = rodSvg(K, P, C, x, hb);
      if (pins.agent) place(pins.agent, [x - 4.2, C.ARM_Y, 84]);
      if (pins.tray) place(pins.tray, [x - 11.4, C.CARD_Y, hb + 3]);
    });
    // The badge goes down into the reader, then comes back up.
    const bz = C.BADGE.rest - (C.BADGE.rest - C.BADGE.down) * (ease(span(u, T.badgeIn)) - ease(span(u, T.badgeOut)));
    set('badge', bz.toFixed(2), () => badgeEl.setAttribute('transform', translateAlong(P, [0, 0, bz])));
    // The reader lamp, and the ledger line printed at each decision.
    const lampState = decided && u < T.lampOff ? (req.ok ? 'ok' : 'bad') : '';
    set('lamp', lampState, (s) => { lamp.dataset.state = s; lamp.setAttribute('opacity', s ? '1' : '0.25'); });
    const lines = 3 + i + (decided ? 1 : 0);
    set('paper', lines, (n) => { paperEl.innerHTML = paperSvg(K, P, C, n); });
    // The drawer: open and lift a card, or hold its lock.
    const key = req.row + '-' + req.col;
    set('active', key, () => {
      if (drawers[key] && drawers[key].parentNode === drawersEl) drawersEl.appendChild(drawers[key]);
      const yc = C.CARD_Y, wt = 6 + 14 * req.row + 14 - 2.5, cx = C.COLX[req.col];
      const a = iso([cx - 16, yc, wt], P), b = iso([cx + 16, yc, wt], P);
      clipEl.setAttribute('d', 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' 0L' + a[0].toFixed(1) + ' 0Z');
    });
    let o = 0, lift = 0;
    if (req.ok) {
      o = C.OUT * (ease(span(u, T.open)) - ease(span(u, T.close)));
      lift = C.LIFT * (ease(span(u, T.lift)) - ease(span(u, T.sink)));
    } else {
      const s = span(u, T.tug);
      o = 0.9 * Math.abs(Math.sin(s * Math.PI * 2));
    }
    for (const [dk, el] of Object.entries(drawers)) {
      const r = +dk[0];
      if (r >= 2) {
        const ox = dk === key ? o : 0;
        set('d' + dk, ox.toFixed(2), () => el.setAttribute('transform', translateAlong(P, [0, ox, 0])));
        const bad = dk === key && decided && u < T.lampOff;
        set('bad' + dk, bad, (v) => el.classList.toggle('fig-bad', v));
      } else {
        const ox = dk === key ? o : 0;
        set('d' + dk, ox.toFixed(2), () => { el.innerHTML = drawerSvg(K, P, C, r, +dk[2], ox, false); });
      }
    }
    set('card', lift.toFixed(2), () => { cardEl.innerHTML = cardSvg(K, P, C, C.COLX[req.col], req.row, lift); });
    // Labels, step cards and the readout.
    const phase = u < T.move[1] ? 'ask' : !decided ? 'check' : req.ok ? 'allow' : 'deny';
    set('phase', i + phase + (u >= T.decide && u < T.open[1]), () => {
      const on = u >= T.decide && u < T.open[1] ? ['ledger'] : { ask: ['agent'], check: ['reader'], allow: ['open', 'tray'], deny: ['locked'] }[phase];
      for (const [id, el] of Object.entries(pins)) { el.toggleAttribute('data-on', on.includes(id)); el.toggleAttribute('data-dim', !on.includes(id)); }
      for (const s of steps) s.toggleAttribute('data-on', s.dataset.step === phase);
      const what = { ask: 'asking', check: 'checking badge', allow: 'allowed', deny: 'blocked' }[phase];
      if (readout) readout.textContent = 'query #' + req.id + ' · analyst · ' + what;
    });
  }
  playFigure(stage, (t) => draw(t), {
    loop: C.D * N,
    stillAt: T.lift[1] + 0.1,
    seek: { ask: 0, check: T.badgeIn[0], allow: T.decide, deny: 2 * C.D + T.badgeIn[0] },
  });
}
