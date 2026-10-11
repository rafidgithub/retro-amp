// Shared bits for the games: crisp canvases, frame loops, pointer mapping, swipes.

// Size a canvas for w×h CSS pixels, drawn sharp on high-DPI screens.
// Returns a context already scaled to CSS pixels.
export function crisp(canvas, w, h) {
  const r = Math.min(3, Math.ceil(window.devicePixelRatio || 1));
  canvas.width = w * r;
  canvas.height = h * r;
  canvas.style.width = `${w}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(r, 0, 0, r, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

// requestAnimationFrame loop; step(dt seconds, now ms). dt is capped so a
// background tab doesn't teleport anything.
export function loop(step) {
  let id = 0;
  let last = 0;
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    id = requestAnimationFrame(frame);
    step(dt, now);
  };
  return {
    start() {
      if (id) return;
      last = performance.now();
      id = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(id);
      id = 0;
    },
    get running() {
      return id !== 0;
    },
  };
}

// Pointer position in the canvas's own w×h coordinate space (works when CSS scales it).
export function toLocal(canvas, e, w, h) {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) * w) / r.width, ((e.clientY - r.top) * h) / r.height];
}

// Swipe and tap gestures on touch screens: onSwipe('left'|'right'|'up'|'down'), onTap().
export function swipe(el, onSwipe, onTap) {
  let start = null;
  el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') start = [e.clientX, e.clientY];
  });
  el.addEventListener('pointerup', e => {
    if (!start) return;
    const dx = e.clientX - start[0];
    const dy = e.clientY - start[1];
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return onTap?.();
    onSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  });
  el.addEventListener('pointercancel', () => (start = null));
}

// The self-hosted pixel font, for scores drawn on canvas.
export const PIXEL_FONT = 'Silkscreen, "Courier New", monospace';
export const fontReady = (document.fonts?.load(`8px ${PIXEL_FONT}`) || Promise.resolve()).catch(() => {});

export const shuffle = arr => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
