// Fig 1: how Pavii checks every agent call (Anatomy kit, MIT; see ./kit/LICENSE).
//
// A mail-sorting machine on a bench. AI agent calls arrive as envelopes from
// an inbound chute and ride a short belt under a scanner bridge. The bridge
// carries a reading head and a row of six lamps, one per gate: injection,
// privacy, supply chain, budget, egress, output. A safe call lights every
// lamp; the diverter flap stays level and the call slides into the delivery
// tray. A harmful call trips one lamp red; the flap drops and the call goes
// into the shredder, whose cutter rollers turn and drop strips past the
// window. Every decision prints one line on the receipt tape: the receipt
// Pavii records on Hyper 0X.
//
// Run: node call-sorter.mjs (from scripts/figures)
import { k, tools, basePlate, pinsHtml, stepsHtml, playFigure, writeFigure } from './lib.mjs';

const WIDTH = 760;
const HEIGHT = 430;

const PLATE = { x: -180, y: -54, w: 338, d: 108, r: 8 };
const BELT = { x0: -100, x1: 40, r: 3, zc: 19, y: 11 };
const BELT_TOP = BELT.zc + BELT.r;
const RAIL = { z: [13.5, 19.5], y: [11, 13] };
const LEGS = [-90, -2, 32];
const CHUTE = { x0: -156, z0: 46, x1: -101, z1: 24.4, y: 12, wall: 5 };
const FEEDER = { x: -174, y: -16, w: 18, d: 32, z: [32, 58] };
const SCAN = { x: -30, tower: { x: -40, w: 20, d: 6, y: 24 }, hood: [44, 53], head: { x: -36, w: 12, y: 11, z: [33, 44] } };
const LAMP_Y = [20, 12, 4, -4, -12, -20];
const GATE_NAMES = ['injection', 'privacy', 'supply chain', 'budget', 'egress', 'output'];
const HINGE = { x: 45, z: BELT_TOP, len: 22, tilt: 40 };
const HOUSING = { x: 48, y: -16, w: 34, d: 38, h: 19, wall: 4, floor: 2 };
const ROLLERS = { xs: [62.6, 68.1], z: 5, r: 2.6, y0: -11, y: 16.5 };
const WINDOW = { x0: 53, x1: 69, z0: 3.6, z1: 14.4, depth: 1.2 };
const TRAY = { x: 82, y: -14, w: 32, d: 28, floor: 17, top: 22, back: 20.4 };
const PRINTER = { x: 120, y: 20, w: 28, d: 18, h: 14 };
const TAPE = { x: 126, w: 16, y: 28, pitch: 2.4, max: 8 };
const ENV = { len: 14, half: 8, t: 1.4 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [SCAN.x, -31, SCAN.hood[1] + 4],
    [SCAN.x, 31, SCAN.hood[1] + 4],
    [FEEDER.x, -FEEDER.d / 2, FEEDER.z[1] + 3],
    [FEEDER.x, FEEDER.d / 2, FEEDER.z[1] + 3],
    [TAPE.x + TAPE.w, TAPE.y, PRINTER.h + 26],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 56 },
);

const { at, S, L, D, byDepth, col, box, path, faceCircle } = tools(P);

// ---- live builders (pure; embedded with toString()) ----------------------

// A convex prism along y: a section in the x-z plane swept from y0 to y1.
// Same paths as the kit's extrude (fill, shades, top, crease, outline), so
// solidSvg draws it: the near end cap and up-facing faces take the top tone,
// side faces are shaded by facing, and the outline is the true silhouette.
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

// An envelope in a local frame: u runs along its travel, w up from what it
// lies on; the frame is tilted by `tilt` degrees (the +u end down). [u0, u1]
// is the part that shows (cut at the inbound slot or at the cutter nip).
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

// The diverter flap, hinged on its axle at the end of the belt.
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

// Cutter teeth on the near end caps of the two rollers, turned by `turn`.
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

// The receipt tape standing out of the printer slot; n lines (may be
// fractional while it feeds). marks[i] is true for a blocked call.
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

const C = { ENV, HINGE, ROLLERS, TAPE, PRINTER };

// ---- static parts ---------------------------------------------------------

const chuteZ = (x) => CHUTE.z0 + ((x - CHUTE.x0) / (CHUTE.x1 - CHUTE.x0)) * (CHUTE.z1 - CHUTE.z0);
const CHUTE_TILT = (Math.atan2(CHUTE.z0 - CHUTE.z1, CHUTE.x1 - CHUTE.x0) * 180) / Math.PI;
const CHUTE_LEN = Math.hypot(CHUTE.x1 - CHUTE.x0, CHUTE.z0 - CHUTE.z1);

