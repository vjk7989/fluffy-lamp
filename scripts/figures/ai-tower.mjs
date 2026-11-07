// Fig 5: Inside Pavii (Anatomy kit, MIT; see ./kit/LICENSE).
//
// An office tower on a bench plate. Requests (prompts, files, tool calls)
// leave a hopper on a short belt and stop under a scanner gantry at the
// perimeter gate. A safe request lifts the boom and rides on to the lobby
// dock; a leaking one stays behind the boom, is pushed off the belt by a
// pusher and drops into the quarantine crate. Each check drops one block on
// the ledger plinth (receipts on Hyper 0X). A safe request climbs the riser
// on the side of the tower and lights the six service rooms in turn: compute,
// AI assistant, custom LLMs, research, coding, video generation. At the top a
// parcel leaves the roof hatch, rides the bridge and drops into the delivery
// bin; the dial on the bin steps one tick per delivered result.
//
// Run: node ai-tower.mjs (from scripts/figures)
import { k, tools, basePlate, pinsHtml, stepsHtml, playFigure, writeFigure } from './lib.mjs';

const WIDTH = 780;
const HEIGHT = 585;

const PLATE = { x: -150, y: -42, w: 282, d: 104, r: 8 };
const TW = { x: -38, y: -26, w: 76, d: 46 };
const FACE = TW.y + TW.d; // 20: the front face
const FY = FACE + 1.2; // window plates stand 1.2 proud of it
const SX = TW.x + TW.w; // 38: the +x face
const FH = 17;
const FZ = (n) => 22 + FH * n;
const FLOORS = 6;
const ROOF = FZ(FLOORS); // 124
const ROOF_TOP = ROOF + 4;
const WIN = { x0: -31, x1: 31, lo: 2, hi: 15 };
const SIDE_WIN = { y0: -20, y1: 10 };
const RISER_Y = 15;
const ROOMS = [
  { id: 'compute', title: 'Compute', icon: 'cpu' },
  { id: 'assistant', title: 'AI assistant', icon: 'chat-circle' },
  { id: 'llm', title: 'Custom LLMs', icon: 'brain' },
  { id: 'research', title: 'Research', icon: 'magnifying-glass' },
  { id: 'code', title: 'Coding', icon: 'code' },
  { id: 'video', title: 'Video generation', icon: 'video-camera' },
];
const roomZ = (n) => FZ(n) + (WIN.lo + WIN.hi) / 2;

const BELT = { x0: -118, x1: -13, y0: 23, y1: 35, z0: 8, top: 12, cy: 29 };
const DOCK = { x: -13, y: FACE, w: 15, d: 16, top: 12 };
const HOPPER = { x: -142, y: 19, w: 24, d: 20, h: 26 };
const ARCH = { x: -73, w: 6, farY: 9.5, farD: 4, z1: 34, z2: 41, head: 36 };
const PUSH = { x: -74, w: 8, housing: { y: 13.5, d: 6.5 }, pad: { y: 20, d: 1.6, z: [13, 19] } };
const BARRIER = { x: -60, w: 4, farY: 19.5, nearY: 35, d: 3.5, h: 22, hinge: [35, 19.5], len: 11.5, t: 2.2 };
const CRATE = { x: -77, y: 36, w: 14, d: 20, h: 9, wall: 1.2, floor: 2 };
const STOP_X = -70;
const FENCE = { x0: -58, x1: 58, y0: -34, y1: 44, h: 11 };
const RESULT = { x0: 28, x1: 104 };
const GIRDER = { x: 40.4, w: 61.6, y: -6, d: 12, z0: 121, top: 128 };
const BIN = { x: 74, y: -9, w: 38, d: 18, h: 24, wall: 2, floor: 2 };
const PYLON = { x: 94, w: 4, y: 9.5, d: 4, h: 116 };
const DIAL = { x: 84, z: 13, r: 8 };
const PLINTH = { x: 62, y: 28, w: 62, d: 22, h: 7 };
const BLOCK = { w: 5.6, d: 10, h: 4.4, pitch: 7.1, x0: 64.6 };
const PKT = { hx: 4.5, hy: 4, h: 4.6 };
const PARCEL = { half: 3.5, h: 4.4 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [HOPPER.x, HOPPER.y, HOPPER.h + 8],
    [-30, 16, 152],
    [10, 16, 152],
    [PYLON.x + PYLON.w, -PYLON.y - PYLON.d, PYLON.h + 12],
    [PYLON.x + PYLON.w, PYLON.y + PYLON.d, PYLON.h + 12],
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 56 },
);

const { at, S, L, D, byDepth, col, box, path, faceCircle } = tools(P);

// ---- live builders (pure; embedded with toString()) ----------------------

// A convex prism along x: a section in the y-z plane swept from x0 to x1.
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

// The boom: hinged on the near gate post, lifting by `lift` degrees.
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

// The needle of the results dial, on the bin's front face, clockwise from up.
function needleSvg(K, P, C, deg) {
  const Dl = C.DIAL, y = C.BIN.y + C.BIN.d + 1.4;
  const r = deg * Math.PI / 180;
  const tip = [Dl.x + Math.sin(r) * (Dl.r - 1.6), y, Dl.z + Math.cos(r) * (Dl.r - 1.6)];
  const tail = [Dl.x - Math.sin(r) * 2.2, y, Dl.z - Math.cos(r) * 2.2];
  const hub = K.iso([Dl.x, y, Dl.z], P);
  return K.lineSvg(K.pathOf([K.iso(tail, P), K.iso(tip, P)]), { tone: 'hi', free: true }) + K.dotsSvg([hub], { size: 1, tone: 'hi' });
}

// A bar from the left end of a window to `share` of its width.
function barSvg(K, P, C, share, zb) {
  const a = [C.WIN.x0 + 3, C.FY, zb], b = [C.WIN.x0 + 3 + (C.WIN.x1 - C.WIN.x0 - 6) * share, C.FY, zb];
  return share > 0.01 ? K.lineSvg(K.pathOf([K.iso(a, P), K.iso(b, P)]), { tone: 'hi' }) : '';
}

const C = { BARRIER, DIAL, BIN, WIN, FY };

// ---- static parts ---------------------------------------------------------

// A low fence: posts every ~19 units with two rails, drawn near-ward.
function fence(axis, fixed, from, to, count) {
  const out = [];
  const step = (to - from) / (count - 1);
  for (let i = 0; i < count; i++) {
    const p = from + step * i;
    const c = axis === 'x' ? [p, fixed] : [fixed, p];
    out.push(box({ x: c[0] - 1.3, y: c[1] - 1.3, w: 2.6, d: 2.6, r: 0.5 }, 0, FENCE.h, { tone: 'mid' }, 2, 0.4));
    if (i < count - 1) {
      for (const [z0, z1] of [[3.4, 4.8], [8, 9.4]]) {
        const rail = axis === 'x' ? { x: p + 1.3, y: fixed - 0.5, w: step - 2.6, d: 1, r: 0.2 } : { x: fixed - 0.5, y: p + 1.3, w: 1, d: step - 2.6, r: 0.2 };
        out.push(box(rail, z0, z1, { tone: 'mid', crease: 'none' }, 2, 0.2));
      }
    }
  }
  return out.join('');
}

