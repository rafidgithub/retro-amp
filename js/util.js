export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function h(tag, cls = '', text = '') {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text) el.textContent = text;
  return el;
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// YouTube auto-generated music channels are named "Artist - Topic".
export const cleanArtist = name => (name || '').replace(/\s+-\s+Topic$/i, '');

const KEY = 'retroamp:v1';
export function loadState() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}
export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // private mode or quota — keep running without persistence
  }
}

export const VIDEO_ID = /^[\w-]{11}$/;
const LIST_ID = /^[\w-]{10,64}$/;

// Returns { video, list } for any YouTube URL (either may be null), or null if
// the input isn't a YouTube link at all (so it should be treated as a search).
export function parseYouTube(input) {
  const s = input.trim();
  if (!s || /\s/.test(s)) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  if (!['youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return null;
  let video = host === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v');
  const path = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
  if (path) video = path[1];
  const list = url.searchParams.get('list');
  return {
    video: VIDEO_ID.test(video || '') ? video : null,
    list: LIST_ID.test(list || '') ? list : null,
  };
}