function feeder() {
  const { x, y, w, d, z } = FEEDER;
  const plan = { x, y, w, d, r: 2 };
  const face = x + w;
  const out = [];
  for (const py of [y + 4, y + d - 4]) out.push(col(x + 5, py, 4.2, 0, 1.6, { tone: 'mid' }), col(x + 5, py, 2, 1.6, z[0], { tone: 'mid', crease: 'none' }, 14));
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, z[0], 1, P)}" style="filter:blur(3px)"/>`);
  out.push(box(plan, z[0], z[1], { tone: 'mid' }, 3, 0.6));
  out.push(L(k.sideSeam(plan, z[0] + 4, P, 3), { tone: 'lo' }));
  // Intake rim on top: calls come in from the agents above.
  const rim = { x: x - 1, y: y - 1, w: w + 2, d: d + 2, r: 2.6 };
  out.push(box(rim, z[1], z[1] + 2.4, { tone: 'mid' }, 3, 0.4));
  out.push(S(k.slabOf(k.insetPlan(rim, 3), z[1] + 2.4, 0.01, P, 3), { tone: 'lo', crease: 'none', flat: true }));
  out.push(L(k.planOutline(k.insetPlan(rim, 3), z[1] + 2.4, P, 3), { tone: 'lo' }));
  // Slot on the +x face where envelopes come out, with a lip under it.
  const sz = CHUTE.z0;
  out.push(L(path([[face, -10, sz + 0.2], [face, 10, sz + 0.2], [face, 10, sz + 3.2], [face, -10, sz + 3.2]], true), { tone: 'mid' }));
  out.push(`<path class="iso-shade" data-shade="0" d="${path([[face, -9.6, sz + 0.5], [face, 9.6, sz + 0.5], [face, 9.6, sz + 2.9], [face, -9.6, sz + 2.9]], true)}"/>`);
  // Label rules and screws on the near face.
  const ny = y + d;
  out.push(D([[x + 3, z[1] - 3], [x + w - 3, z[1] - 3], [x + 3, z[0] + 7], [x + w - 3, z[0] + 7]].map(([px, pz]) => at([px, ny, pz])), { size: 0.42 }));
  [z[1] - 8, z[1] - 10.5].forEach((pz, i) => out.push(L(path([[x + 4, ny, pz], [x + (i ? 10 : 14), ny, pz]]), { tone: 'faint', free: true })));
  out.push(L(faceCircle([x + w - 5, ny, z[0] + 12], 1.8, 'y', 16), { tone: 'lo' }));
  return out.join('');
}

function chuteLegs() {
  const out = [];
  for (const x of [-134, -112]) {
    const top = chuteZ(x) - 1.6;
    for (const y of byDepth([[x, -9], [x, 9]])) out.push(col(x, y[1], 3.6, 0, 1.4, { tone: 'mid' }), col(x, y[1], 1.5, 1.4, top, { tone: 'mid', crease: 'none' }, 12));
  }
  return out.join('');
}

function chuteFloor() {
  const sec = [[CHUTE.x0, CHUTE.z0], [CHUTE.x1, CHUTE.z1], [CHUTE.x1, CHUTE.z1 - 1.6], [CHUTE.x0, CHUTE.z0 - 1.6]];
  const out = [S(prismY(k, P, sec, -CHUTE.y, CHUTE.y), { tone: 'mid' })];
  // Two glide strips the envelopes slide on.
  for (const y of [-5, 5]) out.push(L(path([[CHUTE.x0 + 3, y, chuteZ(CHUTE.x0 + 3)], [CHUTE.x1 - 3, y, chuteZ(CHUTE.x1 - 3)]]), { tone: 'faint', free: true }));
  return out.join('');
}

function chuteWall(y0, y1) {
  const h = CHUTE.wall;
  const x1 = CHUTE.x1 + 2;
  const sec = [[CHUTE.x0, CHUTE.z0 - 1.6], [x1, chuteZ(x1) - 1.6], [x1, chuteZ(x1) + h - 1], [CHUTE.x0, CHUTE.z0 + h]];
  const out = [S(prismY(k, P, sec, y0, y1), { tone: 'mid' })];
  if (y1 > 0) {
    // Rivets along the near wall.
    out.push(D([-146, -130, -114].map((x) => at([x, y1, chuteZ(x) + 1.6])), { size: 0.4 }));
  }
  return out.join('');
}

