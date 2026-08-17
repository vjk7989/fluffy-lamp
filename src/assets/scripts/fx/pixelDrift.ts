// Pixel-drift background effect (inspired by Originkit's "pixeldrift").
// Sparse small squares drifting slowly upward with a gentle twinkle.
// Decorative only: pointer-events none, honors reduced motion via the caller,
// pauses when the document is hidden, DPR capped for perf.

type PixelDriftOptions = {
  color: string;
  particleCount?: number;
  maxOpacity?: number;
};

export function mountPixelDrift(canvas: HTMLCanvasElement, options: PixelDriftOptions): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const count = options.particleCount ?? 70;
  const maxOpacity = options.maxOpacity ?? 0.5;

  type Particle = { x: number; y: number; size: number; speed: number; twinkle: number; offset: number };
  let particles: Particle[] = [];
  let raf = 0;
  let running = true;
  let frame = 0;

  const spawn = (width: number, height: number): Particle => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2 + Math.floor(Math.random() * 3),
    speed: 0.08 + Math.random() * 0.22,
    twinkle: 0.4 + Math.random() * 0.6,
    offset: Math.random() * Math.PI * 2,
  });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: count }, () => spawn(rect.width, rect.height));
  };

  const draw = () => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const { width, height } = rect;
    frame += 1;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = options.color;

    for (const particle of particles) {
      particle.y -= particle.speed;
      if (particle.y < -4) {
        particle.y = height + 4;
        particle.x = Math.random() * width;
      }
      const alpha = maxOpacity * particle.twinkle * (0.55 + 0.45 * Math.sin(particle.offset + frame / 90));
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;

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