function hopper() {
  const { x, y, w, d, h } = HOPPER;
  const plan = { x, y, w, d, r: 2 };
  const face = x + w;
  const out = [];
  for (const py of [y + 4, y + d - 4]) out.push(col(x + 5, py, 3.4, 0, 1.4, { tone: 'mid' }, 16), col(x + 5, py, 1.6, 1.4, 4, { tone: 'mid', crease: 'none' }, 12));
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, 4, 1, P)}" style="filter:blur(3px)"/>`);
  out.push(box(plan, 4, h, { tone: 'mid' }, 3, 0.6));
  out.push(L(k.sideSeam(plan, 9, P, 3), { tone: 'lo' }));
  // Intake rim with three cards standing in it: prompt, file, tool call.
  const rim = { x: x - 1, y: y - 1, w: w + 2, d: d + 2, r: 2.4 };
  out.push(box(rim, h, h + 2.2, { tone: 'mid' }, 3, 0.4));
  out.push(S(k.slabOf(k.insetPlan(rim, 3), h + 2.2, 0.01, P, 3), { tone: 'lo', crease: 'none', flat: true }));
  out.push(L(k.planOutline(k.insetPlan(rim, 3), h + 2.2, P, 3), { tone: 'lo' }));
  [y + 5, y + 10, y + 15].forEach((cy, i) => out.push(box({ x: x + 6, y: cy - 1.6, w: 12, d: 3.2, r: 0.4 }, h + 2.2, h + 8 + (i === 1 ? 2 : 0), { tone: 'hi', crease: 'lo' }, 2, 0.2)));
  // The slot on the +x face where requests come out, and its lip.
  const sz = BELT.top;
  out.push(L(path([[face, y + 3, sz - 0.2], [face, y + d - 3, sz - 0.2], [face, y + d - 3, sz + 6], [face, y + 3, sz + 6]], true), { tone: 'mid' }));
  out.push(`<path class="iso-shade" data-shade="0" d="${path([[face, y + 3.5, sz + 0.2], [face, y + d - 3.5, sz + 0.2], [face, y + d - 3.5, sz + 5.6], [face, y + 3.5, sz + 5.6]], true)}"/>`);
  // Screws and a rule plate on the near face.
  const ny = y + d;
  out.push(D([[x + 3, h - 3], [x + w - 3, h - 3], [x + 3, 10], [x + w - 3, 10]].map(([px, pz]) => at([px, ny, pz])), { size: 0.42 }));
  [h - 8, h - 10.4].forEach((pz, i) => out.push(L(path([[x + 4, ny, pz], [x + (i ? 11 : 15), ny, pz]]), { tone: 'faint', free: true })));
  out.push(L(faceCircle([x + w - 5, ny, 14], 1.8, 'y', 16), { tone: 'lo' }));
  return out.join('');
}

// ---- the tower ----

// One room's drawing in the window plane: local (u, v), u along x, v up.
function roomIcon(n) {
  const w = (pts, closed = false) => path(pts.map(([u, v]) => [u, FY, roomZ(n) + v]), closed);
  let lines = '';
  let free = '';
  let dots = [];
  const faces = [];
  if (n === 0) {
    for (const cx of [-21, -7, 7, 21]) {
      lines += w([[cx - 5.5, -3.8], [cx + 5.5, -3.8], [cx + 5.5, 3.8], [cx - 5.5, 3.8]], true);
      for (const v of [-1.9, 0.1, 2.1]) { free += w([[cx - 3.8, v], [cx + 0.6, v]]); dots.push([cx + 3.4, FY, roomZ(n) + v]); }
    }
  } else if (n === 1) {
    lines += w([[-26, 0.6], [-2, 0.6], [-2, 4.2], [-26, 4.2], [-26, 0.6]], true) + w([[-22, 0.6], [-23.8, -1.6], [-18.5, 0.6]]);
    lines += w([[4, -4.2], [28, -4.2], [28, -0.6], [4, -0.6]], true) + w([[24, -0.6], [25.8, 1.6], [20.5, -0.6]]);
    lines += w([[4, -0.6], [4, -4.2]]);
    free += w([[-23, 2.4], [-9, 2.4]]) + w([[7, -2.4], [17, -2.4]]);
    dots.push([-5, FY, roomZ(n) + 2.4], [21, FY, roomZ(n) - 2.4], [23.6, FY, roomZ(n) - 2.4], [26.2, FY, roomZ(n) - 2.4]);
  } else if (n === 2) {
    const layers = [[-24, [-2.2, 2.2]], [-8, [-3.7, 0, 3.7]], [8, [-3.7, 0, 3.7]], [24, [-2.2, 2.2]]];
    for (let i = 0; i < 3; i++) for (const a of layers[i][1]) for (const b of layers[i + 1][1]) lines += w([[layers[i][0], a], [layers[i + 1][0], b]]);
    for (const [u, vs] of layers) for (const v of vs) dots.push([u, FY, roomZ(n) + v]);
  } else if (n === 3) {
    const ring = Array.from({ length: 18 }, (_, i) => [-18 + 3.6 * Math.cos((i / 18) * Math.PI * 2), 0.8 + 3.6 * Math.sin((i / 18) * Math.PI * 2)]);
    lines += w(ring, true);
    free += w([[-15.5, -1.8], [-11.5, -4.4]]);
    lines += w([[4, -4.4], [4, 4.4], [18.5, 4.4], [22, 1.6], [22, -4.4]], true) + w([[18.5, 4.4], [18.5, 1.6], [22, 1.6]]);
    free += w([[7, 1.6], [14.5, 1.6]]) + w([[7, -0.4], [18.5, -0.4]]) + w([[7, -2.4], [16, -2.4]]);
  } else if (n === 4) {
    free += w([[-14, 3.6], [-20, 0], [-14, -3.6]]) + w([[-3, -4], [3, 4]]) + w([[14, 3.6], [20, 0], [14, -3.6]]);
    free += w([[-28, 3], [-24, 3]]) + w([[-28, 0.4], [-25, 0.4]]) + w([[-28, -2.2], [-23, -2.2]]) + w([[24, 3], [28, 3]]) + w([[25, 0.4], [28, 0.4]]) + w([[23, -2.2], [28, -2.2]]);
  } else {
    lines += w([[-20, -4.2], [20, -4.2], [20, 4.2], [-20, 4.2]], true) + w([[-3.6, -2.4], [3.8, 0], [-3.6, 2.4]], true);
    for (let u = -17; u <= 17; u += 5.7) dots.push([u, FY, roomZ(n) + 3.3], [u, FY, roomZ(n) - 3.3]);
    free += w([[-28, 0], [-24, 0]]) + w([[24, 0], [28, 0]]);
  }
  void faces;
  return L(lines, { tone: 'hi' }) + L(free, { tone: 'hi', free: true }) + (dots.length ? D(dots.map(([x, y, z]) => at([x, y, z])), { size: 0.5, tone: 'hi' }) : '');
}