function beltFrame(near) {
  const out = [];
  const y0 = near ? RAIL.y[0] : -RAIL.y[1];
  const legY = near ? 12 : -12;
  for (const x of LEGS) {
    out.push(box({ x: x - 3, y: legY - 2.5, w: 6, d: 5, r: 0.8 }, 0, 1.2, { tone: 'mid' }, 2, 0.3));
    out.push(box({ x: x - 1.6, y: legY - 1.6, w: 3.2, d: 3.2, r: 0.6 }, 1.2, RAIL.z[0], { tone: 'mid', crease: 'none' }, 2, 0.2));
  }
  const rail = { x: BELT.x0 - 4, y: y0, w: BELT.x1 - BELT.x0 + 8, d: 2, r: 0.6 };
  out.push(box(rail, RAIL.z[0], RAIL.z[1], { tone: 'mid' }, 2, 0.3));
  if (near) {
    const face = RAIL.y[1];
    out.push(L(path([[rail.x + 0.5, face, RAIL.z[0] + 2], [rail.x + rail.w - 0.5, face, RAIL.z[0] + 2]]), { tone: 'lo' }));
    for (const x of [BELT.x0, BELT.x1]) {
      out.push(L(faceCircle([x, face, BELT.zc], 1.7, 'y', 16), { tone: 'mid' }));
      out.push(D([at([x, face, BELT.zc])], { size: 0.55, tone: 'hi' }));
    }
    out.push(D([-76, -48, -14, 10, 26].map((x) => at([x, face, RAIL.z[0] + 4.2])), { size: 0.38 }));
  }
  return out.join('');
}

function belt() {
  // The belt loop: a stadium section round the two drums.
  const sec = [];
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; sec.push([BELT.x1 + BELT.r * Math.cos(a), BELT.zc + BELT.r * Math.sin(a)]); }
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI; sec.push([BELT.x0 + BELT.r * Math.cos(a), BELT.zc + BELT.r * Math.sin(a)]); }
  const out = [S(prismY(k, P, sec, -BELT.y, BELT.y, true), { tone: 'mid', crease: 'none' })];
  for (const y of [-6, 6]) out.push(L(k.lineOnTop([BELT.x0 + 6, y], [BELT.x1 - 6, y], BELT_TOP, P), { tone: 'lo', flow: true, free: true }));
  return out.join('');
}

function tower(y) {
  const T = SCAN.tower;
  const plan = { x: T.x, y, w: T.w, d: T.d, r: 1.2 };
  const out = [box({ x: T.x - 2, y: y - 2, w: T.w + 4, d: T.d + 4, r: 1.6 }, 0, 2, { tone: 'mid' }, 3, 0.4)];
  out.push(box(plan, 2, SCAN.hood[0], { tone: 'mid' }, 3, 0.4));
  if (y > 0) {
    const face = y + T.d;
    // Vent slots and a status window on the near tower.
    for (let i = 0; i < 4; i++) {
      const x = T.x + 4 + i * 3.4;
      out.push(L(path([[x, face, 8], [x + 1.6, face, 8], [x + 1.6, face, 20], [x, face, 20]], true), { tone: 'lo' }));
    }
    out.push(L(k.sideSeam(plan, 26, P, 3), { tone: 'lo' }));
    out.push(D([[T.x + 3, 4], [T.x + T.w - 3, 4], [T.x + 3, 40], [T.x + T.w - 3, 40]].map(([x, z]) => at([x, face, z])), { size: 0.4 }));
    out.push(L(faceCircle([T.x + T.w - 5, face, 32], 2.4, 'y', 18), { tone: 'mid' }));
    out.push(L(path([[T.x + T.w - 5, face, 32], [T.x + T.w - 5, face, 34.2]]), { tone: 'hi', free: true }));
  }
  return out.join('');
}

function head() {
  const H = SCAN.head;
  const plan = { x: H.x, y: -H.y, w: H.w, d: H.y * 2, r: 1.4 };
  const out = [box(plan, H.z[0], H.z[1], { tone: 'mid' }, 3, 0.4)];
  out.push(L(k.sideSeam(plan, H.z[0] + 3, P, 3), { tone: 'lo' }));
  // Reading window on the near end and the head's lens bar under it.
  const face = H.y;
  out.push(box({ x: H.x + 2, y: face, w: H.w - 4, d: 0.6, r: 0.3 }, H.z[0] + 4.5, H.z[0] + 8, { tone: 'lo', crease: 'none' }, 2, 0.2));
  out.push(D([at([H.x + H.w - 2.2, face, H.z[1] - 2.6])], { size: 0.55, tone: 'hi' }));
  return out.join('');
}

