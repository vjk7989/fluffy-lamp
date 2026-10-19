// Shared helpers for the site's Anatomy figures (kit: ./kit, MIT).
//
// Each figure script builds its SVG with the kit, then calls writeFigure()
// to write the site files (src/components/home/figures/<name>.{html,live.js})
// and standalone preview pages in scripts/figures/out/. Labels are HTML pins
// placed over the drawing at projected points, so the drawing stays clean and
// the words stay readable at any size.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as k from './kit/iso-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SITE = join(ROOT, 'src', 'components', 'home', 'figures');
const OUT = join(HERE, 'out');
// Pin icons (Phosphor duotone) come from the Buckleson project, which has the package.
const PHOSPHOR = process.env.PHOSPHOR_DIR || join(ROOT, '..', 'ScrewFast', 'node_modules', '@phosphor-icons', 'core', 'assets', 'duotone');

export { k };

/** Drawing shorthands bound to one projection. */
export function tools(P) {
  const at = point => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const byDepth = points => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const col = (x, y, r, z0, z1, style = { tone: 'mid', crease: 'none' }, steps = 28) => S(k.cylinder(x, y, r, z0, z1 - z0, P, steps), style);
  const box = (plan, z0, z1, style = { tone: 'mid' }, steps = 3, bevel = 0.5) => S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), style);
  // A polyline through world points (for lines on side faces).
  const path = (points, closed = false) => k.pathOf(points.map(at), closed);
  // A circle on a face facing +y (axis 'y') or +x (axis 'x').
  const faceCircle = (center, radius, axis, steps = 32) => {
    const [cx, cy, cz] = center;
    const pts = Array.from({ length: steps }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      const u = radius * Math.cos(a);
      const v = radius * Math.sin(a);
      return axis === 'y' ? [cx + u, cy, cz + v] : [cx, cy - u, cz + v];
    });
    return path(pts, true);
  };
  return { at, S, L, D, byDepth, col, box, path, faceCircle };
}

