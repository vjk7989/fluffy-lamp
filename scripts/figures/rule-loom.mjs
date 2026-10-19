// Fig 4: rules the model cannot forget (Anatomy kit, MIT; see ./kit/LICENSE).
//
// A small punched-card controller on a bench, like the head of a Jacquard
// loom. The rules are punched cards laced into an endless chain that loops
// over a drum and an idler: the smart contracts on Hyper 0X. Every cycle the
// drum turns one card to the top and a reader drops six feeler pins onto it.
// Beside it, a paper tape runs past a print head and through a short window,
// then winds onto a take-up spool: the model's context window. The first text
// on the tape is the rules written into the prompt. As the context fills,
// that text scrolls out of the window and onto the spool, but the card chain
// keeps turning and the reader keeps applying the rule cards. A lever on the
// reader moves to allow or block as each request meets the current card.
// Loop: the tape fills, then rewinds for a new session; the cards keep cycling.
//
// Run: node scripts/figures/rule-loom.mjs
import { k, tools, basePlate, pinsHtml, stepsHtml, playFigure, writeFigure } from './lib.mjs';

const WIDTH = 760;
const HEIGHT = 400;

const PLATE = { x: -142, y: -56, w: 266, d: 104, r: 8 };

// The loom: card chain on a drum (top) and an idler (bottom), axes along y.
const LOOM = { x: 72, zd: 66, zi: 24.6, rc: 12.6, core: 12, cards: 12, len: 11, th: 1.2, half: 17, flange: 15, holes: [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5] };
const PLINTH = { x: 44, y: -32, w: 56, d: 64, r: 3 };
const UPRIGHT = { w: 8, d: 6, top: 74 };
const COLUMN = { x: 68, y: -46, w: 8, d: 8, r: 1.5, top: 108 };
const HEAD = { x0: 63, x1: 81, y0: -19, y1: 19, z0: 96, z1: 109 };
const ARM = { x: 68, y: -46, w: 8, d: 27, r: 1.2, z0: 101, z1: 108 };
const LEVER = { x: 81, y: 0, z: 100, len: 17, swing: 27 };

// The tape deck: supply spool, guides, print head, window, take-up spool.
const DECK = { x: -126, y: -14, w: 152, d: 46, r: 3 };
const YT = 20;
const TZ = [8, 22];
const SUPPLY = { x: -102, y: 6 };
const TAKE = { x: 4, y: 6 };
const SPOOL = { flange: 18, r0: 7, r1: 15 };
const GUIDES = [-80, -18];
const PRINT = { x: -71, y: 7, w: 10, d: 12.6, r: 1, h: 26 };
const WIN = { x0: -62, x1: -23, post: 3 };
const X_HEAD = PRINT.x + PRINT.w;

// Timing (seconds). The chain advances one card per cycle and makes exactly
// one full turn per loop, so the loop is seamless.
const T = { cycle: 1.5, advance: 0.5, run: 16, loop: 18, v: 5, start: 0.6 };
const D_MAX = T.v * T.run;
const D0 = T.v * T.start;
const PROMPT = 14;
// The decision for each cycle (true = block), and each card's punched holes.
const BLOCK = [false, false, true, false, false, false, true, false, false, true, false, false];
const HOLES = ['101001', '010110', '110010', '001101', '100110', '011001', '101100', '010011', '110101', '001010', '100011', '011100'];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [LOOM.x, -46, HEAD.z1 + 8], [LOOM.x, 19, HEAD.z1 + 8], [HEAD.x1, 0, LEVER.z + LEVER.len + 3]],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 56 },
);

const { at, S, L, D, byDepth, col, box, path, faceCircle } = tools(P);

// ---- live builders (pure; embedded with toString()) ----------------------

// A convex solid from 3D vertices and faces, shaded like the kit's slabs:
// faces that look up take the top tone, the rest take one of four shades by
// how they face the light; the outline is the silhouette.
function polySolid(K, P, V, F) {
  const cam = K.cameraOf(P);
  const view = [cam.cosA * cam.cosE, cam.sinA * cam.cosE, cam.sinE];
  const light = [-cam.sinA, cam.cosA];
  const pr = V.map((p) => K.iso(p, P));
  const mid = [0, 1, 2].map((i) => V.reduce((s, p) => s + p[i], 0) / V.length);
  const shades = [[], [], [], []];
  const top = [];
  const facing = [];
  const normals = [];
  for (const f of F) {
    let n = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = V[f[i]], b = V[f[(i + 1) % f.length]];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const c = [0, 1, 2].map((i) => f.reduce((s, j) => s + V[j][i], 0) / f.length);
    if (n[0] * (c[0] - mid[0]) + n[1] * (c[1] - mid[1]) + n[2] * (c[2] - mid[2]) < 0) n = n.map((x) => -x);
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    n = n.map((x) => x / len);
    normals.push(n);
    const on = n[0] * view[0] + n[1] * view[1] + n[2] * view[2] > 1e-6;
    facing.push(on);
    if (!on) continue;
    const d = K.pathOf(f.map((j) => pr[j]), true);
    if (n[2] > 0.55) { top.push(d); continue; }
    const h = Math.hypot(n[0], n[1]) || 1;
    const lit = ((n[0] / h) * light[0] + (n[1] / h) * light[1] + 1) / 2;
    shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))].push(d);
  }
  const edges = new Map();
  F.forEach((f, fi) => f.forEach((a, i) => {
    const b = f[(i + 1) % f.length];
    const key = a < b ? a + '_' + b : b + '_' + a;
    (edges.get(key) || edges.set(key, []).get(key)).push(fi);
  }));
  const crease = [];
  for (const [key, list] of edges) {
    const [na, nb] = list.length === 2 ? [normals[list[0]], normals[list[1]]] : [];
    if (list.length === 2 && facing[list[0]] && facing[list[1]] && na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2] < 0.94) {
      const [a, b] = key.split('_').map(Number);
      crease.push(K.pathOf([pr[a], pr[b]]));
    }
  }
  const pts = [...pr].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = K.pathOf([...lower.slice(0, -1), ...upper.slice(0, -1)], true);
  return { fill: hull, shades: shades.map((s) => s.join('')), top: top.join(''), crease: crease.join(''), outline: hull };
}