function windows() {
  const out = [];
  for (let n = 0; n < FLOORS; n++) {
    const z0 = FZ(n) + WIN.lo, z1 = FZ(n) + WIN.hi, zc = roomZ(n);
    const frame = { x: WIN.x0, y: FACE, w: WIN.x1 - WIN.x0, d: 1.2, r: 0.6 };
    out.push(box(frame, z0, z1, { tone: 'lo', crease: 'lo' }, 2, 0.3));
    out.push(L(path([[WIN.x0 + 1.4, FY, z0 + 1.2], [WIN.x1 - 1.4, FY, z0 + 1.2], [WIN.x1 - 1.4, FY, z1 - 1.2], [WIN.x0 + 1.4, FY, z1 - 1.2]], true), { tone: 'faint' }));
    out.push(`<path data-glow="${n}" style="fill:var(--fig-accent,#7c3aed);stroke:none" opacity="0" d="${path([[WIN.x0 + 1.4, FY, z0 + 1.2], [WIN.x1 - 1.4, FY, z0 + 1.2], [WIN.x1 - 1.4, FY, z1 - 1.2], [WIN.x0 + 1.4, FY, z1 - 1.2]], true)}"/>`);
    out.push(`<g data-room="${n}" opacity="0.55">${roomIcon(n)}<g data-prog="${n}"></g></g>`);
    out.push(D([at([WIN.x0 + 0.7, FY, z0 + 0.7]), at([WIN.x1 - 0.7, FY, z0 + 0.7]), at([WIN.x0 + 0.7, FY, z1 - 0.7]), at([WIN.x1 - 0.7, FY, z1 - 0.7])], { size: 0.36 }));
  }
  return out.join('');
}

function sideWindows() {
  const out = [];
  const sx = SX + 1.2;
  for (let n = 0; n < FLOORS; n++) {
    const z0 = FZ(n) + WIN.lo, z1 = FZ(n) + WIN.hi;
    out.push(box({ x: SX, y: SIDE_WIN.y0, w: 1.2, d: SIDE_WIN.y1 - SIDE_WIN.y0, r: 0.6 }, z0, z1, { tone: 'lo', crease: 'lo' }, 2, 0.3));
    const rect = [[sx, SIDE_WIN.y0 + 1.4, z0 + 1.2], [sx, SIDE_WIN.y1 - 1.4, z0 + 1.2], [sx, SIDE_WIN.y1 - 1.4, z1 - 1.2], [sx, SIDE_WIN.y0 + 1.4, z1 - 1.2]];
    out.push(L(path(rect, true), { tone: 'faint' }));
    out.push(`<path data-sglow="${n}" style="fill:var(--fig-accent,#7c3aed);stroke:none" opacity="0" d="${path(rect, true)}"/>`);
    const mull = [SIDE_WIN.y0 + 8, SIDE_WIN.y0 + 15, SIDE_WIN.y0 + 22].map((y) => path([[sx, y, z0 + 1.2], [sx, y, z1 - 1.2]])).join('');
    out.push(L(mull, { tone: 'lo' }));
  }
  return out.join('');
}

function tower() {
  const out = [];
  const plan = { ...TW, r: 1.6 };
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: TW.x - 2, y: TW.y - 2, w: TW.w + 4, d: TW.d + 4, r: 3 }, 0, 12, P)}" style="filter:blur(3px)"/>`);
  // Lobby with its base band and cornice.
  out.push(box({ x: TW.x - 0.8, y: TW.y - 0.8, w: TW.w + 1.6, d: TW.d + 1.6, r: 2 }, 0, 3, { tone: 'mid' }, 3, 0.4));
  out.push(box(plan, 3, FZ(0), { tone: 'mid' }, 3, 0.5));
  for (let n = 0; n < FLOORS; n++) out.push(box(plan, FZ(n), FZ(n) + FH, { tone: 'mid' }, 3, 0.5));
  // Seams at each floor, cornices where the floors meet.
  for (let n = 0; n <= FLOORS; n++) out.push(L(k.sideSeam(plan, n === 0 ? FZ(0) : FZ(n - 1) + FH, P, 3), { tone: 'lo' }));
  for (let n = -1; n < FLOORS; n++) {
    const top = n < 0 ? FZ(0) : FZ(n) + FH;
    out.push(box({ x: TW.x - 1.4, y: TW.y - 1.4, w: TW.w + 2.8, d: TW.d + 2.8, r: 2.4 }, top - 1.4, top, { tone: 'mid' }, 3, 0.3));
  }
  // Lobby front: the loading door at dock height, a status plate, vents.
  out.push(box({ x: -13, y: FACE, w: 14, d: 1, r: 0.5 }, 12, 20, { tone: 'lo', crease: 'lo' }, 2, 0.3));
  out.push(L(path([[-6, FACE + 1, 12.4], [-6, FACE + 1, 19.6]]), { tone: 'lo' }));
  out.push(L(path([[-12, FACE + 1, 13], [0, FACE + 1, 13], [0, FACE + 1, 19], [-12, FACE + 1, 19]], true), { tone: 'faint' }));
  out.push(D([at([-7.4, FACE + 1, 16]), at([-4.6, FACE + 1, 16])], { size: 0.5, tone: 'hi' }));
  out.push(box({ x: 5, y: FACE, w: 6, d: 0.8, r: 0.3 }, 11, 18, { tone: 'lo', crease: 'none' }, 2, 0.2));
  out.push(D([at([8, FACE + 0.8, 16]), at([8, FACE + 0.8, 14])], { size: 0.5, tone: 'hi' }));
  out.push(L([-34, -30, -26].map((x) => path([[x, FACE, 6], [x + 2.4, FACE, 6], [x + 2.4, FACE, 16], [x, FACE, 16]], true)).join(''), { tone: 'lo' }));
  // Lobby on the +x face: a service hatch.
  out.push(L(path([[SX, -18, 5], [SX, 6, 5], [SX, 6, 17], [SX, -18, 17]], true), { tone: 'lo' }));
  out.push(L(path([[SX, -6, 5], [SX, -6, 17]]), { tone: 'lo' }));
  out.push(D([at([SX, -8.4, 11]), at([SX, -3.6, 11])], { size: 0.5, tone: 'mid' }));
  // The loading canopy over the dock.
  out.push(box({ x: -17, y: FACE, w: 22, d: 7, r: 1 }, 20.8, 22.4, { tone: 'mid' }, 3, 0.3));
  out.push(D(k.corners({ x: -17, y: FACE, w: 22, d: 7 }, 1.2).map(([x, y]) => at([x, y, 22.4])), { size: 0.4 }));
  out.push(windows());
  out.push(sideWindows());
  // The riser on the +x face: a groove with a node at every room.
  out.push(box({ x: SX, y: RISER_Y - 3, w: 1.6, d: 6, r: 0.6 }, 4, 12, { tone: 'lo', crease: 'lo' }, 2, 0.3));
  out.push(L(path([[SX, RISER_Y, 12], [SX, RISER_Y, ROOF - 2]]), { tone: 'mid' }));
  out.push(D(Array.from({ length: FLOORS }, (_, n) => at([SX, RISER_Y, roomZ(n)])), { size: 0.9, tone: 'mid' }));
  out.push(D(Array.from({ length: FLOORS }, (_, n) => at([SX, RISER_Y, roomZ(n)])), { size: 0.4, tone: 'hi' }));
  out.push(`<circle class="fig-led" data-pulse cx="0" cy="0" r="2.2" opacity="0"/>`);
  return out.join('');
}

