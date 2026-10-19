// Fig 2: how Pavii keeps personal data private (Anatomy kit, MIT; see ./kit/LICENSE).
//
// A small desktop redaction press. A prompt rides in as a two-leaf set: the
// top leaf is the copy that will leave, the bottom leaf is the original.
//   1. the set slides off the feed stack onto the sliding bed
//   2. the bed stops under the redaction head (the privacy gate); the hand
//      wheel turns, the screw lowers the head, and it stamps ink bars over
//      the personal fields of the top leaf
//   3. the bed moves on to the proof stamp, a lever press that presses a
//      round seal onto the leaf: a zero-knowledge proof, a fact without the data
//   4. at the end of the bed the masked leaf slides into the provider outbox
//      (patterns and proofs only), and the original slides into the mouth of
//      the locked drawer under the bed, where its key turns: it stays with you.
// The bed runs back and the next prompt comes in.
//
// Run: node privacy-press.mjs
import { k, tools, basePlate, pinsHtml, stepsHtml, vcoil, playFigure, writeFigure } from './lib.mjs';

const WIDTH = 760;
const HEIGHT = 430;

const PLATE = { x: -180, y: -62, w: 330, d: 124, r: 8 };
const CASE = { x: -128, y: -28, w: 218, d: 76, r: 3 };
const TOP = 18;
const FRONT = CASE.y + CASE.d; // 48
const RAILS = [-18, 3];
const RAIL_X = [-122, 86];
const TABLE = { x: -18, y: -22, w: 36, d: 34, r: 2 };
const TZ = [21, 25];
const LEAF = { x: -13, y: -15, w: 26, d: 20, r: 0.8 };
const LT = 0.8; // leaf thickness
const ORIG = [-1.5, 1.5];
const LINES = [[-12, 6], [-8, 0], [-4, 4], [0, -2]]; // [y, x end]; lines start at x -10
const PERSONAL = [0, 2];
const STATION = { start: -103, gate: -55, seal: -3, end: 62 };
const FEED = { x: -166, y: -22, w: 36, d: 34, r: 2 };
const FEED_X = -148;
const FEED_DZ = 4 * LT;
const MOUTH = { x: 46, y: 20, w: 32, d: 24, r: 1.5 };
const DRAWER = { x: 42, w: 40, z: [3, 15] };
const KEY = { x: 74, z: 8 };
const BOX = { x: 96, y: -24, w: 38, d: 38, r: 2 };
const BOX_FLOOR = 17;
const BOX_TOP = 23;
const BOX_STACK = 3;
const BOX_X = 114;
const HEAD = { x: -55, y: -5, die: 46, travel: 19.4 };
const HUB0 = 101.6;
const ARM = { x: -64, y: -52, w: 18, d: 57, r: 2, z: [66, 76] };
const COLUMN = { x: -64, y: -52, w: 18, d: 14, r: 1.5 };
const LEVER = { x: [1, 9], y: -44, z: 50, die: 39, len: [-5, 56], knob: 52 };
const PED = { x: -4, y: -56, w: 18, d: 22, r: 2, h: 44 };

// The lever angle at which the seal die meets the top leaf.
const DIE_DROP = 9;
const contactZ = TZ[1] + 2 * LT;
const dieBottom = phi => LEVER.z + LEVER.die * Math.sin(phi) - 2 * Math.cos(phi) - DIE_DROP;
let PHI_PRESS = 0;
while (dieBottom(PHI_PRESS) > contactZ) PHI_PRESS -= 0.0005;
const SEAL_Y = LEVER.y + LEVER.die * Math.cos(PHI_PRESS) + 2 * Math.sin(PHI_PRESS);
// Seal position in the leaf's own frame (the leaf is built centred on x 0).
const SEAL = [(LEVER.x[0] + LEVER.x[1]) / 2 - STATION.seal, SEAL_Y];

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -17, 0),
    [HEAD.x - 20, HEAD.y - 20, HUB0 + 12],
    [HEAD.x + 20, HEAD.y + 20, HUB0 + 12],
    [ARM.x, ARM.y, ARM.z[1]],
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 56 },
);

const { at, S, L, D, byDepth, col, box, path, faceCircle } = tools(P);

// ---- live builders (pure; embedded in the page with toString()) ----------

// A convex solid from its faces (3D point lists), shaded like the kit's
// extrusions: up-facing faces take the top tone, the rest the four shades.
function polySolid(K, P, faces) {
  const { sinA, cosA, sinE, cosE } = K.cameraOf(P);
  const V = [cosA * cosE, sinA * cosE, sinE];
  const all = faces.flat();
  const mid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
  const c = mid(all);
  const info = faces.map((f) => {
    const u = [f[1][0] - f[0][0], f[1][1] - f[0][1], f[1][2] - f[0][2]];
    const v = [f[2][0] - f[0][0], f[2][1] - f[0][1], f[2][2] - f[0][2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    n = n.map((x) => x / len);
    const fc = mid(f);
    if (n[0] * (fc[0] - c[0]) + n[1] * (fc[1] - c[1]) + n[2] * (fc[2] - c[2]) < 0) n = n.map((x) => -x);
    return { f, n, vis: n[0] * V[0] + n[1] * V[1] + n[2] * V[2] > 1e-6 };
  });
  const pr = (p) => K.iso(p, P);
  const tops = [];
  const shades = [[], [], [], []];
  for (const { f, n, vis } of info) {
    if (!vis) continue;
    const d = K.pathOf(f.map(pr), true);
    if (n[2] > 0.55) { tops.push(d); continue; }
    const h = Math.hypot(n[0], n[1]) || 1;
    const lit = ((n[0] / h) * -sinA + (n[1] / h) * cosA + 1) / 2;
    shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))].push(d);
  }
  const key = (p) => p.map((x) => x.toFixed(3)).join(',');
  const edges = new Map();
  info.forEach((F, i) => F.f.forEach((p, j) => {
    const q = F.f[(j + 1) % F.f.length];
    const id = [key(p), key(q)].sort().join('|');
    const e = edges.get(id) || { p, q, faces: [] };
    e.faces.push(i);
    edges.set(id, e);
  }));
  const outline = [];
  const crease = [];
  for (const e of edges.values()) {
    const v = e.faces.map((i) => info[i].vis);
    const seg = K.pathOf([pr(e.p), pr(e.q)]);
    if (v[0] && v[1]) crease.push(seg);
    else if (v[0] || v[1]) outline.push(seg);
  }
  // Fill: the convex hull of the projected corners.
  const pts = all.map(pr).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  const upper = [];
  for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return { fill: K.pathOf(hull, true), outline: outline.join(''), crease: crease.join(''), top: tops.join(''), shades: shades.map((s) => s.join('')) };
}