// A prism: the 2D section pts (in the a, b plane through O) swept along n
// from t0 to t1.
function prismOf(K, P, pts, O, a, b, n, t0, t1) {
  const at = ([u, v], t) => [0, 1, 2].map((i) => O[i] + a[i] * u + b[i] * v + n[i] * t);
  const V = [...pts.map((p) => at(p, t0)), ...pts.map((p) => at(p, t1))];
  const m = pts.length;
  const F = [pts.map((_, i) => i), pts.map((_, i) => m + i)];
  for (let i = 0; i < m; i++) F.push([i, (i + 1) % m, m + ((i + 1) % m), m + i]);
  return polySolid(K, P, V, F);
}
function roundOf(r, steps, from) {
  return Array.from({ length: steps }, (_, i) => { const a = (from || 0) + (i / steps) * Math.PI * 2; return [r * Math.cos(a), r * Math.sin(a)]; });
}
// A round body along y (a drum, flange, axle cap): section in x-z.
function roundY(K, P, x, z, r, y0, y1, steps) {
  return prismOf(K, P, roundOf(r, steps || 32), [x, 0, z], [1, 0, 0], [0, 0, 1], [0, 1, 0], y0, y1);
}
// A box from its centre, three unit axes and half sizes.
function boxOf(K, P, c, u, v, w, hu, hv, hw) {
  return prismOf(K, P, [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]], c, u, v, w, -hw, hw);
}

// A point on the chain loop, s measured from the top of the drum toward -x.
function chainAt(C, s) {
  const { x, zd, zi, rc } = C.LOOM;
  const run = zd - zi;
  const q = (Math.PI / 2) * rc;
  const total = 2 * run + 2 * Math.PI * rc;
  s = ((s % total) + total) % total;
  const arc = (cz, phi) => ({ c: [x + rc * Math.cos(phi), 0, cz + rc * Math.sin(phi)], n: [Math.cos(phi), 0, Math.sin(phi)] });
  if (s < q) return arc(zd, Math.PI / 2 + s / rc);
  s -= q;
  if (s < run) return { c: [x - rc, 0, zd - s], n: [-1, 0, 0] };
  s -= run;
  if (s < Math.PI * rc) return arc(zi, Math.PI + s / rc);
  s -= Math.PI * rc;
  if (s < run) return { c: [x + rc, 0, zi + s], n: [1, 0, 0] };
  s -= run;
  return arc(zd, s / rc);
}

// The card chain and the two cores, in painter's order: cards whose outer
// face looks away, then the idler and drum cores, then the cards facing us.
function chainSvg(K, P, C, offset, topCard) {
  const L0 = C.LOOM;
  const cam = K.cameraOf(P);
  const view = [cam.cosA * cam.cosE, cam.sinA * cam.cosE, cam.sinE];
  const total = 2 * (L0.zd - L0.zi) + 2 * Math.PI * L0.rc;
  const pitch = total / L0.cards;
  const back = [], front = [];
  for (let i = 0; i < L0.cards; i++) {
    const { c, n } = chainAt(C, (i - offset) * pitch);
    const t = [-n[2], 0, n[0]];
    const y = [0, 1, 0];
    const paths = boxOf(K, P, c, t, y, n, L0.len / 2, L0.half, L0.th / 2);
    const facesUs = n[0] * view[0] + n[2] * view[2] > 0;
    // Holes are punched through, so they show on whichever big face we see.
    const side = facesUs ? 1 : -1;
    const fc = c.map((v, j) => v + n[j] * side * (L0.th / 2 + 0.05));
    const holes = [];
    C.HOLES[i].split('').forEach((bit, j) => {
      if (bit !== '1') return;
      const pts = [];
      for (let a = 0; a < 14; a++) {
        const th = (a / 14) * Math.PI * 2;
        pts.push(K.iso([fc[0] + t[0] * Math.cos(th) * 1.5, L0.holes[j] + Math.sin(th) * 1.5, fc[2] + t[2] * Math.cos(th) * 1.5], P));
      }
      holes.push(K.pathOf(pts, true));
    });
    const lace = [];
    for (const e of [-1, 1]) for (const yy of [-15.4, 15.4]) lace.push(K.iso([fc[0] + t[0] * e * 4.4, yy, fc[2] + t[2] * e * 4.4], P));
    const seen = facesUs || n[0] * -view[0] + n[2] * -view[2] > 0;
    const marks = seen
      ? `<path class="iso-shade" data-shade="0" d="${holes.join('')}"/>` + K.lineSvg(holes.join(''), { tone: 'mid' }) + K.dotsSvg(lace, { size: 0.4, tone: 'mid' })
      : '';
    const svg = K.solidSvg(paths, { tone: 'hi', crease: 'lo', lit: i === topCard }) + marks;
    (facesUs ? front : back).push({ d: K.depthOf(c, P), svg });
  }
  const sort = (list) => list.sort((a, b) => a.d - b.d).map((e) => e.svg).join('');
  const core = (z) => K.solidSvg(roundY(K, P, L0.x, z, L0.core, -L0.half - 0.5, L0.half + 0.5, 36), { tone: 'mid', crease: 'faint' });
  return sort(back) + core(L0.zi) + core(L0.zd) + sort(front);
}

