// Exposes the Anatomy kit (MIT, scripts/figures/kit) to the figures' live
// scripts, and loads lazy figures when they come near: the drawing goes into
// its already-sized box, then the figure's script is imported and runs.
// Bundled once per page however many figures it has.
import * as kit from '../../../scripts/figures/kit/iso-kit.mjs';

type Runner = () => void;
const w = window as unknown as { IsoKit: typeof kit; __isoRun?: Record<string, Runner> };

w.IsoKit = kit;
window.dispatchEvent(new Event('isokit'));

const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));

async function load(el: HTMLElement) {
  const { isoSrc: src, isoJs: js, isoLazy: name = '' } = el.dataset;
  if (!src || !js) return;
  el.removeAttribute('data-iso-src');
  try {
    const response = await fetch(src);
    if (!response.ok) return;
    const drawing = (await response.json()) as { svgOpen: string; chunks: string[]; pins: string };
    const box = el.querySelector<HTMLElement>(`[data-figure="${name}"]`) ?? el;
    // Build the drawing a piece at a time, yielding between pieces, so no
    // single task blocks the page; then the labels, then the script.
    // The empty SVG has the drawing's size, so swapping it in shifts nothing.
    box.innerHTML = `${drawing.svgOpen}</svg>`;
    const svg = box.firstElementChild as SVGSVGElement;
    for (const chunk of drawing.chunks) {
      svg.insertAdjacentHTML('beforeend', chunk);
      await pause();
    }
    box.insertAdjacentHTML('beforeend', drawing.pins);
    await pause();
    if (w.__isoRun?.[name]) w.__isoRun[name]();
    else await import(/* @vite-ignore */ js);
  } catch {
    // Offline or blocked: the frame and steps still read fine without it.
  }
}

// Start once the page has loaded and the browser is idle, so the drawings
// never compete with the page's first paint.
const start = () => {
  const lazy = [...document.querySelectorAll<HTMLElement>('[data-iso-src]')];
  if (!lazy.length) return;
  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        load(entry.target as HTMLElement);
      }
    },
    { rootMargin: '900px 0px' }
  );
  lazy.forEach(el => observer.observe(el));
};
const idle = (fn: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200));
if (document.readyState === 'complete') idle(start);
else window.addEventListener('load', () => idle(start), { once: true });
