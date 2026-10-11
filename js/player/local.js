// Plays the user's own audio files through Web Audio: preamp, 10-band EQ and
// an analyser that feeds the visualizer real data. Files never leave the device.
//
// YouTube's audio lives inside a cross-origin iframe, so none of this can touch
// it — the EQ only shapes local files.

export const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_RANGE = 12; // ± dB

const dbToGain = db => 10 ** (db / 20);

export function createLocal({ onState, onError, onDuration }) {
  const audio = new Audio();
  audio.preload = 'metadata';
  let ctx = null;
  let nodes = null;
  let volume = 0.8;
  let muted = false;
  let eq = { on: true, auto: false, preamp: 0, bands: EQ_BANDS.map(() => 0) };

  audio.addEventListener('playing', () => onState(1));
  audio.addEventListener('pause', () => !audio.ended && audio.currentTime > 0 && onState(2));
  audio.addEventListener('waiting', () => onState(3));
  audio.addEventListener('ended', () => onState(0));
  audio.addEventListener('error', () => audio.getAttribute('src') && onError(audio.error?.code || 0));
  audio.addEventListener('loadedmetadata', () => onDuration?.(audio.duration));

  // The audio graph needs a user gesture, so it's built on first play.
  function graph() {
    if (ctx) return;
    try {
      ctx = new AudioContext();
      const source = ctx.createMediaElementSource(audio);
      const pre = ctx.createGain();
      const filters = EQ_BANDS.map((f, i) => {
        const b = ctx.createBiquadFilter();
        b.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
        b.frequency.value = f;
        b.Q.value = 1.1;
        return b;
      });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.55;
      const out = ctx.createGain();
      source.connect(pre);
      filters.reduce((prev, f) => prev.connect(f), pre).connect(analyser);
      analyser.connect(out).connect(ctx.destination);
      nodes = { pre, filters, analyser, out, freq: new Uint8Array(analyser.frequencyBinCount), wave: new Uint8Array(analyser.fftSize) };
      applyEq();
      applyVolume();
    } catch {
      ctx = null; // no Web Audio: plain playback, no EQ
    }
  }

  function applyEq() {
    if (!nodes) return;
    const bands = eq.on ? eq.bands : eq.bands.map(() => 0);
    // AUTO: pull the preamp down by the biggest boost so loud bands don't clip
    const headroom = eq.on && eq.auto ? Math.max(0, ...bands) : 0;
    nodes.pre.gain.value = dbToGain((eq.on ? eq.preamp : 0) - headroom);
    nodes.filters.forEach((f, i) => (f.gain.value = bands[i]));
  }

  function applyVolume() {
    const v = muted ? 0 : volume;
    if (nodes) nodes.out.gain.value = v;
    else audio.volume = v;
  }

  return {
    load(src, autoplay) {
      audio.src = src;
      if (autoplay) this.play();
      else onState(5);
    },
    play() {
      graph();
      ctx?.resume();
      audio.play().catch(() => {});
    },
    pause: () => audio.pause(),
    stop() {
      audio.pause();
      audio.currentTime = 0;
      onState(5);
    },
    seek: t => (audio.currentTime = t),
    time: () => audio.currentTime || 0,
    duration: () => (Number.isFinite(audio.duration) ? audio.duration : 0),
    unload() {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
    setVolume(v) {
      volume = v / 100;
      applyVolume();
    },
    setMuted(m) {
      muted = m;
      applyVolume();
    },
    setEq(next) {
      eq = next;
      applyEq();
    },
    // n log-spaced bars, 0..1, or null when there's nothing to analyse
    spectrum(n) {
      if (!nodes || audio.paused) return null;
      const { analyser, freq } = nodes;
      analyser.getByteFrequencyData(freq);
      const nyquist = ctx.sampleRate / 2;
      const bins = freq.length;
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const lo = Math.floor((40 * (16000 / 40) ** (i / n) / nyquist) * bins);
        const hi = Math.max(lo + 1, Math.floor((40 * (16000 / 40) ** ((i + 1) / n) / nyquist) * bins));
        let peak = 0;
        for (let b = lo; b < hi && b < bins; b++) peak = Math.max(peak, freq[b]);
        out[i] = (peak / 255) ** 1.6;
      }
      return out;
    },
    // n waveform samples, -1..1
    waveform(n) {
      if (!nodes || audio.paused) return null;
      const { analyser, wave } = nodes;
      analyser.getByteTimeDomainData(wave);
      const out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = (wave[Math.floor((i / n) * wave.length)] - 128) / 128;
      return out;
    },
  };
}