// Peg dots on the front face of a flange, turning with the drum.
function pegsSvg(K, P, C, angle) {
  const L0 = C.LOOM;
  const y = L0.half + 0.5;
  const out = [];
  for (const z of [L0.zi, L0.zd]) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = angle + (i / 8) * Math.PI * 2;
      pts.push(K.iso([L0.x + Math.cos(a) * 8.6, y, z + Math.sin(a) * 8.6], P));
    }
    out.push(K.dotsSvg(pts, { size: 0.55, tone: 'mid' }));
  }
  return out.join('');
}

// The crank on the front of the drum axle: a disc and a handle pin.
function crankSvg(K, P, C, angle) {
  const L0 = C.LOOM;
  const y0 = L0.half + 10;
  const disc = roundY(K, P, L0.x, L0.zd, 8, y0, y0 + 2.4, 36);
  const px = L0.x + Math.cos(angle) * 5.6, pz = L0.zd + Math.sin(angle) * 5.6;
  const pin = roundY(K, P, px, pz, 1.1, y0 + 2.4, y0 + 5, 14);
  const knob = roundY(K, P, px, pz, 1.9, y0 + 5, y0 + 8.4, 18);
  const spoke = K.pathOf([K.iso([L0.x, y0 + 2.4, L0.zd], P), K.iso([px, y0 + 2.4, pz], P)]);
  return K.solidSvg(disc, { tone: 'mid' }) + K.lineSvg(spoke, { tone: 'lo' }) + K.dotsSvg([K.iso([L0.x, y0 + 2.4, L0.zd], P)], { size: 0.8, tone: 'mid' }) + K.solidSvg(pin, { tone: 'mid', crease: 'none' }) + K.solidSvg(knob, { tone: 'mid' });
}

// The six feeler pins under the reader head (drawn from the head down to the
// card or to their tips) and their tails above it.
function pinsSvg(K, P, C, lift) {
  const L0 = C.LOOM, H = C.HEAD;
  const cardTop = L0.zd + L0.core + L0.th;
  const bodies = [], tails = [];
  lift.forEach((dz, j) => {
    const y = L0.holes[j];
    const tip = Math.max(cardTop, cardTop + dz);
    bodies.push(K.solidSvg(K.cylinder(L0.x, y, 0.9, tip, H.z0 - tip, P, 12), { tone: 'mid', crease: 'none' }));
    bodies.push(K.solidSvg(K.cylinder(L0.x, y, 1.5, H.z0 - 1.6, 1.6, P, 14), { tone: 'mid', crease: 'none' }));
    tails.push(K.solidSvg(K.cylinder(L0.x, y, 0.9, H.z1, 2.2 + dz, P, 12), { tone: 'hi', crease: 'none' }));
  });
  return { bodies: bodies.join(''), tails: tails.join('') };
}

// The decision lever on the reader's near end: angle in degrees, + = allow.
function leverSvg(K, P, C, deg) {
  const Lv = C.LEVER;
  const a = (deg * Math.PI) / 180;
  const d = [0, Math.sin(a), Math.cos(a)];
  const side = [0, Math.cos(a), -Math.sin(a)];
  const x = Lv.x + 1.4;
  const c = [x, Lv.y + d[1] * Lv.len / 2, Lv.z + d[2] * Lv.len / 2];
  const bar = boxOf(K, P, c, d, side, [1, 0, 0], Lv.len / 2, 0.8, 0.6);
  const tip = [x, Lv.y + d[1] * Lv.len, Lv.z + d[2] * Lv.len];
  const knob = prismOf(K, P, roundOf(2, 16), tip, [0, 1, 0], [0, 0, 1], [1, 0, 0], -1.2, 1.2);
  const hub = prismOf(K, P, roundOf(2.4, 18), [Lv.x, Lv.y, Lv.z], [0, 1, 0], [0, 0, 1], [1, 0, 0], 0.6, 2.8);
  return K.solidSvg(bar, { tone: 'mid' }) + K.solidSvg(knob, { tone: 'hi' }) + K.solidSvg(hub, { tone: 'mid' }) + K.dotsSvg([K.iso([Lv.x + 2.8, Lv.y, Lv.z], P)], { size: 0.6, tone: 'hi' });
}

