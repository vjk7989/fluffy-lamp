// Fig 3: how the company brain checks access (Anatomy kit, MIT; see ./kit/LICENSE).
//
// The company brain is a card-catalogue cabinet: every drawer holds cards
// (documents, decisions, code). Its rows are clearance levels: the two open
// rows at the bottom, the two restricted rows at the top behind lock plates,
// split by a brass clearance strip. A gantry on two rails over the cabinet
// carries a picker arm: the AI agent that acts for one person. Before any
// drawer opens, the agent's badge slides down into the key reader at the side
// (the access contract on Hyper 0X). Allowed: the lamp turns green, the
// drawer slides out and one card lifts into the reading tray under the arm.
// Restricted: the lamp turns red, the drawer lock holds, the arm moves away.
// Either way the ledger roll on the reader prints one line per request.
//
// Run: node brain-cabinet.mjs
import { k, tools, basePlate, pinsHtml, stepsHtml, playFigure, writeFigure } from './lib.mjs';

const WIDTH = 760;
const HEIGHT = 440;

const PLATE = { x: -104, y: -46, w: 192, d: 86, r: 8 };
const CAB = { x: -82, y: -30, w: 124, d: 40, r: 1.5 };
const CAB_Z = [4, 64];
const FACE = CAB.y + CAB.d; // 10
const TOP = { x: -84, y: -32, w: 128, d: 44, r: 2 };
const TOP_Z = [64, 67];
const COLX = [-65, -35, -5, 25];
const ROWS = 4;
const OPEN_ROWS = 2;
const rowB = r => 6 + 14 * r;
const RAIL_Y = [-26, 6];
const RAIL_Z = [82, 85];
const POST_X = [-78, 38];
const ARM_Y = FACE + 8; // 18: the arm hangs here, in front of the drawers
const HOUSING_Z = [80, 88];
const HEAD = { body: [6, 12], collar: 13.5 };
const HB_MAX = HOUSING_Z[0] - HEAD.collar - 0.5;
const OUT = 14; // drawer travel
const LIFT = 12;
const CARD_Y = ARM_Y + 4; // the card stands in the open tray, in front of the head
const READER = { x: 52, y: -16, w: 16, d: 22, r: 1.5, z: [2, 34] };
const SLOT_X = 57;
const BADGE = { y: [-9, 1], h: 14, rest: 28, down: 22 };
const ROLL = { x: 64, z: 37.6, r: 3.4, y: [-12.5, 2.5] };
const PAPER = { y: [-9, -1], x: READER.x + READER.w + 0.15 };

// The loop: four requests from one person's agent.
const REQUESTS = [
  { id: 87, col: 0, row: 1, ok: true },
  { id: 88, col: 2, row: 0, ok: true },
  { id: 89, col: 1, row: 3, ok: false },
  { id: 90, col: 3, row: 1, ok: true },
];
const D = 4.4;
const T = {
  move: [0, 1.0], badgeIn: [1.0, 1.4], decide: 1.9, badgeOut: [2.15, 2.55],
  open: [2.0, 2.5], lift: [2.5, 2.95], sink: [3.35, 3.75], close: [3.75, 4.2],
  tug: [2.0, 2.7], retract: [2.7, 3.6], lampOff: 3.5,
};
const hbOf = row => rowB(row) + 14 + 0.5;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -17, 0), [0, -31, 104], [-71, -31, 104], [31, 23, 93], [-82, -32, 92], [42, -28, 92]],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: 56 },
);

const { at, S, L, D: Dots, byDepth, col, box, path, faceCircle } = tools(P);

// ---- live builders (pure; embedded with toString()) ----------------------

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

const C = { COLX, FACE, ARM_Y, CARD_Y, HEAD, HOUSING_Z, PAPER, READER, ROLL };

// ---- static parts ---------------------------------------------------------

