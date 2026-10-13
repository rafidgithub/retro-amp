// RetroAmp — a Windows 95/98/XP-era audio player that streams YouTube through
// the official embedded player. No accounts, no API keys; state lives in localStorage.
import { $, $$, h, clamp, fmtTime, debounce, cleanArtist, parseYouTube, loadState, saveState, VIDEO_ID } from './core/util.js';
import { createPlayer, NOCOOKIE_HOST, SIGNED_IN_HOST } from './player/yt.js';
import { createLocal, EQ_BANDS, EQ_RANGE } from './player/local.js';
import { Visualizer, Lcd, Static } from './player/viz.js';
import { createPip, pipSupported } from './player/pip.js';
import { showPrivacy, confirmClear } from './core/consent.js';
import { ListView } from './core/listview.js';
import { openMenu, closeMenus, isMenuOpen } from './core/menu.js';
import * as wm from './core/wm.js';
import { LOOKS, SKINS, OSES, TIMELINE, YEARS, skinGroups, skinOrder, skinConfig, skinSearchText, skinYear } from './core/skins.js';

const VIZ_MODES = [
  ['spectrum', 'Spectrum analyzer'],
  ['scope', 'Oscilloscope'],
  ['off', 'Off'],
];
const STATE_TEXT = { playing: 'Playing', paused: 'Paused', stopped: 'Stopped', buffering: 'Buffering…' };
const YT_ERRORS = {
  2: 'Invalid video ID',
  5: 'Player error',
  100: 'Video removed or private',
  101: 'Owner blocked embedding',
  150: 'Owner blocked embedding',
  local: 'Can’t decode this file',
};

const root = document.documentElement;
const P = $('#w-player');
const PL = $('#w-playlist');
const VID = $('#w-video');
const SEARCH = $('#w-search');
const ABOUT = $('#w-about');
const SKINWIN = $('#w-skins');
const EQW = $('#w-eq');
const SUGGESTIONS = ['lofi hip hop', 'city pop', 'synthwave', 'Daft Punk', 'Coke Studio Bangla', 'Ayub Bachchu'];

// ---------------------------------------------------------------------------
// State

const saved = loadState();
const S = {
  list: Array.isArray(saved.list) ? saved.list.filter(t => VIDEO_ID.test(t?.id) && typeof t.title === 'string') : [],
  index: Number.isInteger(saved.index) ? saved.index : -1,
  skin: SKINS[saved.skin] && (!SKINS[saved.skin].secret || saved.unlocked) ? saved.skin : 'amp',
  volume: Number.isFinite(saved.volume) ? clamp(saved.volume, 0, 100) : 80,
  muted: !!saved.muted,
  shuffle: !!saved.shuffle,
  repeat: !!saved.repeat,
  viz: VIZ_MODES.some(([k]) => k === saved.viz) ? saved.viz : 'spectrum',
  remaining: !!saved.remaining,
  tipSeen: !!saved.tipSeen,
  unlocked: !!saved.unlocked,
  ytSignIn: !!saved.ytSignIn,
  eq: {
    on: saved.eq?.on ?? true,
    auto: !!saved.eq?.auto,
    preamp: clamp(Number(saved.eq?.preamp) || 0, -EQ_RANGE, EQ_RANGE),
    bands: EQ_BANDS.map((_, i) => clamp(Number(saved.eq?.bands?.[i]) || 0, -EQ_RANGE, EQ_RANGE)),
    preset: typeof saved.eq?.preset === 'string' ? saved.eq.preset : 'Flat',
  },
  recent: Array.isArray(saved.recent) ? saved.recent.filter(q => typeof q === 'string').slice(0, 5) : [],
  state: 'stopped',
  history: [],
};
if (S.index >= S.list.length) S.index = S.list.length ? 0 : -1;
const cur = () => S.list[S.index];
const isLocal = t => !!t?.local; // the user's own files (session only)
const sleep = { at: 0, mins: 0, endOfTrack: false, timer: 0, fade: 0 }; // sleep timer
const look = () => skinConfig(S.skin);

let booted = false;
let deskLayout = saved.layout; // phones stack windows in a column; keep the desktop arrangement
const saveNow = () => {
  if (!booted) return;
  // local files are blob URLs that die with the page, so only YouTube tracks are saved
  const keep = S.list.filter(t => !isLocal(t));
  const now = cur();
  saveState({
    list: keep.map(({ id, title, channel, seconds }) => ({ id, title, channel, seconds })),
    index: now && !isLocal(now) ? keep.indexOf(now) : keep.length ? 0 : -1,
    eq: S.eq,
    skin: S.skin,
    look: SKINS[S.skin].look,
    volume: S.volume,
    muted: S.muted,
    shuffle: S.shuffle,
    repeat: S.repeat,
    viz: S.viz,
    remaining: S.remaining,
    tipSeen: S.tipSeen,
    unlocked: S.unlocked,
    ytSignIn: S.ytSignIn,
    recent: S.recent,
    layout: wm.isMobile() ? deskLayout : (deskLayout = wm.layout()),
  });
};
const persist = debounce(saveNow, 300);

// ---------------------------------------------------------------------------
// UI

const ui = {
  time: $('.lcd-time', P),
  viz: $('.lcd-viz', P),
  marquee: $('.marquee-text', P),
  artist: $('.artist-text', P),
  art: $('.art img', P),
  seek: $('.seek', P),
  vol: $('.vol', P),
  mini: $('.tb-mini', P),
  sbState: $('.sb-state', P),
  sbTrack: $('.sb-track', P),
  sbTime: $('.sb-time', P),
  plTotal: $('.pl-total', PL),
  status: $('.search-status', SEARCH),
  progress: $('.progress', SEARCH),
  q: $('#q'),
};

const viz = new Visualizer(ui.viz);
const lcd = new Lcd(ui.time);
const tv = new Static($('.static', VID));

const COLUMNS = [{ key: 'num' }, { key: 'title', label: 'Title' }, { key: 'channel', label: 'Artist' }, { key: 'time', label: 'Length' }];
const plView = new ListView($('#playlist'), {
  columns: COLUMNS,
  empty: () => {
    const box = h('div', 'lv-empty', 'Your playlist is empty.');
    const add = h('button', 'btn', 'Add music from YouTube…');
    add.dataset.act = 'eject';
    box.append(add);
    return box;
  },
  onActivate: i => playIndex(i),
  onDelete: removeTracks,
  onMove: moveTracks,
  onMenu: (i, x, y) => openMenu(playlistMenu(), x, y), // long press on touch screens
});
let results = [];
const resView = new ListView($('#results'), {
  columns: COLUMNS,
  onActivate: i => addTracks([results[i]], true),
});

// ---------------------------------------------------------------------------
// YouTube player

let yt = null;
let ready;
function buildPlayer() {
  ready = createPlayer($('#yt'), {
    host: S.ytSignIn ? SIGNED_IN_HOST : NOCOOKIE_HOST,
    onState: code => !isLocal(cur()) && onState(code),
    onError: code => !isLocal(cur()) && onError(code),
  }).then(
    p => {
      yt = p;
      p.setVolume(S.volume);
      if (S.muted) p.mute();
      if (cur() && !isLocal(cur())) p.cueVideoById(cur().id);
      return p;
    },
    () => {
      flash('Could not load the YouTube player. Check your connection and reload.', 10000);
      return null;
    },
  );
}
buildPlayer();
const withPlayer = fn => ready.then(p => p && fn(p));

// YouTube sign-in mode (Play menu, off by default). The youtube-nocookie.com
// player carries no YouTube cookies, so a network that Google has flagged for
// "unusual traffic" gets "An error occurred. Please try again later" there even
// while youtube.com works in another tab. Playing through youtube.com sends the
// browser's own YouTube cookies (and sign-in) along, which gets past that block.
// RetroAmp never sees them; the cost is that YouTube can set cookies.
async function toggleYtSignIn() {
  S.ytSignIn = !S.ytSignIn;
  persist();
  const t = cur();
  const onYouTube = t && !isLocal(t);
  const at = onYouTube ? youtube.time() : 0;
  const resume = onYouTube && (S.state === 'playing' || S.state === 'buffering');
  const old = await ready;
  yt = null;
  try {
    old?.destroy();
  } catch {
    // already gone
  }
  if (!$('#yt')) {
    const slot = h('div');
    slot.id = 'yt';
    $('.screen', VID).prepend(slot);
  }
  buildPlayer();
  if (onYouTube) withPlayer(p => (resume ? p.loadVideoById(t.id, at) : p.cueVideoById(t.id, at)));
  flash(S.ytSignIn ? 'YouTube now plays through youtube.com with your sign-in' : 'YouTube back on the no-cookie player', 3000);
}