// Where the tape leaves a spool for a guide: the tangent point nearest us.
function tangentOf(cx, cy, r, ex, ey) {
  const dx = ex - cx, dy = ey - cy;
  const d = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const al = Math.acos(Math.min(1, r / d));
  const p1 = [cx + r * Math.cos(base + al), cy + r * Math.sin(base + al)];
  const p2 = [cx + r * Math.cos(base - al), cy + r * Math.sin(base - al)];
  return p1[1] > p2[1] ? p1 : p2;
}
function ribbon(K, P, C, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const u = [dx / len, dy / len, 0];
  const w = [-u[1], u[0], 0];
  const zc = (C.TZ[0] + C.TZ[1]) / 2;
  return K.solidSvg(boxOf(K, P, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, zc], u, [0, 0, 1], w, len / 2, (C.TZ[1] - C.TZ[0]) / 2, 0.15), { tone: 'mid', crease: 'none' });
}
// The tape pack on a spool (radius r), between its flanges.
function packSvg(K, P, C, sp, r) {
  return K.solidSvg(K.cylinder(sp.x, sp.y, r, C.TZ[0] - 0.5, C.TZ[1] - C.TZ[0] + 1, P, 44), { tone: 'mid', crease: 'none' }) +
    K.lineSvg(K.sideArc(sp.x, sp.y, r, (C.TZ[0] + C.TZ[1]) / 2, P, 30), { tone: 'faint' });
}
// The free tape on both sides of the window, which moves as the packs change.
function tapeSides(K, P, C, rs, rt) {
  const g0 = [C.GUIDES[0], C.YT], g1 = [C.GUIDES[1], C.YT];
  return ribbon(K, P, C, tangentOf(C.SUPPLY.x, C.SUPPLY.y, rs, g0[0], g0[1]), g0) + ribbon(K, P, C, g1, tangentOf(C.TAKE.x, C.TAKE.y, rt, g1[0], g1[1]));
}
// The windows and slot on a spool's top flange, turning with it.
function spoolMarks(K, P, C, sp, angle) {
  const z = C.TZ[1] + 2;
  const holes = [];
  for (let i = 0; i < 3; i++) {
    const a = angle + (i / 3) * Math.PI * 2;
    const pts = [];
    for (let j = 0; j <= 10; j++) { const b = a - 0.42 + (j / 10) * 0.84; pts.push([sp.x + Math.cos(b) * 13.2, sp.y + Math.sin(b) * 13.2]); }
    for (let j = 10; j >= 0; j--) { const b = a - 0.42 + (j / 10) * 0.84; pts.push([sp.x + Math.cos(b) * 8.4, sp.y + Math.sin(b) * 8.4]); }
    holes.push(K.onTop(pts, z, P, true));
  }
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const slot = K.onTop([[-2.6, -0.45], [2.6, -0.45], [2.6, 0.45], [-2.6, 0.45]].map(([u, v]) => [sp.x + u * ca - v * sa, sp.y + u * sa + v * ca]), z + 3.5, P, true);
  return `<path class="iso-shade" data-shade="0" d="${holes.join('')}"/>` + K.lineSvg(holes.join(''), { tone: 'lo' }) + K.lineSvg(slot, { tone: 'mid' });
}

const C = { LOOM, HEAD, LEVER, TZ, YT, GUIDES, SUPPLY, TAKE, HOLES };

// ---- static parts ---------------------------------------------------------

function plinth() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLINTH, 0, 5, P)}" style="filter:blur(4px)"/>`];
  out.push(box(PLINTH, 0, 5, { tone: 'mid' }, 3, 0.5));
  out.push(L(k.planOutline(k.insetPlan(PLINTH, 3.5), 5, P, 3), { tone: 'faint' }));
  const screws = k.corners(PLINTH, 6);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, 5, P, 14)).join(''), { tone: 'lo' }));
  out.push(D(screws.map(([x, y]) => at([x, y, 5])), { size: 0.45 }));
  // A tie bar between the uprights, under the loop.
  out.push(box({ x: LOOM.x - 3, y: -22, w: 6, d: 44, r: 1 }, 5, 9, { tone: 'mid' }, 2, 0.3));
  return out.join('');
}

function upright(y0) {
  const plan = { x: LOOM.x - UPRIGHT.w / 2, y: y0, w: UPRIGHT.w, d: UPRIGHT.d, r: 1.2 };
  const out = [box(plan, 5, UPRIGHT.top, { tone: 'mid' }, 3, 0.5)];
  out.push(box({ x: plan.x - 2, y: y0 - 1, w: UPRIGHT.w + 4, d: UPRIGHT.d + 2, r: 1.2 }, 5, 8, { tone: 'mid' }, 3, 0.4));
  if (y0 > 0) {
    // Bearing caps with screws on the near face.
    const face = y0 + UPRIGHT.d;
    for (const z of [LOOM.zd, LOOM.zi]) {
      out.push(S(roundY(k, P, LOOM.x, z, 3.6, face, face + 1.2, 24), { tone: 'mid' }));
      out.push(D([[-2.6, 0], [2.6, 0]].map(([dx]) => at([LOOM.x + dx, face, z - 3.4 + 7])), { size: 0.35 }));
    }
    out.push(S(roundY(k, P, LOOM.x, LOOM.zi, 2.2, face + 1.2, face + 3.2, 6), { tone: 'mid' }));
    out.push(L(k.sideSeam(plan, 40, P, 3), { tone: 'lo' }));
    out.push(D([at([LOOM.x, face, 12]), at([LOOM.x, face, 48])], { size: 0.4 }));
  }
  return out.join('');
}

function flanges(y0, y1) {
  return [LOOM.zi, LOOM.zd].map(z => S(roundY(k, P, LOOM.x, z, 4, y0, y1, 24), { tone: 'mid' })).join('');
}

function column() {
  const out = [col(COLUMN.x + 4, COLUMN.y + 4, 7, 0, 2.4, { tone: 'mid' })];
  out.push(box(COLUMN, 2.4, COLUMN.top, { tone: 'mid' }, 3, 0.5));
  out.push(L([30, 70].map(z => k.sideSeam(COLUMN, z, P, 3)).join(''), { tone: 'faint' }));
  return out.join('');
}