/** The heavy base every figure stands on: feet, groove, screws, label plate. */
export function basePlate(P, plate, { height = 12, foot = 5, label, ruler } = {}) {
  const { S, L, D, at, byDepth } = tools(P);
  const out = [`<path class="iso-halo" d="${k.haloOf(plate, -height - foot, height, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(plate, 22))) {
    out.push(S(k.cylinder(x, y, 7, -height - foot, 1.6, P, 28), { tone: 'lo' }));
    out.push(S(k.cylinder(x, y, 5.4, -height - foot + 1.6, foot - 1.6, P, 28), { tone: 'mid' }));
  }
  out.push(S(k.slabOf(plate, -height, height, P, 8, 1.6), { tone: 'mid' }));
  out.push(L(k.planOutline(k.insetPlan(plate, 5), 0, P), { tone: 'lo' }));
  const screws = k.corners(plate, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(''), { tone: 'lo' }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (ruler) {
    out.push(S(k.slabOf(ruler, 0, 0.6, P, 3), { tone: 'lo', crease: 'none' }));
    const ticks = k.topTicks(ruler.x + 4, ruler.x + ruler.w - 4, 5, 5, ruler.y + 0.8, 0.6, [2, 3.6], P);
    out.push(L(ticks.minor, { tone: 'lo' }), L(ticks.major, { tone: 'mid' }));
    out.push(D([at([ruler.x + 2, ruler.y + ruler.d / 2, 0.6]), at([ruler.x + ruler.w - 2, ruler.y + ruler.d / 2, 0.6])], { size: 0.45 }));
  }
  if (label) {
    out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.3), { tone: 'lo' }));
    [0.3, 0.5, 0.7].forEach((share, i) => {
      const y = label.y + label.d * share;
      out.push(L(k.lineOnTop([label.x + 4, y], [label.x + (i === 2 ? label.w * 0.55 : label.w * 0.8), y], 0.8, P), { tone: 'faint', free: true }));
    });
    out.push(D(k.corners(label, 2.2).map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  }
  return out.join('');
}

/** Phosphor duotone icon (MIT) as inline SVG. */
export function icon(name) {
  const svg = readFileSync(join(PHOSPHOR, `${name}-duotone.svg`), 'utf8');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${inner}</svg>`;
}

const esc = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = (v, of) => `${Math.round((v / of) * 10000) / 100}%`;

/**
 * HTML pins over the drawing. Each label: { id, at: [x,y,z], icon, title,
 * sub, side: 'up' | 'down', lift: stem px }. The pin's dot sits on the part;
 * the tag floats above (or below) it on a stem; a longer stem staggers
 * neighbouring tags.
 */
export function pinsHtml(P, width, height, labels) {
  return labels
    .map(({ id, at, icon: name, title, sub, side = 'up', lift, expand, seek, n }) => {
      const [x, y] = k.iso(at, P);
      const horizontal = side === 'left' || side === 'right';
      const stem = lift ? ` style="${horizontal ? 'width' : 'height'}:max(12px,${(lift / 9.6).toFixed(2)}cqw)"` : '';
      const extra = `${expand ? ' data-expand' : ''}${seek ? ` data-seek="${seek}"` : ''}`;
      return `<span class="fig-pin" data-pin="${id}" data-side="${side}"${extra} style="left:${pct(x, width)};top:${pct(y, height)}"><span class="fig-pin-tag">${icon(name)}<span class="fig-pin-text"><b>${n ? `<span class="fig-pin-num">${n}</span>` : ''}${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></span><span class="fig-pin-stem"${stem}></span><span class="fig-pin-dot"></span></span>`;
    })
    .join('');
}

/** A numbered list under the drawing; the live script lights the current step. */
export function stepsHtml(steps) {
  return `<ol class="fig-steps">${steps
    .map(({ id, icon: name, title, sub }) => `<li><button type="button" class="fig-step" data-step="${id}"><span class="fig-step-icon">${icon(name)}</span><span class="fig-step-text"><b>${esc(title)}</b><small>${esc(sub)}</small></span></button></li>`)
    .join('')}</ol>`;
}

/**
 * A coil spring standing on z, split into the half behind its rod and the
 * half in front. Pure, so the live scripts can embed it with toString().
 */
export function vcoil(cx, cy, r, z0, z1, turns, P, iso, depthOf, pathOf) {
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

/**
 * The shared loop for every live figure, embedded with toString(). It keeps
 * its own clock (paused offscreen, so a figure resumes where it stopped),
 * schedules the next frame before drawing (one bad frame can never freeze
 * the loop), and turns the step cards and seekable pins into controls that
 * jump the animation to their stage.
 * draw(t, dt): t is the loop clock in seconds, dt the time since the last frame.
 * opts: { loop, seek: { stepId: seconds }, onSeek(id), stillAt }
 */
export function playFigure(stage, draw, opts) {
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

// Site-level additions to the kit CSS: theme keying, card blending, pins.
const SITE_CSS = `
.iso-sheet{--anatomy-page:transparent;--anatomy-card:var(--sheet-card);--anatomy-paper:var(--sheet-card)}
.iso-bare .iso-plate{background:transparent;box-shadow:none;padding:28px 0 8px}
.iso-bare{--anatomy-card:transparent;--anatomy-paper:var(--figure-paper,#fbfbfa)}
.iso .iso-figure{margin:0}
.iso .iso-plate{overflow:hidden;border-radius:1.6rem;box-shadow:0 0 0 1px color-mix(in oklab,var(--anatomy-mid) 45%,transparent)}
.iso .iso-legend{margin-top:14px}
.iso-stage{position:relative;container-type:inline-size}
.iso-plate{container-type:inline-size}
@container (max-width:600px){.iso-plate-corner[data-corner="hint"]{display:none}}
.iso .iso-plate-corner{color:var(--anatomy-text)}
.iso-hero{--anatomy-card:color-mix(in oklab,var(--card,#fff) 80%,transparent)}
.iso-hero .iso-plate{padding:46px 14px 42px}
.fig-pin{position:absolute;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,calc(-100% + 3px));pointer-events:none;transition:opacity .45s ease,transform .45s cubic-bezier(.22,1,.36,1);z-index:1}
.fig-pin[data-side="down"]{flex-direction:column-reverse;transform:translate(-50%,-3px)}
.fig-pin[data-side="right"]{flex-direction:row-reverse;transform:translate(-3.5px,-50%)}
.fig-pin[data-side="left"]{flex-direction:row;transform:translate(calc(-100% + 3.5px),-50%)}
.fig-pin[data-side="right"] .fig-pin-stem,.fig-pin[data-side="left"] .fig-pin-stem{width:12px;height:1px}
.fig-pin-tag{display:inline-flex;align-items:center;gap:7px;padding:5px 10px 5px 6px;border-radius:999px;background:var(--fig-tag,#fff);color:var(--anatomy-strong);box-shadow:0 0 0 1px color-mix(in oklab,var(--anatomy-mid) 35%,transparent),0 8px 18px -10px rgb(0 0 0/.35);white-space:nowrap;transition:box-shadow .45s ease,background .45s ease}
.fig-pin-tag>svg{flex:none;width:22px;height:22px;padding:3px;border-radius:999px;color:var(--fig-accent,#7c3aed);background:color-mix(in oklab,var(--fig-accent,#7c3aed) 12%,transparent)}
.fig-pin-text{display:grid;line-height:1.15;text-align:left}
.fig-pin-text b{font:600 11.5px/1.2 var(--font-sans,ui-sans-serif,system-ui,sans-serif);letter-spacing:-.005em}
.fig-pin-text small{font:500 10px/1.25 var(--font-sans,ui-sans-serif,system-ui,sans-serif);color:var(--anatomy-text)}
.fig-pin-stem{width:1px;height:12px;background:color-mix(in oklab,var(--anatomy-mid) 70%,transparent)}
.fig-pin-dot{width:7px;height:7px;border-radius:999px;background:var(--fig-accent,#7c3aed);box-shadow:0 0 0 2px var(--anatomy-card,#fff)}
.fig-pin[data-dim] .fig-pin-tag>svg,.fig-pin[data-dim] .fig-pin-dot,.fig-pin[data-dim] .fig-pin-stem{opacity:.4}
.fig-pin[data-dim] .fig-pin-tag{box-shadow:0 0 0 1px color-mix(in oklab,var(--anatomy-mid) 22%,transparent)}
.fig-pin[data-on] .fig-pin-tag{box-shadow:0 0 0 1.5px var(--fig-accent,#7c3aed),0 10px 22px -10px color-mix(in oklab,var(--fig-accent,#7c3aed) 60%,transparent)}
.fig-pin[data-hidden]{opacity:0}
.iso{container:figure / inline-size}
.fig-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0 0;padding:0;list-style:none}
.fig-step{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border-radius:16px;background:var(--fig-tag,#fff);box-shadow:0 0 0 1px color-mix(in oklab,var(--anatomy-mid) 30%,transparent);transition:box-shadow .45s ease,opacity .45s ease}
.fig-step-icon{display:grid;flex:none;place-items:center;width:30px;height:30px;border-radius:10px;color:var(--fig-accent,#7c3aed);background:color-mix(in oklab,var(--fig-accent,#7c3aed) 12%,transparent)}
.fig-step-icon svg{width:18px;height:18px}
.fig-step-text{display:grid;gap:2px}
.fig-step-text b{font:600 13px/1.25 var(--font-sans,ui-sans-serif,system-ui,sans-serif);color:var(--anatomy-strong)}
.fig-step-text small{font:400 12px/1.4 var(--font-sans,ui-sans-serif,system-ui,sans-serif);color:var(--anatomy-text)}
.fig-step[data-on]{box-shadow:0 0 0 1.5px var(--fig-accent,#7c3aed)}
.fig-pin-text small{white-space:normal;max-width:34ch}
.fig-pin[data-expand]:not([data-on]) .fig-pin-text small{display:none}
.fig-pin[data-seek] .fig-pin-tag{pointer-events:auto;cursor:pointer}
.fig-pin-num{display:inline-grid;place-items:center;min-width:16px;height:16px;padding:0 4px;margin-right:5px;border-radius:999px;font:700 9.5px/1 var(--font-mono,ui-monospace,monospace);color:#fff;background:var(--fig-accent,#7c3aed);vertical-align:1px}
.fig-steps>li{display:flex}
.fig-step{width:100%;margin:0;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
.fig-step:hover{box-shadow:0 0 0 1px color-mix(in oklab,var(--fig-accent,#7c3aed) 55%,transparent)}
.fig-step:focus-visible{outline:2px solid var(--fig-accent,#7c3aed);outline-offset:2px}
.fig-led{fill:var(--fig-accent,#7c3aed);transition:opacity .3s ease,fill .2s ease}
.fig-led[data-state="ok"]{fill:#22a35a}
.fig-led[data-state="bad"]{fill:#e5484d}
.fig-bad .iso-top{fill:color-mix(in oklab,#e5484d 38%,var(--anatomy-top))}
.fig-bad .iso-shade{fill:color-mix(in oklab,#e5484d 30%,var(--anatomy-shade-2))}
.fig-bad .iso-edge{stroke:#e5484d}
.iso-placeholder{width:100%}
.iso-card{--anatomy-card:transparent}
.iso-card .iso-plate{background:transparent;box-shadow:none;padding:10px 6px 30px}
.iso-card .iso-plate-corner:not([data-corner="readout"]){display:none}
.iso-card .iso-plate-corners{inset:auto 12px 6px 12px;height:12px}
.iso-card .fig-steps{display:none}
@container figbox (min-height:10rem){.iso-card .iso-stage{width:min(100cqw - 1rem,(100cqh - 3.5rem) * var(--fig-ar,1.7));margin-inline:auto}}
html.dark .iso,.iso-sheet{--fig-tag:#1c1c1c}
html:not(.dark) .iso{--fig-accent:oklch(0.511 0.262 276.966)}
html:not(.dark) .iso.iso-auto,html:not(.dark) .iso-hero{--anatomy-card:#f3f3f4}
html.dark .iso{--fig-accent:var(--accent-400,#fb923c)}
@media (max-width:520px){.fig-steps{grid-template-columns:1fr 1fr;gap:6px}.fig-step{padding:9px;gap:8px;border-radius:14px}.fig-step-icon{width:26px;height:26px;border-radius:8px}.fig-step-icon svg{width:15px;height:15px}.fig-step-text b{font-size:12px}.fig-step-text small{font-size:11px}}
@media (max-width:640px){.fig-pin:not([data-on]) .fig-pin-text small{display:none}.fig-pin-text small{max-width:21ch}.fig-pin-tag{gap:5px;padding:3px 7px 3px 3px}.fig-pin-tag>svg{width:18px;height:18px}.fig-pin-text b{font-size:10px}.fig-pin[data-dim]{visibility:hidden}}
@container figure (min-width:44rem){.fig-steps{grid-template-columns:repeat(4,minmax(0,1fr))}}
@container (max-width:700px){.fig-pin:not([data-on]) .fig-pin-text small{display:none}.fig-pin-text small{max-width:22ch}.fig-pin-tag{gap:5px;padding:3px 8px 3px 4px}.fig-pin-tag>svg{width:18px;height:18px}.fig-pin-text b{font-size:10.5px}.fig-pin-num{min-width:14px;height:14px;font-size:8.5px}}
@media (prefers-reduced-motion:reduce){.fig-pin{transition:none}}
`;

/** Write the site stylesheet: kit CSS keyed to the site theme, plus pins. */
export function writeCss() {
  const css = readFileSync(join(HERE, 'kit', 'iso.css'), 'utf8').replace('.iso[data-theme="light"]', 'html:not(.dark) .iso.iso-auto');
  writeFileSync(join(ROOT, 'src', 'assets', 'styles', 'iso.css'), `/* Generated by scripts/figures/lib.mjs from the Anatomy kit (MIT). */\n${css}${SITE_CSS}`);
}

/** Write the figure's site files and two preview pages (dark and light). */
export function writeFigure(name, { plate, live, title }) {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(SITE, { recursive: true });
  const kitSrc = readFileSync(join(HERE, 'kit', 'iso-kit.mjs'), 'utf8').replace(/^export /gm, '');
  for (const theme of ['dark', 'light']) {
    const page = k
      .pageHtml({ title, theme, body: plate, script: kitSrc + live, width: 900 })
      .replace('</style>', `${SITE_CSS.replace(/html:not\(\.dark\) \.iso/g, '.iso[data-theme="light"]').replace(/html\.dark \.iso/g, '.iso[data-theme="dark"]')}</style>`);
    writeFileSync(join(OUT, `${name}${theme === 'light' ? '-light' : ''}.html`), page);
  }
  writeFileSync(join(SITE, `${name}.html`), plate);
  writeFileSync(join(SITE, `${name}.live.js`), live);
  writeCss();
  console.log(`wrote ${name} + previews`);
}