// Convex hull (screen points), for the roll seen along its axis.
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (const q of p.reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function roll() {
  const ringAt = y => Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return [ROLL.x + ROLL.r * Math.cos(a), y, ROLL.z + ROLL.r * Math.sin(a)]; });
  const back = ringAt(ROLL.y[0]).map(at);
  const front = ringAt(ROLL.y[1]).map(at);
  const fill = k.pathOf(hull([...back, ...front]), true);
  // Lower half of the roll in shade.
  const low = ringAt(ROLL.y[0]).filter(p => p[2] <= ROLL.z + 0.01);
  const lowF = ringAt(ROLL.y[1]).filter(p => p[2] <= ROLL.z + 0.01);
  const shade = k.pathOf(hull([...low, ...lowF].map(at)), true);
  const cap = k.pathOf(front, true);
  return `<g class="iso-solid"><path class="iso-fill" d="${fill}"/><path class="iso-shade" data-shade="1" d="${shade}"/><path class="iso-top" d="${cap}"/><path class="iso-line iso-edge" data-tone="mid" d="${fill}${cap}"/></g>`
    + L(faceCircle([ROLL.x, ROLL.y[1], ROLL.z], 1.3, 'y', 16), { tone: 'lo' });
}

function cabinet() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CAB, 0, CAB_Z[1], P)}"/>`];
  out.push(box({ x: -80, y: -28, w: 120, d: 36, r: 1 }, 0, CAB_Z[0], { tone: 'mid' }, 3, 0.4));
  out.push(box(CAB, CAB_Z[0], CAB_Z[1], { tone: 'mid' }, 3, 0.8));
  // Face frame: rails between rows, stiles between columns.
  const fl = [];
  for (const z of [6, 20, 48, 62]) fl.push(k.sideSeam(CAB, z, P, 3));
  for (const x of [-80, -50, -20, 10, 40]) fl.push(path([[x, FACE, 6], [x, FACE, 62]]));
  out.push(L(fl.join(''), { tone: 'faint' }));
  // The right side panel: inset outline, carry handle, terminal box.
  const sx = CAB.x + CAB.w;
  out.push(L(path([[sx, -27, 8], [sx, 7, 8], [sx, 7, 60], [sx, -27, 60]], true), { tone: 'faint' }));
  out.push(box({ x: sx, y: -16, w: 1.6, d: 10, r: 0.6 }, 44, 46, { tone: 'mid', crease: 'none' }, 3, 0.2));
  out.push(Dots([at([sx, -18, 45]), at([sx, -4, 45])], { size: 0.45 }));
  out.push(box({ x: sx, y: -9, w: 2, d: 6, r: 0.5 }, 18, 25, { tone: 'mid', crease: 'none' }, 2, 0.2));
  out.push(Dots([at([sx + 2, -6, 23])], { size: 0.5, tone: 'hi' }));
  // Top cap with its groove and screws.
  out.push(box(TOP, TOP_Z[0], TOP_Z[1], { tone: 'mid' }, 3, 0.8));
  out.push(L(k.planOutline(k.insetPlan(TOP, 4), TOP_Z[1], P, 3), { tone: 'faint' }));
  out.push(Dots(k.corners(TOP, 2.2).map(([x, y]) => at([x, y, TOP_Z[1]])), { size: 0.45 }));
  const g = k.insetPlan(TOP, 4);
  out.push(L([-17, -1, 0].slice(0, 2).concat([-9]).map(y => k.lineOnTop([g.x, y], [g.x + g.w, y], TOP_Z[1], P)).join(''), { tone: 'faint' }));
  return out.join('');
}

function clearanceStrip() {
  const plan = { x: CAB.x, y: FACE, w: CAB.w, d: 1.3, r: 0.3 };
  return box(plan, 33.3, 34.7, { tone: 'mid', crease: 'none' }, 2, 0.2) + Dots([-80, -50, -20, 10, 40].map(x => at([x, FACE + 1.3, 34])), { size: 0.4 });
}