// The lead screw between two heights, with its thread on the near side.
function screwSvg(K, P, C, z0, z1, coil) {
  if (z1 - z0 < 0.4) return '';
  const { x, y } = C.HEAD;
  const rod = K.solidSvg(K.cylinder(x, y, 2.2, z0, z1 - z0, P, 20), { tone: 'mid', crease: 'none' });
  const thread = coil(x, y, 2.25, z0, z1, (z1 - z0) / 1.7, P, K.iso, K.depthOf, K.pathOf);
  return rod + K.lineSvg(thread.front, { tone: 'lo' });
}

// The three-spoke hand wheel on top of the screw, turned by ang.
function wheelSvg(K, P, C, z, ang) {
  const { x, y } = C.HEAD;
  const hubR = 4.2;
  const hubD = K.depthOf([x, y, 0], P);
  const items = [];
  for (let i = 0; i < 3; i++) {
    const a = ang + (i * Math.PI * 2) / 3;
    const ca = Math.cos(a), sa = Math.sin(a), w = 1.15, r0 = hubR, r1 = 16.6;
    const ring = [[x + ca * r0 - sa * w, y + sa * r0 + ca * w], [x + ca * r1 - sa * w, y + sa * r1 + ca * w], [x + ca * r1 + sa * w, y + sa * r1 - ca * w], [x + ca * r0 + sa * w, y + sa * r0 - ca * w]];
    const kx = x + ca * 18.4, ky = y + sa * 18.4;
    let svg = K.solidSvg(K.extrude(ring, z + 1.7, 2.1, P, { convex: true, bevel: 0.25 }), { tone: 'mid' });
    svg += K.solidSvg(K.cylinder(kx, ky, 2.6, z + 0.8, 4, P, 22, 0.4), { tone: 'mid' });
    if (i === 0) {
      svg += K.solidSvg(K.cylinder(kx, ky, 1.5, z + 4.8, 6.4, P, 16), { tone: 'mid', crease: 'none' });
      svg += K.solidSvg(K.cylinder(kx, ky, 1.9, z + 11.2, 1.4, P, 16, 0.3), { tone: 'mid' });
    }
    items.push({ d: K.depthOf([x + ca * 10, y + sa * 10, 0], P), svg });
  }
  items.sort((a, b) => a.d - b.d);
  const hub = K.solidSvg(K.cylinder(x, y, hubR, z, 5.6, P, 28, 0.5), { tone: 'mid' }) + K.lineSvg(K.ring(x, y, 2.4, z + 5.6, P, 18), { tone: 'lo' }) + K.dotsSvg([K.iso([x, y, z + 5.6], P)], { size: 0.6 });
  return items.filter((it) => it.d < hubD).map((it) => it.svg).join('') + hub + items.filter((it) => it.d >= hubD).map((it) => it.svg).join('');
}

// The proof stamp's lever at angle phi, with its return spring, seal die and knob.
function leverSvg(K, P, C, phi, coil, poly) {
  const L = C.LEVER;
  const pt = (s, t) => [L.y + s * Math.cos(phi) - t * Math.sin(phi), L.z + s * Math.sin(phi) + t * Math.cos(phi)];
  const sec = [pt(L.len[0], -2), pt(L.len[1], -1.6), pt(L.len[1], 1.6), pt(L.len[0], 2)];
  const faces = [sec.map(([y, z]) => [L.x[0], y, z]), sec.map(([y, z]) => [L.x[1], y, z])];
  for (let i = 0; i < sec.length; i++) {
    const a = sec[i], b = sec[(i + 1) % sec.length];
    faces.push([[L.x[0], a[0], a[1]], [L.x[1], a[0], a[1]], [L.x[1], b[0], b[1]], [L.x[0], b[0], b[1]]]);
  }
  const cx = (L.x[0] + L.x[1]) / 2;
  const [sy, sz] = pt(7, -2);
  const spring = coil(cx, C.PED.y + C.PED.d - 2.2, 2, C.PED.h, sz, 5, P, K.iso, K.depthOf, K.pathOf);
  const [dy, dz] = pt(L.die, -2);
  const [ky, kz] = pt(L.knob, 1.8);
  return [
    K.lineSvg(spring.back, { tone: 'lo' }),
    K.lineSvg(spring.front, { tone: 'mid' }),
    K.solidSvg(K.cylinder(cx, dy, 4.6, dz - 9, 4, P, 32, 0.5), { tone: 'mid' }),
    K.lineSvg(K.knurl(cx, dy, 4.6, dz - 8.6, dz - 5.4, 30, P), { tone: 'lo' }),
    K.solidSvg(K.cylinder(cx, dy, 1.5, dz - 5, 5.2, P, 16), { tone: 'mid', crease: 'none' }),
    K.solidSvg(poly(K, P, faces), { tone: 'mid' }),
    K.dotsSvg([K.iso([L.x[1], dy, dz + 2], P)], { size: 0.45 }),
    K.solidSvg(K.cylinder(cx, ky, 3.2, kz - 0.4, 4.4, P, 26, 0.6), { tone: 'mid' }),
    K.lineSvg(K.ring(cx, ky, 1.6, kz + 4, P, 16), { tone: 'lo' }),
  ].join('');
}

