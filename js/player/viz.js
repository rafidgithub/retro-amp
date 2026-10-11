// Canvas renderers: spectrum / oscilloscope visualizer, 7-segment clock, TV static.
//
// The YouTube iframe never exposes its audio, so for YouTube the visualizer is
// synthesized: a per-track tempo drives kick / snare / hi-hat envelopes layered
// over smooth noise — it moves *with* the music rather than *to* it. Local
// files pass an analyser source and get the real spectrum and waveform.

const hash = n => {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  n ^= n >>> 13;
  n = Math.imul(n, 0xc2b2ae35);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
const noise = x => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash(i) * (1 - u) + hash(i + 1) * u;
};
const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

export class Visualizer {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'spectrum';
    this.level = 0;
    this.bars = new Float32Array(0);
    this.still = false;
    this.setTrack('');
  }

  // Each track gets its own tempo and noise seed, so songs look different.
  setTrack(id) {
    let h = 2166136261;
    for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    h >>>= 0;
    this.seed = (h % 997) / 7;
    this.bpm = 84 + (h % 53);
  }

  // cfg: { pixel, w, h, scale, bar, gap, dots, reflect }
  configure(cfg) {
    this.cfg = cfg;
    this.colors = {
      top: cssVar('--viz-top'),
      mid: cssVar('--viz-mid'),
      bot: cssVar('--viz-bot'),
      peak: cssVar('--viz-peak'),
      scope: cssVar('--viz-scope'),
      dots: cssVar('--viz-dots'),
    };
    this.resize();
  }

  resize() {
    const { c, cfg } = this;
    if (cfg.pixel) {
      this.u = 1;
      c.width = cfg.w;
      c.height = cfg.h;
      c.style.width = `${cfg.w * cfg.scale}px`;
      c.style.height = `${cfg.h * cfg.scale}px`;
    } else {
      c.style.width = c.style.height = '';
      this.u = dpr();
      c.width = Math.max(1, Math.round(c.clientWidth * this.u));
      c.height = Math.max(1, Math.round(c.clientHeight * this.u));
    }
    this.bw = cfg.bar * this.u;
    this.gap = cfg.gap * this.u;
    const n = Math.max(1, Math.floor((c.width + this.gap) / (this.bw + this.gap)));
    if (n !== this.bars.length) {
      this.bars = new Float32Array(n);
      this.peaks = new Float32Array(n);
      this.hold = new Float32Array(n);
      this.fall = new Float32Array(n);
    }
    this.x0 = Math.floor((c.width - (n * (this.bw + this.gap) - this.gap)) / 2);
    this.H = cfg.reflect ? Math.round(c.height * 0.72) : c.height;
    const g = this.ctx.createLinearGradient(0, this.H, 0, 0);
    g.addColorStop(0, this.colors.bot);
    g.addColorStop(0.55, this.colors.mid);
    g.addColorStop(1, this.colors.top);
    this.grad = g;
    this.still = false;
  }

  setMode(mode) {
    this.mode = mode;
    this.still = false;
  }

  // source: { spectrum(n), waveform(n) } for real audio, or null to synthesize
  frame(t, playing, dt, source = null) {
    const quiet = !playing && this.level < 0.01 && !this.peaks?.some(p => p > 0);
    if (quiet && this.still) return; // nothing moving: skip redraws
    this.still = quiet;
    this.level += ((playing ? 1 : 0) - this.level) * Math.min(1, dt * (playing ? 8 : 3));
    const { ctx, c } = this;
    ctx.clearRect(0, 0, c.width, c.height);
    if (this.cfg.dots) this.dots();
    if (this.mode === 'spectrum') this.spectrum(t, playing, dt, source);
    else if (this.mode === 'scope' && this.level > 0.01) this.scope(t, source);
  }

  spectrum(t, playing, dt, source) {
    const { ctx, bars, peaks, hold, fall, H, bw, gap, x0, u } = this;
    const n = bars.length;
    const real = playing ? source?.spectrum(n) : null;
    const beat = (t * this.bpm) / 60;
    const ph = beat % 1;
    const kick = Math.exp(-ph * 7);
    const snare = Math.floor(beat) % 2 ? Math.exp(-ph * 9) : 0;
    const hat = Math.exp(-((beat * 2) % 1) * 14);
    const swell = 0.8 + 0.2 * Math.sin(t / 9 + this.seed);
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) : 0;
      const e =
        (0.8 - 0.45 * f) * (0.3 + 0.55 * noise(t * (2 + f * 6) + i * 7.31 + this.seed)) +
        kick * Math.max(0, 1 - f * 3.2) * 0.5 +
        snare * Math.exp(-((f - 0.45) ** 2) / 0.025) * 0.35 +
        hat * Math.max(0, f - 0.55) * 0.7;
      const target = real ? Math.min(1, real[i] * 1.15) : playing ? Math.min(1, e * swell) : 0;
      bars[i] = target > bars[i] ? bars[i] + (target - bars[i]) * Math.min(1, dt * 28) : Math.max(target, bars[i] - dt * 1.8);
      if (bars[i] >= peaks[i]) {
        peaks[i] = bars[i];
        hold[i] = 0.35;
        fall[i] = 0;
      } else if ((hold[i] -= dt) < 0) {
        fall[i] += dt * 2.4;
        peaks[i] = Math.max(0, peaks[i] - fall[i] * dt);
      }
    }
    const draw = () => {
      for (let i = 0; i < n; i++) {
        const h = Math.round(bars[i] * H);
        if (h) ctx.fillRect(x0 + i * (bw + gap), H - h, bw, h);
      }
    };
    ctx.fillStyle = this.grad;
    draw();
    if (this.cfg.reflect) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.translate(0, H * 2 + u * 2);
      ctx.scale(1, -1);
      draw();
      ctx.restore();
    }
    ctx.fillStyle = this.colors.peak;
    for (let i = 0; i < n; i++) {
      const p = Math.round(peaks[i] * H);
      if (p > 0) ctx.fillRect(x0 + i * (bw + gap), Math.max(0, H - p - u), bw, u);
    }
  }

  scope(t, source) {
    const { ctx, c, u } = this;
    const W = c.width;
    const H = c.height;
    const real = source?.waveform(W);
    const kick = Math.exp(-(((t * this.bpm) / 60) % 1) * 6);
    const amp = real ? this.level * (H / 2 - u) : this.level * (0.25 + 0.5 * kick) * (H / 2 - u);
    const sample = real ? x => real[Math.min(W - 1, Math.floor(x))] * 1.4 : x => this.wave(x / W, t);
    const y = x => Math.min(H - u, Math.max(0, H / 2 + amp * sample(x)));
    if (this.cfg.pixel) {
      ctx.fillStyle = this.colors.scope;
      let prev = Math.round(y(0));
      for (let x = 0; x < W; x++) {
        const v = Math.round(y(x));
        ctx.fillRect(x, Math.min(prev, v), 1, Math.abs(v - prev) + 1);
        prev = v;
      }
    } else {
      ctx.strokeStyle = ctx.shadowColor = this.colors.scope;
      ctx.lineWidth = 2 * u;
      ctx.shadowBlur = 8 * u;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2 * u) ctx.lineTo(x, y(x));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  wave(x, t) {
    return (
      Math.sin(x * 19 + t * 21) * 0.55 +
      Math.sin(x * 47 - t * 33 + this.seed) * 0.3 * noise(t * 3 + this.seed) +
      (noise(x * 60 + t * 90) - 0.5) * 0.5
    );
  }

  // the faint dotted grid behind classic visualizers
  dots() {
    const { ctx, c } = this;
    ctx.fillStyle = this.colors.dots;
    for (let y = 1; y < c.height; y += 2) for (let x = 1; x < c.width; x += 2) ctx.fillRect(x, y, 1, 1);
  }
}