function gantry() {
  const out = [];
  const post = (x, y) => col(x, y, 4, TOP_Z[1], TOP_Z[1] + 2, { tone: 'mid' }, 24) + col(x, y, 2.4, TOP_Z[1] + 2, RAIL_Z[0], { tone: 'mid', crease: 'none' }, 18)
    + L(k.sideArc(x, y, 2.4, 75, P, 14), { tone: 'faint' });
  const rail = y => {
    const plan = { x: CAB.x, y: y - 2, w: CAB.w, d: 4, r: 1 };
    return box(plan, RAIL_Z[0], RAIL_Z[1], { tone: 'mid' }, 3, 0.4)
      + L(k.lineOnTop([CAB.x + 2, y], [CAB.x + CAB.w - 2, y], RAIL_Z[1], P), { tone: 'faint' })
      + box({ x: CAB.x, y: y - 2.5, w: 3, d: 5, r: 0.6 }, RAIL_Z[1], RAIL_Z[1] + 3, { tone: 'mid' }, 2, 0.3)
      + box({ x: CAB.x + CAB.w - 3, y: y - 2.5, w: 3, d: 5, r: 0.6 }, RAIL_Z[1], RAIL_Z[1] + 3, { tone: 'mid' }, 2, 0.3)
      + Dots([at([CAB.x + 1.5, y, RAIL_Z[1] + 3]), at([CAB.x + CAB.w - 1.5, y, RAIL_Z[1] + 3])], { size: 0.4 });
  };
  for (const x of POST_X) out.push(post(x, RAIL_Y[0]));
  out.push(rail(RAIL_Y[0]));
  for (const x of POST_X) out.push(post(x, RAIL_Y[1]));
  out.push(rail(RAIL_Y[1]));
  return out.join('');
}

// The bridge, built at x = 0 and moved along the rails.
function bridge() {
  const out = [];
  for (const y of RAIL_Y) {
    const truck = { x: -6, y: y - 3, w: 12, d: 6, r: 1 };
    out.push(box(truck, RAIL_Z[1], RAIL_Z[1] + 3, { tone: 'mid' }, 3, 0.3));
    out.push(Dots([at([-4, y + 3, RAIL_Z[1] + 1.5]), at([4, y + 3, RAIL_Z[1] + 1.5])], { size: 0.4 }));
  }
  const beam = { x: -5, y: -31, w: 10, d: 54, r: 1.5 };
  out.push(box(beam, 88, 93, { tone: 'mid' }, 3, 0.5));
  out.push(L(k.sideSeam(beam, 90, P, 3), { tone: 'lo' }));
  out.push(Dots([[0, -12], [0, 0], [0, 12]].map(([x, y]) => at([x, y, 93])), { size: 0.45 }));
  // Drive motor on the back end, with a knurled hand wheel.
  const motor = { x: -7, y: -31, w: 14, d: 11, r: 1.5 };
  out.push(box(motor, 93, 101, { tone: 'mid' }, 3, 0.5));
  for (let i = 0; i < 4; i++) out.push(L(path([[-5 + i * 2.6, -20, 95], [-3.8 + i * 2.6, -20, 95], [-3.8 + i * 2.6, -20, 99], [-5 + i * 2.6, -20, 99]], true), { tone: 'lo' }));
  out.push(col(0, -25.5, 2.8, 101, 103.6, { tone: 'mid' }, 22));
  out.push(L(k.knurl(0, -25.5, 2.8, 101, 103.6, 18, P), { tone: 'lo' }));
  // Arm housing under the front of the beam.
  out.push(col(0, ARM_Y, 4.2, HOUSING_Z[0], HOUSING_Z[1], { tone: 'mid' }, 28));
  out.push(L(k.sideArc(0, ARM_Y, 4.2, 84, P, 18), { tone: 'lo' }));
  out.push(col(0, ARM_Y, 2.8, HOUSING_Z[0] - 0.8, HOUSING_Z[0], { tone: 'mid' }, 20));
  return out.join('');
}