// The drawer key, turned by theta (0 = locked, flat; 1 = open, upright).
function keySvg(K, P, C, open) {
  const { x, z } = C.KEY;
  const face = C.FRONT + 1;
  const th = open * Math.PI / 2;
  const u = [Math.cos(th), 0, Math.sin(th)];
  const at = (cy, a, r) => K.iso([x + u[0] * r * Math.cos(a), cy + r * Math.sin(a), z + u[2] * r * Math.cos(a)], P);
  const bow = (r, cy) => K.pathOf(Array.from({ length: 28 }, (_, i) => at(cy, (i / 28) * Math.PI * 2, r)), true);
  const shank = K.solidSvg(K.slabOf({ x: x - 0.5, y: face, w: 1, d: 3, r: 0.3 }, z - 0.5, 1, P, 2, 0.1), { tone: 'mid', crease: 'none' });
  return shank + `<path class="iso-fill" d="${bow(2.3, face + 5.2)}"/>` + K.lineSvg(bow(2.3, face + 5.2), { tone: 'hi' }) + K.lineSvg(bow(0.9, face + 5.2), { tone: 'mid' });
}

const C = { HEAD, LEVER, PED, KEY, FRONT };

// ---- static parts ---------------------------------------------------------

const ink = (plan, z) => `<path style="fill:var(--anatomy-hi)" d="${k.planOutline(plan, z, P, 2)}"/>`;

function leafLines(dx, dy, z, tone = 'mid') {
  return L(LINES.map(([y, x1]) => k.lineOnTop([-10 + dx, y + dy], [x1 + dx, y + dy], z, P)).join(''), { tone, free: true });
}

function sealMark(z, x0 = 0, y0 = 0) {
  const [x, y] = [SEAL[0] + x0, SEAL[1] + y0];
  return [
    L(k.ring(x, y, 3.6, z, P, 32), { tone: 'hi' }),
    L(k.ring(x, y, 2.7, z, P, 28), { tone: 'mid' }),
    L(k.onTop([[x - 1.3, y - 0.2], [x - 0.3, y + 0.9], [x + 1.4, y - 1.1]], z, P), { tone: 'hi', free: true }),
  ].join('');
}

function bars(z, x0 = 0, y0 = 0) {
  return PERSONAL.map(i => { const [y, x1] = LINES[i]; return ink({ x: -10.9 + x0, y: y - 1.25 + y0, w: x1 + 10.9 + 0.9, d: 2.5, r: 0.4 }, z); }).join('');
}

/** One leaf: kind 'top' (the copy, lit), 'orig', or 'stack' (a plain leaf). */
function leaf(kind, z0, { dx = 0, dy = 0, masked = false } = {}) {
  const plan = { ...LEAF, x: LEAF.x + dx, y: LEAF.y + dy };
  const zt = z0 + LT;
  const out = [S(k.slabOf(plan, z0, LT, P, 2, 0.15), { tone: 'hi', crease: 'lo', lit: kind === 'top' })];
  out.push(leafLines(dx, dy, zt));
  if (kind === 'top') {
    out.push(`<g data-part="bars" opacity="0">${bars(zt + 0.02)}</g>`);
    out.push(`<g data-part="seal" opacity="0">${sealMark(zt + 0.02)}</g>`);
  } else if (masked) {
    out.push(bars(zt + 0.02, dx, dy), sealMark(zt + 0.02, dx, dy));
  }
  return out.join('');
}

