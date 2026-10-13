// Pop-out mini player: the current skin's player, drawn on a canvas and shown in
// a Picture-in-Picture window that floats over other tabs and apps (on Android,
// over the home screen too). PiP can only float video, so the canvas is streamed
// into a hidden <video>. Its play/pause and previous/next buttons come from the
// page's Media Session handlers (main.js).

const W = 320; // layout units; the canvas is drawn at 2x
const H = 160;
const SCALE = 2;
const FPS = 15;

export const pipSupported = () =>
  !!(document.pictureInPictureEnabled && HTMLVideoElement.prototype.requestPictureInPicture && HTMLCanvasElement.prototype.captureStream);

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ---------------------------------------------------------------------------
// CSS backgrounds on a canvas: colors plus linear and radial gradients, enough
// to repaint a skin's title bar, body and screen. Repeating and conic gradients
// use their first color.

function splitTop(str) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    else if (str[i] === ',' && !depth) {
      out.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(str.slice(start).trim());
  return out.filter(Boolean);
}

// "rgba(0, 0, 0, .5) 20% 40%" → { color, at: [0.2, 0.4] }
function parseStop(arg, len) {
  let color = arg;
  let rest = '';
  const paren = arg.match(/^[a-z-]+\(/i);
  if (paren) {
    let depth = 0;
    for (let i = 0; i < arg.length; i++) {
      if (arg[i] === '(') depth++;
      else if (arg[i] === ')' && !--depth) {
        color = arg.slice(0, i + 1);
        rest = arg.slice(i + 1);
        break;
      }
    }
  } else {
    [color, ...rest] = arg.split(/\s+/);
    rest = rest.join(' ');
  }
  const at = rest
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(p => (p.endsWith('%') ? parseFloat(p) / 100 : parseFloat(p) / len));
  return { color, at };
}

function stops(args, len) {
  const list = [];
  for (const a of args) {
    const { color, at } = parseStop(a, len);
    if (!at.length) list.push({ color, pos: null });
    for (const p of at) list.push({ color, pos: Number.isFinite(p) ? p : null });
  }
  if (!list.length) return list;
  list[0].pos ??= 0;
  list.at(-1).pos ??= 1;
  for (let i = 1; i < list.length; i++) {
    if (list[i].pos === null) {
      let j = i;
      while (list[j].pos === null) j++;
      const from = list[i - 1].pos;
      const step = (list[j].pos - from) / (j - i + 1);
      for (let k = i; k < j; k++) list[k].pos = from + step * (k - i + 1);
    }
    list[i].pos = Math.max(list[i].pos, list[i - 1].pos);
  }
  return list;
}

const SIDES = { top: 0, right: 90, bottom: 180, left: 270, 'top right': 45, 'right top': 45, 'bottom right': 135, 'right bottom': 135, 'bottom left': 225, 'left bottom': 225, 'top left': 315, 'left top': 315 };

function layer(ctx, value, x, y, w, h) {
  const m = value.match(/^(repeating-)?(linear|radial|conic)-gradient\(/);
  if (!m) {
    if (/^(none|url\()/.test(value)) return;
    ctx.fillStyle = value;
    ctx.fillRect(x, y, w, h);
    return;
  }
  const args = splitTop(value.slice(m[0].length, value.lastIndexOf(')'))); // drops any "0 0 / 4px 4px" size
  let grad;
  if (m[1] || m[2] === 'conic') return fillFirst(ctx, args.filter(a => !/^(from|-?[\d.]+deg|to )/.test(a)), x, y, w, h);
  if (m[2] === 'linear') {
    let deg = 180;
    const a = args[0];
    if (/^-?[\d.]+(deg|turn)$/.test(a)) deg = parseFloat(a) * (a.endsWith('turn') ? 360 : 1);
    if (/^-?[\d.]+(deg|turn)$/.test(a) || a.startsWith('to ')) args.shift();
    if (a.startsWith('to ')) deg = SIDES[a.slice(3)] ?? 180;
    const rad = (deg * Math.PI) / 180;
    const len = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
    const dx = (Math.sin(rad) * len) / 2;
    const dy = (-Math.cos(rad) * len) / 2;
    const cx = x + w / 2;
    const cy = y + h / 2;
    grad = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    for (const s of stops(args, len)) addStop(grad, s);
  } else {
    let cx = x + w / 2;
    let cy = y + h / 2;
    if (/\bat\b|circle|ellipse|closest|farthest|^[\d.]+(px|%)/.test(args[0])) {
      const at = args.shift().match(/at\s+([\d.]+)%\s*(?:([\d.]+)%)?/);
      if (at) {
        cx = x + (w * parseFloat(at[1])) / 100;
        cy = y + (h * parseFloat(at[2] ?? 50)) / 100;
      }
    }
    const r = Math.hypot(Math.max(cx - x, x + w - cx), Math.max(cy - y, y + h - cy));
    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    for (const s of stops(args, r)) addStop(grad, s);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

function addStop(grad, s) {
  try {
    grad.addColorStop(Math.min(1, Math.max(0, s.pos)), s.color);
  } catch {
    // a color the canvas can't parse: skip the stop
  }
}

function fillFirst(ctx, args, x, y, w, h) {
  const first = args.length && parseStop(args[0], 1).color;
  if (!first) return;
  ctx.fillStyle = first;
  ctx.fillRect(x, y, w, h);
}

// Paint a CSS background value (several layers allowed) into a rounded box.
function paint(ctx, value, x, y, w, h, r = 0) {
  if (!value) return;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  for (const l of splitTop(value).reverse()) layer(ctx, l, x, y, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Colors and fonts for the current look, read once per skin change.

function theme() {
  const look = document.documentElement.dataset.look;
  const px = v => parseFloat(v) || 0;
  const common = { screen: cssVar('--lcd-bg') || '#000', screenR: 0, groove: cssVar('--groove') || '#333' };
  if (look === 'amp') {
    return { ...common, title: cssVar('--m-bg'), titleText: cssVar('--rib-text'), titleFont: '8px Silkscreen, monospace', rule: cssVar('--rib-a'), body: [cssVar('--m-bg')], text: cssVar('--m-text'), sub: cssVar('--lcd-on'), font: 'bold 13px Arial, sans-serif', subFont: '11px Arial, sans-serif', fill: cssVar('--lcd-on') };
  }
  if (look === 'chicago') {
    return { ...common, title: cssVar('--title'), titleText: cssVar('--title-text'), titleFont: 'bold 11px Tahoma, Geneva, sans-serif', body: [cssVar('--face')], text: cssVar('--text'), sub: cssVar('--text'), font: 'bold 13px Tahoma, Geneva, sans-serif', subFont: '11px Tahoma, Geneva, sans-serif', fill: cssVar('--title') };
  }
  return {
    title: cssVar('--title'),
    titleText: cssVar('--title-text'),
    titleFont: cssVar('--title-font') || 'bold 12px sans-serif',
    body: [cssVar('--desk-bg'), cssVar('--face'), cssVar('--body')], // the desktop shows through glass skins
    screen: cssVar('--screen'),
    screenR: px(cssVar('--screen-r')),
    art: cssVar('--art-bg'),
    artR: px(cssVar('--art-r')),
    text: cssVar('--np-text'),
    sub: cssVar('--artist'),
    font: cssVar('--np-font') || 'bold 14px sans-serif',
    subFont: cssVar('--artist-font') || '11px sans-serif',
    groove: cssVar('--groove'),
    fill: cssVar('--fill-a') || cssVar('--sel'),
  };
}

const STATE = { playing: '▶', paused: '❚❚', buffering: '…', stopped: '■' };

// info(): { title, artist, state, progress (0–1), art (URL or null) }
// viz, clock: the player's own canvases, copied into the mini player
// toggle(): play/pause, for PiP windows whose button pauses the video itself
export function createPip({ info, viz, clock, toggle, onChange }) {
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d');
  let video = null;
  let timer = 0;
  let th = null;
  let skin = '';
  let art = { url: null, img: null };

  function loadArt(url) {
    if (url === art.url) return;
    art = { url, img: null };
    if (!url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous'; // keeps the canvas streamable (i.ytimg.com sends CORS headers)
    img.onload = () => art.url === url && (art.img = img);
    img.src = url;
  }

  function line(str, x, y, w, color, font) {
    ctx.font = font;
    ctx.fillStyle = color;
    const tw = ctx.measureText(str).width;
    if (tw <= w) return ctx.fillText(str, x, y);
    // too long: scroll it like the player's marquee
    const gap = 40;
    const off = ((performance.now() / 1000) * 28) % (tw + gap);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - 20, w, 30);
    ctx.clip();
    ctx.fillText(str, x - off, y);
    ctx.fillText(str, x - off + tw + gap, y);
    ctx.restore();
  }

  function draw() {
    const now = document.documentElement.dataset.skin;
    if (now !== skin) {
      skin = now;
      th = theme();
    }
    const i = info();
    loadArt(i.art);
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';
    for (const b of th.body) paint(ctx, b, 0, 0, W, H);

    // title bar
    paint(ctx, th.title, 0, 0, W, 22);
    if (th.rule) {
      ctx.fillStyle = th.rule;
      for (let y = 8; y < 15; y += 2) ctx.fillRect(10, y, W - 20, 1);
    }
    ctx.font = th.titleFont;
    const label = `${STATE[i.state] || ''}  RetroAmp`;
    const lw = ctx.measureText(label).width;
    if (th.rule) {
      paint(ctx, th.title, (W - lw) / 2 - 6, 4, lw + 12, 14);
    }
    ctx.fillStyle = th.titleText;
    ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, 15);
    ctx.textAlign = 'left';

    // album art (media looks) and the screen with the live visualizer and clock
    let sx = 10;
    if (th.art !== undefined && i.art) {
      paint(ctx, th.art, 10, 30, 62, 62, th.artR);
      if (art.img) {
        const s = Math.min(art.img.naturalWidth, art.img.naturalHeight);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(10, 30, 62, 62, th.artR);
        ctx.clip();
        ctx.drawImage(art.img, (art.img.naturalWidth - s) / 2, (art.img.naturalHeight - s) / 2, s, s, 10, 30, 62, 62);
        ctx.restore();
      }
      sx = 80;
    }
    const sw = W - sx - 10;
    paint(ctx, th.screen, sx, 30, sw, 62, th.screenR);
    if (viz.width > 1 && viz.offsetParent) ctx.drawImage(viz, sx + 3, 33, sw - 6, 56);
    if (clock.width > 1) {
      const ch = 14;
      const cw = (clock.width / clock.height) * ch;
      const cx = sx + sw - cw - 6;
      const cy = 30 + 62 - ch - 5;
      ctx.fillStyle = getComputedStyle(clock).backgroundColor; // some skins put the clock on a tag
      ctx.fillRect(cx, cy, cw, ch);
      ctx.drawImage(clock, cx, cy, cw, ch);
    }

    // track, artist, progress
    line(i.title, 10, 112, W - 20, th.text, th.font);
    line(i.artist, 10, 129, W - 20, th.sub, th.subFont);
    paint(ctx, th.groove, 10, 141, W - 20, 5, 2.5);
    if (i.progress > 0) paint(ctx, th.fill, 10, 141, (W - 20) * i.progress, 5, 2.5);
  }

  const isOpen = () => !!video && document.pictureInPictureElement === video;

  async function open() {
    if (video) return;
    draw();
    video = document.createElement('video');
    video.className = 'pip-source';
    video.muted = true;
    video.playsInline = true;
    video.srcObject = canvas.captureStream(FPS);
    document.body.append(video);
    timer = setInterval(draw, 1000 / FPS); // keeps drawing while the tab is hidden (rAF stops)
    video.addEventListener('leavepictureinpicture', close);
    // some PiP windows pause the video instead of calling the Media Session
    video.addEventListener('pause', () => {
      if (!isOpen()) return;
      toggle();
      video.play().catch(() => {});
    });
    try {
      await video.play();
      await video.requestPictureInPicture();
    } catch (err) {
      close();
      throw err;
    }
    onChange(true);
  }

  function close() {
    if (!video) return;
    clearInterval(timer);
    for (const t of video.srcObject?.getTracks() || []) t.stop();
    video.remove();
    video = null;
    onChange(false);
  }

  return {
    isOpen,
    open,
    close: () => (isOpen() ? document.exitPictureInPicture().catch(close) : close()),
    toggle: () => (isOpen() ? document.exitPictureInPicture() : open()),
  };
}