// Local files play through Web Audio (EQ + real visualizer).
const local = createLocal({
  onState: code => isLocal(cur()) && onState(code),
  onError: () => isLocal(cur()) && onError('local'),
  onDuration: d => {
    const t = cur();
    if (isLocal(t) && d && !t.seconds) {
      t.seconds = Math.round(d);
      renderPlaylist();
      trackChanged();
    }
  },
});
local.setVolume(S.volume);
local.setMuted(S.muted);
local.setEq(S.eq);

// Every transport call goes to whichever engine owns the track.
const youtube = {
  load: (t, autoplay) => withPlayer(p => (autoplay ? p.loadVideoById(t.id) : p.cueVideoById(t.id))),
  play: () => withPlayer(p => p.playVideo()),
  pause: () => withPlayer(p => p.pauseVideo()),
  stop: t => withPlayer(p => p.cueVideoById(t.id)),
  seek: sec => withPlayer(p => p.seekTo(sec, true)),
  time: () => yt?.getCurrentTime() || 0,
  duration: () => yt?.getDuration() || 0,
  unload: () => withPlayer(p => p.stopVideo()),
};
const fileEngine = { ...local, load: (t, autoplay) => local.load(t.src, autoplay), stop: () => local.stop() };
const engineFor = t => (isLocal(t) ? fileEngine : youtube);
const engine = () => engineFor(cur());

let errorRun = 0;
function onState(code) {
  if (code === 1) {
    errorRun = 0;
    setState('playing');
    fillMeta();
  } else if (code === 2) setState('paused');
  else if (code === 3) setState('buffering');
  else if (code === 5) setState('stopped');
  else if (code === 0) {
    if (sleep.endOfTrack) return goToSleep();
    next(true);
  }
}

function onError(code) {
  const t = cur();
  if (t) t.bad = true;
  plView.paint();
  setState('stopped');
  // several YouTube videos failing in a row usually means the network, not the videos
  const hint = errorRun >= 1 && code !== 'local' && !S.ytSignIn ? ' (try Play › Use my YouTube sign-in)' : '';
  flash(`*** ${YT_ERRORS[code] || 'Can’t play this one'} — skipping${hint} ***`, hint ? 6000 : 2500);
  const at = S.index;
  if (++errorRun < Math.min(S.list.length, 8)) {
    setTimeout(() => S.index === at && S.state === 'stopped' && next(true), 1500);
  } else errorRun = 0;
}

// Fill in title / channel / length that a pasted link didn't provide.
function fillMeta() {
  const t = cur();
  if (!t || isLocal(t) || !yt) return;
  const d = Math.round(yt.getDuration() || 0);
  const info = yt.getVideoData?.() || {};
  const before = JSON.stringify(t);
  if (d && !t.seconds) t.seconds = d;
  if (!t.channel && info.author) t.channel = info.author;
  if (t.title === t.id && info.title) t.title = info.title;
  if (JSON.stringify(t) !== before) {
    renderPlaylist();
    trackChanged();
  }
}

// ---------------------------------------------------------------------------
// Transport

function playIndex(i, { record = true } = {}) {
  if (i < 0 || i >= S.list.length) return;
  if (record && S.index >= 0 && S.index !== i) S.history = [...S.history.slice(-199), S.index];
  const before = cur();
  S.index = i;
  clock = 0;
  setState('buffering');
  viz.setTrack(cur().id);
  if (before && engineFor(before) !== engine()) engineFor(before).unload();
  engine().load(cur(), true);
  watchStart();
  trackChanged();
  plView.reveal(i);
}

function play() {
  if (!S.list.length) return openSearch();
  if (S.index < 0) return playIndex(S.shuffle ? randomIndex() : 0);
  if (S.state === 'playing') {
    if (look().playToggles) pause();
    else engine().seek(0); // Winamp: Play while playing restarts the track
    return;
  }
  engine().play();
  watchStart();
}

function pause() {
  if (S.state === 'paused') engine().play();
  else if (S.state === 'playing' || S.state === 'buffering') engine().pause();
}

function stop() {
  const t = cur();
  if (!t) return;
  engine().stop(t);
  clock = 0;
  setState('stopped');
}

function next(auto = false) {
  if (!S.list.length) return;
  if (S.shuffle) return playIndex(randomIndex());
  if (S.index + 1 < S.list.length) return playIndex(S.index + 1);
  if (S.repeat || !auto) return playIndex(0);
  stop(); // end of playlist
}

function prev() {
  if (!S.list.length) return;
  if (S.shuffle && S.history.length) return playIndex(S.history.pop(), { record: false });
  playIndex(S.index > 0 ? S.index - 1 : S.list.length - 1);
}

function randomIndex() {
  if (S.list.length < 2) return 0;
  let i;
  do i = Math.floor(Math.random() * S.list.length);
  while (i === S.index);
  return i;
}

function seekTo(sec) {
  const e = engine();
  const dur = e.duration();
  const t = clamp(sec, 0, Math.max(0, dur - 1));
  e.seek(t);
  clock = t;
  flash(`Seek to: ${fmtTime(t)} / ${fmtTime(dur)}`);
}
function seekBy(sec) {
  if (S.index < 0 || S.state === 'stopped') return;
  seekTo(engine().time() + sec);
}

// iPhone and iPad let only the hardware buttons change a YouTube video's
// volume, so the slider hides there (mute still works; your files keep it).
const hardwareVolume = () => root.classList.contains('ios') && !!cur() && !isLocal(cur());

function setVolume(v, announce = true) {
  S.volume = clamp(Math.round(v), 0, 100);
  setRange(ui.vol, S.volume, 100);
  ui.vol.style.setProperty('--vol', S.volume / 100);
  withPlayer(p => p.setVolume(S.volume));
  local.setVolume(S.volume);
  if (announce) {
    if (S.muted) toggleMute(false);
    flash(hardwareVolume() ? 'Use your device’s volume buttons' : `Volume: ${S.volume}%`);
  }
  persist();
}

// Phones can refuse to start a YouTube video the visitor didn't tap directly.
// If nothing starts, stop pretending to buffer and point at the video.
let startWatch = 0;
function watchStart() {
  clearTimeout(startWatch);
  if (!wm.isTouch() || isLocal(cur())) return;
  const at = S.index;
  startWatch = setTimeout(() => {
    const code = yt?.getPlayerState?.();
    if (S.index !== at || S.state === 'playing' || S.state === 'paused' || code === 1 || code === 3) return;
    setState('paused');
    wm.show(VID);
    VID.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    flash('Tap the video to start playback', 5000);
  }, 6000);
}

function toggleMute(force) {
  S.muted = force ?? !S.muted;
  root.toggleAttribute('data-muted', S.muted);
  withPlayer(p => (S.muted ? p.mute() : p.unMute()));
  local.setMuted(S.muted);
  flash(S.muted ? 'Muted' : `Volume: ${S.volume}%`);
  persist();
}

function toggleShuffle() {
  S.shuffle = !S.shuffle;
  S.history = [];
  flash(`Shuffle: ${S.shuffle ? 'on' : 'off'}`);
  syncToggles();
  persist();
}

function toggleRepeat() {
  S.repeat = !S.repeat;
  flash(`Repeat: ${S.repeat ? 'on' : 'off'}`);
  syncToggles();
  persist();
}

function toggleRemaining() {
  S.remaining = !S.remaining;
  persist();
}

function setViz(mode) {
  S.viz = mode;
  viz.setMode(mode);
  persist();
}

// ---------------------------------------------------------------------------
// Playlist

function renderPlaylist() {
  plView.render(S.list, S.index);
  const total = S.list.reduce((a, t) => a + (t.seconds || 0), 0);
  ui.plTotal.textContent = `${S.list.length} track${S.list.length === 1 ? '' : 's'} · ${fmtTime(total)}`;
  persist();
}