function casing() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CASE, 0, TOP, P)}"/>`];
  out.push(box(CASE, 0, TOP, { tone: 'mid' }, 4, 1));
  out.push(L(k.sideSeam(CASE, 3.5, P, 4), { tone: 'lo' }));
  // Top: corner screws and a ruler strip along the front edge.
  const screws = k.corners(CASE, 5);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.8, TOP, P, 14)).join(''), { tone: 'lo' }));
  out.push(D(screws.map(([x, y]) => at([x, y, TOP])), { size: 0.45 }));
  const ruler = { x: -118, y: 38, w: 150, d: 6, r: 1 };
  out.push(S(k.slabOf(ruler, TOP, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
  const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 5, 5, ruler.y + 0.8, TOP + 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
  // Station marks: a short notch on the ruler under each station.
  out.push(D([STATION.gate, STATION.seal].map(x => at([x, ruler.y + ruler.d - 1.2, TOP + 0.6])), { size: 0.55, tone: 'hi' }));
  // The drawer mouth: a dark opening with its far walls, a rim and screws.
  const open = k.planOutline(MOUTH, TOP, P, 3);
  const { x, y, w, d } = MOUTH;
  const back = path([[x, y, TOP], [x + w, y, TOP], [x + w, y, TOP - 9], [x, y, TOP - 9]], true);
  const left = path([[x, y, TOP], [x, y + d, TOP], [x, y + d, TOP - 9], [x, y, TOP - 9]], true);
  out.push(`<clipPath id="pp-open"><path d="${open}"/></clipPath>`);
  out.push(`<path class="iso-shade" data-shade="0" d="${open}"/>`);
  out.push(`<g clip-path="url(#pp-open)"><path class="iso-shade" data-shade="2" d="${back}"/><path class="iso-shade" data-shade="1" d="${left}"/>${L(path([[x, y, TOP - 9], [x + w, y, TOP - 9]]) + path([[x, y, TOP - 9], [x, y + d, TOP - 9]]), { tone: 'faint' })}${L(path([[x, y, TOP], [x, y, TOP - 9]]), { tone: 'faint' })}</g>`);
  out.push(L(open, { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(MOUTH, -2.4), TOP, P, 3), { tone: 'faint' }));
  out.push(D(k.corners(k.insetPlan(MOUTH, -2.4), 1.2).map(([sx, sy]) => at([sx, sy, TOP])), { size: 0.42 }));
  // Front face: vents, a label plate, the drawer.
  for (let i = 0; i < 6; i++) {
    const vx = -116 + i * 3.8;
    out.push(L(path([[vx, FRONT, 5], [vx + 1.6, FRONT, 5], [vx + 1.6, FRONT, 13], [vx, FRONT, 13]], true), { tone: 'lo' }));
  }
  const lp = { x: -86, y: FRONT, w: 26, d: 0.6, r: 0.4 };
  out.push(box(lp, 5, 13, { tone: 'mid', crease: 'none' }, 2, 0.2));
  [11, 9, 7].forEach((z, i) => out.push(L(path([[lp.x + 3, FRONT + 0.6, z], [lp.x + (i === 2 ? 12 : 20), FRONT + 0.6, z]]), { tone: 'faint', free: true })));
  out.push(D([[lp.x + 1.4, 12], [lp.x + lp.w - 1.4, 12], [lp.x + 1.4, 6], [lp.x + lp.w - 1.4, 6]].map(([px, z]) => at([px, FRONT + 0.6, z])), { size: 0.38 }));
  // The drawer front, its pull, card holder and lock ring.
  const df = { x: DRAWER.x, y: FRONT, w: DRAWER.w, d: 1, r: 0.5 };
  out.push(box(df, DRAWER.z[0], DRAWER.z[1], { tone: 'mid' }, 2, 0.3));
  const fz = FRONT + 1;
  out.push(L(path([[df.x + 2, fz, 5], [df.x + 22, fz, 5], [df.x + 22, fz, 9.5], [df.x + 2, fz, 9.5]], true), { tone: 'lo' }));
  out.push(L(path([[df.x + 4, fz, 7.9], [df.x + 16, fz, 7.9]]) + path([[df.x + 4, fz, 6.5], [df.x + 12, fz, 6.5]]), { tone: 'faint', free: true }));
  for (const px of [df.x + 6, df.x + 18]) out.push(box({ x: px - 1, y: fz, w: 2, d: 2.2, r: 0.4 }, 11.4, 13.2, { tone: 'mid', crease: 'none' }, 2, 0.2));
  out.push(box({ x: df.x + 4, y: fz + 2.2, w: 16, d: 1.4, r: 0.6 }, 11.2, 13.4, { tone: 'mid' }, 2, 0.3));
  out.push(L(faceCircle([KEY.x, fz, KEY.z], 3, 'y', 24), { tone: 'mid' }));
  out.push(L(faceCircle([KEY.x, fz, KEY.z], 2.2, 'y', 20), { tone: 'lo' }));
  out.push(D([[df.x + 1.6, 13.6], [df.x + df.w - 1.6, 13.6], [df.x + 1.6, 4.4], [df.x + df.w - 1.6, 4.4]].map(([px, z]) => at([px, fz, z])), { size: 0.38 }));
  // Right end: two screws and a service slot.
  const ex = CASE.x + CASE.w;
  out.push(L(path([[ex, -6, 6], [ex, 18, 6], [ex, 18, 8], [ex, -6, 8]], true), { tone: 'lo' }));
  out.push(D([at([ex, -20, 13]), at([ex, 40, 13])], { size: 0.4 }));
  return out.join('');
}

function rails() {
  const out = [];
  for (const y of RAILS) {
    out.push(box({ x: RAIL_X[0], y, w: RAIL_X[1] - RAIL_X[0], d: 5, r: 1 }, TOP, TOP + 3, { tone: 'mid' }, 3, 0.4));
    out.push(D([RAIL_X[0] + 8, -60, 0, 50].map(x => at([x, y + 2.5, TOP + 3])), { size: 0.4 }));
  }
  // The feed screw between the rails, with its thread on the near side.
  const rodY = -5, rodZ = TOP + 2;
  const coil = k.coil(RAIL_X[0], RAIL_X[1], [rodY, rodZ], 1.75, 64, 'x', P);
  out.push(L(coil.back, { tone: 'faint' }));
  out.push(S(k.slabOf({ x: RAIL_X[0], y: rodY - 1.6, w: RAIL_X[1] - RAIL_X[0], d: 3.2, r: 1.5 }, rodZ - 1.6, 3.2, P, 3), { tone: 'mid', crease: 'none' }));
  out.push(L(coil.front, { tone: 'lo' }));
  // End blocks that carry the screw and stop the bed.
  for (const x of [RAIL_X[0] - 4, RAIL_X[1]]) {
    const plan = { x, y: -21, w: 4, d: 32, r: 1 };
    out.push(box(plan, TOP, TOP + 7, { tone: 'mid' }, 3, 0.4));
    out.push(D([at([x + 2, -17, TOP + 7]), at([x + 2, 7, TOP + 7])], { size: 0.42 }));
  }
  return out.join('');
}

function table() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(TABLE, 3), TZ[0], 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(box(TABLE, TZ[0], TZ[1], { tone: 'mid' }, 4, 0.6));
  out.push(L(k.sideSeam(TABLE, TZ[0] + 1.4, P, 4), { tone: 'lo' }));
  out.push(L(k.planOutline(k.insetPlan(TABLE, 2), TZ[1], P, 4), { tone: 'faint' }));
  out.push(D(k.corners(TABLE, 2.4).map(([x, y]) => at([x, y, TZ[1]])), { size: 0.4, tone: 'lo' }));
  // Register pins on the back edge hold the leaves square.
  for (const x of [-9, 9]) out.push(col(x, -18.6, 1, TZ[1], TZ[1] + 3, { tone: 'mid', crease: 'none' }, 12));
  // A knurled push knob on a bracket at the front.
  out.push(box({ x: -4, y: TABLE.y + TABLE.d, w: 8, d: 5, r: 1 }, TZ[0] + 0.5, TZ[0] + 3, { tone: 'mid' }, 2, 0.3));
  out.push(col(0, TABLE.y + TABLE.d + 3, 2.6, TZ[0] + 3, TZ[0] + 7, { tone: 'mid' }, 20));
  out.push(L(k.knurl(0, TABLE.y + TABLE.d + 3, 2.6, TZ[0] + 3, TZ[0] + 7, 18, P), { tone: 'lo' }));
  return out.join('');
}

function feed() {
  const out = [`<path class="iso-halo" d="${k.haloOf(FEED, 0, 21, P)}"/>`];
  out.push(box(FEED, 0, 21, { tone: 'mid' }, 3, 0.8));
  out.push(L(k.sideSeam(FEED, 3, P, 3), { tone: 'lo' }));
  const deck = { x: FEED.x - 1, y: FEED.y - 1, w: FEED.w + 2, d: FEED.d + 2, r: 2 };
  out.push(box(deck, 21, TZ[1], { tone: 'mid' }, 3, 0.5));
  // Back stop and two side fences.
  out.push(box({ x: FEED.x, y: -17, w: 2, d: 25, r: 0.6 }, TZ[1], TZ[1] + 5, { tone: 'mid' }, 2, 0.3));
  out.push(box({ x: FEED.x + 2, y: -18.5, w: 30, d: 2, r: 0.6 }, TZ[1], TZ[1] + 4, { tone: 'mid' }, 2, 0.3));
  // The stack of prompts waiting.
  for (let i = 0; i < 4; i++) {
    const o = i % 2 === 0;
    out.push(leaf(i === 3 ? 'stack' : 'stack', TZ[1] + i * LT, { dx: FEED_X + (o ? ORIG[0] : 0), dy: o ? ORIG[1] : 0 }));
  }
  out.push(box({ x: FEED.x + 2, y: 8.5, w: 30, d: 2, r: 0.6 }, TZ[1], TZ[1] + 4, { tone: 'mid' }, 2, 0.3));
  out.push(D([at([FEED.x + 4, -17.5, TZ[1] + 4]), at([FEED.x + 30, -17.5, TZ[1] + 4]), at([FEED.x + 4, 9.5, TZ[1] + 4]), at([FEED.x + 30, 9.5, TZ[1] + 4])], { size: 0.38 }));
  // Front face: a small label window.
  out.push(L(path([[FEED.x + 8, FEED.y + FEED.d, 8], [FEED.x + 28, FEED.y + FEED.d, 8], [FEED.x + 28, FEED.y + FEED.d, 14], [FEED.x + 8, FEED.y + FEED.d, 14]], true), { tone: 'lo' }));
  out.push(L(path([[FEED.x + 10, FEED.y + FEED.d, 11], [FEED.x + 22, FEED.y + FEED.d, 11]]), { tone: 'faint', free: true }));
  return out.join('');
}

function frameBack() {
  // C-frame foot, column with its ways, and a rib on the near side.
  const foot = { x: -76, y: -58, w: 42, d: 26, r: 3 };
  const out = [`<path class="iso-halo" d="${k.haloOf(foot, 0, 4, P)}"/>`];
  out.push(box(foot, 0, 4, { tone: 'mid' }, 4, 0.6));
  out.push(D(byDepth([[-72, -54], [-38, -54], [-72, -36], [-38, -36]]).map(([x, y]) => at([x, y, 4])), { size: 0.5 }));
  out.push(L(byDepth([[-72, -54], [-38, -54], [-72, -36], [-38, -36]]).map(([x, y]) => k.ring(x, y, 1.8, 4, P, 14)).join(''), { tone: 'lo' }));
  out.push(box(COLUMN, 4, ARM.z[0], { tone: 'mid' }, 3, 0.6));
  out.push(L(k.sideSeam(COLUMN, 10, P, 3), { tone: 'lo' }));
  const face = COLUMN.y + COLUMN.d;
  for (const x of [-63.5, -49]) out.push(box({ x, y: face, w: 2.5, d: 1.4, r: 0.3 }, 6, 64, { tone: 'mid', crease: 'none' }, 2, 0.2));
  out.push(box({ x: COLUMN.x + COLUMN.w, y: -50, w: 1.6, d: 10, r: 0.4 }, 4, ARM.z[0], { tone: 'mid', crease: 'none' }, 2, 0.2));
  return out.join('');
}

function head() {
  const out = [];
  const z = HEAD.die;
  // Slide shoe on the column ways, the bracket, the die and the body.
  out.push(box({ x: -60, y: COLUMN.y + COLUMN.d, w: 10, d: 3, r: 0.6 }, z + 4, z + 18, { tone: 'mid' }, 2, 0.3));
  out.push(D([at([-50, -36.5, z + 7]), at([-50, -36.5, z + 15])], { size: 0.4 }));
  const die = { x: -69, y: -15, w: 28, d: 20, r: 1.5 };
  out.push(box(die, z, z + 6, { tone: 'mid' }, 3, 0.5));
  out.push(L(k.sideSeam(die, z + 1.6, P, 3), { tone: 'lo' }));
  // Grooves on the die's near face show the bar pads underneath.
  for (const x of [-64, -59, -54, -49, -44]) out.push(L(path([[x, die.y + die.d, z], [x, die.y + die.d, z + 1.6]]), { tone: 'lo' }));
  out.push(box({ x: -59, y: -35, w: 8, d: 22, r: 1 }, z + 8, z + 14, { tone: 'mid' }, 2, 0.4));
  const body = { x: -63, y: -13, w: 16, d: 16, r: 2 };
  out.push(box(body, z + 6, z + 16, { tone: 'mid' }, 3, 0.5));
  out.push(L(k.sideSeam(body, z + 12.5, P, 3), { tone: 'lo' }));
  out.push(D([at([-47, -9, z + 9.5]), at([-47, -1, z + 9.5])], { size: 0.45 }));
  out.push(L(faceCircle([-55, 3, z + 9.5], 1.6, 'y', 14), { tone: 'lo' }));
  out.push(col(HEAD.x, HEAD.y, 4, z + 16, z + 18.5, { tone: 'mid' }, 24));
  return out.join('');
}

function arm() {
  return [
    box(ARM, ARM.z[0], ARM.z[1], { tone: 'mid' }, 4, 0.7),
    L(k.sideSeam(ARM, ARM.z[0] + 3, P, 4), { tone: 'lo' }),
    L(k.lineOnTop([ARM.x + 4, ARM.y], [ARM.x + 4, ARM.y + ARM.d], ARM.z[1], P), { tone: 'faint' }),
    D([at([HEAD.x, -46, ARM.z[1]]), at([HEAD.x, -38, ARM.z[1]])], { size: 0.5 }),
    col(HEAD.x, HEAD.y, 6, ARM.z[1], ARM.z[1] + 4, { tone: 'mid' }, 28),
    L(k.ring(HEAD.x, HEAD.y, 4.2, ARM.z[1] + 4, P, 22), { tone: 'lo' }),
    D(byDepth([[HEAD.x - 4.8, HEAD.y], [HEAD.x + 4.8, HEAD.y]]).map(([x, y]) => at([x, y, ARM.z[1] + 4])), { size: 0.4 }),
  ].join('');
}

function pedestal() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PED, 0, PED.h, P)}"/>`];
  out.push(box(PED, 0, PED.h, { tone: 'mid' }, 3, 0.8));
  out.push(L(k.sideSeam(PED, 4, P, 3), { tone: 'lo' }));
  out.push(L(k.sideSeam(PED, PED.h - 4, P, 3), { tone: 'lo' }));
  out.push(D([at([PED.x + PED.w, -52, 30]), at([PED.x + PED.w, -38, 30])], { size: 0.42 }));
  out.push(L(k.ring(5, PED.y + PED.d - 2.2, 2.6, PED.h, P, 18), { tone: 'lo' }));
  out.push(box({ x: -3, y: -50, w: 3.6, d: 10, r: 0.6 }, PED.h, PED.h + 12, { tone: 'mid' }, 2, 0.3));
  return out.join('');
}