function hood() {
  const plan = { x: SCAN.tower.x - 2, y: -31, w: SCAN.tower.w + 4, d: 62, r: 2.4 };
  const [z0, z1] = SCAN.hood;
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, z0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(box(plan, z0, z1, { tone: 'mid' }, 4, 0.8));
  out.push(L(k.sideSeam(plan, z0 + 3, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), z1, P, 4), { tone: 'faint' }));
  out.push(D(k.corners(plan, 5).map(([x, y]) => at([x, y, z1])), { size: 0.45 }));
  // Lamp strip down the middle of the roof.
  const strip = { x: SCAN.x - 4, y: -24, w: 8, d: 48, r: 1.6 };
  out.push(S(k.slabOf(strip, z1, 0.6, P, 3, 0.2), { tone: 'lo', crease: 'none' }));
  // Near face: a plate with rule lines.
  const face = plan.y + plan.d;
  out.push(box({ x: plan.x + 4, y: face, w: plan.w - 8, d: 0.6, r: 0.3 }, z0 + 2, z1 - 2, { tone: 'mid', crease: 'none' }, 2, 0.2));
  [z1 - 3.6, z1 - 5.6].forEach((z, i) => out.push(L(path([[plan.x + 6, face + 0.6, z], [plan.x + (i ? 13 : 18), face + 0.6, z]]), { tone: 'faint', free: true })));
  return out.join('');
}

function lamps() {
  const z = SCAN.hood[1] + 0.6;
  const out = [];
  LAMP_Y.forEach((y, i) => {
    out.push(col(SCAN.x, y, 2.7, z, z + 1, { tone: 'mid' }, 24));
    out.push(col(SCAN.x, y, 2, z + 1, z + 2.4, { tone: 'hi', crease: 'lo' }, 24));
    const [lx, ly] = at([SCAN.x, y, z + 2.4]);
    out.push(`<circle class="fig-led" data-gate="${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.1" opacity="0.25"/>`);
  });
  return out.join('');
}

// The scan beam: two light lines from the head's lens to the belt.
function beamSvg() {
  const H = SCAN.head;
  return `<g data-part="beam" opacity="0" style="--anatomy-hi:var(--fig-accent,#7c3aed)">${L(path([[SCAN.x, -8, H.z[0]], [SCAN.x, -8, BELT_TOP]]) + path([[SCAN.x, 8, H.z[0]], [SCAN.x, 8, BELT_TOP]]) + path([[SCAN.x, -8, BELT_TOP], [SCAN.x, 8, BELT_TOP]]), { tone: 'hi' })}</g>`;
}

function hingeBack() {
  return [
    box({ x: HINGE.x - 3, y: -14, w: 6, d: 3, r: 0.6 }, RAIL.z[0], HINGE.z + 0.6, { tone: 'mid' }, 2, 0.3),
    S(prismY(k, P, Array.from({ length: 16 }, (_, i) => [HINGE.x + 1.3 * Math.cos((i / 16) * Math.PI * 2), HINGE.z - 0.6 + 1.3 * Math.sin((i / 16) * Math.PI * 2)]), -11, 11, true), { tone: 'mid', crease: 'none' }),
  ].join('');
}

function hingeFront() {
  const face = 14;
  return [
    box({ x: HINGE.x - 3, y: 11, w: 6, d: 3, r: 0.6 }, RAIL.z[0], HINGE.z + 0.6, { tone: 'mid' }, 2, 0.3),
    L(faceCircle([HINGE.x, face, HINGE.z - 0.6], 1.4, 'y', 16), { tone: 'mid' }),
  ].join('');
}

function crankSvg(K, P, C, tilt) {
  // The crank on the axle end turns with the flap.
  const H = C.HINGE, y = 14.2;
  const r = tilt * Math.PI / 180;
  const a = [H.x, y, H.z - 0.6];
  const b = [H.x + Math.cos(r) * 3.6, y, H.z - 0.6 - Math.sin(r) * 3.6];
  return K.lineSvg(K.pathOf([K.iso(a, P), K.iso(b, P)]), { tone: 'hi' }) + K.dotsSvg([K.iso(a, P), K.iso(b, P)], { size: 0.6, tone: 'hi' });
}