// The picker head, built at x = 0 and hb = 0. The card rises between the jaws.
function headBack() {
  const body = { x: -12, y: ARM_Y - 4, w: 24, d: 7, r: 1.5 };
  const [z0, z1] = HEAD.body;
  const fy = body.y + body.d;
  return [
    box({ x: -11, y: fy - 0.6, w: 22, d: 0.6, r: 0.2 }, 0, z0, { tone: 'mid', crease: 'none' }, 2, 0),
    box({ x: -11.4, y: fy - 0.6, w: 1.4, d: 3.4, r: 0.3 }, 0, z0, { tone: 'mid', crease: 'none' }, 2, 0.2),
    box(body, z0, z1, { tone: 'mid' }, 3, 0.5),
    L(k.sideSeam(body, z0 + 1.6, P, 3), { tone: 'lo' }),
    Dots([at([12, ARM_Y - 2, z0 + 3.4]), at([12, ARM_Y + 0.5, z0 + 3.4])], { size: 0.55, tone: 'hi' }),
    Dots(k.corners(k.insetPlan(body, 1.6)).map(([x, y]) => at([x, y, z1])), { size: 0.4 }),
    col(0, ARM_Y, 3, z1, HEAD.collar, { tone: 'mid' }, 22),
  ].join('');
}
function headFront() {
  const fy = ARM_Y + 3;
  return box({ x: 10, y: fy - 0.6, w: 1.4, d: 3.4, r: 0.3 }, 0, HEAD.body[0], { tone: 'mid', crease: 'none' }, 2, 0.2)
    + Dots([at([11.4, fy + 1.4, 1.6]), at([11.4, fy + 1.4, 4.4])], { size: 0.4 });
}

function reader() {
  const { x, y, w, d, r, z } = READER;
  const plan = { x, y, w, d, r };
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, z[1], P)}"/>`];
  // Cable from the cabinet's terminal box to the reader.
  out.push(k.wireSvg(at([CAB.x + CAB.w + 2, -6, 20]), at([x, -6, 9]), { via: [at([47, -6, 5])], tone: 'lo' }));
  out.push(box({ x: x - 2, y: y - 2, w: w + 4, d: d + 4, r: 2 }, 0, z[0], { tone: 'mid' }, 3, 0.3));
  out.push(box(plan, z[0], z[1], { tone: 'mid' }, 3, 0.6));
  out.push(L(k.sideSeam(plan, 7, P, 3), { tone: 'lo' }));
  out.push(L(k.planOutline({ x: SLOT_X - 0.9, y: BADGE.y[0] - 1.2, w: 1.8, d: BADGE.y[1] - BADGE.y[0] + 2.4, r: 0.8 }, z[1], P, 3), { tone: 'lo' }));
  // Front face: lamp ring, display, keypad, screws.
  const fy = y + d;
  out.push(L(faceCircle([x + 8, fy, 28], 2.7, 'y', 24), { tone: 'lo' }));
  out.push(box({ x: x + 3, y: fy, w: 10, d: 0.5, r: 0.4 }, 16, 22, { tone: 'lo', crease: 'none' }, 2, 0.2));
  out.push(L(path([[x + 4.6, fy + 0.5, 19.8], [x + 10.4, fy + 0.5, 19.8]]) + path([[x + 4.6, fy + 0.5, 18], [x + 8.2, fy + 0.5, 18]]), { tone: 'faint', free: true }));
  const keys = [];
  for (const kz of [9, 11.4, 13.8]) for (const kx of [x + 4.5, x + 8, x + 11.5]) keys.push(at([kx, fy, kz]));
  out.push(Dots(keys, { size: 0.55 }));
  out.push(Dots([[x + 1.8, 31.5], [x + w - 1.8, 31.5], [x + 1.8, 5], [x + w - 1.8, 5]].map(([px, pz]) => at([px, fy, pz])), { size: 0.4 }));
  // Side face: vent slots beside the ledger strip.
  const sx = x + w;
  for (let i = 0; i < 3; i++) { const yy = 1.6 + i * 1.6; out.push(L(path([[sx, yy, 8], [sx, yy + 0.8, 8], [sx, yy + 0.8, 20], [sx, yy, 20]], true), { tone: 'lo' })); }
  // Roll cheeks (the roll sits between them).
  out.push(box({ x: ROLL.x - 3, y: ROLL.y[0] - 1, w: 6, d: 1, r: 0.4 }, z[1], ROLL.z + 3.8, { tone: 'mid' }, 2, 0.2));
  return out.join('');
}