function pedestalFront() {
  const x = 9.4;
  return [
    box({ x, y: -50, w: 3.6, d: 10, r: 0.6 }, PED.h, PED.h + 12, { tone: 'mid' }, 2, 0.3),
    L(faceCircle([x + 3.6, LEVER.y, LEVER.z], 1.9, 'x', 18), { tone: 'mid' }),
    D([at([x + 3.6, LEVER.y, LEVER.z])], { size: 0.55, tone: 'hi' }),
  ].join('');
}

function outboxBase() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BOX, 0, 14, P)}"/>`];
  out.push(box(BOX, 0, 14, { tone: 'mid' }, 3, 0.8));
  out.push(L(k.sideSeam(BOX, 3, P, 3), { tone: 'lo' }));
  out.push(box(BOX, 14, BOX_FLOOR, { tone: 'mid' }, 3, 0.4));
  out.push(box({ x: BOX.x, y: BOX.y, w: BOX.w - 2, d: 2, r: 0.5 }, BOX_FLOOR, BOX_TOP, { tone: 'mid' }, 2, 0.3));
  return out.join('');
}

function outboxStack() {
  const out = [];
  for (let i = 0; i < BOX_STACK; i++) out.push(leaf('stack', BOX_FLOOR + i * LT, { dx: BOX_X, masked: i === BOX_STACK - 1 }));
  return out.join('');
}