function head() {
  const plan = { x: HEAD.x0, y: HEAD.y0, w: HEAD.x1 - HEAD.x0, d: HEAD.y1 - HEAD.y0, r: 2 };
  const out = [box(plan, HEAD.z0, HEAD.z1, { tone: 'mid' }, 4, 0.6)];
  out.push(L(k.sideSeam(plan, HEAD.z0 + 3, P, 4), { tone: 'lo' }));
  out.push(L([8, -8].map(y => faceCircle([HEAD.x1, y, HEAD.z0 + 1.5], 1.25, 'x', 16)).join(''), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.5), HEAD.z1, P, 3), { tone: 'faint' }));
  // Pin bores on top, a row along the reading line.
  out.push(L(LOOM.holes.map(y => k.ring(LOOM.x, y, 1.6, HEAD.z1, P, 14)).join(''), { tone: 'lo' }));
  out.push(D(k.corners(k.insetPlan(plan, 1.4)).map(([x, y]) => at([x, y, HEAD.z1])), { size: 0.4 }));
  // Front face: a small label plate and a vent row.
  const face = HEAD.y1;
  out.push(box({ x: HEAD.x0 + 3, y: face, w: 9, d: 0.6, r: 0.3 }, HEAD.z0 + 5, HEAD.z0 + 10.5, { tone: 'mid', crease: 'none' }, 2, 0.2));
  [HEAD.z0 + 9, HEAD.z0 + 7.6, HEAD.z0 + 6.2].forEach((z, i) => out.push(L(path([[HEAD.x0 + 4.4, face + 0.6, z], [HEAD.x0 + (i === 2 ? 8 : 10.6), face + 0.6, z]]), { tone: 'faint', free: true })));
  for (let i = 0; i < 3; i++) {
    const x = HEAD.x1 - 6 + i * 1.8;
    out.push(L(path([[x, face, HEAD.z0 + 4.5], [x + 0.8, face, HEAD.z0 + 4.5], [x + 0.8, face, HEAD.z0 + 10.5], [x, face, HEAD.z0 + 10.5]], true), { tone: 'lo' }));
  }
  // Near end: the quadrant plate behind the lever, with its two lamps.
  const sector = [];
  const r = 12.5;
  sector.push([0, 0]);
  for (let i = 0; i <= 10; i++) { const a = (-36 + i * 7.2) * Math.PI / 180; sector.push([Math.sin(a) * r, Math.cos(a) * r]); }
  out.push(S(prismOf(k, P, sector.map(([u, v]) => [u, v]), [LEVER.x, LEVER.y, LEVER.z - 1.5], [0, 1, 0], [0, 0, 1], [1, 0, 0], 0, 0.6), { tone: 'mid', crease: 'none' }));
  const arc = [];
  for (let i = 0; i <= 12; i++) { const a = (-32 + i * (64 / 12)) * Math.PI / 180; arc.push([LEVER.x + 0.6, LEVER.y + Math.sin(a) * 9.4, LEVER.z - 1.5 + Math.cos(a) * 9.4]); }
  out.push(L(path(arc), { tone: 'lo', free: true }));
  return out.join('');
}

function arm() {
  return [
    box(ARM, ARM.z0, ARM.z1, { tone: 'mid' }, 3, 0.5),
    D([at([ARM.x + 4, ARM.y + 4, ARM.z1]), at([ARM.x + 4, ARM.y + ARM.d - 3, ARM.z1])], { size: 0.5 }),
  ].join('');
}

function lamp(point, name) {
  const [cx, cy] = at(point);
  return `<circle class="fig-led" data-part="${name}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.7" opacity="0.2"/>`;
}

function deck() {
  const out = [`<path class="iso-halo" d="${k.haloOf(DECK, 0, 3, P)}" style="filter:blur(4px)"/>`];
  out.push(box(DECK, 0, 3, { tone: 'mid' }, 3, 0.5));
  out.push(L(k.planOutline(k.insetPlan(DECK, 3.5), 3, P, 3), { tone: 'faint' }));
  const screws = k.corners(DECK, 6);
  out.push(D(screws.map(([x, y]) => at([x, y, 3])), { size: 0.45 }));
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, 3, P, 14)).join(''), { tone: 'lo' }));
  return out.join('');
}

function spoolLow(sp) {
  return [
    col(sp.x, sp.y, 6, 3, 6, { tone: 'mid' }, 30),
    S(k.cylinder(sp.x, sp.y, SPOOL.flange, 6, 1.5, P, 56, 0.3), { tone: 'mid' }),
  ].join('');
}

function spoolTop(sp) {
  return [
    S(k.cylinder(sp.x, sp.y, SPOOL.flange, TZ[1] + 0.5, 1.5, P, 56, 0.3), { tone: 'mid' }),
    S(k.cylinder(sp.x, sp.y, 4.4, TZ[1] + 2, 3.5, P, 28), { tone: 'mid' }),
    L(k.knurl(sp.x, sp.y, 4.4, TZ[1] + 2, TZ[1] + 5.5, 22, P), { tone: 'lo' }),
  ].join('');
}

function guidePost(x) {
  return col(x, YT - 2.5, 2.5, 3, TZ[1] + 2.5, { tone: 'mid', crease: 'none' }, 18);
}
function guideCaps(x) {
  return [
    S(k.cylinder(x, YT - 2.5, 4, 6, 1.4, P, 24, 0.2), { tone: 'mid' }),
    S(k.cylinder(x, YT - 2.5, 4, TZ[1] + 1, 1.4, P, 24, 0.2), { tone: 'mid' }),
    D([at([x, YT - 2.5, TZ[1] + 2.4])], { size: 0.6, tone: 'mid' }),
  ].join('');
}