function readerFront() {
  const z = READER.z[1];
  return box({ x: ROLL.x - 3, y: ROLL.y[1], w: 6, d: 1, r: 0.4 }, z, ROLL.z + 3.8, { tone: 'mid' }, 2, 0.2)
    + Dots([at([ROLL.x, ROLL.y[1] + 1, ROLL.z])], { size: 0.6, tone: 'hi' });
}

function badge() {
  const plan = { x: SLOT_X - 0.6, y: BADGE.y[0], w: 1.2, d: BADGE.y[1] - BADGE.y[0], r: 0.5 };
  const fx = SLOT_X + 0.6;
  const z0 = 0, z1 = BADGE.h;
  const chip = path([[fx, -7.4, 9.4], [fx, -4.6, 9.4], [fx, -4.6, 11.6], [fx, -7.4, 11.6]], true);
  const rules = path([[fx, -7.4, 8], [fx, -1, 8]]) + path([[fx, -7.4, 6.8], [fx, -3, 6.8]]);
  const hole = path([[fx, -3, 12.4], [fx, -1, 12.4]]);
  return S(k.slabOf(plan, z0, z1 - z0, P, 2, 0.3), { tone: 'hi', lit: true })
    + L(chip, { tone: 'hi' }) + L(rules, { tone: 'mid', free: true }) + L(hole, { tone: 'hi' })
    + Dots([at([fx, -2.5, 10.4])], { size: 0.5, tone: 'hi' });
}

// ---- paint back to front --------------------------------------------------

const staticDrawers = [];
for (let r = OPEN_ROWS; r < ROWS; r++) for (let c = 0; c < COLX.length; c++) staticDrawers.push(`<g data-drawer="${r}-${c}">${drawerSvg(k, P, C, r, c, 0, true)}</g>`);
const liveDrawers = [];
for (let r = 0; r < OPEN_ROWS; r++) for (let c = 0; c < COLX.length; c++) liveDrawers.push(`<g data-drawer="${r}-${c}">${drawerSvg(k, P, C, r, c, 0, false)}</g>`);

const R0 = REQUESTS[REQUESTS.length - 1];
const X0 = COLX[R0.col], HB0 = R0.ok ? hbOf(R0.row) : HB_MAX;
const [lx, ly] = at([READER.x + 8, READER.y + READER.d, 28]);
const badgeLine = [at([SLOT_X, -40, READER.z[1]]), at([SLOT_X, 30, READER.z[1]])];
const badgeClip = `M${badgeLine[0][0].toFixed(1)} ${badgeLine[0][1].toFixed(1)}L${badgeLine[1][0].toFixed(1)} ${badgeLine[1][1].toFixed(1)}L${badgeLine[1][0].toFixed(1)} 0L${badgeLine[0][0].toFixed(1)} 0Z`;

