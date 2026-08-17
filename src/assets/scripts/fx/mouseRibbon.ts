// Mouse ribbon-trail effect (inspired by Originkit's "ribbon-trails").
// A tapering translucent ribbon follows the pointer with spring smoothing.
// Decorative only: pointer-events none, mouse pointers only (no touch),
// honors reduced motion via the caller, pauses when the document is hidden.

type MouseRibbonOptions = {
  color: string;
  segmentCount?: number;
  maxWidth?: number;
};

export function mountMouseRibbon(canvas: HTMLCanvasElement, options: MouseRibbonOptions): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const segmentCount = options.segmentCount ?? 22;
  const maxWidth = options.maxWidth ?? 14;

  type Point = { x: number; y: number };
  const trail: Point[] = [];
  let target: Point | null = null;
  let raf = 0;
  let running = true;
  let idleFrames = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const rect = canvas.getBoundingClientRect();
    target = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    idleFrames = 0;
    if (trail.length === 0) {
      for (let i = 0; i < segmentCount; i++) trail.push({ ...target });
    }
  };

  const draw = () => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (target && trail.length > 0) {
      // Spring-follow: head chases the pointer, each segment chases the previous
      trail[0].x += (target.x - trail[0].x) * 0.38;
      trail[0].y += (target.y - trail[0].y) * 0.38;
      for (let i = 1; i < trail.length; i++) {
        trail[i].x += (trail[i - 1].x - trail[i].x) * 0.42;
        trail[i].y += (trail[i - 1].y - trail[i].y) * 0.42;
      }

      idleFrames += 1;
      const settle = Math.max(0, 1 - idleFrames / 90); // fade out when the mouse rests

      if (settle > 0.01) {
        for (let i = 1; i < trail.length; i++) {
          const t = i / trail.length;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = options.color;
          ctx.lineWidth = Math.max(0.5, maxWidth * (1 - t));
          ctx.lineCap = 'round';
          ctx.globalAlpha = 0.35 * (1 - t) * settle;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    raf = requestAnimationFrame(draw);
  };

  const onVisibility = () => {
    running = !document.hidden;
    if (running) raf = requestAnimationFrame(draw);
    else cancelAnimationFrame(raf);
  };

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(draw);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