function roof() {
  const out = [];
  const cap = { x: TW.x - 2.4, y: TW.y - 2.4, w: TW.w + 4.8, d: TW.d + 4.8, r: 2.8 };
  out.push(box(cap, ROOF, ROOF_TOP, { tone: 'mid' }, 4, 0.8));
  out.push(L(k.sideSeam(cap, ROOF + 1.5, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(cap, 3), ROOF_TOP, P, 4), { tone: 'faint' }));
  out.push(D(k.corners(cap, 3.4).map(([x, y]) => at([x, y, ROOF_TOP])), { size: 0.45 }));
  // Two cooling units.
  for (const [cx, cy] of byDepth([[-24, -12], [-8, -12]])) {
    out.push(box({ x: cx - 6, y: cy - 6, w: 12, d: 12, r: 1 }, ROOF_TOP, ROOF_TOP + 6, { tone: 'mid' }, 3, 0.4));
    out.push(L(k.ring(cx, cy, 4, ROOF_TOP + 6, P, 20), { tone: 'lo' }));
    out.push(L(k.lineOnTop([cx - 4, cy], [cx + 4, cy], ROOF_TOP + 6, P) + k.lineOnTop([cx, cy - 4], [cx, cy + 4], ROOF_TOP + 6, P), { tone: 'faint' }));
    out.push(D([at([cx, cy, ROOF_TOP + 6])], { size: 0.6, tone: 'mid' }));
  }
  // Mast with a beacon.
  out.push(col(30, -18, 2, ROOF_TOP, ROOF_TOP + 2, { tone: 'mid' }, 14));
  out.push(col(30, -18, 0.9, ROOF_TOP + 2, ROOF_TOP + 26, { tone: 'mid', crease: 'none' }, 10));
  out.push(box({ x: 27, y: -18.5, w: 6, d: 1, r: 0.2 }, ROOF_TOP + 18, ROOF_TOP + 19, { tone: 'mid', crease: 'none' }, 2, 0.1));
  out.push(`<circle class="fig-led" data-beacon cx="${at([30, -18, ROOF_TOP + 27])[0].toFixed(1)}" cy="${at([30, -18, ROOF_TOP + 27])[1].toFixed(1)}" r="2" opacity="0.3"/>`);
  // The result hatch: a lift pad flush in the roof.
  const hatch = { x: 12, y: -7, w: 16, d: 14, r: 1 };
  out.push(S(k.slabOf(hatch, ROOF_TOP, 0.7, P, 3, 0.2), { tone: 'lo', crease: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(hatch, 2), ROOF_TOP + 0.7, P, 3), { tone: 'faint' }));
  out.push(D(k.corners(hatch, 1.1).map(([x, y]) => at([x, y, ROOF_TOP + 0.7])), { size: 0.4 }));
  return out.join('');
}

const LETTERS = {
  P: { lines: [[[0, 0], [0, 1], [0.8, 1], [1, 0.85], [1, 0.65], [0.8, 0.5], [0, 0.5]]] },
  A: { lines: [[[0, 0], [0.5, 1], [1, 0]], [[0.2, 0.38], [0.8, 0.38]]] },
  V: { lines: [[[0, 1], [0.5, 0], [1, 1]]] },
  I: { lines: [[[0.5, 0], [0.5, 1]], [[0.15, 0], [0.85, 0]], [[0.15, 1], [0.85, 1]]] },
};

function sign() {
  const out = [];
  const board = { x: -30, y: 14, w: 40, d: 2, r: 0.8 };
  const front = board.y + board.d;
  for (const x of [-24, 4]) out.push(box({ x: x - 1.2, y: 14.2, w: 2.4, d: 1.6, r: 0.3 }, ROOF_TOP, 135, { tone: 'mid', crease: 'none' }, 2, 0.2));
  out.push(`<path class="iso-halo" d="${k.haloOf(board, 135, 14, P)}" style="filter:blur(3px)"/>`);
  out.push(box(board, 135, 149, { tone: 'mid' }, 3, 0.5));
  out.push(L(path([[board.x + 1.5, front, 136.5], [board.x + board.w - 1.5, front, 136.5], [board.x + board.w - 1.5, front, 147.5], [board.x + 1.5, front, 147.5]], true), { tone: 'lo' }));
  const w = 4.6, h = 7, gap = 3;
  const x0 = board.x + (board.w - (5 * w + 4 * gap)) / 2;
  let letters = '';
  [...'PAVII'].forEach((ch, i) => {
    for (const run of LETTERS[ch].lines) letters += path(run.map(([u, v]) => [x0 + i * (w + gap) + u * w, front, 138.5 + v * h]));
  });
  out.push(L(letters, { tone: 'hi', free: true }));
  out.push(D([at([board.x + 0.8, front, 135.8]), at([board.x + board.w - 0.8, front, 135.8]), at([board.x + 0.8, front, 148.2]), at([board.x + board.w - 0.8, front, 148.2])], { size: 0.4 }));
  return out.join('');
}

// ---- belt, gate, crate ----

function beltFrame() {
  const out = [];
  const body = { x: BELT.x0, y: BELT.y0, w: BELT.x1 - BELT.x0, d: BELT.y1 - BELT.y0, r: 1 };
  // Legs under both rails.
  for (const x of [-112, -92, -76, -50, -30]) {
    for (const [y] of [[BELT.y0 + 1], [BELT.y1 - 1]].sort((a, b) => a[0] - b[0])) out.push(box({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.5 }, 0, BELT.z0, { tone: 'mid', crease: 'none' }, 2, 0.2));
  }
  out.push(box(body, BELT.z0, BELT.top, { tone: 'mid' }, 3, 0.4));
  const strip = { x: BELT.x0 + 1, y: BELT.y0 + 1.5, w: BELT.x1 - BELT.x0 - 2, d: BELT.y1 - BELT.y0 - 3, r: 0.6 };
  out.push(S(k.slabOf(strip, BELT.top, 0.01, P, 3), { tone: 'lo', crease: 'none', flat: true }));
  out.push(L([BELT.y0 + 4, BELT.y1 - 4].map((y) => k.lineOnTop([BELT.x0 + 5, y], [BELT.x1 - 5, y], BELT.top, P)).join(''), { tone: 'lo', flow: true, free: true }));
  // Side face: seam, rollers, bolts.
  out.push(L(path([[BELT.x0 + 0.6, BELT.y1, BELT.z0 + 2], [BELT.x1 - 0.6, BELT.y1, BELT.z0 + 2]]), { tone: 'lo' }));
  for (const x of [BELT.x0 + 3, BELT.x1 - 3]) out.push(L(faceCircle([x, BELT.y1, BELT.z0 + 2], 1.2, 'y', 14), { tone: 'mid' }), D([at([x, BELT.y1, BELT.z0 + 2])], { size: 0.5, tone: 'hi' }));
  out.push(D([-100, -84, -48, -32].map((x) => at([x, BELT.y1, BELT.top - 1])), { size: 0.36 }));
  // The lift pad at the lobby door.
  const dock = { x: DOCK.x, y: DOCK.y, w: DOCK.w, d: DOCK.d, r: 1.2 };
  out.push(box(dock, 0, DOCK.top, { tone: 'mid' }, 3, 0.4));
  out.push(L(k.planOutline(k.insetPlan(dock, 2), DOCK.top, P, 3), { tone: 'faint' }));
  out.push(L(path([[DOCK.x + 0.6, DOCK.y + DOCK.d, 3], [DOCK.x + DOCK.w - 0.6, DOCK.y + DOCK.d, 3]]), { tone: 'lo' }));
  out.push(D(k.corners(dock, 2.6).map(([x, y]) => at([x, y, DOCK.top])), { size: 0.4 }));
  return out.join('');
}