function printHead() {
  const out = [box(PRINT, 3, PRINT.h, { tone: 'mid' }, 3, 0.5)];
  out.push(L(k.sideSeam(PRINT, 8, P, 3), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(PRINT, 2), PRINT.h, P, 3), { tone: 'faint' }));
  out.push(D([at([PRINT.x + PRINT.w, PRINT.y + 4, PRINT.h - 3])], { size: 0.6, tone: 'hi' }));
  return out.join('');
}

function windowFrame() {
  const y = YT + 0.6, d = 4.4;
  const out = [];
  out.push(box({ x: WIN.x0, y, w: WIN.x1 - WIN.x0, d, r: 0.8 }, 3, TZ[0] - 1, { tone: 'mid' }, 2, 0.4));
  const ticks = k.topTicks(WIN.x0 + WIN.post, WIN.x1 - WIN.post, (WIN.x1 - WIN.x0 - 2 * WIN.post) / 10, 5, y + 0.4, TZ[0] - 1, [1.4, 2.8], P);
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  for (const x of [WIN.x0, WIN.x1 - WIN.post]) out.push(box({ x, y, w: WIN.post, d, r: 0.6 }, TZ[0] - 1, TZ[1] + 1, { tone: 'mid' }, 2, 0.3));
  out.push(box({ x: WIN.x0, y, w: WIN.x1 - WIN.x0, d, r: 0.8 }, TZ[1] + 1, TZ[1] + 4.5, { tone: 'mid' }, 2, 0.4));
  out.push(D([WIN.x0 + 1.5, WIN.x1 - 1.5].map(x => at([x, y + d / 2, TZ[1] + 4.5])), { size: 0.45 }));
  return out.join('');
}

// Text printed on the tape: rows of rule lines in tape coordinates. The first
// block is the rules written into the prompt.
function tapeText() {
  const y = YT + 0.2;
  const rows = [TZ[0] + 3.2, TZ[0] + 7, TZ[0] + 10.8];
  const prompt = [], rest = [];
  const lineAt = (x0, x1, z, list) => list.push(path([[x0, y, z], [x1, y, z]]));
  // Local x of text printed when the tape had moved d: X_HEAD - d.
  let d = D0;
  const lengths = [[14, 12, 9]];
  const pattern = [[8, 6, 0], [12, 12, 7], [5, 0, 0], [10, 9, 10], [7, 4, 0], [12, 11, 5], [6, 6, 0], [11, 8, 0], [9, 9, 6], [6, 3, 0]];
  for (const row of lengths) { row.forEach((len, i) => lineAt(X_HEAD - d - len, X_HEAD - d, rows[i], prompt)); d += PROMPT + 3; }
  let n = 0;
  while (d < D_MAX + 4) {
    const row = pattern[n++ % pattern.length];
    const len = Math.max(...row);
    row.forEach((l, i) => { if (l) lineAt(X_HEAD - d - l, X_HEAD - d, rows[i], rest); });
    d += len + 3;
  }
  return L(prompt.join(''), { tone: 'hi', free: true }) + L(rest.join(''), { tone: 'lo', free: true });
}

function cableRuns() {
  // The request line: print head -> along the deck and base -> up the
  // reader column -> under the arm into the reader head.
  const px = PRINT.x + PRINT.w / 2;
  const cy = COLUMN.y + COLUMN.d + 0.4;
  const cx = COLUMN.x + COLUMN.w / 2;
  const base = k.wireSvg(at([px, DECK.y - 0.4, 0]), at([cx, cy, 0]), { via: [at([38, DECK.y - 0.4, 0]), at([38, cy, 0])], tone: 'lo', ends: 'to' });
  const onDeck = k.wireSvg(at([px, PRINT.y, 5]), at([px, DECK.y, 3]), { via: [at([px, PRINT.y - 1.5, 3])], tone: 'lo', ends: 'from' });
  const up = k.wireSvg(at([cx, cy, 0]), at([cx, HEAD.y0, ARM.z0 - 1.5]), { via: [at([cx, cy, ARM.z0 - 1.5])], tone: 'lo', ends: 'to' });
  return { base, onDeck, up };
}

// ---- paint back to front --------------------------------------------------

const cables = cableRuns();
const r0 = { s: SPOOL.r1, t: SPOOL.r0 };
const clip = k.pathOf([[X_HEAD, YT, TZ[0]], [GUIDES[1], YT, TZ[0]], [GUIDES[1], YT, TZ[1]], [X_HEAD, YT, TZ[1]]].map(at), true);
const lift0 = LOOM.holes.map(() => 3.8);
const pins0 = pinsSvg(k, P, C, lift0);