// ---------------------------------------------------------------------------
// 7-segment clock. '~' is a blank full-width slot (no ghost segments).
const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', '[': 'adef', ']': 'abcd' };

export class Lcd {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // cfg: { seg: true, w, h, t, gap, scale }  or  { seg: false, font, cssW, cssH }
  configure(cfg) {
    this.cfg = cfg;
    this.on = cssVar('--lcd-on');
    this.off = cssVar('--lcd-off');
    this.key = null;
    if (!cfg.seg) {
      this.u = dpr();
      this.c.width = cfg.cssW * this.u;
      this.c.height = cfg.cssH * this.u;
      this.c.style.width = `${cfg.cssW}px`;
      this.c.style.height = `${cfg.cssH}px`;
    }
  }

  draw(str, dim) {
    const key = `${str}|${dim}`;
    if (key === this.key) return;
    this.key = key;
    if (this.cfg.seg) this.segments(str, dim);
    else this.text(str, dim);
  }

  charWidth(ch) {
    const { w, t } = this.cfg;
    return ch === ':' ? t : ch === ' ' ? w >> 1 : w;
  }

  segments(str, dim) {
    const { c, ctx } = this;
    const { w, h, t, gap, scale } = this.cfg;
    const chars = [...str];
    const width = chars.reduce((a, ch) => a + this.charWidth(ch) + gap, -gap);
    if (c.width !== width || c.height !== h) {
      c.width = width;
      c.height = h;
      c.style.width = `${width * scale}px`;
      c.style.height = `${h * scale}px`;
    }
    ctx.clearRect(0, 0, width, h);
    const L = (h - 3 * t) / 2;
    const R = {
      a: [t, 0, w - 2 * t, t],
      b: [w - t, t, t, L],
      c: [w - t, 2 * t + L, t, L],
      d: [t, h - t, w - 2 * t, t],
      e: [0, 2 * t + L, t, L],
      f: [0, t, t, L],
      g: [t, t + L, w - 2 * t, t],
    };
    let x = 0;
    for (const ch of chars) {
      if (ch === ':') {
        ctx.fillStyle = dim ? this.off : this.on;
        ctx.fillRect(x, Math.round(t + (L - t) / 2), t, t);
        ctx.fillRect(x, Math.round(2 * t + L + (L - t) / 2), t, t);
      } else if (ch !== ' ' && ch !== '~') {
        const lit = dim ? '' : SEGS[ch] || '';
        const ghost = ch !== '[' && ch !== ']';
        for (const k in R) {
          if (!ghost && !lit.includes(k)) continue;
          const [rx, ry, rw, rh] = R[k];
          ctx.fillStyle = lit.includes(k) ? this.on : this.off;
          ctx.fillRect(x + rx, ry, rw, rh);
        }
      }
      x += this.charWidth(ch) + gap;
    }
  }

  text(str, dim) {
    const { c, ctx, u, cfg } = this;
    ctx.clearRect(0, 0, c.width, c.height);
    if (dim) return;
    ctx.font = cfg.font.replace(/(\d+)px/, (_, n) => `${n * u}px`);
    ctx.fillStyle = ctx.shadowColor = this.on;
    ctx.shadowBlur = 6 * u;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, c.width - 2 * u, c.height / 2);
    ctx.shadowBlur = 0;
  }
}

// ---------------------------------------------------------------------------
// Analog TV snow for the idle video window.
export class Static {
  constructor(canvas) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = 96;
    canvas.height = 72;
    this.img = this.ctx.createImageData(96, 72);
  }

  frame() {
    const d = this.img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
}