function housingBack() {
  const { x, y, w, d, h, wall, floor } = HOUSING;
  const plan = { x, y, w, d, r: 2 };
  return [
    `<path class="iso-halo" d="${k.haloOf(plan, 0, h, P)}"/>`,
    box(plan, 0, floor, { tone: 'mid' }, 3, 0.4),
    box({ x, y, w, d: wall, r: 1 }, floor, h, { tone: 'mid' }, 2, 0.3),
    box({ x, y, w: wall, d, r: 1 }, floor, h, { tone: 'mid' }, 2, 0.3),
    S(k.slabOf({ x: x + wall, y: y + wall, w: w - wall * 2, d: d - wall * 2, r: 0.6 }, floor, 0.01, P, 2), { tone: 'lo', crease: 'none', flat: true }),
  ].join('');
}

function rollers() {
  const R = ROLLERS;
  const out = [];
  R.xs.forEach((x) => {
    const sec = Array.from({ length: 28 }, (_, i) => [x + R.r * Math.cos((i / 28) * Math.PI * 2), R.z + R.r * Math.sin((i / 28) * Math.PI * 2)]);
    // Cutter discs: the visible half of a ring every 3 units along the roller.
    const a = (P.azimuth * Math.PI) / 180, e = (30 * Math.PI) / 180;
    const vx = Math.cos(a) * Math.cos(e), vz = Math.sin(e);
    const t0 = Math.atan2(vz, vx);
    const arcs = [];
    for (let y = R.y0 + 2.25; y < R.y - 1; y += 3) {
      const pts = [];
      for (let i = 0; i <= 14; i++) { const t = t0 - Math.PI / 2 + (i / 14) * Math.PI; pts.push([x + R.r * Math.cos(t), y, R.z + R.r * Math.sin(t)]); }
      arcs.push(path(pts));
    }
    out.push(S({ ...prismY(k, P, sec, R.y0, R.y, true) }, { tone: 'mid', crease: 'lo', inner: L(arcs.join(''), { tone: 'lo' }) }));
    out.push(L(faceCircle([x, R.y, R.z], 0.9, 'y', 12), { tone: 'mid' }));
  });
  return out.join('');
}