function outboxFront() {
  const face = BOX.y + BOX.d;
  const out = [
    box({ x: BOX.x + BOX.w - 2, y: BOX.y, w: 2, d: BOX.d, r: 0.5 }, BOX_FLOOR, BOX_TOP, { tone: 'mid' }, 2, 0.3),
    box({ x: BOX.x, y: face - 2, w: BOX.w - 2, d: 2, r: 0.5 }, BOX_FLOOR, BOX_TOP, { tone: 'mid' }, 2, 0.3),
  ];
  const lp = { x: BOX.x + 6, y: face, w: 18, d: 0.6, r: 0.3 };
  out.push(box(lp, 4, 11, { tone: 'mid', crease: 'none' }, 2, 0.2));
  [9, 7, 5.6].forEach((z, i) => out.push(L(path([[lp.x + 2.5, face + 0.6, z], [lp.x + (i === 2 ? 9 : 14), face + 0.6, z]]), { tone: 'faint', free: true })));
  out.push(D([at([BOX.x + BOX.w - 1, BOX.y + 3, BOX_TOP]), at([BOX.x + BOX.w - 1, face - 3, BOX_TOP])], { size: 0.4 }));
  return out.join('');
}

// ---- clips for leaves that sink below a lip ------------------------------

function sinkClip(id, x0, x1, yFront, yBack, z) {
  const a = at([x0, yFront, z]);
  const b = at([x1, yFront, z]);
  const c = at([x1, yBack - 80, z]);
  const f = v => v.toFixed(1);
  return `<clipPath id="${id}"><path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(c[0])} ${f(c[1])}L${f(c[0])} -50L${f(a[0])} -50Z"/></clipPath>`;
}

// ---- paint back to front --------------------------------------------------

const ledLight = (point, name) => {
  const [cx, cy] = at(point);
  return `<circle class="fig-led" data-part="${name}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.4"/>`;
};

const TOP_Z = TZ[1] + LT;
const body = [
  basePlate(P, PLATE, { label: { x: -172, y: -56, w: 30, d: 18, r: 1.5 }, ruler: { x: -150, y: 51, w: 190, d: 6, r: 1 } }),
  frameBack(),
  pedestal(),
  feed(),
  casing(),
  `<g data-part="key">${keySvg(k, P, C, 0)}</g>`,
  ledLight([DRAWER.x + 32, FRONT + 1, 12.6], 'led'),
  rails(),
  outboxBase(),
  sinkClip('pp-box', BOX.x, BOX.x + BOX.w - 2, BOX.y + BOX.d - 2, BOX.y + 2, BOX_FLOOR),
  `<g clip-path="url(#pp-box)"><g data-part="stack">${outboxStack()}</g></g>`,
  `<g data-part="table" transform="${k.translateAlong(P, [STATION.start, 0, 0])}">${table()}</g>`,
  sinkClip('pp-mouth', MOUTH.x, MOUTH.x + MOUTH.w, MOUTH.y + MOUTH.d, MOUTH.y, TOP),
  `<g clip-path="url(#pp-mouth)" data-part="mouth"></g>`,
  `<g data-part="leaves"><g data-part="orig">${leaf('orig', TZ[1], { dx: ORIG[0], dy: ORIG[1] })}</g><g data-part="copy">${leaf('top', TOP_Z)}</g></g>`,
  outboxFront(),
  `<g data-part="head">${head()}</g>`,
  `<g data-part="screw-lo">${screwSvg(k, P, C, HEAD.die + 18.5, ARM.z[0], vcoil)}</g>`,
  arm(),
  `<g data-part="screw-hi">${screwSvg(k, P, C, ARM.z[1] + 4, HUB0, vcoil)}</g>`,
  `<g data-part="wheel">${wheelSvg(k, P, C, HUB0, 0)}</g>`,
  `<g data-part="lever">${leverSvg(k, P, C, 0, vcoil, polySolid)}</g>`,
  pedestalFront(),
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A small desktop redaction press that shows how Pavii keeps personal data private. A prompt slides in on a sliding bed as two leaves. A redaction head on a screw lowers and stamps ink bars over the personal fields of the top leaf. A lever stamp presses a round proof seal onto it, a fact without the data. The masked leaf slides into the outbox for the AI provider, and the original drops into a locked drawer under the bed.',
  body,
});