function gateBack() {
  const out = [];
  // Scanner gantry: far post, header, four lamps; the pusher sits under it.
  out.push(box({ x: ARCH.x, y: ARCH.farY, w: ARCH.w, d: ARCH.farD, r: 0.6 }, 0, ARCH.z1, { tone: 'mid' }, 2, 0.4));
  out.push(D([at([ARCH.x + 1.5, ARCH.farY + ARCH.farD, 26]), at([ARCH.x + ARCH.w - 1.5, ARCH.farY + ARCH.farD, 26]), at([ARCH.x + 1.5, ARCH.farY + ARCH.farD, 22]), at([ARCH.x + ARCH.w - 1.5, ARCH.farY + ARCH.farD, 22])], { size: 0.4 }));
  const hs = PUSH.housing;
  out.push(box({ x: PUSH.x - 1, y: hs.y, w: PUSH.w + 2, d: hs.d, r: 0.4 }, 4, 20, { tone: 'mid' }, 3, 0.3));
  out.push(L(path([[PUSH.x - 0.7, hs.y + hs.d, 12], [PUSH.x + PUSH.w + 0.7, hs.y + hs.d, 12]]), { tone: 'lo', free: true }));
  out.push(L(path([[PUSH.x + 1, hs.y + hs.d, 6], [PUSH.x + PUSH.w - 1, hs.y + hs.d, 6], [PUSH.x + PUSH.w - 1, hs.y + hs.d, 10], [PUSH.x + 1, hs.y + hs.d, 10]], true), { tone: 'lo' }));
  out.push(D([at([PUSH.x + 1.2, hs.y + hs.d, 17]), at([PUSH.x + PUSH.w - 1.2, hs.y + hs.d, 17])], { size: 0.4 }));
  out.push(`<g data-part="pad">${padSvg()}</g>`);
  // Barrier far post.
  out.push(box({ x: BARRIER.x, y: BARRIER.farY, w: BARRIER.w, d: BARRIER.d, r: 0.5 }, 0, BARRIER.h, { tone: 'mid' }, 2, 0.3));
  out.push(D([at([BARRIER.x + 2, BARRIER.farY + BARRIER.d, 18])], { size: 0.5, tone: 'hi' }));
  out.push(L(path([[BARRIER.x, BARRIER.farY + BARRIER.d, 5], [BARRIER.x + BARRIER.w, BARRIER.farY + BARRIER.d, 5]]), { tone: 'lo' }));
  // Header spans the belt on the far post.
  out.push(box({ x: ARCH.x, y: ARCH.farY, w: ARCH.w, d: ARCH.head - ARCH.farY, r: 0.4 }, ARCH.z1, ARCH.z2, { tone: 'mid' }, 3, 0.3));
  out.push(D([at([ARCH.x + 1.5, ARCH.head, ARCH.z1 + 3.5]), at([ARCH.x + ARCH.w - 1.5, ARCH.head, ARCH.z1 + 3.5])], { size: 0.4 }));
  out.push(L(k.planOutline({ x: ARCH.x + 1.2, y: ARCH.farY + 1.2, w: ARCH.w - 2.4, d: ARCH.head - ARCH.farY - 2.4, r: 0.5 }, ARCH.z2, P, 2), { tone: 'faint' }));
  const lampsY = [14.5, 20.5, 26.5, 32.5];
  lampsY.forEach((y, j) => {
    out.push(col(ARCH.x + 3, y, 2.4, ARCH.z2, ARCH.z2 + 1, { tone: 'mid' }, 20));
    out.push(col(ARCH.x + 3, y, 1.8, ARCH.z2 + 1, ARCH.z2 + 2.2, { tone: 'hi', crease: 'lo' }, 20));
    const [lx, ly] = at([ARCH.x + 3, y, ARCH.z2 + 2.2]);
    out.push(`<circle class="fig-led" data-gate="${j}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.9" opacity="0.25"/>`);
  });
  return out.join('');
}

function padSvg() {
  const { x, w, pad } = PUSH;
  const body = S(k.slabOf({ x, y: pad.y, w, d: pad.d, r: 0.5 }, pad.z[0], pad.z[1] - pad.z[0], P, 2, 0.3), { tone: 'hi', crease: 'lo' });
  const face = pad.y + pad.d;
  const ribs = L(path([[x + 0.6, face, pad.z[0] + 1.6], [x + w - 0.6, face, pad.z[0] + 1.6]]) + path([[x + 0.6, face, pad.z[1] - 1.6], [x + w - 0.6, face, pad.z[1] - 1.6]]), { tone: 'mid', free: true });
  // The push rod behind the pad, drawn to its housing.
  return S(k.slabOf({ x: x + w / 2 - 1, y: pad.y - 2, w: 2, d: 2.2, r: 0.3 }, 14, 4, P, 2, 0.2), { tone: 'mid', crease: 'none' }) + body + ribs;
}

function beam() {
  const z0 = ARCH.z1, y0 = BELT.cy - 3.6, y1 = BELT.cy + 3.6;
  const x = STOP_X;
  return `<g data-part="beam" opacity="0" style="--anatomy-hi:var(--fig-accent,#7c3aed)">${L(path([[x, y0, z0], [x, y0, BELT.top + 0.2]]) + path([[x, y1, z0], [x, y1, BELT.top + 0.2]]) + path([[x, y0, BELT.top + 0.2], [x, y1, BELT.top + 0.2]]), { tone: 'hi', free: true })}</g>`;
}

function barrierNear() {
  const out = [];
  out.push(box({ x: BARRIER.x, y: BARRIER.nearY, w: BARRIER.w, d: BARRIER.d, r: 0.5 }, 0, BARRIER.h, { tone: 'mid' }, 2, 0.3));
  out.push(L(path([[BARRIER.x, BARRIER.nearY + BARRIER.d, 5], [BARRIER.x + BARRIER.w, BARRIER.nearY + BARRIER.d, 5]]), { tone: 'lo' }));
  out.push(L(faceCircle([BARRIER.x + 2, BARRIER.nearY + BARRIER.d, 13], 1.2, 'y', 12), { tone: 'mid' }));
  out.push(D([at([BARRIER.x + 2, BARRIER.nearY + BARRIER.d, 13]), at([BARRIER.x + 2, BARRIER.nearY + BARRIER.d, 18])], { size: 0.5, tone: 'hi' }));
  return out.join('');
}