function addTracks(items, playNow = false) {
  const fresh = items.filter(Boolean).map(({ id, title, channel, seconds, local: own, src }) => (own ? { id, title, channel, seconds, local: true, src } : { id, title, channel, seconds }));
  if (!fresh.length) return;
  const start = S.list.length;
  S.list.push(...fresh);
  renderPlaylist();
  if (playNow) playIndex(start);
  else if (S.index < 0) {
    S.index = start;
    engine().load(cur(), false);
    setState('stopped');
    trackChanged();
  } else trackChanged();
  ui.status.textContent = `Added ${fresh.length} track${fresh.length === 1 ? '' : 's'} to the playlist.`;
}

function removeTracks(indices) {
  if (!indices.length) return;
  const gone = new Set(indices);
  const dropped = indices.map(i => S.list[i]);
  const wasCurrent = gone.has(S.index);
  const before = indices.filter(i => i < S.index).length;
  S.list = S.list.filter((_, i) => !gone.has(i));
  S.history = [];
  plView.select([]);
  if (wasCurrent) {
    S.index = Math.min(S.index - before, S.list.length - 1);
    youtube.unload();
    local.unload();
    if (cur()) engine().load(cur(), false);
    setState('stopped');
  } else S.index -= before;
  for (const t of dropped) if (isLocal(t)) URL.revokeObjectURL(t.src);
  renderPlaylist();
  trackChanged();
}

function moveTracks(indices, to) {
  if (!indices.length || to < 0) return;
  const playing = cur();
  const moving = indices.map(i => S.list[i]);
  const gone = new Set(indices);
  const at = to - indices.filter(i => i < to).length;
  const list = S.list.filter((_, i) => !gone.has(i));
  list.splice(at, 0, ...moving);
  if (list.every((t, i) => t === S.list[i])) return;
  S.list = list;
  S.index = playing ? list.indexOf(playing) : -1;
  S.history = [];
  renderPlaylist();
  plView.select(moving.map((_, k) => at + k));
  trackChanged();
}

function clearPlaylist() {
  youtube.unload();
  local.unload();
  for (const t of S.list) if (isLocal(t)) URL.revokeObjectURL(t.src);
  S.list = [];
  S.index = -1;
  S.history = [];
  setState('stopped');
  renderPlaylist();
  trackChanged();
}

// ---------------------------------------------------------------------------
// Display: marquee, clock, status

const mq = { text: '', pos: 0, flashText: '', flashUntil: 0 };

function setMarquee(text) {
  mq.text = text;
  mq.pos = 0;
  drawMarquee();
}

// Temporary message in the marquee (seek position, volume, errors…)
function flash(text, ms = 1200) {
  mq.flashText = text;
  mq.flashUntil = performance.now() + ms;
  drawMarquee();
}

function drawMarquee() {
  if (performance.now() < mq.flashUntil) {
    ui.marquee.textContent = mq.flashText;
    return;
  }
  ui.marquee.textContent = mq.text;
  if (ui.marquee.offsetWidth <= ui.marquee.parentElement.clientWidth) return; // fits: no scrolling
  const loop = `${mq.text}  ***  `;
  mq.pos = (mq.pos + 1) % loop.length;
  ui.marquee.textContent = loop.slice(mq.pos) + loop.slice(0, mq.pos);
}
setInterval(drawMarquee, 180);

function trackChanged() {
  const t = cur();
  const lk = look();
  const label = t && (lk.numbered ? `${S.index + 1}. ${t.title}${t.seconds ? ` (${fmtTime(t.seconds)})` : ''}` : t.title);
  setMarquee(t ? label : (wm.isTouch() && lk.idleTouch) || lk.idle);
  ui.artist.textContent = t ? cleanArtist(t.channel) || 'YouTube' : 'No track loaded';
  ui.art.hidden = !t || isLocal(t);
  if (t && !isLocal(t)) ui.art.src = `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`;
  ui.sbTrack.textContent = t ? `Track ${S.index + 1} of ${S.list.length}` : `${S.list.length} tracks`;
  VID.classList.toggle('idle', !t || isLocal(t));
  $('.no-signal', VID).textContent = isLocal(t) ? 'Audio only' : 'No signal';
  syncEqNote();
  root.toggleAttribute('data-hw-volume', hardwareVolume());
  plView.setCurrent(S.index);
  setState(S.state);
  syncMediaMeta();
  persist();
}

function setState(s) {
  S.state = s;
  root.dataset.state = S.index < 0 ? 'empty' : s;
  ui.sbState.textContent = S.index < 0 ? 'Ready' : STATE_TEXT[s];
  const t = cur();
  const label = t ? `${S.index + 1}. ${t.title}` : 'RetroAmp';
  document.title = t && s !== 'stopped' ? `${label} - RetroAmp` : 'RetroAmp';
  wm.setTitle(P, label);
  if (mediaSession) mediaSession.playbackState = s === 'playing' ? 'playing' : s === 'paused' ? 'paused' : 'none';
}