const pins = pinsHtml(P, WIDTH, HEIGHT, [
  { id: 'prompt', n: 1, at: [FEED_X, -5, TOP_Z + LT + FEED_DZ], icon: 'file-text', title: 'Your prompt', sub: 'Arrives with personal details inside', side: 'down', lift: 40, expand: true, seek: 'in' },
  { id: 'gate', n: 2, at: [ARM.x, -40, ARM.z[0] + 5], icon: 'eye-slash', title: 'Privacy gate', sub: 'Masks names, numbers and addresses', side: 'left', lift: 60, expand: true, seek: 'mask' },
  { id: 'proof', n: 3, at: [5, -44, PED.h + 12], icon: 'seal-check', title: 'Proof stamp', sub: 'Shows a fact, not the data', lift: 30, expand: true, seek: 'proof' },
  { id: 'outbox', n: 4, at: [BOX.x + 20, BOX.y + 1, BOX_TOP], icon: 'tray-arrow-up', title: 'Provider outbox', sub: 'Patterns and proofs, no personal data', lift: 34, expand: true, seek: 'safe' },
  { id: 'drawer', at: [DRAWER.x + 20, FRONT + 1, DRAWER.z[0] + 1], icon: 'lock-key', title: 'Locked drawer', sub: 'The original stays with you', side: 'down', expand: true },
]);

const steps = stepsHtml([
  { id: 'in', icon: 'file-text', title: 'The prompt comes in', sub: 'Your prompt arrives with names and numbers in it' },
  { id: 'mask', icon: 'eye-slash', title: 'Personal data is masked', sub: 'The privacy gate covers each personal field' },
  { id: 'proof', icon: 'seal-check', title: 'A proof replaces the data', sub: 'A zero-knowledge proof shows a fact without the data' },
  { id: 'safe', icon: 'tray-arrow-up', title: 'The provider gets safe data', sub: 'Only patterns and proofs go out. The original stays with you.' },
]);

const T = {
  fade: [0, 0.35],
  feed: [0.4, 1.4],
  toGate: [1.6, 2.9],
  headDown: [3.0, 3.45],
  headUp: [3.8, 4.3],
  toSeal: [4.4, 5.4],
  leverDown: [5.5, 5.8],
  leverUp: [5.95, 6.35],
  toEnd: [6.4, 7.4],
  toBox: [7.5, 8.1],
  drop: [8.1, 8.4],
  unlock: [8.15, 8.45],
  toMouth: [8.5, 9.1],
  sink: [9.1, 9.5],
  lock: [9.6, 10.0],
  back: [10.1, 11.1],
  stackSink: [10.4, 11.0],
  loop: 11.6,
};
const STAGES = [
  { id: 'in', until: T.headDown[0], text: 'prompt comes in · 2 personal fields', pins: ['prompt'] },
  { id: 'mask', until: T.toSeal[0], text: 'personal data masked', pins: ['gate'] },
  { id: 'proof', until: T.toEnd[0], text: 'proof replaces the data', pins: ['proof'] },
  { id: 'safe', until: T.loop + 1, text: 'provider gets safe data only', pins: ['outbox', 'drawer'] },
];