const body = [
  basePlate(P, PLATE, { label: { x: -98, y: -42, w: 28, d: 16, r: 1.5 }, ruler: { x: -92, y: 29, w: 120, d: 6, r: 1 } }),
  cabinet(),
  staticDrawers.join(''),
  `<g data-part="drawers">${liveDrawers.join('')}</g>`,
  clearanceStrip(),
  gantry(),
  `<g data-part="bridge" transform="${k.translateAlong(P, [X0, 0, 0])}">${bridge()}</g>`,
  `<g data-part="rod">${rodSvg(k, P, C, X0, HB0)}</g>`,
  `<g data-part="head-back" transform="${k.translateAlong(P, [X0, 0, HB0])}">${headBack()}</g>`,
  `<clipPath id="bc-card"><path data-part="card-clip" d="M0 0Z"/></clipPath><g clip-path="url(#bc-card)"><g data-part="card"></g></g>`,
  `<g data-part="head-front" transform="${k.translateAlong(P, [X0, 0, HB0])}">${headFront()}</g>`,
  reader(),
  `<clipPath id="bc-badge"><path d="${badgeClip}"/></clipPath><g clip-path="url(#bc-badge)"><g data-part="badge" transform="${k.translateAlong(P, [0, 0, BADGE.rest])}">${badge()}</g></g>`,
  roll(),
  readerFront(),
  `<g data-part="paper">${paperSvg(k, P, C, 3)}</g>`,
  `<circle class="fig-led" data-part="lamp" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.7" opacity="0.25"/>`,
];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    'A card-catalogue cabinet stands for the company brain: documents, decisions and code. The bottom rows are open, and the top rows are restricted and have locks. A picker arm on a gantry above the cabinet is the AI agent that acts for one person. Before a drawer opens, the agent badge goes into a key reader at the side, which is the access contract on Hyper 0X. If access is allowed, the drawer opens and one card goes up into the reading tray. If access is restricted, the lamp turns red, the drawer stays locked and the arm moves away. A ledger roll prints one line for each request.',
  body,
});

const pins = pinsHtml(P, WIDTH, HEIGHT, [
  { id: 'agent', n: 1, at: [X0 - 4.2, ARM_Y, 84], icon: 'robot', title: 'Agent', sub: 'Acts for one person', side: 'left', lift: 20, expand: true, seek: 'ask' },
  { id: 'reader', n: 2, at: [READER.x + 8, READER.y + READER.d, READER.z[1]], icon: 'identification-badge', title: 'Key reader', sub: 'Access contract on Hyper 0X', side: 'up', lift: 46, expand: true, seek: 'check' },
  { id: 'open', n: 3, at: [COLX[1] + 9, FACE + 1, 7.5], icon: 'folder-open', title: 'Open rows', sub: 'Knowledge this person may read', side: 'down', lift: 40, expand: true, seek: 'allow' },
  { id: 'locked', n: 4, at: [COLX[2] + 8.8, FACE + 1.5, 58.4], icon: 'lock', title: 'Locked rows', sub: 'Restricted, they stay shut', side: 'up', lift: 90, expand: true, seek: 'deny' },
  { id: 'tray', at: [X0 - 11.4, CARD_Y, HB0 + 3], icon: 'tray', title: 'Reading tray', side: 'left', lift: 14, seek: 'allow' },
  { id: 'ledger', at: [PAPER.x, -5, 10], icon: 'receipt', title: 'Ledger roll', sub: 'A receipt for every read', side: 'down', lift: 24, expand: true, seek: 'check' },
]);

const steps = stepsHtml([
  { id: 'ask', icon: 'robot', title: 'The agent asks for knowledge', sub: 'It acts for one person and asks for one drawer' },
  { id: 'check', icon: 'identification-badge', title: 'The badge is checked on chain', sub: 'The access contract on Hyper 0X decides' },
  { id: 'allow', icon: 'folder-open', title: 'Allowed drawers open', sub: 'One card goes to the agent, and the ledger records it' },
  { id: 'deny', icon: 'lock', title: 'Restricted drawers stay locked', sub: 'The agent gets nothing, and the attempt is recorded' },
]);

const live = `
${playFigure.toString()}
${drawerSvg.toString()}
${cardSvg.toString()}
${rodSvg.toString()}
${paperSvg.toString()}
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify({ ...C, REQUESTS, D, T, HB_MAX, OUT, LIFT, BADGE, WIDTH, HEIGHT })};
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
`;

const plate = k.plateHtml({
  fig: 'Fig 3',
  title: 'How the company brain checks access',
  hint: 'Every read is checked and recorded',
  readout: 'query #87 · analyst · asking',
  body: `<div class="iso-stage" data-figure="brain-cabinet">${svg}${pins}</div>`,
}).replace('</figure>', `${steps}</figure>`);

writeFigure('brain-cabinet', { plate, live, title: 'Brain cabinet' });
console.log('solids', (plate.match(/class="iso-solid/g) || []).length);