const body = [
  basePlate(P, PLATE, { label: { x: -132, y: -50, w: 28, d: 15, r: 1.5 }, ruler: { x: 36, y: 38, w: 74, d: 6, r: 1 } }),
  cables.base,
  plinth(),
  column(),
  cables.up,
  upright(-LOOM.half - 10),
  `<g data-part="chain">${chainSvg(k, P, C, 0, 0)}</g>`,
  `<g data-part="pegs">${pegsSvg(k, P, C, 0)}</g>`,
  flanges(LOOM.half + 0.5, LOOM.half + 4),
  upright(LOOM.half + 4),
  `<g data-part="crank">${crankSvg(k, P, C, Math.PI / 2)}</g>`,
  `<g data-part="pins">${pins0.bodies}</g>`,
  arm(),
  head(),
  `<g data-part="tails">${pins0.tails}</g>`,
  `<g data-part="lever">${leverSvg(k, P, C, 0)}</g>`,
  lamp([HEAD.x1, 8, HEAD.z0 + 1.5], 'allow'),
  lamp([HEAD.x1, -8, HEAD.z0 + 1.5], 'block'),
  deck(),
  cables.onDeck,
  spoolLow(SUPPLY),
  spoolLow(TAKE),
  `<g data-part="pack-s">${packSvg(k, P, C, SUPPLY, r0.s)}</g>`,
  `<g data-part="pack-t">${packSvg(k, P, C, TAKE, r0.t)}</g>`,
  GUIDES.map(guidePost).join(''),
  printHead(),
  `<g data-part="sides">${tapeSides(k, P, C, r0.s, r0.t)}</g>`,
  ribbon(k, P, C, [GUIDES[0], YT], [GUIDES[1], YT]),
  `<clipPath id="rl-window"><path d="${clip}"/></clipPath><g clip-path="url(#rl-window)"><g data-part="text">${tapeText()}</g></g>`,
  GUIDES.map(guideCaps).join(''),
  windowFrame(),
  spoolTop(SUPPLY),
  spoolTop(TAKE),
  `<g data-part="marks-s">${spoolMarks(k, P, C, SUPPLY, 0)}</g>`,
  `<g data-part="marks-t">${spoolMarks(k, P, C, TAKE, 0)}</g>`,
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A punched-card controller on a bench. The rules are punched cards in an endless chain that turns over a drum: the smart contracts on Hyper 0X. On each cycle a reader drops six pins onto the top card. Beside it, a paper tape runs through a short window and winds onto a spool: the context window of the model. The first text on the tape is the rules in the prompt. When the context fills, that text scrolls onto the spool, but the cards keep turning and the reader still applies every rule. A lever on the reader moves to allow or block each request.',
  body,
});

const pins = pinsHtml(P, WIDTH, HEIGHT, [
  { id: 'cards', at: [LOOM.x + LOOM.rc + 0.6, 0, LOOM.zi - 4], icon: 'cards', title: 'Rule cards', sub: 'Smart contracts on Hyper 0X', side: 'down', lift: 40, seek: 'rules' },
  { id: 'reader', at: [HEAD.x0 + 3, HEAD.y1, (HEAD.z0 + HEAD.z1) / 2], icon: 'scan', title: 'Card reader', sub: 'Reads one rule card each cycle', side: 'left', lift: 26, seek: 'applies' },
  { id: 'lever', at: [LEVER.x + 1.4, 0, LEVER.z + LEVER.len + 2], icon: 'toggle-left', title: 'Decision lever', sub: 'Allows or blocks each request', lift: 10, seek: 'decides' },
  { id: 'tape', at: [(WIN.x0 + WIN.x1) / 2, YT + 5, 3], icon: 'scroll', title: 'Context tape', sub: 'What the model can see now', side: 'down', lift: 18, seek: 'fills' },
  { id: 'spool', at: [TAKE.x + 8, TAKE.y, TZ[1] + 3.5], icon: 'archive', title: 'Take-up spool', sub: 'Old context, out of view', lift: 40, seek: 'fills' },
]);

const steps = stepsHtml([
  { id: 'rules', icon: 'cards', title: 'Rules live on chain', sub: 'Each rule is a smart contract card on Hyper 0X' },
  { id: 'fills', icon: 'scroll', title: 'The context fills', sub: 'Old text, even the prompt rules, scrolls out of view' },
  { id: 'applies', icon: 'scan', title: 'Every rule still applies', sub: 'The reader reads a rule card on every cycle' },
  { id: 'decides', icon: 'toggle-left', title: 'Each decision follows the rules', sub: 'The lever allows or blocks each request' },
]);

const STAGES = [
  { id: 'rules', until: 4, pins: ['cards'] },
  { id: 'fills', until: 10.6, pins: ['tape', 'spool'] },
  { id: 'applies', until: 13.5, pins: ['reader', 'cards'] },
  { id: 'decides', until: T.loop + 1, pins: ['lever'] },
];

