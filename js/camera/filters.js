// Retro camera filters. Every filter runs on raw pixels, so the live preview
// and the saved photo look exactly the same.
//
// Filter: { id, name, era, px, aspect?, frame?, pixel?, type, fx(d, w, h, t) | null, overlay?(ctx, w, h, t) }
//   px      pixel budget for the preview; pixel-art filters capture at this size
//           too and are scaled up without smoothing. Others capture at full size.
//   aspect  crop the camera picture to this width / height
//   frame   instant-film border: [top, sides, bottom] as fractions of the width
//   type    image type of the saved file

const FULL = 640 * 480;

// 4×4 Bayer matrix, 0…1: the ordered dither of 80s/90s graphics hardware.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const luma = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));

// Map brightness onto a palette ordered dark → light, with ordered dither.
function ditherLevels(d, w, h, palette, contrast = 1) {
  const n = palette.length - 1;
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i += 4) {
      const v = Math.min(1, Math.max(0, (luma(d, i) / 255 - 0.5) * contrast + 0.5));
      const c = palette[Math.min(n, Math.floor(v * n + BAYER[(y & 3) * 4 + (x & 3)]))];
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
    }
  }
}

// Darker corners, cached per size.
const vignettes = new Map();
function vignette(w, h, strength) {
  const key = `${w}x${h}x${strength}`;
  let m = vignettes.get(key);
  if (m) return m;
  m = new Float32Array(w * h);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.hypot(cx, cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = Math.hypot(x - cx, y - cy) / r;
      m[y * w + x] = 1 - strength * k * k * k;
    }
  }
  if (w * h <= FULL) {
    if (vignettes.size > 8) vignettes.clear();
    vignettes.set(key, m);
  }
  return m;
}