// Quarantine crate: back and left walls, floor; front and right walls are painted after the dropped request.
function crateBack() {
  const { x, y, w, d, h, wall, floor } = CRATE;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 1 }, 0, h, P)}"/>`];
  out.push(box({ x, y, w, d, r: 1 }, 0, floor, { tone: 'mid' }, 3, 0.4));
  out.push(box({ x, y, w, d: wall, r: 0.5 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(box({ x, y, w: wall, d, r: 0.5 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(S(k.slabOf({ x: x + wall, y: y + wall, w: w - wall * 2, d: d - wall * 2, r: 0.5 }, floor, 0.01, P, 2), { tone: 'lo', crease: 'none', flat: true }));
  return out.join('');
}

function crateFront() {
  const { x, y, w, d, h, wall, floor } = CRATE;
  const face = y + d;
  const out = [];
  out.push(box({ x, y: face - wall, w, d: wall, r: 0.5 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(box({ x: x + w - wall, y, w: wall, d, r: 0.5 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(L(k.planOutline({ x: x + 1, y: y + 1, w: w - 2, d: d - 2, r: 0.6 }, h, P, 2), { tone: 'faint' }));
  // A "no entry" mark on the front face: ring and slash end on the ring.
  const cx = x + w / 2, cz = 5;
  out.push(L(faceCircle([cx, face, cz], 2.4, 'y', 20), { tone: 'hi' }));
  const s = 2.4 * Math.SQRT1_2;
  out.push(L(path([[cx - s, face, cz + s], [cx + s, face, cz - s]]), { tone: 'hi' }));
  out.push(D(k.corners({ x, y, w, d }, 1.6).filter(([, py]) => py > y + 1).map(([px, py]) => at([px, py, h])), { size: 0.4 }));
  return out.join('');
}

// ---- results side ----

function girder() {
  const out = [];
  const { x, w, y, d, z0, top } = GIRDER;
  const beamZ = z0 - 5;
  // Cross beam on the pylon under the bridge end.
  out.push(box({ x: PYLON.x - 2, y: -PYLON.y - PYLON.d + 1, w: PYLON.w + 4, d: (PYLON.y + PYLON.d) * 2 - 2, r: 0.8 }, beamZ, z0, { tone: 'mid' }, 3, 0.4));
  out.push(`<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 1 }, z0, top - z0, P)}" style="filter:blur(3px)"/>`);
  out.push(box({ x, y, w, d, r: 0.4 }, z0, top, { tone: 'mid' }, 3, 0.3));
  const strip = { x: RESULT.x0, y: y + 2, w: x + w - RESULT.x0, d: d - 4, r: 0.6 };
  out.push(S(k.slabOf(strip, top, 0.01, P, 3), { tone: 'lo', crease: 'none', flat: true }));
  out.push(L([y + 4.5, y + d - 4.5].map((py) => k.lineOnTop([RESULT.x0 + 4, py], [x + w - 3, py], top, P)).join(''), { tone: 'lo', flow: true, free: true }));
  // Truss on the near side: diagonals between a top and bottom chord.
  const face = y + d;
  out.push(L(path([[x + 1, face, z0 + 2], [x + w - 1, face, z0 + 2]]) + path([[x + 1, face, top - 2], [x + w - 1, face, top - 2]]), { tone: 'lo' }));
  let truss = '';
  for (let i = 0; i < 8; i++) {
    const a = x + 1 + i * ((w - 2) / 8), b = x + 1 + (i + 1) * ((w - 2) / 8);
    truss += i % 2 ? path([[a, face, top - 2], [b, face, z0 + 2]]) : path([[a, face, z0 + 2], [b, face, top - 2]]);
  }
  out.push(L(truss, { tone: 'faint' }));
  out.push(D([at([x + 1, face, z0 + 2]), at([x + w - 1, face, z0 + 2]), at([x + 1, face, top - 2]), at([x + w - 1, face, top - 2])], { size: 0.45 }));
  return out.join('');
}

function pylon(near) {
  const y = near ? PYLON.y : -PYLON.y - PYLON.d;
  const out = [box({ x: PYLON.x - 1, y: y - 1, w: PYLON.w + 2, d: PYLON.d + 2, r: 0.8 }, 0, 3, { tone: 'mid' }, 2, 0.3)];
  out.push(box({ x: PYLON.x, y, w: PYLON.w, d: PYLON.d, r: 0.6 }, 3, PYLON.h, { tone: 'mid', crease: 'none' }, 2, 0.3));
  if (near) {
    const face = PYLON.y + PYLON.d;
    out.push(L(path([[PYLON.x + 0.7, face, 12], [PYLON.x + PYLON.w - 0.7, face, 12]]) + path([[PYLON.x + 0.7, face, 60], [PYLON.x + PYLON.w - 0.7, face, 60]]), { tone: 'lo' }));
    out.push(D([at([PYLON.x + 2, face, 2]), at([PYLON.x + 2, face, 30]), at([PYLON.x + 2, face, 90])], { size: 0.4 }));
  }
  return out.join('');
}

function binBack() {
  const { x, y, w, d, h, wall, floor } = BIN;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x, y, w, d, r: 1 }, 0, h, P)}"/>`];
  out.push(box({ x, y, w, d, r: 1.2 }, 0, floor, { tone: 'mid' }, 3, 0.4));
  out.push(box({ x, y, w, d: wall, r: 0.6 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(box({ x, y, w: wall, d, r: 0.6 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(S(k.slabOf({ x: x + wall, y: y + wall, w: w - wall * 2, d: d - wall * 2, r: 0.6 }, floor, 0.01, P, 2), { tone: 'lo', crease: 'none', flat: true }));
  return out.join('');
}

function binFront() {
  const { x, y, w, d, h, wall, floor } = BIN;
  const face = y + d;
  const out = [];
  out.push(box({ x, y: face - wall, w, d: wall, r: 0.6 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(box({ x: x + w - wall, y, w: wall, d, r: 0.6 }, floor, h, { tone: 'mid' }, 2, 0.3));
  out.push(L(k.planOutline({ x: x + 1.2, y: y + 1.2, w: w - 2.4, d: d - 2.4, r: 0.8 }, h, P, 2), { tone: 'faint' }));
  out.push(D(k.corners({ x, y, w, d }, 2).map(([px, py]) => at([px, py, h])), { size: 0.4 }));
  out.push(L(k.sideSeam({ x, y, w, d, r: 1.2 }, 1.6, P, 3), { tone: 'lo' }));
  // The results dial: a plate, a bezel, six ticks, a hub; the needle is live.
  const fy = face + 1.4;
  out.push(box({ x: DIAL.x - 10, y: face, w: 20, d: 1.4, r: 1 }, 2.4, 23.6, { tone: 'lo', crease: 'lo' }, 2, 0.3));
  out.push(L(faceCircle([DIAL.x, fy, DIAL.z], DIAL.r, 'y', 36), { tone: 'mid' }));
  out.push(L(faceCircle([DIAL.x, fy, DIAL.z], DIAL.r + 2, 'y', 36), { tone: 'lo' }));
  let ticks = '';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    ticks += path([[DIAL.x + s * (DIAL.r - 2), fy, DIAL.z + c * (DIAL.r - 2)], [DIAL.x + s * DIAL.r, fy, DIAL.z + c * DIAL.r]]);
  }
  out.push(L(ticks, { tone: 'hi' }));
  out.push(D(Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2 + Math.PI / 12; return at([DIAL.x + Math.sin(a) * (DIAL.r - 1), fy, DIAL.z + Math.cos(a) * (DIAL.r - 1)]); }).filter((_, i) => i % 2 === 0), { size: 0.32, tone: 'lo' }));
  out.push(D([at([DIAL.x - 8.8, fy, 4.4]), at([DIAL.x + 8.8, fy, 4.4]), at([DIAL.x - 8.8, fy, 21.6]), at([DIAL.x + 8.8, fy, 21.6])], { size: 0.4 }));
  out.push(`<g data-part="needle">${needleSvg(k, P, C, 0)}</g>`);
  return out.join('');
}

function plinth() {
  const { x, y, w, d, h } = PLINTH;
  const plan = { x, y, w, d, r: 1.6 };
  const face = y + d;
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, h, P)}"/>`];
  out.push(box(plan, 0, h, { tone: 'mid' }, 3, 0.6));
  out.push(L(k.sideSeam(plan, 2.4, P, 3), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), h, P, 3), { tone: 'faint' }));
  out.push(D(k.corners(plan, 2.4).map(([px, py]) => at([px, py, h])), { size: 0.4 }));
  // The channel the chain lies in.
  out.push(S(k.slabOf({ x: x + 3, y: y + 5, w: w - 6, d: 12, r: 0.8 }, h, 0.01, P, 3), { tone: 'lo', crease: 'none', flat: true }));
  // Plate on the front face with rule lines.
  out.push(box({ x: x + 6, y: face, w: 26, d: 0.6, r: 0.3 }, 1.8, 5.2, { tone: 'lo', crease: 'none' }, 2, 0.2));
  [4.2, 2.8].forEach((z, i) => out.push(L(path([[x + 9, face + 0.6, z], [x + (i ? 20 : 29), face + 0.6, z]]), { tone: 'faint', free: true })));
  out.push(D([at([x + w - 6, face, 3.5]), at([x + w - 11, face, 3.5])], { size: 0.5, tone: 'hi' }));
  return out.join('');
}

// One ledger block with its link back to the previous one, at the origin of its slot.
function blockSvg(i) {
  const cx = BLOCK.x0 + i * BLOCK.pitch + BLOCK.w / 2, cy = PLINTH.y + 11;
  const z0 = PLINTH.h;
  const out = [];
  if (i > 0) out.push(box({ x: cx - BLOCK.pitch / 2 - 0.8, y: cy - 1.4, w: BLOCK.pitch - BLOCK.w + 1.6, d: 2.8, r: 0.3 }, z0 + 1.4, z0 + 2.8, { tone: 'lo', crease: 'none' }, 2, 0.1));
  out.push(box({ x: cx - BLOCK.w / 2, y: cy - BLOCK.d / 2, w: BLOCK.w, d: BLOCK.d, r: 0.8 }, z0, z0 + BLOCK.h, { tone: 'hi', crease: 'lo' }, 2, 0.4));
  const top = z0 + BLOCK.h;
  out.push(L(k.lineOnTop([cx - 1.6, cy - 3], [cx + 1.6, cy - 3], top, P) + k.lineOnTop([cx - 1.6, cy - 0.6], [cx + 1.6, cy - 0.6], top, P) + k.lineOnTop([cx - 1.6, cy + 1.8], [cx + 0.4, cy + 1.8], top, P), { tone: 'mid', free: true }));
  out.push(D([at([cx, cy + BLOCK.d / 2, z0 + BLOCK.h - 1.2])], { size: 0.45, tone: 'mid' }));
  return out.join('');
}

// ---- packets and parcels (drawn at the origin, moved by the live script) ---

function packetSvg(kind) {
  const { hx, hy, h } = PKT;
  const out = [S(k.slabOf({ x: -hx, y: -hy, w: hx * 2, d: hy * 2, r: 0.8 }, 0, h, P, 2, 0.3), { tone: 'hi', crease: 'lo' })];
  const lt = (a, b) => k.lineOnTop(a, b, h, P);
  if (kind === 'prompt') {
    out.push(L(lt([-3, -2.4], [3, -2.4]) + lt([-3, -0.6], [3.2, -0.6]) + lt([-3, 1.2], [1, 1.2]), { tone: 'mid', free: true }));
  } else if (kind === 'file') {
    out.push(L(k.onTop([[1.4, -3.2], [3.2, -3.2], [3.2, -1.4], [1.4, -3.2]], h, P, true), { tone: 'mid' }));
    out.push(L(lt([-3, 0.4], [3, 0.4]) + lt([-3, 2.2], [0.8, 2.2]), { tone: 'mid', free: true }));
  } else {
    out.push(L(k.ring(-1, 0, 2.2, h, P, 14), { tone: 'mid' }));
    out.push(D([at([-1, 0, h])], { size: 0.6, tone: 'hi' }));
    out.push(L(lt([2.4, 0], [3.6, 0]), { tone: 'mid', free: 'end' }));
  }
  out.push(L(path([[-3.2, hy, 2.3], [3.2, hy, 2.3]]), { tone: 'lo', free: true }));
  return out.join('');
}

function parcelSvg() {
  const { half: a, h } = PARCEL;
  const out = [S(k.slabOf({ x: -a, y: -a, w: a * 2, d: a * 2, r: 0.6 }, 0, h, P, 2, 0.3), { tone: 'hi', crease: 'lo', lit: true })];
  out.push(L(k.lineOnTop([0, -a], [0, a], h, P) + k.lineOnTop([-a, 0], [a, 0], h, P), { tone: 'mid' }));
  out.push(L(path([[0, a, 0], [0, a, h]]) + path([[a, 0, 0], [a, 0, h]]), { tone: 'mid' }));
  return out.join('');
}

// ---- paint back to front --------------------------------------------------

const KINDS = ['prompt', 'file', 'tool', 'prompt'];
const SLOTS = 4;

const body = [
  basePlate(P, PLATE, { label: { x: -144, y: -36, w: 28, d: 14, r: 1.5 }, ruler: { x: -40, y: 52, w: 90, d: 6, r: 1 } }),
  // Rear and left fences (behind the tower).
  fence('x', FENCE.y0, FENCE.x0, FENCE.x1, 5),
  fence('y', FENCE.x0, FENCE.y0, BARRIER.farY - 1, 3),
  hopper(),
  tower(),
  roof(),
  sign(),
  // Right fence, then the delivery side.
  fence('y', FENCE.x1, FENCE.y0, FENCE.y1, 4),
  pylon(false),
  binBack(),
  girder(),
  `<g data-part="parcels">${Array.from({ length: SLOTS }, (_, s) => `<g data-parcel="${s}" opacity="0">${parcelSvg()}</g>`).join('')}</g>`,
  binFront(),
  pylon(true),
  plinth(),
  `<g data-part="blocks">${Array.from({ length: 8 }, (_, i) => `<g data-blk="${i}" opacity="0">${blockSvg(i)}</g>`).join('')}</g>`,
  // Belt, gate and crate.
  beltFrame(),
  gateBack(),
  `<g data-part="packets">${Array.from({ length: SLOTS }, (_, s) => `<g data-slot="${s}" opacity="0">${packetSvg(KINDS[s])}</g>`).join('')}</g>`,
  beam(),
  barrierNear(),
  `<g data-part="boom">${boomSvg(k, P, C, 0)}</g>`,
  crateBack(),
  `<g data-part="rejects">${Array.from({ length: SLOTS }, (_, s) => `<g data-rej="${s}" opacity="0">${packetSvg(KINDS[s])}</g>`).join('')}</g>`,
  crateFront(),
  fence('x', FENCE.y1, FENCE.x0, FENCE.x1, 6),
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A Pavii office tower with a PAVII sign on a bench plate. Requests arrive on a belt from a hopper and stop under a scanner at the security gate. A safe request lifts the boom and goes into the lobby; a leaking request is pushed off the belt into a quarantine crate. Each check adds a block to a ledger of receipts on Hyper 0X. Safe requests climb the side of the tower and light six service rooms in turn: compute, AI assistant, custom LLMs, research, coding and video generation. A finished result leaves the roof, crosses a bridge and drops into a delivery bin, and a dial counts the results.',
  body,
});

const pins = pinsHtml(P, WIDTH, HEIGHT, [
  { id: 'hopper', at: [HOPPER.x + HOPPER.w / 2, HOPPER.y + HOPPER.d / 2, HOPPER.h + 10], icon: 'file-arrow-down', title: 'Requests', sub: 'Prompts, files and tool calls', lift: 10, expand: true, seek: 'arrive' },
  { id: 'gate', at: [BARRIER.x + 2, BARRIER.nearY + BARRIER.d, 14], icon: 'shield-check', title: 'Pavii security', sub: 'Every request is checked at the gate', side: 'down', lift: 70, expand: true, seek: 'check' },
  ...ROOMS.map((r, n) => (n < 3 ? { id: r.id, at: [SX + 1.2, SIDE_WIN.y1 - 1.4, roomZ(n)], icon: r.icon, title: r.title, side: 'right', lift: 14, seek: 'work' } : { id: r.id, at: [WIN.x0, FY, roomZ(n)], icon: r.icon, title: r.title, side: 'left', lift: 20 + (n % 2) * 16, seek: 'work' })),
  { id: 'ledger', at: [PLINTH.x + PLINTH.w / 2, PLINTH.y + PLINTH.d, 3.5], icon: 'receipt', title: 'Receipts on Hyper 0X', sub: 'One block for each checked request', side: 'down', lift: 16, expand: true, seek: 'receipt' },
  { id: 'results', at: [BIN.x + BIN.w, 0, BIN.h], icon: 'trend-up', title: 'Results', sub: 'Delivered work, counted', side: 'right', lift: 20, expand: true, seek: 'deliver' },
]);

const steps = stepsHtml([
  { id: 'arrive', icon: 'file-arrow-down', title: 'Requests arrive', sub: 'Prompts, files and tool calls' },
  { id: 'check', icon: 'shield-check', title: 'Pavii checks them', sub: 'Unsafe ones stop at the gate' },
  { id: 'work', icon: 'cpu', title: 'Services do the work', sub: 'Video, code, research and custom LLMs' },
  { id: 'receipt', icon: 'receipt', title: 'Every result has a receipt', sub: 'Kept on Hyper 0X' },
]);

// ---- the loop: a fixed run of requests, each a pure function of its age ----

// bad: the check that stops the request (-1 = safe).
const REQS = [{ bad: -1 }, { bad: -1 }, { bad: 2 }, { bad: -1 }, { bad: -1 }, { bad: 1 }, { bad: -1 }, { bad: -1 }];
const PERIOD = 2.4;
const LOOP = REQS.length * PERIOD;
const CHECKS = ['injection', 'privacy', 'tool', 'egress'];
const A = {
  startX: -121,
  speed: 36,
  stopX: STOP_X,
  lamp0: 1.5,
  lampGap: 0.22,
  pass: 2.45,
  goX: -5,
  go: 2.7,
  goSpeed: 50,
  boomUp: [2.45, 2.75],
  boomDown: [3.35, 3.7],
  push: [2.55, 3.2],
  pull: [3.25, 3.75],
  pulse: [4.35, 5.9],
  hatch: [5.9, 6.15],
  cross: [6.15, 8.1],
  fall: [8.1, 8.75],
  land: [8.75, 9.1],
  needle: [8.75, 9.25],
  dur: 9.2,
};
A.arrive = (A.stopX - A.startX) / A.speed;
A.turn = [A.go + (A.goX - A.stopX) / A.goSpeed, A.go + (A.goX - A.stopX) / A.goSpeed + 0.35];
A.dec = (bad) => (bad < 0 ? A.pass : A.lamp0 + A.lampGap * bad + 0.05);
const SERIAL = 1204;
const SEEK = {
  arrive: 0.2,
  check: 2 * PERIOD + 2.95,
  work: A.pulse[0] + 0.5,
  receipt: A.pass + 0.4,
  deliver: A.fall[1] - 0.8,
};

const live = `
${prismX.toString()}
${boomSvg.toString()}
${needleSvg.toString()}
${barSvg.toString()}
${playFigure.toString()}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify({ ...C, BELT_TOP: BELT.top, BELT_Y: BELT.cy, REQS, PERIOD, LOOP, CHECKS, A: { ...A, dec: undefined }, SERIAL, CRATE, PUSH, PKT, PARCEL, FZ: Array.from({ length: FLOORS }, (_, n) => FZ(n)), ROOM_Z: Array.from({ length: FLOORS }, (_, n) => roomZ(n)), ROOM_IDS: ROOMS.map((r) => r.id), ROOM_TITLES: ROOMS.map((r) => r.title), ROOF_TOP, SX, RISER_Y, BLOCK, PLINTH, HATCH_X: 20, GIRDER_TOP: GIRDER.top, FACE })};
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
  const slotOf = (i) => i % ${SLOTS};
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
    stillAt: ${JSON.stringify(2 * PERIOD + 0 + 5.0)},
    seek: ${JSON.stringify(SEEK)},
  });
}
`;

const plate = k.plateHtml({
  fig: 'Fig 5',
  title: 'Inside Pavii',
  hint: 'Every request is checked before it reaches a service',
  readout: 'request #1208 · checked · delivered',
  body: `<div class="iso-stage" data-figure="ai-tower">${svg}${pins}</div>`,
}).replace('</figure>', `${steps}</figure>`);

writeFigure('ai-tower', { plate, live, title: 'Inside Pavii' });