// Lock-screen and notification controls (phones, and media keys on desktops).
// They steer your own files; a YouTube video brings its own from the iframe.
const mediaSession = navigator.mediaSession;
for (const [action, fn] of [
  ['play', () => S.state !== 'playing' && play()],
  ['pause', () => S.state === 'playing' && pause()],
  ['stop', () => stop()],
  ['previoustrack', () => prev()],
  ['nexttrack', () => next()],
]) {
  try {
    mediaSession?.setActionHandler(action, fn);
  } catch {
    // action not supported by this browser
  }
}
function syncMediaMeta() {
  const t = cur();
  if (!mediaSession || typeof MediaMetadata !== 'function') return;
  mediaSession.metadata = t
    ? new MediaMetadata({
        title: t.title,
        artist: cleanArtist(t.channel) || (isLocal(t) ? 'Local file' : 'YouTube'),
        album: 'RetroAmp',
        artwork: isLocal(t) ? [{ src: 'assets/icon.svg', type: 'image/svg+xml' }] : [{ src: `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' }],
      })
    : null;
}

function syncToggles() {
  const pressed = {
    shuffle: S.shuffle,
    repeat: S.repeat,
    'toggle-playlist': wm.isOpen(PL),
    'toggle-video': wm.isOpen(VID),
    'toggle-eq': wm.isOpen(EQW),
  };
  for (const b of $$('.tgl[aria-pressed]', P)) b.setAttribute('aria-pressed', !!pressed[b.dataset.act]);
}

function setRange(input, value, max) {
  input.value = value;
  input.style.setProperty('--pct', `${(value / max) * 100}%`);
}

let miniText = '';
function drawClock(t, dur, now) {
  const { clock: style } = look();
  const loaded = S.index >= 0;
  const secs = Math.floor(S.remaining && dur ? Math.max(0, dur - t) : t);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const blinkOff = S.state === 'paused' && now % 1000 > 500;
  let str;
  let dim = blinkOff || !loaded;
  if (style === 'amp') {
    str = `${S.remaining ? '-' : '~'}${mm}:${ss}`;
    dim ||= S.state === 'stopped'; // Winamp shows a blank clock when stopped
  } else if (style === 'cd') {
    str = `[${String(Math.max(0, S.index + 1)).padStart(2, '0')}] ${mm}:${ss}`;
  } else {
    str = `${S.remaining ? '-' : ''}${mm}:${ss}`;
  }
  lcd.draw(str, dim);
  const mini = loaded && S.state !== 'stopped' ? `${S.remaining ? '-' : ''}${mm}:${ss}` : '';
  if (mini !== miniText) ui.mini.textContent = miniText = mini;
}

let seeking = false;
function updateProgress(t, dur) {
  const live = S.index >= 0 && S.state !== 'stopped' && dur > 0;
  ui.seek.disabled = !live;
  if (!seeking) setRange(ui.seek, live ? Math.round((t / dur) * 1000) : 0, 1000);
  P.style.setProperty('--progress', live ? Math.min(1, t / dur).toFixed(4) : 0); // tape reels, tonearm
  ui.sbTime.textContent = S.index >= 0 ? `${fmtTime(t)} / ${fmtTime(dur)}` : '';
}

// ---------------------------------------------------------------------------
// Frame loop: interpolated playback clock drives visualizer + LCD

let clock = 0;
let last = performance.now();
let lastUi = 0;
let frameNo = 0;
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const playing = S.state === 'playing';
  if (S.index >= 0) {
    const real = engine().time();
    if (playing) {
      clock += dt;
      if (Math.abs(clock - real) > 0.4) clock = real;
    } else clock = real;
  }
  const dur = (S.index >= 0 && engine().duration()) || cur()?.seconds || 0;
  viz.frame(clock, playing, dt, isLocal(cur()) ? local : null, S.index >= 0 && dur > 0 ? Math.min(1, clock / dur) : null);
  drawClock(clock, dur, now);
  if (now - lastUi > 250) {
    lastUi = now;
    updateProgress(clock, dur);
  }
  if (++frameNo % 3 === 0 && VID.classList.contains('idle') && wm.isOpen(VID)) tv.frame();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------------------
// Skins

function applySkin() {
  const lk = look();
  const skin = SKINS[S.skin];
  root.dataset.family = lk.family;
  root.dataset.look = skin.look;
  root.dataset.skin = S.skin;
  viz.configure(lk.viz);
  viz.setMode(S.viz);
  ui.viz.title = lk.viz.wave ? 'Click to jump to that point' : 'Click: change visualization';
  lcd.configure(lk.lcd);
  drawClock(clock, cur()?.seconds || 0, 0);
  trackChanged();
  wm.fit();
  $('#tray-skin-name').textContent = skin.name;
  for (const c of $$('.skin-card')) c.setAttribute('aria-checked', c.dataset.skin === S.skin);
  syncTimeMachine();
  drawEqGraph();
}

// Skin changes cross-fade (View Transitions API). Picks made while a fade runs,
// like dragging the time machine, wait for it; only the latest one is applied.
const calm = matchMedia('(prefers-reduced-motion: reduce)');
let fading = false;
let wanted = null;
const pickedSkin = () => (fading ? wanted : S.skin);

function setSkin(name) {
  if (!SKINS[name]) return;
  wanted = name;
  if (fading || name === S.skin) return syncTimeMachine();
  flash(`Skin: ${SKINS[name].name}`, 1500);
  if (!document.startViewTransition || calm.matches || document.hidden) return swapSkin(name);
  fading = true;
  document.startViewTransition(() => swapSkin(name)).finished.finally(() => {
    fading = false;
    setSkin(wanted);
  });
  syncTimeMachine();
}

function swapSkin(name) {
  const rels = wm.docked(P);
  S.skin = name;
  applySkin();
  wm.redock(rels);
  wm.keepAllOnScreen();
  fitPlaylist();
  syncToggles();
  hideBalloon();
  persist();
}

// Keep the playlist above the taskbar (or Dock) by shortening it — it's resizable anyway.
function fitPlaylist() {
  if (wm.isMobile() || !wm.isOpen(PL)) return;
  const dock = root.dataset.look === 'mac' ? 78 : 0;
  const room = $('#desktop').clientHeight - PL.offsetTop - dock - 6;
  if (PL.offsetHeight > room) PL.style.height = `${Math.max(140, room)}px`;
}

function cycleSkin() {
  const order = skinOrder(S.unlocked);
  setSkin(order[(order.indexOf(pickedSkin()) + 1) % order.length]);
}

// Time machine: one skin per year, 1990–2026.
const yearInput = $('#year');
yearInput.min = YEARS[0];
yearInput.max = YEARS[1];
yearInput.addEventListener('input', () => setSkin(TIMELINE[yearInput.value]));
function syncTimeMachine() {
  const skin = SKINS[pickedSkin()];
  if (skin.year) yearInput.value = skin.year;
  $('#year-out').textContent = skinYear(pickedSkin()) || '—';
  $('#year-skin').textContent = `${skin.name} (${skin.inspo}) — ${skin.era}`;
}

function openSkins() {
  hideBalloon();
  wm.show(SKINWIN, { center: !wm.isOpen(SKINWIN) });
  $(`.skin-card[data-skin="${S.skin}"]`)?.focus();
}

// The Skins window: one card per skin with a tiny animated preview.
function renderSkinCards() {
  const groups = skinGroups(S.unlocked).map(([label, ids]) => {
    const grid = h('div', 'skin-grid');
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', label);
    for (const id of ids) {
      const skin = SKINS[id];
      const card = h('button', 'skin-card');
      card.dataset.skin = id;
      card.setAttribute('role', 'radio');
      const preview = h('span', 'sc-preview');
      for (const [k, v] of Object.entries(skin.preview)) preview.style.setProperty(`--p-${k}`, v);
      const badge = skinYear(id);
      if (badge) preview.append(h('span', 'sc-year', String(badge)));
      const lcdBars = h('span', 'sc-lcd');
      for (let i = 0; i < 9; i++) lcdBars.append(document.createElement('i'));
      const win = h('span', 'sc-win');
      win.append(h('span', 'sc-title'), lcdBars);
      preview.append(win);
      card.append(preview, h('span', 'sc-name', skin.name), h('span', 'sc-inspo', `inspired by ${skin.inspo}`), h('span', 'sc-era', skin.era));
      grid.append(card);
    }
    const section = h('section');
    section.append(h('h3', '', label), grid);
    return section;
  });
  $('.skin-groups').replaceChildren(...groups, h('p', 'skin-none', 'No skins match. Try another word or All systems.'));
  filterSkinCards();
}
$('.skin-groups').addEventListener('click', e => {
  const card = e.target.closest('.skin-card');
  if (card) setSkin(card.dataset.skin);
});

// Search box + OS filter: hide the cards that don't match, and any group left empty.
const skinFind = { q: '', os: '' };
function filterSkinCards() {
  const terms = skinFind.q.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const section of $$('.skin-groups section')) {
    let any = false;
    for (const card of $$('.skin-card', section)) {
      const id = card.dataset.skin;
      const hit = (!skinFind.os || SKINS[id].os === skinFind.os) && terms.every(t => skinSearchText(id).includes(t));
      card.hidden = !hit;
      if (hit) any = true, shown++;
    }
    section.hidden = !any;
  }
  $('.skin-none').hidden = shown > 0;
}
function setSkinOs(os) {
  skinFind.os = os;
  $('#skin-os').textContent = os ? OSES[os] : 'All systems';
  filterSkinCards();
}
const skinQ = $('#skin-q');
skinQ.addEventListener('input', () => {
  skinFind.q = skinQ.value;
  filterSkinCards();
});
skinQ.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || !skinQ.value) return; // an empty box lets Esc close the window
  e.preventDefault();
  skinQ.value = skinFind.q = '';
  filterSkinCards();
});

new ResizeObserver(() => {
  if (viz.cfg && !viz.cfg.pixel) viz.resize();
}).observe(ui.viz);

// ---------------------------------------------------------------------------
// Full-screen video: the Fullscreen API where the browser has it. iPhones have no
// element full screen, so there the Video window is stretched over the viewport.

const vidScreen = $('.screen', VID);
const fullEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleVideoFull() {
  if (VID.classList.contains('vid-fill')) return VID.classList.remove('vid-fill');
  if (fullEl()) return (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  wm.show(VID);
  const req = vidScreen.requestFullscreen || vidScreen.webkitRequestFullscreen;
  if (!req || !(document.fullscreenEnabled || document.webkitFullscreenEnabled)) return VID.classList.add('vid-fill');
  Promise.resolve(req.call(vidScreen))
    .then(() => wm.isTouch() && window.screen.orientation?.lock?.('landscape').catch(() => {})) // phones turn sideways
    .catch(() => VID.classList.add('vid-fill'));
}
for (const type of ['fullscreenchange', 'webkitfullscreenchange']) {
  document.addEventListener(type, () => {
    if (fullEl()) return;
    try {
      window.screen.orientation?.unlock?.();
    } catch {
      // no orientation lock on this device
    }
  });
}

// ---------------------------------------------------------------------------
// Pop-out mini player (Picture-in-Picture), drawn in the current skin

const pip = createPip({
  info: () => {
    const t = cur();
    const time = S.index >= 0 ? engine().time() : 0; // not the rAF clock: it stops in hidden tabs
    const dur = (S.index >= 0 && engine().duration()) || t?.seconds || 0;
    return {
      title: t ? t.title : 'Nothing playing',
      artist: t ? cleanArtist(t.channel) || (isLocal(t) ? 'Local file' : 'YouTube') : 'Add music to start',
      state: S.state,
      progress: dur ? clamp(time / dur, 0, 1) : 0,
      art: t && !isLocal(t) ? `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg` : null,
    };
  },
  viz: ui.viz,
  clock: ui.time,
  toggle: () => (S.state === 'playing' ? pause() : play()),
  onChange: on => $('#tray-pip').setAttribute('aria-pressed', on),
});
async function togglePip() {
  try {
    await pip.toggle();
  } catch {
    flash('The mini player can\'t open here.', 2500);
  }
}
for (const b of $$('[data-act=pip]')) b.hidden = !pipSupported();

// ---------------------------------------------------------------------------
// Add from YouTube dialog

function openSearch() {
  wm.show(SEARCH, { center: !wm.isOpen(SEARCH) });
  ui.q.focus();
  ui.q.select();
}

async function api(params) {
  let res;
  try {
    res = await fetch(`/api/yt?${new URLSearchParams(params)}`);
  } catch {
    throw new Error('Can’t reach the RetroAmp server. Pasting a YouTube link still works.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // status 0 = no RetroAmp API answered at all (e.g. plain static hosting)
    throw Object.assign(new Error(body.error || 'Search needs the RetroAmp server (npm start).'), { status: body.error ? res.status : 0 });
  }
  return body;
}

function lookup(input) {
  const link = parseYouTube(input);
  if (!link) return api({ q: input });
  if (link.list && !link.list.startsWith('RD')) return api({ list: link.list });
  if (link.video) {
    // Fall back to the bare ID if the server is unreachable; the player fills in the title later.
    return api({ v: link.video }).catch(err => {
      if (err.status) throw err;
      return { results: [{ id: link.video, title: link.video, channel: '', seconds: 0 }] };
    });
  }
  return Promise.reject(new Error(link.list ? 'YouTube mixes can’t be imported. Paste a regular playlist link.' : 'That link has no video or playlist in it.'));
}

let searchSeq = 0;
$('.search-form').addEventListener('submit', async e => {
  e.preventDefault();
  const input = ui.q.value.trim();
  if (!input) return;
  const seq = ++searchSeq;
  ui.progress.hidden = false;
  ui.status.textContent = 'Searching…';
  const quips = startQuips();
  try {
    const data = await lookup(input);
    if (seq !== searchSeq) return;
    results = data.results || [];
    if (!parseYouTube(input)) rememberSearch(input);
    resView.select(results.length ? [0] : []);
    resView.render(results, -1);
    ui.status.textContent = results.length
      ? `${results.length} result${results.length === 1 ? '' : 's'}${data.title ? ` from “${data.title}”` : ''}. ${wm.isTouch() ? 'Double-tap' : 'Double-click'} to play.`
      : 'Nothing found. Try other words.';
    if (results.length) $('#results').focus();
  } catch (err) {
    if (seq !== searchSeq) return;
    results = [];
    resView.render(results, -1);
    ui.status.textContent = err.message;
  } finally {
    clearInterval(quips);
    if (seq === searchSeq) ui.progress.hidden = true;
  }
});

const picked = () => resView.selected.map(i => results[i]);

const QUIPS = [
  'Untangling headphone wires…',
  'Blowing on the cartridge…',
  'Rewinding the tape with a pencil…',
  'Waiting for the modem handshake…',
  'Adjusting the rabbit-ear antenna…',
  'Defragmenting the mixtape…',
  'Polishing the CD with a T-shirt…',
  'Asking the record store clerk…',
  'Burning at 4× speed…',
];
function startQuips() {
  let i = Math.floor(Math.random() * QUIPS.length);
  return setInterval(() => {
    if (!ui.progress.hidden) ui.status.textContent = QUIPS[i++ % QUIPS.length];
  }, 650);
}

function rememberSearch(q) {
  S.recent = [q, ...S.recent.filter(r => r.toLowerCase() !== q.toLowerCase())].slice(0, 5);
  renderChips();
  persist();
}

function renderChips() {
  const chip = q => {
    const b = h('button', 'chip', q);
    b.type = 'button';
    b.dataset.q = q;
    return b;
  };
  const parts = [];
  if (S.recent.length) {
    const clear = h('button', 'chip', 'clear');
    clear.type = 'button';
    clear.dataset.act = 'clear-recent';
    parts.push(h('b', '', 'Recent:'), ...S.recent.map(chip), clear);
  }
  parts.push(h('b', '', 'Try:'), ...SUGGESTIONS.slice(0, S.recent.length ? 3 : 6).map(chip));
  const own = h('button', 'chip', 'your own audio files');
  own.type = 'button';
  own.dataset.act = 'open-files';
  parts.push(h('b', '', 'Or:'), own);
  $('.chips').replaceChildren(...parts);
}
$('.chips').addEventListener('click', e => {
  const q = e.target.closest('[data-q]')?.dataset.q;
  if (!q) return;
  ui.q.value = q;
  $('.search-form').requestSubmit();
});

// ---------------------------------------------------------------------------
// Menus

const skinItems = () => [
  ...skinGroups(S.unlocked)
    .filter(([, ids]) => ids.length)
    .map(([label, ids]) => ({
      label,
      checked: ids.includes(S.skin),
      radio: true,
      sub: ids.map(id => ({
        label: `${skinYear(id)}  ${SKINS[id].name} (${SKINS[id].inspo})`.trim(),
        radio: true,
        checked: S.skin === id,
        act: () => setSkin(id),
      })),
    })),
  { sep: true },
  { label: 'Skins window…', act: openSkins },
  { label: 'Next skin', key: 'K', act: cycleSkin },
];
// skins whose player has no visualizer grey these out instead of switching nothing
const vizItems = () => VIZ_MODES.map(([k, label]) => ({ label, radio: true, checked: S.viz === k, disabled: !!look().viz.hidden, act: () => setViz(k) }));
const playItems = () => [
  { label: 'Play', key: 'X', act: play },
  { label: 'Pause', key: 'C', act: pause },
  { label: 'Stop', key: 'V', act: stop },
  { label: 'Previous', key: 'Z', act: prev },
  { label: 'Next', key: 'B', act: () => next() },
  { sep: true },
  { label: 'Shuffle', key: 'S', checked: S.shuffle, act: toggleShuffle },
  { label: 'Repeat', key: 'R', checked: S.repeat, act: toggleRepeat },
  { sep: true },
  { label: 'Use my YouTube sign-in', checked: S.ytSignIn, act: toggleYtSignIn },
  {
    label: 'Sleep timer',
    checked: !!(sleep.at || sleep.endOfTrack),
    sub: [
      { label: 'Off', radio: true, checked: !sleep.at && !sleep.endOfTrack, act: () => setSleep(0) },
      ...[15, 30, 45, 60, 90].map(m => ({ label: `${m} minutes`, radio: true, checked: sleep.mins === m, act: () => setSleep(m) })),
      { label: 'End of this track', radio: true, checked: sleep.endOfTrack, act: () => setSleep('track') },
    ],
  },
];
const windowItems = () => [
  { label: 'Playlist editor', checked: wm.isOpen(PL), act: () => wm.toggle(PL) },
  { label: 'Video window', checked: wm.isOpen(VID), act: () => wm.toggle(VID) },
  { label: 'Full-screen video', act: toggleVideoFull },
  ...(pipSupported() ? [{ label: 'Mini player (pop out)', checked: pip.isOpen(), act: togglePip }] : []),
  { label: 'Equalizer', key: 'G', checked: wm.isOpen(EQW), act: toggleEq },
  ...(wm.isMobile() ? [] : [{ label: 'Window shade', checked: P.classList.contains('shaded'), act: () => wm.toggleShade(P) }]),
];
const MENUS = {
  file: () => [
    { label: 'Add from YouTube…', key: 'L', act: openSearch },
    { label: 'Open local files…', key: 'O', act: openFiles },
    { sep: true },
    { label: 'Remove selected', key: 'Del', disabled: !plView.selected.length, act: () => removeTracks(plView.selected) },
    { label: 'Clear playlist', disabled: !S.list.length, act: clearPlaylist },
    { sep: true },
    { label: 'Exit', act: () => wm.hide(P) },
  ],
  view: () => [
    ...windowItems(),
    { sep: true },
    { label: 'Skin', sub: skinItems() },
    { label: 'Visualization', sub: vizItems() },
    { label: 'Time remaining', checked: S.remaining, act: toggleRemaining },
  ],
  play: playItems,
  help: () => [
    ...(wm.isTouch() ? [] : [{ label: 'Keyboard shortcuts', act: openAbout }, { sep: true }]),
    { label: 'Privacy…', act: showPrivacy },
    { label: 'Clear all data…', act: () => confirmClear() },
    { sep: true },
    { label: 'About RetroAmp…', act: openAbout },
  ],
};
const mainMenu = () => [
  { label: 'Add from YouTube…', key: 'L', act: openSearch },
  { label: 'Open local files…', key: 'O', act: openFiles },
  { sep: true },
  { label: 'Play', sub: playItems() },
  { label: 'Skin', sub: skinItems() },
  { label: 'Visualization', sub: vizItems() },
  { label: 'Time remaining', checked: S.remaining, act: toggleRemaining },
  { sep: true },
  ...windowItems(),
  { sep: true },
  { label: 'About RetroAmp…', act: openAbout },
];
// Move up / down stand in for drag-to-reorder on touch screens.
const playlistMenu = () => {
  const one = plView.selected.length === 1 ? plView.selected[0] : -1;
  return [
    { label: 'Play', disabled: one < 0, act: () => playIndex(one) },
    { label: 'Move up', disabled: one < 1, act: () => moveTracks([one], one - 1) },
    { label: 'Move down', disabled: one < 0 || one >= S.list.length - 1, act: () => moveTracks([one], one + 2) },
    { label: 'Remove', key: 'Del', disabled: !plView.selected.length, act: () => removeTracks(plView.selected) },
    { sep: true },
    { label: 'Add from YouTube…', key: 'L', act: openSearch },
    { label: 'Clear playlist', disabled: !S.list.length, act: clearPlaylist },
  ];
};

let barBtn = null;
function openBarMenu(btn) {
  barBtn?.classList.remove('open');
  barBtn = btn;
  btn.classList.add('open');
  const r = btn.getBoundingClientRect();
  openMenu(MENUS[btn.dataset.menu](), r.left, r.bottom, () => {
    btn.classList.remove('open');
    if (barBtn === btn) barBtn = null;
  });
}
for (const btn of $$('[data-menu]')) {
  btn.addEventListener('click', () => (barBtn === btn ? closeMenus() : openBarMenu(btn)));
  btn.addEventListener('pointerenter', () => barBtn && barBtn !== btn && openBarMenu(btn));
}
P.addEventListener('contextmenu', e => {
  e.preventDefault();
  openMenu(mainMenu(), e.clientX, e.clientY);
});
$('#playlist').addEventListener('contextmenu', e => {
  if (e.defaultPrevented) return; // a touch long press, already handled by the list view
  e.preventDefault();
  openMenu(playlistMenu(), e.clientX, e.clientY);
});

// ---------------------------------------------------------------------------
// Start menu, About, Shut down

const startBtn = $('#start-btn');
const startMenu = $('#start-menu');
function toggleStart(open = startMenu.hidden) {
  startMenu.hidden = !open;
  startBtn.setAttribute('aria-expanded', open);
}
startBtn.addEventListener('click', () => toggleStart());
document.addEventListener(
  'pointerdown',
  e => {
    if (!startMenu.hidden && !e.target.closest('#start-menu, #start-btn')) toggleStart(false);
  },
  true,
);
startMenu.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  toggleStart(false);
});

function openAbout() {
  wm.show(ABOUT, { center: !wm.isOpen(ABOUT) });
}

function shutdown() {
  if (S.state === 'playing') pause();
  $('#shutdown').hidden = false;
}
$('#shutdown').addEventListener('click', () => ($('#shutdown').hidden = true));

// ---------------------------------------------------------------------------
// Buttons, sliders, keyboard

const ACTIONS = {
  prev,
  play,
  pause,
  stop,
  next: () => next(),
  eject: openSearch,
  rew: () => seekBy(-10),
  ff: () => seekBy(10),
  shuffle: toggleShuffle,
  repeat: toggleRepeat,
  mute: () => toggleMute(),
  'toggle-playlist': () => wm.toggle(PL),
  'toggle-video': () => wm.toggle(VID),
  'video-full': toggleVideoFull,
  privacy: showPrivacy,
  'clear-data': () => confirmClear(),
  pip: togglePip,
  'toggle-eq': toggleEq,
  'show-eq': showEq,
  'eq-on': () => {
    S.eq.on = !S.eq.on;
    syncEq();
  },
  'eq-auto': () => {
    S.eq.auto = !S.eq.auto;
    syncEq();
  },
  'skin-os': b => {
    const r = b.getBoundingClientRect();
    const order = skinOrder(S.unlocked);
    openMenu([
      { label: 'All systems', radio: true, checked: !skinFind.os, act: () => setSkinOs('') },
      { sep: true },
      ...Object.entries(OSES).map(([os, label]) => {
        const n = order.filter(id => SKINS[id].os === os).length;
        return { label: `${label} (${n})`, radio: true, checked: skinFind.os === os, disabled: !n, act: () => setSkinOs(os) };
      }),
    ], r.left, r.bottom);
  },
  'eq-presets': b => {
    const r = b.getBoundingClientRect();
    openMenu(Object.keys(EQ_PRESETS).map(name => ({ label: name, radio: true, checked: S.eq.preset === name, act: () => applyPreset(name) })), r.left, r.bottom);
  },
  'open-files': openFiles,
  'main-menu': b => {
    if (isMenuOpen()) return closeMenus();
    const r = b.getBoundingClientRect();
    openMenu(mainMenu(), r.left, r.bottom);
  },
  remove: () => removeTracks(plView.selected),
  clear: clearPlaylist,
  'res-play': () => addTracks(picked(), true),
  'res-add': () => addTracks(picked()),
  'res-all': () => addTracks(results),
  'show-player': () => wm.show(P),
  'show-playlist': () => wm.show(PL),
  'show-video': () => wm.show(VID),
  about: openAbout,
  'about-ok': () => wm.hide(ABOUT),
  skins: openSkins,
  'skins-ok': () => wm.hide(SKINWIN),
  'clear-recent': () => {
    S.recent = [];
    renderChips();
    persist();
  },
  shutdown,
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (b && ACTIONS[b.dataset.act]) ACTIONS[b.dataset.act](b, e);
});

ui.viz.addEventListener('click', e => {
  // Waveform skin: the waveform is the whole track, so a click jumps to that point
  if (look().viz.wave && S.viz === 'spectrum') {
    if (S.index < 0 || S.state === 'stopped') return play();
    const r = ui.viz.getBoundingClientRect();
    return seekTo(((e.clientX - r.left) / r.width) * engine().duration());
  }
  const i = VIZ_MODES.findIndex(([k]) => k === S.viz);
  setViz(VIZ_MODES[(i + 1) % VIZ_MODES.length][0]);
});
ui.time.addEventListener('click', toggleRemaining);

ui.vol.addEventListener('input', () => setVolume(ui.vol.value));

const seekTarget = () => (ui.seek.value / 1000) * engine().duration();
ui.seek.addEventListener('input', () => {
  seeking = true;
  setRange(ui.seek, ui.seek.value, 1000);
  const dur = engine().duration();
  flash(`Seek to: ${fmtTime(seekTarget())} / ${fmtTime(dur)} (${Math.round(ui.seek.value / 10)}%)`);
});
ui.seek.addEventListener('change', () => {
  const t = seekTarget();
  engine().seek(t);
  clock = t;
  seeking = false;
});

const KEYS = { z: prev, x: play, c: pause, v: stop, b: () => next(), l: openSearch, s: toggleShuffle, r: toggleRepeat, k: cycleSkin, '?': openAbout, o: openFiles, g: toggleEq };
document.addEventListener('keydown', e => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape') {
    if (VID.classList.contains('vid-fill')) return toggleVideoFull();
    if (!startMenu.hidden) return toggleStart(false);
    for (const w of [ABOUT, SKINWIN, SEARCH]) if (wm.isOpen(w)) return wm.hide(w);
    return;
  }
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if (KEYS[k]) KEYS[k]();
  else if (e.key === 'ArrowLeft') seekBy(-5);
  else if (e.key === 'ArrowRight') seekBy(5);
  else if (e.key === 'ArrowUp') setVolume(S.volume + 5);
  else if (e.key === 'ArrowDown') setVolume(S.volume - 5);
  else if (e.key === ' ' && tag !== 'BUTTON') S.state === 'playing' ? pause() : play();
  else return;
  e.preventDefault();
});

// Mouse wheel over the player changes volume (one notch = 4%).
let wheel = 0;
P.addEventListener(
  'wheel',
  e => {
    if (e.target.closest('.listview')) return;
    e.preventDefault();
    wheel += e.deltaY;
    if (Math.abs(wheel) < 40) return;
    setVolume(S.volume - Math.sign(wheel) * 4);
    wheel = 0;
  },
  { passive: false },
);

// Desktop icons: click selects, double-click (or tap / Enter) opens.
const ICONS = { player: () => wm.show(P), playlist: () => wm.show(PL), video: () => wm.show(VID), search: openSearch, skins: openSkins };
$('#icons').addEventListener('click', e => {
  const icon = e.target.closest('.dicon');
  if (!icon) return;
  for (const d of $$('.dicon')) d.classList.toggle('sel', d === icon);
  if (e.pointerType === 'touch' || e.detail === 0) ICONS[icon.dataset.open]?.();
});
$('#icons').addEventListener('dblclick', e => {
  const icon = e.target.closest('.dicon');
  if (icon) ICONS[icon.dataset.open]?.();
});
$('#desktop').addEventListener('pointerdown', e => {
  if (e.target.id === 'desktop') for (const d of $$('.dicon')) d.classList.remove('sel');
});

// Yellow retro tooltips instead of the browser's own.
const tip = $('#tip');
let tipTimer = 0;
let tipFor = null;
function hideTip() {
  clearTimeout(tipTimer);
  tip.hidden = true;
  tipFor = null;
}
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('[title]:not(iframe), [data-tip]');
  if (!el || el === tipFor) return;
  if (el.title) {
    el.dataset.tip = el.title;
    el.removeAttribute('title');
  }
  hideTip();
  tipFor = el;
  const { clientX: x, clientY: y } = e;
  tipTimer = setTimeout(() => {
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    tip.style.left = `${Math.min(x, innerWidth - tip.offsetWidth - 4)}px`;
    tip.style.top = `${y + 20 + tip.offsetHeight > innerHeight ? y - tip.offsetHeight - 8 : y + 20}px`;
  }, 650);
});
document.addEventListener('pointerout', e => {
  if (tipFor && !tipFor.contains(e.relatedTarget)) hideTip();
});
document.addEventListener('pointerdown', hideTip, true);

// One-time balloon pointing at the skin switcher in the tray.
const balloon = $('#balloon');
let balloonTimer = 0;
function showBalloon() {
  const anchor = $('#tray-skin').getBoundingClientRect();
  if (!anchor.width) return;
  balloon.hidden = false;
  const w = balloon.offsetWidth;
  const up = anchor.top < innerHeight / 2;
  balloon.classList.toggle('up', up);
  balloon.style.left = `${clamp(anchor.left + anchor.width / 2 + 37 - w, 8, innerWidth - w - 8)}px`;
  balloon.style.top = `${up ? anchor.bottom + 12 : anchor.top - balloon.offsetHeight - 12}px`;
  balloonTimer = setTimeout(hideBalloon, 15000);
}
function hideBalloon() {
  clearTimeout(balloonTimer);
  balloon.hidden = true;
  if (!S.tipSeen) {
    S.tipSeen = true;
    persist();
  }
}
balloon.addEventListener('click', e => (e.target.closest('.balloon-x') ? hideBalloon() : openSkins()));

// ---------------------------------------------------------------------------
// Equalizer: 10 bands + preamp. It shapes local files only — YouTube's audio
// plays inside a cross-origin iframe that no web page can process.

const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 3, -3, -5, -2, 2, 5, 6, 6, 6],
  Pop: [-1, 2, 4, 5, 4, 0, -1, -1, -1, -1],
  Jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  Classical: [0, 0, 0, 0, 0, 0, -4, -4, -4, -6],
  Dance: [6, 4, 1, 0, 0, -3, -4, -4, 0, 0],
  Club: [0, 0, 4, 3, 3, 3, 2, 0, 0, 0],
  Live: [-3, 0, 2, 3, 3, 3, 2, 1, 1, 1],
  Vocal: [-2, -3, -1, 2, 5, 5, 3, 1, 0, -2],
  'Bass boost': [7, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble boost': [0, 0, 0, 0, 0, 2, 4, 6, 7, 8],
  Loudness: [6, 4, 0, -2, -2, 0, 2, 4, 6, 6],
  'Laptop speakers': [3, 6, 3, -2, -1, 1, 3, 6, 8, 9],
};
const fmtHz = f => (f >= 1000 ? `${f / 1000}K` : String(f));
const eqInputs = [];

function buildEq() {
  const band = (label, key, value) => {
    const wrap = h('label', key === 'pre' ? 'eq-band eq-pre' : 'eq-band');
    const slot = h('span', 'eq-slot');
    const input = h('input');
    Object.assign(input, { type: 'range', min: -EQ_RANGE, max: EQ_RANGE, step: 0.5, value });
    input.dataset.band = key;
    input.title = 'Double-click to reset';
    input.setAttribute('aria-label', key === 'pre' ? 'Preamp' : `${label}Hz`);
    slot.append(input);
    wrap.append(h('span', 'eq-val'), slot, h('span', 'eq-f', label));
    eqInputs.push(input);
    return wrap;
  };
  const scale = h('span', 'eq-scale');
  scale.append(h('i', '', `+${EQ_RANGE}`), h('i', '', '0 dB'), h('i', '', `−${EQ_RANGE}`));
  $('.eq-bands', EQW).replaceChildren(band('Pre', 'pre', S.eq.preamp), scale, ...EQ_BANDS.map((f, i) => band(fmtHz(f), i, S.eq.bands[i])));
  syncEq();
}

function syncEq() {
  for (const input of eqInputs) {
    const v = input.dataset.band === 'pre' ? S.eq.preamp : S.eq.bands[input.dataset.band];
    input.value = v;
    input.style.setProperty('--pct', `${((v + EQ_RANGE) / (2 * EQ_RANGE)) * 100}%`);
    input.closest('.eq-band').querySelector('.eq-val').textContent = `${v > 0 ? '+' : ''}${v}`;
  }
  $('[data-act=eq-on]', EQW).setAttribute('aria-pressed', S.eq.on);
  $('[data-act=eq-auto]', EQW).setAttribute('aria-pressed', S.eq.auto);
  $('.eq-presets', EQW).textContent = S.eq.preset === 'Custom' ? 'Presets' : S.eq.preset;
  local.setEq(S.eq);
  drawEqGraph();
  syncEqNote();
  persist();
}

function applyPreset(name) {
  S.eq.bands = [...EQ_PRESETS[name]];
  S.eq.preset = name;
  S.eq.on = true;
  syncEq();
  flash(`EQ: ${name}`);
}

$('.eq-bands', EQW).addEventListener('input', e => {
  const input = e.target.closest('input');
  if (!input) return;
  const v = Number(input.value);
  if (input.dataset.band === 'pre') S.eq.preamp = v;
  else {
    S.eq.bands[input.dataset.band] = v;
    S.eq.preset = 'Custom';
  }
  syncEq();
});
$('.eq-bands', EQW).addEventListener('dblclick', e => {
  const input = e.target.closest('input');
  if (!input) return;
  input.value = 0;
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

// The response curve, drawn in the skin's visualizer colors.
function drawEqGraph() {
  const c = $('.eq-graph', EQW);
  const u = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(c.clientWidth * u);
  const ht = Math.round(c.clientHeight * u);
  if (!w || !ht) return;
  if (c.width !== w) c.width = w;
  if (c.height !== ht) c.height = ht;
  const ctx = c.getContext('2d');
  const css = getComputedStyle(root);
  ctx.clearRect(0, 0, w, ht);
  ctx.strokeStyle = css.getPropertyValue('--viz-mid').trim() || '#0f0';
  ctx.lineWidth = u;
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([2 * u, 3 * u]);
  ctx.beginPath();
  ctx.moveTo(0, ht / 2);
  ctx.lineTo(w, ht / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = S.eq.on ? 1 : 0.4;
  ctx.lineWidth = 2 * u;
  const pts = S.eq.bands.map((g, i) => [((i + 0.5) / EQ_BANDS.length) * w, ht / 2 - (g / EQ_RANGE) * (ht / 2 - 3 * u)]);
  ctx.beginPath();
  ctx.moveTo(0, pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  ctx.lineTo(w, pts.at(-1)[1]);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function syncEqNote() {
  const t = cur();
  $('.eq-note', EQW).textContent = isLocal(t)
    ? S.eq.on
      ? 'Shaping your file in real time.'
      : 'Equalizer is off.'
    : `YouTube audio can’t be equalized in a browser. The EQ works on your own files — ${wm.isTouch() ? 'tap Files… to open some' : 'drop audio files on the desktop or click Files…'}.`;
}

// First time it opens, the EQ slots in under the player (Winamp order:
// player, equalizer, playlist) and pushes the windows docked below it down.
let eqPlaced = !!saved.layout?.['w-eq'];
function showEq() {
  if (!eqPlaced && !wm.isMobile()) {
    const below = wm.docked(P).filter(r => r.el.offsetTop >= P.offsetTop + P.offsetHeight - 1).map(r => r.el);
    wm.place(EQW, P.offsetLeft, P.offsetTop + P.offsetHeight);
    for (const el of below) wm.place(el, el.offsetLeft, el.offsetTop + EQW.offsetHeight);
    eqPlaced = true;
  }
  wm.show(EQW);
  fitPlaylist();
  drawEqGraph();
}
function toggleEq() {
  if (wm.isOpen(EQW)) wm.hide(EQW);
  else showEq();
}

// ---------------------------------------------------------------------------
// Local files: file picker or drag & drop. They play in the browser and are
// never uploaded; the playlist keeps them only until the page closes.

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|flac|wav|weba)$/i;
function openFiles() {
  $('#files').click();
}

function addLocalFiles(list, playNow) {
  const tracks = [...list]
    .filter(f => f.type.startsWith('audio/') || AUDIO_EXT.test(f.name))
    .map(f => {
      const name = f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
      const m = name.match(/^(.+?)\s+-\s+(.+)$/); // "Artist - Title"
      const t = { id: `local:${crypto.randomUUID()}`, local: true, src: URL.createObjectURL(f), title: m ? m[2] : name, channel: m ? m[1] : 'Local file', seconds: 0 };
      probeDuration(t);
      return t;
    });
  if (!tracks.length) return flash('No audio files there.', 2000);
  addTracks(tracks, playNow);
  flash(`Added ${tracks.length} local file${tracks.length === 1 ? '' : 's'}`, 1600);
}

function probeDuration(t) {
  const a = new Audio();
  a.preload = 'metadata';
  a.onloadedmetadata = () => {
    if (Number.isFinite(a.duration) && !t.seconds) {
      t.seconds = Math.round(a.duration);
      renderPlaylist();
    }
    a.removeAttribute('src');
  };
  a.src = t.src;
}

$('#files').addEventListener('change', e => {
  addLocalFiles(e.target.files, true);
  e.target.value = '';
});
document.addEventListener('dragover', e => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  root.classList.add('dropping');
});
document.addEventListener('dragleave', e => {
  if (!e.relatedTarget) root.classList.remove('dropping');
});
document.addEventListener('drop', e => {
  root.classList.remove('dropping');
  if (!e.dataTransfer?.files.length) return;
  e.preventDefault();
  addLocalFiles(e.dataTransfer.files, S.state !== 'playing');
});

// ---------------------------------------------------------------------------
// Sleep timer: fades the music out, pauses, and dims the desktop.

const FADE_MS = 30_000;
function setSleep(mins) {
  clearTimeout(sleep.timer);
  clearInterval(sleep.fade);
  Object.assign(sleep, { at: 0, mins: 0, endOfTrack: mins === 'track' });
  if (typeof mins === 'number' && mins > 0) {
    sleep.mins = mins;
    sleep.at = Date.now() + mins * 60_000;
    sleep.timer = setTimeout(fadeToSleep, Math.max(0, mins * 60_000 - FADE_MS));
  }
  flash(sleep.endOfTrack ? 'Sleep after this track' : mins ? `Sleep timer: ${mins} min` : 'Sleep timer off', 1600);
  tickSleep();
}
function fadeToSleep() {
  const start = S.volume;
  const t0 = performance.now();
  sleep.fade = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / FADE_MS);
    const v = Math.round(start * (1 - k));
    withPlayer(p => p.setVolume(v));
    local.setVolume(v);
    if (k >= 1) goToSleep();
  }, 250);
}
function goToSleep() {
  clearInterval(sleep.fade);
  Object.assign(sleep, { at: 0, mins: 0, endOfTrack: false });
  engine().pause();
  withPlayer(p => p.setVolume(S.volume)); // the saved volume is back for tomorrow
  local.setVolume(S.volume);
  $('#night').hidden = false;
  tickSleep();
}
function tickSleep() {
  const badge = $('#sleep-left');
  const left = sleep.at - Date.now();
  badge.hidden = !(left > 0 || sleep.endOfTrack);
  badge.textContent = sleep.endOfTrack ? 'zZ ♪' : `zZ ${fmtTime(left / 1000)}`;
}
setInterval(tickSleep, 1000);
$('#night').addEventListener('click', () => ($('#night').hidden = true));

// ↑↑↓↓←→←→BA unlocks a secret skin, with a chiptune fanfare.
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konami = 0;
document.addEventListener(
  'keydown',
  e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konami = k === KONAMI[konami] ? konami + 1 : k === KONAMI[0] ? 1 : 0;
    if (konami < KONAMI.length) return;
    konami = 0;
    fanfare();
    if (!S.unlocked) {
      S.unlocked = true;
      renderSkinCards();
    }
    setSkin('phosphor');
    flash('*** Secret skin unlocked: Phosphor ***', 3000);
  },
  true,
);
function fanfare() {
  try {
    const ac = new AudioContext();
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square';
      o.frequency.value = f;
      const t = ac.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.13);
    });
    setTimeout(() => ac.close(), 1500);
  } catch {
    // no Web Audio — the skin still unlocks
  }
}

window.addEventListener('resize', debounce(() => {
  wm.fit();
  wm.keepAllOnScreen();
}, 150));
window.addEventListener('pagehide', saveNow);

// ---------------------------------------------------------------------------
// Boot

// Closing the player stops the music with it (pause, so play picks up where it was).
wm.register(P, { title: 'RetroAmp', icon: 'i-note', main: true, onClose: () => (S.state === 'playing' || S.state === 'buffering') && pause() });
wm.register(PL, { title: 'Playlist Editor', icon: 'i-list' });
wm.register(VID, { title: 'Video', icon: 'i-video' });
wm.register(SEARCH, { title: 'Add from YouTube', icon: 'i-search', dialog: true });
wm.register(ABOUT, { title: 'About RetroAmp', icon: 'i-info', dialog: true });
wm.register(SKINWIN, { title: 'Skins', icon: 'i-palette', dialog: true });
wm.register(EQW, { title: 'Equalizer', icon: 'i-eq' });
wm.onChange(() => {
  syncToggles();
  persist();
});

root.toggleAttribute('data-muted', S.muted);
setVolume(S.volume, false);
renderPlaylist();
renderSkinCards();
renderChips();
buildEq();
$('.balloon b').lastChild.textContent = `${skinOrder(false).length} skins to try`;
await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]);
applySkin();
if (cur()) viz.setTrack(cur().id);

if (saved.layout && !wm.isMobile()) {
  wm.restore(saved.layout);
} else if (!wm.isMobile()) {
  // Winamp-style default: playlist docked under the player, video to the right,
  // leaving the desktop icons uncovered. Narrower screens (tablets) get the
  // video under the playlist instead of half off the edge.
  const x = 100;
  wm.place(P, x, 20);
  wm.place(PL, x, 20 + P.offsetHeight);
  if (x + P.offsetWidth + VID.offsetWidth <= $('#desktop').clientWidth) wm.place(VID, x + P.offsetWidth, 20);
  else wm.place(VID, x, 20 + P.offsetHeight + PL.offsetHeight);
}
wm.fit();
wm.focus(P);
syncToggles();
root.classList.add('ready');
booted = true;
if (!S.list.length) openSearch();
if (!S.tipSeen) setTimeout(showBalloon, 2500);
requestAnimationFrame(loop);