const PALETTE_16 = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'].map(hex);
const POCKET = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'].map(hex);
const CGA = ['#000000', '#ff55ff', '#55ffff', '#ffffff'].map(hex);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Glowing date stamp in a corner, like a camcorder or a film camera's date back.
function stamp(ctx, w, h, lines, color, size) {
  const px = Math.max(6, Math.round(size));
  ctx.save();
  ctx.font = `${px}px Silkscreen, "Courier New", monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = color;
  ctx.shadowBlur = px / 3;
  const pad = Math.round(px * 0.9);
  lines.forEach((text, k) => {
    const y = h - pad - (lines.length - 1 - k) * px * 1.2;
    ctx.fillStyle = 'rgba(0, 0, 0, .55)';
    ctx.fillText(text, w - pad + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, w - pad, y);
  });
  ctx.restore();
}

export const FILTERS = [
  {
    id: 'plain',
    name: 'Plain',
    era: 'no filter',
    px: FULL,
    type: 'image/jpeg',
    fx: null,
  },
  {
    id: 'pocket',
    name: 'Pocket Cam',
    era: '1998 · handheld camera add-on',
    px: 128 * 112,
    aspect: 128 / 112,
    pixel: true,
    type: 'image/png',
    fx: (d, w, h) => ditherLevels(d, w, h, POCKET, 1.35),
  },
  {
    id: 'cga',
    name: 'CGA',
    era: '1981 · 4-colour PC graphics',
    px: 320 * 200,
    pixel: true,
    type: 'image/png',
    fx: (d, w, h) => ditherLevels(d, w, h, CGA, 1.2),
  },
  {
    id: 'ega',
    name: '16 Colors',
    era: '1987 · VGA desktop',
    px: 320 * 240,
    pixel: true,
    type: 'image/png',
    fx(d, w, h) {
      for (let y = 0, i = 0; y < h; y++) {
        for (let x = 0; x < w; x++, i += 4) {
          const t = (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * 96;
          const r = d[i] + t;
          const g = d[i + 1] + t;
          const b = d[i + 2] + t;
          let best = 0;
          let bestD = Infinity;
          for (let k = 0; k < 16; k++) {
            const c = PALETTE_16[k];
            const dist = (r - c[0]) ** 2 * 3 + (g - c[1]) ** 2 * 4 + (b - c[2]) ** 2 * 2;
            if (dist < bestD) {
              bestD = dist;
              best = k;
            }
          }
          const c = PALETTE_16[best];
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
        }
      }
    },
  },
  {
    id: 'onebit',
    name: '1-Bit',
    era: '1984 · black-and-white desktop',
    px: 512 * 342,
    pixel: true,
    type: 'image/png',
    // Atkinson dithering: spreads 3/4 of the error, so highlights stay crisp.
    fx(d, w, h) {
      const v = new Float32Array(w * h);
      for (let p = 0; p < v.length; p++) v[p] = (luma(d, p * 4) - 128) * 1.15 + 128;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          const out = v[p] < 128 ? 0 : 255;
          const err = (v[p] - out) / 8;
          v[p] = out;
          if (x + 1 < w) v[p + 1] += err;
          if (x + 2 < w) v[p + 2] += err;
          if (y + 1 < h) {
            if (x > 0) v[p + w - 1] += err;
            v[p + w] += err;
            if (x + 1 < w) v[p + w + 1] += err;
          }
          if (y + 2 < h) v[p + 2 * w] += err;
        }
      }
      for (let p = 0, i = 0; p < v.length; p++, i += 4) d[i] = d[i + 1] = d[i + 2] = v[p];
    },
  },
  {
    id: 'phosphor',
    name: 'Green Screen',
    era: '1977 · monochrome monitor',
    px: 320 * 240,
    pixel: true,
    type: 'image/png',
    fx(d, w, h) {
      for (let y = 0, i = 0; y < h; y++) {
        const scan = y & 1 ? 0.55 : 1;
        for (let x = 0; x < w; x++, i += 4) {
          const v = Math.round((luma(d, i) / 255) * 7) / 7;
          d[i] = (20 + 60 * v * v) * scan;
          d[i + 1] = (24 + 231 * v) * scan;
          d[i + 2] = (16 + 70 * v * v) * scan;
        }
      }
    },
  },
  {
    id: 'vhs',
    name: 'Camcorder',
    era: '1989 · home video tape',
    px: 352 * 240,
    pixel: true,
    type: 'image/png',
    fx(d, w, h, t) {
      const src = d.slice();
      const shift = Math.max(1, Math.round(w / 160));
      // A tracking glitch drifts down the picture now and then.
      const band = (t * 0.06) % (h * 3);
      for (let y = 0, i = 0; y < h; y++) {
        const wobble = Math.abs(y - band) < 4 ? Math.round(3 + Math.random() * 4) : 0;
        for (let x = 0; x < w; x++, i += 4) {
          const at = (sx, c) => src[(y * w + Math.min(w - 1, Math.max(0, sx - wobble))) * 4 + c];
          const r = at(x + shift, 0);
          const g = at(x, 1);
          const b = at(x - shift, 2);
          const l = 0.299 * r + 0.587 * g + 0.114 * b;
          const n = (Math.random() - 0.5) * 26 + (y & 1 ? -6 : 4);
          d[i] = l + (r - l) * 0.75 + n + 6;
          d[i + 1] = l + (g - l) * 0.75 + n;
          d[i + 2] = l + (b - l) * 0.75 + n + 4;
        }
      }
    },
    overlay(ctx, w, h) {
      const now = new Date();
      const hr = now.getHours();
      const time = `${hr < 12 ? 'AM' : 'PM'} ${hr % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
      stamp(ctx, w, h, [time, `${MONTHS[now.getMonth()]}.${now.getDate()} ${now.getFullYear()}`], '#ffd23c', h / 15);
    },
  },
  {
    id: 'silent',
    name: 'Silent Film',
    era: '1920s · hand-cranked camera',
    px: FULL,
    type: 'image/jpeg',
    fx(d, w, h, t) {
      const vig = vignette(w, h, 0.85);
      const flicker = 1 + Math.sin(t / 37) * 0.04 + (Math.random() - 0.5) * 0.05;
      const scratches = [];
      for (let k = 0; k < 2; k++) if (Math.random() < 0.35) scratches.push(Math.floor(Math.random() * w));
      for (let p = 0, i = 0; p < vig.length; p++, i += 4) {
        let v = (luma(d, i) - 128) * 1.35 + 128;
        v = v * vig[p] * flicker + (Math.random() - 0.5) * 34;
        if (scratches.includes(p % w)) v = 220;
        d[i] = v * 1.07 + 10;
        d[i + 1] = v * 0.93 + 4;
        d[i + 2] = v * 0.72;
      }
    },
  },
  {
    id: 'instant',
    name: 'Instant',
    era: '1972 · instant film',
    px: FULL,
    aspect: 1,
    frame: [0.06, 0.06, 0.24],
    type: 'image/jpeg',
    fx(d, w, h) {
      const vig = vignette(w, h, 0.45);
      for (let p = 0, i = 0; p < vig.length; p++, i += 4) {
        const k = vig[p];
        // faded blacks, warm highlights, cyan-ish shadows
        const r = d[i] / 255;
        const g = d[i + 1] / 255;
        const b = d[i + 2] / 255;
        d[i] = (28 + 215 * r ** 0.9) * k + 6;
        d[i + 1] = (22 + 210 * g) * k;
        d[i + 2] = (40 + 170 * b ** 1.1) * k;
      }
    },
  },
  {
    id: 'disposable',
    name: 'Disposable',
    era: '1995 · cardboard film camera',
    px: FULL,
    type: 'image/jpeg',
    fx(d, w, h) {
      const vig = vignette(w, h, 0.9);
      for (let y = 0, p = 0, i = 0; y < h; y++) {
        for (let x = 0; x < w; x++, p++, i += 4) {
          const l = luma(d, i);
          const k = vig[p];
          // light leak down the right-hand edge
          const leak = Math.max(0, (x / w - 0.78) * 4.5) * (0.6 + 0.4 * Math.sin((y / h) * 3));
          d[i] = ((l + (d[i] - l) * 1.45 - 128) * 1.15 + 140) * k + leak * 150;
          d[i + 1] = ((l + (d[i + 1] - l) * 1.45 - 128) * 1.15 + 132) * k + leak * 60;
          d[i + 2] = ((l + (d[i + 2] - l) * 1.3 - 128) * 1.1 + 112) * k;
        }
      }
    },
    overlay(ctx, w, h) {
      const now = new Date();
      const two = n => String(n).padStart(2, '0');
      stamp(ctx, w, h, [`'${two(now.getFullYear() % 100)} ${two(now.getMonth() + 1)} ${two(now.getDate())}`], '#ff8a1c', h / 16);
    },
  },
];

