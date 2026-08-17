// Ribbon-trails background effect (inspired by Originkit's "ribbon-trails").
// Flowing translucent ribbons drawn on a canvas with a fading trail buffer.
// Decorative only: pointer-events none, honors reduced motion via the caller,
// pauses when the document is hidden, DPR capped for perf.

type RibbonOptions = {
  colors: string[];
  background: string;
  ribbonCount?: number;
};

export function mountRibbonTrails(canvas: HTMLCanvasElement, options: RibbonOptions): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const ribbons = Array.from({ length: options.ribbonCount ?? 4 }, (_, index) => ({
    phase: Math.random() * Math.PI * 2,
    speed: 0.16 + Math.random() * 0.12,
    amplitude: 0.16 + Math.random() * 0.1,
    baseline: 0.25 + (index / (options.ribbonCount ?? 4)) * 0.5,
    width: 26 + Math.random() * 30,
    color: options.colors[index % options.colors.length],
  }));

  let frame = 0;
  let raf = 0;
  let running = true;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const draw = () => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const { width, height } = rect;
    frame += 1;

    // Fading trail: translucent background wash each frame
    ctx.fillStyle = options.background;
    ctx.globalAlpha = 0.055;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;

    const t = frame / 60;
    for (const ribbon of ribbons) {
      ctx.beginPath();
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * width;
        const wave =
          Math.sin(ribbon.phase + t * ribbon.speed * 2 + (i / steps) * Math.PI * 2.2) * ribbon.amplitude +
          Math.sin(ribbon.phase * 1.7 + t * ribbon.speed + (i / steps) * Math.PI * 4.4) * ribbon.amplitude * 0.4;
        const y = (ribbon.baseline + wave) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = ribbon.color;
      ctx.lineWidth = ribbon.width;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.05;
      ctx.stroke();
      ctx.globalAlpha = 1;
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
  document.addEventListener('visibilitychange', onVisibility);
  raf = requestAnimationFrame(draw);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