const live = `
${playFigure.toString()}
${polySolid.toString()}
${screwSvg.toString()}
${wheelSvg.toString()}
${leverSvg.toString()}
${keySvg.toString()}
${vcoil.toString()}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify({ ...C, STATION, T, STAGES, WIDTH, HEIGHT, HUB0, ARM, PHI_PRESS, FEED_X, FEED_DZ, BOX_X, BOX_DZ: BOX_FLOOR + BOX_STACK * LT - TOP_Z, MOUTH_DY: MOUTH.y + MOUTH.d / 2 - (LEAF.y + LEAF.d / 2 + ORIG[1]), CASE_DZ: TOP - TZ[1], TOP_Z, LT })};
const K = { cylinder, solidSvg, lineSvg, pathOf, iso, depthOf, dotsSvg, slabOf, extrude, cameraOf, ring, knurl };
for (const stage of document.querySelectorAll('[data-figure="privacy-press"]')) {
  const svg = stage.querySelector('svg');
  const q = (name) => svg.querySelector('[data-part="' + name + '"]');
  const tableEl = q('table'), leavesEl = q('leaves'), copy = q('copy'), orig = q('orig'), mouth = q('mouth');
  const stack = q('stack'), barsEl = q('bars'), sealEl = q('seal');
  const headEl = q('head'), screwLo = q('screw-lo'), screwHi = q('screw-hi'), wheel = q('wheel');
  const lever = q('lever'), keyEl = q('key'), led = q('led');
  const copySolid = copy.querySelector('.iso-solid');
  const figure = stage.closest('.iso-figure');
  const readout = figure.querySelector('[data-readout]');
  const pins = Object.fromEntries([...stage.querySelectorAll('[data-pin]')].map((el) => [el.dataset.pin, el]));
  const steps = [...figure.querySelectorAll('[data-step]')];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const T = C.T, S = C.STATION;
  const last = {};
  const set = (key, value, apply) => { if (last[key] !== value) { last[key] = value; apply(value); } };
  const move = (a, b, t, w) => a + (b - a) * ease(span(t, w));

  function tableX(t) {
    if (t < T.toGate[0]) return S.start;
    if (t < T.toSeal[0]) return move(S.start, S.gate, t, T.toGate);
    if (t < T.toEnd[0]) return move(S.gate, S.seal, t, T.toSeal);
    if (t < T.back[0]) return move(S.seal, S.end, t, T.toEnd);
    return move(S.end, S.start, t, T.back);
  }
  // Where the leaf set rides before it is split: on the feed stack, then the bed.
  function setPos(t) {
    if (t < T.feed[0]) return [C.FEED_X, C.FEED_DZ];
    if (t < T.feed[1]) { const s = ease(span(t, T.feed)); return [C.FEED_X + (S.start - C.FEED_X) * s, C.FEED_DZ * (1 - s)]; }
    return [tableX(Math.min(t, T.back[0] - 0.001)), 0];
  }
  function copyPos(t) {
    if (t < T.toBox[0]) return setPos(t);
    const x = move(S.end, C.BOX_X, t, T.toBox);
    const s = span(t, T.drop);
    return [x, C.BOX_DZ * s * s];
  }
  function origPos(t) {
    if (t < T.toMouth[0]) { const [x, z] = setPos(t); return [x, 0, z]; }
    const s = span(t, T.toMouth);
    const dy = C.MOUTH_DY * ease(s);
    const dz = C.CASE_DZ * ease(clamp((s - 0.45) / 0.45, 0, 1));
    const f = span(t, T.sink);
    return [S.end + 1.5 * ease(s), dy, dz - 26 * f * f];
  }
  function headDz(t) {
    const d = C.HEAD.travel;
    if (t < T.headDown[0] || t > T.headUp[1]) return 0;
    if (t < T.headDown[1]) return -d * ease(span(t, T.headDown));
    if (t < T.headUp[0]) return -d;
    return -d * (1 - ease(span(t, T.headUp)));
  }
  function leverPhi(t) {
    if (t < T.leverDown[0] || t > T.leverUp[1]) return 0;
    if (t < T.leverDown[1]) { const s = span(t, T.leverDown); return C.PHI_PRESS * s * s; }
    if (t < T.leverUp[0]) return C.PHI_PRESS;
    return C.PHI_PRESS * (1 - ease(span(t, T.leverUp)));
  }
  function keyOpen(t) {
    if (t < T.unlock[0] || t > T.lock[1]) return 0;
    if (t < T.unlock[1]) return ease(span(t, T.unlock));
    if (t < T.lock[0]) return 1;
    return 1 - ease(span(t, T.lock));
  }
  function place(el, point) {
    const [x, y] = iso(point, P);
    el.style.left = (x / C.WIDTH) * 100 + '%';
    el.style.top = (y / C.HEIGHT) * 100 + '%';
  }

  // Every part is touched only when its value changes.
  function draw(t) {
    const tx = tableX(t);
    set('table', tx.toFixed(2), () => tableEl.setAttribute('transform', translateAlong(P, [tx, 0, 0])));
    // The leaf set: fades in on the feed stack at the start of each cycle.
    set('fade', ease(span(t, T.fade)).toFixed(2), (o) => leavesEl.setAttribute('opacity', o));
    const [cx, cz] = copyPos(t);
    set('copy', cx.toFixed(2) + ',' + cz.toFixed(2), () => copy.setAttribute('transform', translateAlong(P, [cx, 0, cz])));
    // In the outbox the copy joins the stack (clipped by the tray) and is no longer the lit part.
    const boxed = t >= T.drop[0];
    set('boxed', boxed, (on) => {
      (on ? stack : leavesEl).appendChild(copy);
      copySolid.toggleAttribute('data-lit', !on);
      if (!on && orig.parentNode === leavesEl) leavesEl.insertBefore(orig, copy);
    });
    set('bars', t >= T.headDown[1], (on) => barsEl.setAttribute('opacity', on ? '1' : '0'));
    set('seal', t >= T.leverDown[1], (on) => sealEl.setAttribute('opacity', on ? '1' : '0'));
    const [ox, oy, oz] = origPos(t);
    set('orig', ox.toFixed(2) + ',' + oy.toFixed(2) + ',' + oz.toFixed(2), () => orig.setAttribute('transform', translateAlong(P, [ox, oy, oz])));
    set('mouth', t >= T.toMouth[0], (on) => { if (on) mouth.appendChild(orig); else leavesEl.insertBefore(orig, leavesEl.firstChild); });
    set('origHidden', t >= T.sink[1], (on) => orig.setAttribute('opacity', on ? '0' : '1'));
    // The outbox stack sinks one leaf before the cycle ends.
    const sink = ease(span(t, T.stackSink));
    set('sink', sink.toFixed(3), () => stack.setAttribute('transform', translateAlong(P, [0, 0, -C.LT * sink])));
    // Hand wheel, screw and redaction head.
    const dz = headDz(t);
    set('head', dz.toFixed(2), () => {
      headEl.setAttribute('transform', translateAlong(P, [0, 0, dz]));
      screwLo.innerHTML = screwSvg(K, P, C, C.HEAD.die + 18.5 + dz, C.ARM.z[0], vcoil);
      screwHi.innerHTML = screwSvg(K, P, C, C.ARM.z[1] + 4, C.HUB0 + dz, vcoil);
      wheel.innerHTML = wheelSvg(K, P, C, C.HUB0 + dz, (dz / C.HEAD.travel) * Math.PI * 2.2);
    });
    const phi = leverPhi(t);
    set('lever', phi.toFixed(4), () => { lever.innerHTML = leverSvg(K, P, C, phi, vcoil, polySolid); });
    const open = keyOpen(t);
    set('key', open.toFixed(3), () => {
      keyEl.innerHTML = keySvg(K, P, C, open);
      led.setAttribute('opacity', open < 0.02 ? '1' : '0.15');
    });
    // Labels, step cards and readout follow the stage.
    const index = C.STAGES.findIndex((s) => t < s.until);
    const current = C.STAGES[index];
    set('stage', index, () => {
      for (const [id, el] of Object.entries(pins)) {
        const on = current.pins.includes(id);
        el.toggleAttribute('data-on', on);
        el.toggleAttribute('data-dim', !on);
      }
      for (const step of steps) step.toggleAttribute('data-on', step.dataset.step === current.id);
      if (readout) readout.textContent = 'stage ' + (index + 1) + ' of 4 · ' + current.text;
    });
    if (pins.prompt) {
      set('promptPin', cx.toFixed(1) + ',' + cz.toFixed(1), () => place(pins.prompt, [cx, -5, C.TOP_Z + C.LT + cz]));
      set('promptHidden', t >= T.toBox[0], (hidden) => pins.prompt.toggleAttribute('data-hidden', hidden));
    }
  }
  playFigure(stage, (t) => draw(t), {
    loop: T.loop,
    stillAt: T.leverUp[1] + 0.03,
    seek: { in: 0.4, mask: T.headDown[0], proof: T.toSeal[0], safe: T.toEnd[1] },
  });
}
`;

const plate = k.plateHtml({
  fig: 'Fig 2',
  title: 'How Pavii keeps personal data private',
  hint: 'Masked before it leaves your hands',
  readout: `stage 1 of 4 · ${STAGES[0].text}`,
  body: `<div class="iso-stage" data-figure="privacy-press">${svg}${pins}</div>`,
}).replace('</figure>', `${steps}</figure>`);

writeFigure('privacy-press', { plate, live, title: 'Privacy press' });