export const filterById = id => FILTERS.find(f => f.id === id) || FILTERS[0];

// Size of the processed picture for a camera frame of vw×vh pixels.
// `full` uses the camera's own resolution (capped) for the non-pixel filters.
export function frameSize(f, vw, vh, full = false) {
  let w = vw;
  let h = vh;
  if (f.aspect) {
    if (w / h > f.aspect) w = h * f.aspect;
    else h = w / f.aspect;
  }
  const budget = full && !f.pixel ? 1920 * 1440 : f.px;
  const k = Math.min(1, Math.sqrt(budget / (w * h)));
  return { sw: w, sh: h, w: Math.max(16, Math.round(w * k)), h: Math.max(16, Math.round(h * k)) };
}

// Draw one camera frame through a filter onto `canvas`. Returns the picture size.
export function render(canvas, video, f, { mirror = false, full = false, t = 0 } = {}) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const { sw, sh, w, h } = frameSize(f, vw, vh, full);
  const [top, side, bottom] = f.frame ? f.frame.map(v => Math.round(v * w)) : [0, 0, 0];
  const cw = w + side * 2;
  const ch = h + top + bottom;
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (f.frame) {
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (mirror) {
    ctx.translate(side + w, top);
    ctx.scale(-1, 1);
  } else ctx.translate(side, top);
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, w, h);
  ctx.restore();
  if (f.fx) {
    const img = ctx.getImageData(side, top, w, h);
    f.fx(img.data, w, h, t);
    ctx.putImageData(img, side, top);
  }
  if (f.overlay) {
    ctx.save();
    ctx.translate(side, top);
    f.overlay(ctx, w, h, t);
    ctx.restore();
  }
  return { w: cw, h: ch };
}

// The saved photo: full resolution, or the pixel-art picture scaled up crisply.
export function capture(video, f, { mirror, t }) {
  const work = document.createElement('canvas');
  const { w, h } = render(work, video, f, { mirror, full: true, t });
  let out = work;
  if (f.pixel) {
    const scale = Math.max(1, Math.ceil(1280 / Math.max(w, h)));
    out = document.createElement('canvas');
    out.width = w * scale;
    out.height = h * scale;
    const ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(work, 0, 0, out.width, out.height);
  }
  return out;
}