const live = `
${playFigure.toString()}
${polySolid.toString()}
${prismOf.toString()}
${roundOf.toString()}
${roundY.toString()}
${boxOf.toString()}
${chainAt.toString()}
${chainSvg.toString()}
${pegsSvg.toString()}
${crankSvg.toString()}
${pinsSvg.toString()}
${leverSvg.toString()}
${tangentOf.toString()}
${ribbon.toString()}
${packSvg.toString()}
${tapeSides.toString()}
${spoolMarks.toString()}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify({ ...C, T, BLOCK, STAGES, SPOOL, D_MAX, D0, X_HEAD, WIN })};
const K = { iso, depthOf, pathOf, cameraOf, solidSvg, lineSvg, dotsSvg, cylinder, sideArc, onTop };
for (const stage of document.querySelectorAll('[data-figure="rule-loom"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const el = {};
  for (const name of ['chain', 'pegs', 'crank', 'pins', 'tails', 'lever', 'allow', 'block', 'pack-s', 'pack-t', 'sides', 'text', 'marks-s', 'marks-t']) el[name] = q(name);
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((p) => [p.dataset.pin, p]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const T = C.T, L0 = C.LOOM;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const total = 2 * (L0.zd - L0.zi) + 2 * Math.PI * L0.rc;
  const pitch = total / L0.cards;
  const last = {};
  const set = (key, value, apply) => { if (last[key] !== value) { last[key] = value; apply(value); } };

  // Tape travel: runs at a steady speed, then rewinds for a new session.
  function travel(t) {
    if (t < T.run) return T.v * t;
    return C.D_MAX * (1 - ease(span(t, T.run + 0.2, T.loop - 0.2)));
  }
  const radius = (wound) => Math.sqrt(C.SPOOL.r0 * C.SPOOL.r0 + wound * (C.SPOOL.r1 * C.SPOOL.r1 - C.SPOOL.r0 * C.SPOOL.r0) / C.D_MAX);

  function draw(t) {
    // The chain: one card per cycle, eased; pins drop while it dwells.
    const cyc = Math.floor(t / T.cycle);
    const u = t - cyc * T.cycle;
    const offset = cyc + (u < T.advance ? ease(u / T.advance) : 1);
    const top = (cyc + 1) % L0.cards;
    const turn = -(offset * pitch) / L0.rc;
    set('chain', offset.toFixed(3), () => {
      el.chain.innerHTML = chainSvg(K, P, C, offset, u < T.advance ? -1 : top);
      el.pegs.innerHTML = pegsSvg(K, P, C, turn);
      el.crank.innerHTML = crankSvg(K, P, C, Math.PI / 2 + turn);
    });
    const down = u < T.advance ? 0 : ease(span(u, T.advance, T.advance + 0.25)) * (1 - ease(span(u, T.cycle - 0.22, T.cycle)));
    const holes = C.HOLES[top];
    const lift = L0.holes.map((_, j) => 3.8 - down * (holes[j] === '1' ? 6.5 : 3.8));
    set('pins', down.toFixed(3), () => {
      const p = pinsSvg(K, P, C, lift);
      el.pins.innerHTML = p.bodies;
      el.tails.innerHTML = p.tails;
    });
    // The lever: the request meets the card, then the lever swings.
    const block = C.BLOCK[cyc % C.BLOCK.length];
    const swing = u < T.advance ? 0 : ease(span(u, T.advance + 0.25, T.advance + 0.6)) * (1 - ease(span(u, T.cycle - 0.25, T.cycle)));
    set('lever', (block ? -swing : swing).toFixed(3), (v) => { el.lever.innerHTML = leverSvg(K, P, C, C.LEVER.swing * Number(v)); });
    const lit = swing > 0.9;
    set('lamps', lit ? (block ? 'b' : 'a') : '', (v) => {
      el.allow.setAttribute('opacity', v === 'a' ? '1' : '0.2');
      el.allow.dataset.state = v === 'a' ? 'ok' : '';
      el.block.setAttribute('opacity', v === 'b' ? '1' : '0.2');
      el.block.dataset.state = v === 'b' ? 'bad' : '';
    });
    // The tape: packs grow and shrink, text slides through the window.
    const d = travel(t);
    const rs = radius(C.D_MAX - d), rt = radius(d);
    // The text slides by a transform every frame; the packs, the free tape
    // and the turning flanges are redrawn only in small steps.
    set('tape', d.toFixed(2), () => el.text.setAttribute('transform', translateAlong(P, [d, 0, 0])));
    set('packs', rt.toFixed(1), () => {
      el['pack-s'].innerHTML = packSvg(K, P, C, C.SUPPLY, rs);
      el['pack-t'].innerHTML = packSvg(K, P, C, C.TAKE, rt);
      el.sides.innerHTML = tapeSides(K, P, C, rs, rt);
    });
    const spin = Math.round(d / 0.6) * 0.06;
    set('spin', spin.toFixed(2), () => {
      el['marks-s'].innerHTML = spoolMarks(K, P, C, C.SUPPLY, -spin * 1.2);
      el['marks-t'].innerHTML = spoolMarks(K, P, C, C.TAKE, -spin);
    });
    const fade = t < T.run ? 1 : 1 - span(t, T.run, T.run + 0.6);
    set('fade', fade.toFixed(2), (v) => el.text.setAttribute('opacity', v));
    // Readout and labels.
    const front = C.X_HEAD + (d - C.D0);
    const inner = [C.WIN.x0 + 3, C.WIN.x1 - 3];
    const fill = t >= T.run ? 0 : clamp((front - inner[0]) / (inner[1] - inner[0]), 0, 1);
    const pct = Math.round(fill * 100);
    const promptGone = t < T.run && d > C.D0 + (C.GUIDES[1] - C.X_HEAD) + 14;
    const verdict = u < T.advance + 0.4 ? 'reading' : block ? 'block' : 'allow';
    const ctx = t >= T.run ? 'new session' : pct >= 100 ? (promptGone ? 'context full · prompt rules gone' : 'context full') : 'context ' + pct + '% full';
    set('readout', ctx + '|' + top + '|' + verdict, () => {
      if (readout) readout.textContent = ctx + ' · rule ' + (top + 1) + ' · ' + verdict;
    });
    const index = C.STAGES.findIndex((s) => t < s.until);
    set('stage', index, () => {
      const on = C.STAGES[index].pins;
      for (const [id, p] of Object.entries(pins)) { p.toggleAttribute('data-on', on.includes(id)); p.toggleAttribute('data-dim', !on.includes(id)); }
      for (const s of steps) s.toggleAttribute('data-on', s.dataset.step === C.STAGES[index].id);
    });
  }
  playFigure(stage, (t) => draw(t), {
    loop: T.loop,
    stillAt: 14.6,
    seek: { rules: 0.5, fills: 6.2, applies: 11.2, decides: 14.0 },
  });
}
`;

const plate = k.plateHtml({
  fig: 'Fig 4',
  title: 'Rules the model cannot forget',
  hint: 'The tape runs out, the cards keep turning',
  readout: 'context 0% full · rule 1 · reading',
  body: `<div class="iso-stage" data-figure="rule-loom">${svg}${pins}</div>`,
}).replace('</figure>', `${steps}</figure>`);

writeFigure('rule-loom', { plate, live, title: 'Rule loom' });