function housingFront() {
  const { x, y, w, d, h, wall, floor } = HOUSING;
  const face = y + d;
  const out = [];
  out.push(box({ x, y: face - wall, w, d: wall, r: 1 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(box({ x: x + w - wall, y, w: wall, d, r: 1 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(L(k.planOutline({ x: x + 1.2, y: y + 1.2, w: w - 2.4, d: d - 2.4, r: 1 }, h, P, 2), { tone: 'faint' }));
  out.push(D(k.corners({ x, y, w, d }, 2).map(([px, py]) => at([px, py, h])), { size: 0.4 }));
  // Window into the strip chute: recess floor, left wall, back plane.
  const { x0, x1, z0, z1, depth } = WINDOW;
  const back = face - depth;
  out.push(`<path class="iso-shade" data-shade="0" d="${path([[x0, back, z0], [x1, back, z0], [x1, back, z1], [x0, back, z1]], true)}"/>`);
  out.push(`<path class="iso-top" d="${path([[x0, back, z0], [x1, back, z0], [x1, face, z0], [x0, face, z0]], true)}"/>`);
  out.push(`<path class="iso-shade" data-shade="2" d="${path([[x0, back, z0], [x0, face, z0], [x0, face, z1], [x0, back, z1]], true)}"/>`);
  out.push(`<g data-part="strips" clip-path="url(#cs-window)"></g>`);
  out.push(L(path([[x0, back, z0], [x1, back, z0], [x1, back, z1], [x0, back, z1]], true), { tone: 'faint' }));
  out.push(L(path([[x0, face, z0], [x1, face, z0], [x1, face, z1], [x0, face, z1]], true) + path([[x0, back, z0], [x0, face, z0]]) + path([[x0, back, z1], [x0, face, z1]]), { tone: 'lo' }));
  // Gear cover for the cutter drive on the right of the face.
  const gx = x1 + 3.5;
  out.push(box({ x: gx, y: face, w: x + w - gx - 1.5, d: 1.4, r: 0.5 }, 3, 16, { tone: 'mid', crease: 'none' }, 2, 0.3));
  out.push(L(faceCircle([gx + (x + w - gx - 1.5) / 2, face + 1.4, 9.5], 2.8, 'y', 20), { tone: 'lo' }));
  out.push(D([at([gx + (x + w - gx - 1.5) / 2, face + 1.4, 9.5])], { size: 0.55 }));
  out.push(D([[gx + 1.4, 4.4], [x + w - 2.9, 4.4], [gx + 1.4, 14.6], [x + w - 2.9, 14.6]].map(([px, pz]) => at([px, face + 1.4, pz])), { size: 0.38 }));
  out.push(L(k.sideSeam({ x, y, w, d, r: 2 }, 1.6, P, 3), { tone: 'lo' }));
  return out.join('');
}

function windowClip() {
  const { x0, x1, z0, z1, depth } = WINDOW;
  const face = HOUSING.y + HOUSING.d;
  return `<clipPath id="cs-window"><path d="${path([[x0, face - depth, z0], [x1, face - depth, z0], [x1, face - depth, z1], [x0, face - depth, z1]], true)}"/></clipPath>`;
}

function trayBack() {
  const { x, y, w, d, floor, back } = TRAY;
  const ped = { x: x + 3, y: y + 3, w: w - 6, d: d - 6, r: 1.4 };
  return [
    `<path class="iso-halo" d="${k.haloOf(ped, 0, floor, P)}"/>`,
    box(ped, 0, floor - 2, { tone: 'mid' }, 3, 0.4),
    L(k.sideSeam(ped, 4, P, 3), { tone: 'lo' }),
    D([[ped.x + 4, ped.y + ped.d], [ped.x + ped.w - 4, ped.y + ped.d]].map(([px, py]) => at([px, py, floor - 5])), { size: 0.4 }),
    box({ x, y, w, d, r: 1.2 }, floor - 2, floor, { tone: 'mid' }, 3, 0.3),
    box({ x, y, w, d: 2, r: 0.6 }, floor, TRAY.top, { tone: 'mid' }, 2, 0.2),
    box({ x, y, w: 2, d, r: 0.6 }, floor, back, { tone: 'mid' }, 2, 0.2),
    // Entry lip from the flap's tip down over the back wall.
    S(prismY(k, P, [[HINGE.x + HINGE.len + 0.6, HINGE.z - 0.3], [x + 1.6, back + 0.2], [x + 1.6, back - 0.6], [HINGE.x + HINGE.len + 0.6, HINGE.z - 1.1]], -11, 11), { tone: 'mid' }),
  ].join('');
}

function trayFront() {
  const { x, y, w, d, floor, top } = TRAY;
  return [
    box({ x, y: y + d - 2, w, d: 2, r: 0.6 }, floor, top, { tone: 'mid' }, 2, 0.2),
    box({ x: x + w - 2, y, w: 2, d, r: 0.6 }, floor, top, { tone: 'mid' }, 2, 0.2),
    D([x + 8, x + w - 8].map((px) => at([px, y + d, top - 2])), { size: 0.4 }),
  ].join('');
}

function printer() {
  const { x, y, w, d, h } = PRINTER;
  const plan = { x, y, w, d, r: 2 };
  const face = y + d;
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, h, P)}"/>`];
  out.push(box(plan, 0, h, { tone: 'mid' }, 3, 0.6));
  out.push(L(k.sideSeam(plan, 3.4, P, 3), { tone: 'lo' }));
  // Paper-roll lid on the back half, the slot, and the tear bar.
  const lid = { x: x + 3, y: y + 2, w: w - 6, d: 6, r: 1.4 };
  out.push(box(lid, h, h + 1.6, { tone: 'mid' }, 3, 0.3));
  out.push(S(k.slabOf({ x: TAPE.x - 1.2, y: TAPE.y - 0.6, w: TAPE.w + 2.4, d: 1.7, r: 0.5 }, h, 0.01, P, 2), { tone: 'lo', crease: 'none', flat: true }));
  out.push(L(k.planOutline({ x: TAPE.x - 1.2, y: TAPE.y - 0.6, w: TAPE.w + 2.4, d: 1.7, r: 0.5 }, h, P, 2), { tone: 'lo' }));
  out.push(D(k.corners({ x, y, w, d }, 2.4).map(([px, py]) => at([px, py, h])), { size: 0.4 }));
  // Front panel: two buttons, a lamp, rule lines.
  out.push(L([[x + 6, 9], [x + 11, 9]].map(([px, pz]) => faceCircle([px, face, pz], 1.6, 'y', 16)).join(''), { tone: 'mid' }));
  out.push(D([at([x + 16, face, 9])], { size: 0.6, tone: 'hi' }));
  out.push(L(path([[x + 20, face, 10], [x + w - 4, face, 10]]) + path([[x + 20, face, 8], [x + w - 8, face, 8]]), { tone: 'faint', free: true }));
  return out.join('');
}

function tearBar() {
  const plan = { x: TAPE.x - 1, y: TAPE.y + 0.6, w: TAPE.w + 2, d: 1.1, r: 0.3 };
  return box(plan, PRINTER.h, PRINTER.h + 1.4, { tone: 'mid', crease: 'none' }, 2, 0.2) + D(Array.from({ length: 8 }, (_, i) => at([plan.x + 1.5 + i * 2.2, plan.y + plan.d, PRINTER.h + 1.4])), { size: 0.3, tone: 'lo' });
}

function cable() {
  // Signal cable from the scanner tower to the printer, laid on the bench.
  return k.wireSvg(at([SCAN.tower.x + 3, SCAN.tower.y + SCAN.tower.d + 2, 0.6]), at([PRINTER.x + 4, PRINTER.y + PRINTER.d, 3]), {
    via: [at([SCAN.tower.x + 3, 50, 0]), at([PRINTER.x + 1, 50, 0])],
    tone: 'lo',
  });
}

// ---- paint back to front --------------------------------------------------

const body = [
  windowClip(),
  basePlate(P, PLATE, { label: { x: -172, y: 28, w: 30, d: 16, r: 1.5 }, ruler: { x: -134, y: 38, w: 90, d: 6, r: 1 } }),
  feeder(),
  chuteLegs(),
  chuteWall(-CHUTE.y - 1.4, -CHUTE.y),
  chuteFloor(),
  tower(-SCAN.tower.y - SCAN.tower.d),
  beltFrame(false),
  belt(),
  beltFrame(true),
  housingBack(),
  rollers(),
  `<g data-part="teeth">${teethSvg(k, P, C, 0)}</g>`,
  trayBack(),
  hingeBack(),
  `<g data-part="flap">${flapSvg(k, P, C, 0)}</g>`,
  beamSvg(),
  `<g data-part="envelopes">${[0, 1, 2, 3].map((i) => `<g data-env="${i}" opacity="0"></g>`).join('')}</g>`,
  head(),
  chuteWall(CHUTE.y, CHUTE.y + 1.4),
  tower(SCAN.tower.y),
  hood(),
  lamps(),
  housingFront(),
  hingeFront(),
  `<g data-part="crank">${crankSvg(k, P, C, 0)}</g>`,
  trayFront(),
  printer(),
  `<g data-part="torn" opacity="0"></g>`,
  `<g data-part="tape"></g>`,
  tearBar(),
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A mail-sorting machine on a bench. Agent calls arrive as envelopes from an inbound chute and ride a belt under a scanner bridge. Six lamps on the bridge stand for the six gates: injection, privacy, supply chain, budget, egress and output. A safe call lights every lamp, the diverter flap stays level and the call goes into the delivery tray. A harmful call turns one lamp red, the flap drops and the call goes into the shredder. Each decision prints one line on the receipt tape.',
  body,
});

const pins = pinsHtml(P, WIDTH, HEIGHT, [
  { id: 'calls', at: [FEEDER.x + FEEDER.w / 2, 0, FEEDER.z[1] + 2.4], icon: 'robot', title: 'Agent calls', sub: 'Prompts and tool calls from any agent', lift: 8, expand: true, seek: 'calls' },
  { id: 'gates', at: [SCAN.x, LAMP_Y[5], SCAN.hood[1] + 3], icon: 'scan', title: 'Six gates', sub: 'Injection, privacy, supply chain, budget, egress, output', lift: 22, expand: true, seek: 'calls' },
  { id: 'diverter', at: [HINGE.x + 12, -11, HINGE.z], icon: 'arrows-split', title: 'Diverter', sub: 'Sends each call by its verdict', lift: 34, expand: true, seek: 'blocked' },
  { id: 'shredder', at: [HOUSING.x + 14, HOUSING.y + HOUSING.d, 6], icon: 'scissors', title: 'Shredder', sub: 'Blocked calls never reach your systems', side: 'down', lift: 26, expand: true, seek: 'blocked' },
  { id: 'tray', at: [TRAY.x + TRAY.w / 2, TRAY.y + 3, TRAY.top], icon: 'tray', title: 'Delivery tray', sub: 'Safe calls go on to your tools', lift: 18, expand: true, seek: 'delivered' },
  { id: 'receipt', at: [PRINTER.x + PRINTER.w, PRINTER.y + PRINTER.d / 2, PRINTER.h / 2], icon: 'receipt', title: 'Receipt on Hyper 0X', sub: 'One line per decision, never edited', side: 'right', lift: 14, expand: true, seek: 'receipt' },
]);

const steps = stepsHtml([
  { id: 'calls', icon: 'scan', title: 'Every call is scanned', sub: 'Six gates check each prompt and tool call' },
  { id: 'delivered', icon: 'check-circle', title: 'Safe calls are delivered', sub: 'The flap stays level and the call goes on' },
  { id: 'blocked', icon: 'scissors', title: 'Harmful calls are shredded', sub: 'One gate trips, the flap drops, the call is cut' },
  { id: 'receipt', icon: 'receipt', title: 'Each decision prints a receipt', sub: 'Hyper 0X keeps it, so nobody can change it' },
]);

// ---- the loop: a fixed run of calls, each a pure function of its age ------

// gate: the gate that blocks the call (-1 = safe).
const CALLS = [{ gate: -1 }, { gate: -1 }, { gate: 1 }, { gate: -1 }, { gate: 4 }, { gate: -1 }, { gate: -1 }, { gate: 0 }];
const PERIOD = 2.4;
const LOOP = CALLS.length * PERIOD;
const SPEED = 44;
const A = {
  emerge: [0, 0.6],
  slide: [0.6, 1.45],
  land: [1.45, 1.7],
  beltX: [-92, 40],
};
A.beltEnd = A.land[1] + (A.beltX[1] - A.beltX[0]) / SPEED;
A.scanX = SCAN.x - 12;
A.lampX = (j) => SCAN.x - 6 + j * 2.4;
A.ageAtX = (x) => A.land[1] + (x - A.beltX[0]) / SPEED;
A.safe = { flapEnd: A.beltEnd + (HINGE.x + HINGE.len - 2 - A.beltX[1]) / SPEED, settle: 0.6, fade: [7.4, 7.9] };
A.block = { onFlap: [A.beltEnd, A.beltEnd + 0.45], tilt: [A.beltEnd + 0.6, A.beltEnd + 0.95], feed: [A.beltEnd + 0.95, A.beltEnd + 1.85], spin: [A.beltEnd + 1.05, A.beltEnd + 2.05], strips: [A.beltEnd + 1.3, A.beltEnd + 2.5], back: [A.beltEnd + 1.9, A.beltEnd + 2.3] };
A.decide = (gate) => (gate < 0 ? A.beltEnd : A.block.tilt[0]);
A.dur = 7.9;
A.tear = 2.2;
const SERIAL = 1202;

// Seek points (loop seconds): call 3 scanning, call 0 delivered, call 2
// blocked, call 3's receipt line.
const SEEK = {
  calls: 3 * PERIOD + A.ageAtX(A.scanX) - 0.5,
  delivered: A.beltEnd - 0.4,
  blocked: 2 * PERIOD + A.beltEnd - 0.3,
  receipt: 3 * PERIOD + A.beltEnd + 0.1,
};

const live = `
${prismY.toString()}
${envelopeSvg.toString()}
${flapSvg.toString()}
${teethSvg.toString()}
${tapeSvg.toString()}
${crankSvg.toString()}
${playFigure.toString()}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify({ ...C, CHUTE, CHUTE_TILT, CHUTE_LEN, BELT_TOP, GATE_NAMES, CALLS, PERIOD, LOOP, SPEED, A: { ...A, lampX: undefined, ageAtX: undefined, decide: undefined }, SERIAL, WINDOW, HOUSING, SCAN, TRAY })};
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
    stillAt: ${JSON.stringify(SEEK.blocked + 1.2)},
    seek: ${JSON.stringify(SEEK)},
  });
}
`;

const plate = k.plateHtml({
  fig: 'Fig 1',
  title: 'How Pavii checks every agent call',
  hint: 'Safe calls pass, harmful calls are shredded',
  readout: 'call #1202 · scanning',
  body: `<div class="iso-stage" data-figure="call-sorter">${svg}${pins}</div>`,
}).replace('</figure>', `${steps}</figure>`);

writeFigure('call-sorter', { plate, live, title: 'Call sorter' });
