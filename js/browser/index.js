// Internet: a period web browser that only ever shows Google. It's nostalgia,
// not a browser: google.com runs in a sandboxed iframe (Google allows framing
// with igu=1), and everything around it (toolbar, throbber, status messages,
// error pages, even how slowly a page seems to arrive) follows the skin's year,
// from NCSA-style 1993 to 2026.
//
// What a page can and can't do with a cross-origin frame shapes the UX:
// - The frame's URL and title are private. The address bar shows the last
//   address we asked for; links clicked inside Google keep it.
// - Back/Forward walk the tab's own history, which includes frame navigations.
//   A sentinel entry pushed on first open makes overshooting harmless: it lands
//   on our own document (popstate), never on the page before RetroAmp.
// - Links that leave google.com hit our CSP frame-src. The violation event
//   names the host, and an era-styled error page covers the browser's own.
// - The sandbox has no allow-downloads, allow-popups or allow-top-navigation:
//   nothing downloads, nothing opens a window, Google can't navigate us away.
// - credentialless (Chromium) gives the frame an empty cookie jar that dies
//   with the page; Firefox and Safari partition or block third-party cookies.
//   Either way you browse signed out, and RetroAmp stores nothing.
import { $, $$, h, clamp } from '../core/util.js';
import * as wm from '../core/wm.js';
import { openMenu, closeMenus, isMenuOpen } from '../core/menu.js';
import { SKINS } from '../core/skins.js';

const GOOGLE = 'https://www.google.com';
const HOME = `${GOOGLE}/webhp?igu=1`;
const HOST = 'www.google.com';
const MIN_W = 340;
const MIN_H = 260;
const calm = matchMedia('(prefers-reduced-motion: reduce)');

// ---------------------------------------------------------------------------
// Eras: which browser generation each skin gets

// By the skin's year (Mac skins by theirs). Retro-revival skins keep the
// browser their window frame comes from.
export function eraFor(id) {
  const s = SKINS[id];
  if (!s) return 'ie5';
  if (id === 'dos' || id === 'phosphor') return 'lynx';
  if (s.linux) return 'nav'; // the browser on every 1999 Linux desktop
  const year = s.year || s.mac || { chicago: 1995, amp: 1998, luna: 2001, mac: 2007, modern: 2015 }[s.look];
  if (s.look === 'chicago' && year > 1997) return 'nav';
  if (s.look === 'amp' && year > 2006) return 'ie5';
  if (year < 1994) return 'mosaic';
  if (year < 1998) return 'nav';
  if (year < 2001) return 'ie5';
  if (s.mac && year < 2010) return 'safari';
  if (year < 2007) return 'ie6';
  if (year < 2010) return 'tabs';
  if (year < 2020) return 'chrome';
  return 'modern';
}

const IE_MSG = {
  find: h => `Finding site: ${h}`,
  connect: h => `Connecting to site ${h}`,
  wait: () => 'Web site found. Waiting for reply...',
  xfer: (h, url) => `Opening page ${url}...`,
  done: () => 'Done',
  stop: () => 'Done',
};
const CHROME_MSG = {
  find: () => 'Resolving host...',
  connect: () => 'Establishing secure connection...',
  wait: h => `Waiting for ${h}...`,
  xfer: () => 'Processing request...',
  done: () => '',
  stop: () => '',
};

// steps: when the "connect" and "wait" messages appear (ms after start).
// min: shortest a load may look; xfer: how long "transferring" shows.
// throb: canvas throbber style; wipe: the page paints in top to bottom.
const ERAS = {
  mosaic: {
    year: 1993, ver: '1.0', go: 'Navigate', reload: 'Reload', addr: 'URL:',
    throb: 'globe', pixel: true, wipe: true, steps: [350, 800], min: 950, xfer: 350, fps: 90,
    title: t => `RetroAmp Web: ${t}`,
    msg: {
      find: h => `Looking up ${h}...`,
      connect: h => `Connecting to HTTP server ${h}...`,
      wait: () => 'Waiting for reply...',
      xfer: () => 'Reading response...',
      done: () => 'Document Done.',
      stop: () => 'Transfer interrupted.',
    },
    err: h => ({ title: 'Failed to load document', text: [`Requested document (${h}) could not be accessed.`, 'This browser only visits www.google.com.'] }),
  },
  lynx: {
    year: 1994, ver: '2.3 (text mode)', go: 'Go', reload: 'Reload', addr: 'URL to open:',
    throb: 'text', wipe: true, steps: [300, 650], min: 800, xfer: 300, fps: 110,
    title: t => `RetroAmp Web (text mode) - ${t}`,
    msg: {
      find: h => `Looking up ${h}`,
      connect: h => `Making HTTPS connection to ${h}`,
      wait: () => 'HTTP request sent; waiting for response.',
      xfer: () => 'Data transfer in progress.',
      done: () => 'Data transfer complete',
      stop: () => 'Transfer interrupted!',
    },
    err: h => ({ title: 'Alert!: Unable to access document.', text: [`${h} is outside google.com, the only site this browser visits.`] }),
  },
  nav: {
    year: 1996, ver: '3.0', go: 'Go', reload: 'Reload', addr: 'Location:', editing: 'Go to:',
    throb: 'comet', pixel: true, wipe: true, steps: [300, 700], min: 900, xfer: 350, fps: 70,
    title: t => `RetroAmp Web - [${t}]`,
    msg: {
      find: h => `Connect: Looking up host: ${h}...`,
      connect: h => `Connect: Contacting host: ${h}...`,
      wait: h => `Connect: Host ${h} contacted. Waiting for reply...`,
      xfer: h => `Transferring data from ${h}...`,
      done: () => 'Document: Done',
      stop: () => 'Transfer interrupted!',
    },
    err: h => ({ title: 'Unable to open this page', text: [`RetroAmp Web only visits www.google.com, so ${h} can't be opened here.`, 'Try another link, or search for it on Google.'] }),
  },
  ie5: {
    year: 1999, ver: '5.0', go: 'Go', reload: 'Refresh', addr: 'Address',
    throb: 'orbit', steps: [200, 450], min: 500, xfer: 250, fps: 50,
    title: t => `${t} - RetroAmp Web`,
    msg: IE_MSG,
    err: h => ({
      title: 'The page cannot be displayed',
      text: [`The page you are looking for is on ${h}, outside google.com. RetroAmp Web only displays Google pages.`],
      tips: ['Click the Back button to try another link.', `Search Google for ${h} instead.`],
      foot: 'Page outside Google',
    }),
  },
  ie6: {
    year: 2001, ver: '6.0', go: 'Go', reload: 'Refresh', addr: 'Address',
    throb: 'sweep', steps: [150, 350], min: 400, xfer: 200, fps: 40,
    title: t => `${t} - RetroAmp Web`,
    msg: IE_MSG,
    err: h => ERAS.ie5.err(h),
  },
  tabs: {
    year: 2007, ver: '7.0', go: 'Go', reload: 'Refresh', addr: '', find: 'Google',
    steps: [100, 250], min: 250, xfer: 150,
    title: t => `${t} - RetroAmp Web`,
    msg: {
      find: h => `Looking up ${h}...`,
      connect: h => `Connecting to ${h}...`,
      wait: h => `Waiting for ${h}...`,
      xfer: h => `Transferring data from ${h}...`,
      done: () => 'Done',
      stop: () => 'Stopped',
    },
    err: h => ({ title: 'This page can’t be shown here', text: [`${h} is outside google.com. RetroAmp Web only shows Google pages.`], tips: ['Go back to the previous page.', `Search Google for ${h}.`] }),
  },
  safari: {
    year: 2007, ver: '3.0', go: 'Go', reload: 'Reload', addr: '', find: 'Google',
    steps: [100, 250], min: 0, xfer: 150,
    title: t => t,
    msg: {
      find: h => `Contacting “${h}”`,
      connect: h => `Contacting “${h}”`,
      wait: h => `Waiting for “${h}”`,
      xfer: (h, url, title) => `Loading “${title}”`,
      done: () => '',
      stop: () => '',
    },
    err: h => ({ title: 'RetroAmp Web can’t open the page.', text: [`“${h}” is outside google.com, the only site this browser visits.`] }),
  },
  chrome: {
    year: 2011, ver: '10.0', go: 'Go', reload: 'Reload', addr: '', placeholder: 'Search Google or type a URL',
    steps: [80, 200], min: 0, xfer: 120,
    title: t => `${t} - RetroAmp Web`,
    msg: CHROME_MSG,
    err: h => ({ title: 'This page is outside Google', text: [`RetroAmp Web only opens www.google.com, so ${h} is blocked here.`], code: 'ERR_BLOCKED_BY_CSP' }),
  },
  modern: {
    year: 2026, ver: '26.0', go: 'Go', reload: 'Reload', addr: '', placeholder: 'Search Google or type a URL',
    steps: [60, 150], min: 0, xfer: 100,
    title: t => `${t} - RetroAmp Web`,
    msg: CHROME_MSG,
    err: h => ERAS.chrome.err(h),
  },
};

// ---------------------------------------------------------------------------
// Icons (our own drawings). Colors come from --wb-* variables so each era can
// paint them, or leave them monochrome (currentColor).

const NS = 'http://www.w3.org/2000/svg';
const sprite = document.createElementNS(NS, 'svg');
sprite.setAttribute('class', 'sprite');
sprite.setAttribute('aria-hidden', 'true');
sprite.innerHTML = `
  <symbol id="w-globe" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13.5" fill="#2f7fe0" stroke="#0b2f75" stroke-width="1.4"/><path d="M9.5 7.5c3 1 4 3 3 5s-4.2 1.8-4.2 4.8 3.2 3.2 3 6.4C8 22.4 5 19 5 15c0-3 1.7-5.8 4.5-7.5zM18.5 4.2c1.8 2 .2 3.3 2.2 5.1s5-.3 6 2.8-3 4-3 7 2 4-.2 6.2c-2.2 1-3-2-4-4s-3-2.3-3-5.2 4-3.2 3-6.1-3.2-2.8-1-5.8z" fill="#3fbf4a" stroke="#14601c" stroke-width=".8"/><ellipse cx="11" cy="9.5" rx="5" ry="2.8" fill="#fff" opacity=".35"/></symbol>
  <symbol id="wb-back" viewBox="0 0 24 24"><path style="fill:var(--wb-arrow,currentColor);stroke:var(--wb-ink,none)" stroke-width="1.2" stroke-linejoin="round" d="M2.5 12L11 3.8v4.7h10.5v7H11v4.7z"/></symbol>
  <symbol id="wb-forward" viewBox="0 0 24 24"><path style="fill:var(--wb-arrow,currentColor);stroke:var(--wb-ink,none)" stroke-width="1.2" stroke-linejoin="round" d="M21.5 12L13 3.8v4.7H2.5v7H13v4.7z"/></symbol>
  <symbol id="wb-stop" viewBox="0 0 24 24"><path style="fill:var(--wb-stop,currentColor);stroke:var(--wb-ink,none)" stroke-width="1.2" d="M8 2h8l6 6v8l-6 6H8l-6-6V8z"/><path style="stroke:var(--wb-stop-x,var(--wb-x,#fff))" stroke-width="2.6" fill="none" d="M8.5 8.5l7 7M15.5 8.5l-7 7"/></symbol>
  <symbol id="wb-x" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></symbol>
  <symbol id="wb-reload" viewBox="0 0 24 24"><path style="stroke:var(--wb-reload,currentColor)" fill="none" stroke-width="2.6" d="M19 12a7 7 0 1 1-2.1-5"/><path style="fill:var(--wb-reload,currentColor)" d="M21 3v7.5h-7.5z"/></symbol>
  <symbol id="wb-home" viewBox="0 0 24 24"><path style="fill:var(--wb-house,currentColor);stroke:var(--wb-ink,none)" stroke-width="1.2" d="M4.5 11v10.5h5.5v-6h4v6h5.5V11"/><path style="fill:var(--wb-roof,currentColor);stroke:var(--wb-ink,none)" stroke-width="1.2" stroke-linejoin="round" d="M12 2.5L1.5 12h3L12 5.3l7.5 6.7h3z"/></symbol>
  <symbol id="wb-full" viewBox="0 0 24 24"><path style="stroke:var(--wb-full,currentColor)" fill="none" stroke-width="2" d="M3 4.5h18v13H3z"/><path style="fill:var(--wb-full,currentColor)" d="M10 20h4v1.5h3V23H7v-1.5h3zM5.5 7h5l-5 5zM18.5 15h-5l5-5z"/></symbol>
  <symbol id="wb-go" viewBox="0 0 16 16"><rect x=".5" y=".5" width="15" height="15" rx="2" style="fill:var(--wb-go,currentColor)"/><path fill="#fff" d="M3.5 7h5V4l4.5 4-4.5 4V9h-5z"/></symbol>
  <symbol id="wb-page" viewBox="0 0 16 16"><path fill="#fff" stroke="#3a3a3a" d="M3.5 1.5h6l3 3v10h-9z"/><path fill="#cfcfcf" stroke="#3a3a3a" d="M9.5 1.5v3h3"/><path stroke="#2f6fe0" d="M5 7.5h5M5 9.5h5M5 11.5h4"/></symbol>
  <symbol id="wb-lock" viewBox="0 0 16 16"><path fill="none" style="stroke:var(--wb-lock,currentColor)" stroke-width="1.8" d="M5 7.5V5a3 3 0 0 1 6 0v2.5"/><rect x="3" y="7" width="10" height="8" rx="1" style="fill:var(--wb-lock,currentColor)"/></symbol>
  <symbol id="wb-key" viewBox="0 0 16 16"><path style="fill:var(--wb-key,currentColor)" fill-rule="evenodd" d="M4.5 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM8 7h7.5v2H14v2.5h-2V9h-1v1.5H9V9H8z"/></symbol>
  <symbol id="wb-dots" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></symbol>
  <symbol id="wb-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3.6" stroke-dasharray="3.2 3.08"/><path fill-rule="evenodd" d="M12 5.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></symbol>
  <symbol id="wb-search" viewBox="0 0 16 16"><path d="M6.5 1a5.5 5.5 0 0 1 4.4 8.8l4.1 4.1-1.4 1.4-4.1-4.1A5.5 5.5 0 1 1 6.5 1zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/></symbol>
  <symbol id="wb-sad" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-width="3" d="M10 4h20l10 10v30H10z"/><path fill="currentColor" d="M18 22h4v4h-4zM28 22h4v4h-4z"/><path fill="none" stroke="currentColor" stroke-width="3" d="M18 36c3-4 11-4 14 0"/></symbol>
`;
document.body.prepend(sprite);

function icon(id, cls = 'ico') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

function button(cls, act, label, iconId) {
  const b = h('button', cls);
  b.type = 'button';
  b.dataset.web = act;
  b.title = label;
  b.setAttribute('aria-label', label);
  if (iconId) {
    const ico = h('span', 'wb-ico');
    ico.append(icon(iconId));
    b.append(ico);
  }
  return b;
}

// ---------------------------------------------------------------------------
// The window

const win = h('section', 'win dialog wb is-min');
win.id = 'w-web';
win.setAttribute('aria-label', 'Internet');

const titlebar = h('header', 'titlebar');
const tbIcon = h('span', 'tb-icon');
tbIcon.append(icon('w-globe'));
const tbTitle = h('span', 'tb-title', 'RetroAmp Web');
const tbBtns = h('span', 'tb-btns');
const maxBtn = h('button');
maxBtn.dataset.wb = 'max';
maxBtn.setAttribute('aria-label', 'Maximize');
const closeBtn = h('button');
closeBtn.dataset.wm = 'close';
closeBtn.setAttribute('aria-label', 'Close');
tbBtns.append(maxBtn, closeBtn);
titlebar.append(tbIcon, tbTitle, tbBtns);

const body = h('div', 'win-body wb-body');
const chrome = h('div', 'wb-chrome');

// menu bar (1990s–2006); later eras use the ⋮ / gear button instead
const menubar = h('nav', 'wb-menubar');
menubar.setAttribute('aria-label', 'Menu');
for (const key of ['file', 'view', 'go', 'help']) {
  const b = h('button');
  b.type = 'button';
  b.dataset.wbmenu = key;
  menubar.append(b);
}

// toolbar
const tools = h('div', 'wb-tools');
const TOOL_BUTTONS = [
  ['back', 'Back', 'wb-back'],
  ['forward', 'Forward', 'wb-forward'],
  ['stop', 'Stop', 'wb-stop'],
  ['reload', 'Reload', 'wb-reload'],
  ['home', 'Home', 'wb-home'],
  ['full', 'Fullscreen', 'wb-full'],
];
for (const [act, label, ico] of TOOL_BUTTONS) {
  const b = button(`wb-btn wb-${act}`, act, label, ico);
  if (act === 'stop') b.querySelector('.wb-ico').append(icon('wb-x', 'ico wb-x'));
  if (act === 'full') tools.append(h('span', 'wb-sep'));
  b.append(h('span', 'wb-lbl', label));
  tools.append(b);
}

// Mosaic's "Title:" field; Lynx's top line
const titleRow = h('div', 'wb-title');
const titleVal = h('span', 'wb-title-val');
titleRow.append(h('span', 'wb-title-lbl', 'Title:'), titleVal);

// address bar
const addr = h('form', 'wb-addr');
addr.autocomplete = 'off';
addr.noValidate = true;
const addrLbl = h('label', 'wb-addr-lbl');
addrLbl.htmlFor = 'wb-url';
const addrBox = h('div', 'wb-addr-box');
const fill = h('i', 'wb-fill');
const pageIco = h('span', 'wb-addr-ico');
pageIco.append(icon('wb-page'));
const lockIco = h('span', 'wb-addr-lock');
lockIco.title = 'Secure connection (HTTPS)';
lockIco.append(icon('wb-lock'));
const url = h('input', 'wb-url');
Object.assign(url, { id: 'wb-url', type: 'text', spellcheck: false, maxLength: 2000 });
url.setAttribute('autocapitalize', 'off');
url.setAttribute('aria-label', 'Address');
const inReload = button('wb-ab wb-reload', 'reload', 'Refresh', 'wb-reload');
const inStop = button('wb-ab wb-stop', 'stop', 'Stop', 'wb-x');
addrBox.append(fill, pageIco, lockIco, url, inReload, inStop);
const goBtn = h('button', 'wb-go');
goBtn.type = 'submit';
goBtn.title = 'Go to the address in the Address bar';
const goIco = h('span', 'wb-ico');
goIco.append(icon('wb-go'));
goBtn.append(goIco, h('span', 'wb-lbl', 'Go'));
addr.append(addrLbl, addrBox, goBtn);

// search box (2007-era toolbars)
const find = h('form', 'wb-find');
find.autocomplete = 'off';
find.noValidate = true;
const findBox = h('div', 'wb-find-box');
const findInput = h('input', 'wb-find-q');
Object.assign(findInput, { type: 'text', spellcheck: false, maxLength: 300 });
findInput.setAttribute('aria-label', 'Search Google');
const findBtn = h('button', 'wb-find-go');
findBtn.type = 'submit';
findBtn.title = 'Search';
findBtn.setAttribute('aria-label', 'Search');
findBtn.append(icon('wb-search'));
findBox.append(findInput, findBtn);
find.append(findBox);

// one tab (2007+)
const tabs = h('div', 'wb-tabs');
const tab = h('div', 'wb-tab');
const tabIco = h('span', 'wb-tab-ico');
tabIco.append(icon('w-globe'));
const tabTitle = h('span', 'wb-tab-title', 'Google');
const tabX = button('wb-tab-x', 'close', 'Close', 'wb-x');
tab.append(tabIco, tabTitle, tabX);
tabs.append(tab);

const more = button('wb-more', 'more', 'Menu', 'wb-dots');
more.querySelector('.wb-ico').append(icon('wb-gear', 'ico wb-gear'));
more.append(h('span', 'wb-lbl', 'Tools'));

// the throbber: click it to go home, like the browsers that inspired it
const throbBox = h('button', 'wb-throb');
throbBox.type = 'button';
throbBox.dataset.web = 'home';
throbBox.title = 'Home';
throbBox.setAttribute('aria-label', 'Home');
const canvas = h('canvas');
throbBox.append(canvas);

chrome.append(menubar, tools, titleRow, addr, find, tabs, more, throbBox);

// page area
const view = h('div', 'wb-view');
const wipe = h('div', 'wb-wipe');
const line = h('div', 'wb-line');
const page = h('div', 'wb-page');
page.hidden = true;
view.append(wipe, line, page);

// status bar
const status = h('footer', 'wb-status');
const stIco = h('span', 'wb-st-ico');
stIco.append(icon('wb-page'));
const stText = h('span', 'wb-st-text');
stText.setAttribute('role', 'status');
const stSpin = h('span', 'wb-st-spin');
const stProg = h('span', 'wb-st-prog');
stProg.append(h('i'));
const stLock = h('span', 'wb-st-lock');
stLock.title = 'Secure connection (HTTPS)';
stLock.append(icon('wb-lock', 'ico wb-padlock'), icon('wb-key', 'ico wb-keyico'));
const stZone = h('span', 'wb-st-zone');
stZone.append(icon('w-globe'), h('span', '', 'Internet'));
const stHelp = h('span', 'wb-st-help', 'Commands: G)o  H)ome  R)eload  B)ack  F)orward  Q)uit');
status.append(stIco, stText, stSpin, stProg, stLock, stZone, stHelp);

const grip = h('span', 'wb-grip');
grip.setAttribute('aria-hidden', 'true');

body.append(chrome, view, status, grip);
win.append(titlebar, body);
$('#desktop').append(win);
wm.register(win, { title: 'Internet', icon: 'w-globe', dialog: true });

// ---------------------------------------------------------------------------
// State

let frame = null;
let era = 'ie5';
let cfg = ERAS[era];
let entries = []; // one per frame history entry: { url, title, blocked?, inPage? }
let idx = -1;
let pending = null; // what the next frame load is: { kind: nav|back|forward|reload, entry?, note? }
let pendingTimer = 0;
let loading = false;
let quick = false;
let loadStart = 0;
let timers = [];
let blockedHost = null;
let blockedAt = 0;
let lastLoadAt = 0;
let showingAbout = false;
let editing = false;
let placed = false;
let sentinel = false;
const TOKEN = Math.random().toString(36).slice(2);

const later = (ms, fn) => timers.push(setTimeout(fn, ms));
const clearTimers = () => {
  timers.forEach(clearTimeout);
  timers = [];
};

// ---------------------------------------------------------------------------
// Addresses: everything resolves to https://www.google.com/…

function entryFor(href, extra = {}) {
  let u;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if (u.origin !== GOOGLE) return null;
  u.searchParams.set('igu', '1');
  const q = u.searchParams.get('q');
  const title = u.pathname === '/search' && q ? `${q} - Google Search` : 'Google';
  return { url: u.href, title, ...extra };
}

// What the address bar shows: the real address minus the framing flag.
function shown(href) {
  const u = new URL(href);
  u.searchParams.delete('igu');
  if (u.pathname === '/webhp' && !u.search) u.pathname = '/';
  return u.href;
}

// Typed text → a Google address. Other sites can't load here, so they become
// a Google search for that site.
function fromInput(text) {
  const s = text.trim();
  if (!s) return null;
  if (/^about:/i.test(s)) return { about: true };
  const hasScheme = /^https?:\/\//i.test(s);
  let offsite = null;
  if (!/\s/.test(s) && (hasScheme || /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]|$)/i.test(s))) {
    try {
      const u = new URL(hasScheme ? s : `https://${s}`);
      if (/^(www\.)?google\.com$/i.test(u.hostname)) return { url: GOOGLE + u.pathname + u.search + u.hash };
      offsite = u.hostname;
    } catch {
      // not a URL after all: search for it
    }
  }
  const q = new URL('/search', GOOGLE);
  q.searchParams.set('q', s);
  return { url: q.href, note: offsite && `${offsite} is outside Google, so RetroAmp Web searched for it.` };
}

const searchUrl = text => {
  const q = new URL('/search', GOOGLE);
  q.searchParams.set('q', text);
  return q.href;
};

// ---------------------------------------------------------------------------
// The frame

function createFrame(entry) {
  // One sentinel entry per page load, so Back can never leave RetroAmp.
  if (!sentinel) {
    history.pushState({ retroampWeb: TOKEN }, '');
    sentinel = true;
  }
  frame = document.createElement('iframe');
  frame.className = 'wb-frame';
  frame.title = 'Web page';
  frame.setAttribute('credentialless', '');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  frame.referrerPolicy = 'no-referrer';
  frame.addEventListener('load', onLoad);
  entries = [];
  idx = -1;
  expect({ kind: 'nav', entry }, 30000);
  startLoading(entry);
  frame.src = entry.url;
  view.prepend(frame);
}

function teardown() {
  frame?.remove();
  frame = null;
  entries = [];
  idx = -1;
  pending = null;
  clearTimeout(pendingTimer);
  showingAbout = false;
  editing = false;
  blockedHost = null;
  stopLoading('');
  url.value = '';
  findInput.value = '';
  render();
}

function expect(p, ms) {
  pending = p;
  clearTimeout(pendingTimer);
  // A load that never comes (offline, or a history step with nothing to show)
  // mustn't leave the throbber spinning forever.
  pendingTimer = setTimeout(() => {
    if (pending !== p) return;
    pending = null;
    stopLoading(loading ? cfg.msg.done() : null);
  }, ms);
}

function go(href, note = null) {
  const entry = entryFor(href);
  if (!entry) return;
  showingAbout = false;
  editing = false;
  if (!frame) {
    createFrame(entry);
    render();
    return;
  }
  expect({ kind: 'nav', entry, note }, 30000);
  startLoading(entry);
  frame.src = entry.url;
  render();
}

function onLoad() {
  try {
    if (frame.contentWindow.location.href === 'about:blank') return;
  } catch {
    // cross-origin: a real page (or the browser's own error page)
  }
  const now = Date.now();
  lastLoadAt = now;
  const p = pending;
  pending = null;
  clearTimeout(pendingTimer);
  if (p?.kind === 'back') idx = Math.max(0, idx - 1);
  else if (p?.kind === 'forward') idx = Math.min(entries.length - 1, idx + 1);
  else if (p?.kind === 'reload' && entries[idx]) entries[idx] = { ...p.entry };
  else {
    // our own navigation, or a link clicked inside the page (address unknown)
    const prev = entries[idx];
    entries = entries.slice(0, idx + 1);
    entries.push(p?.entry ? { ...p.entry } : { url: prev?.url || HOME, title: 'Google', inPage: true });
    idx = entries.length - 1;
  }
  if (blockedHost && now - blockedAt < 5000) entries[idx].blocked = blockedHost;
  blockedHost = null;
  if (!p || !loading) startLoading(entries[idx], true);
  finish(p?.note);
  render();
}

// A link that leaves google.com: our CSP blocks it before the frame loads.
document.addEventListener('securitypolicyviolation', e => {
  if (!frame || e.effectiveDirective !== 'frame-src' || (e.target instanceof HTMLIFrameElement && e.target !== frame)) return;
  let host = 'that site';
  try {
    host = new URL(e.blockedURI).hostname || host;
  } catch {
    // blockedURI can be a bare keyword
  }
  if (Date.now() - lastLoadAt < 300 && entries[idx] && !pending) {
    entries[idx].blocked = host; // the error page loaded first
    render();
  } else {
    blockedHost = host;
    blockedAt = Date.now();
  }
});

// Our own Back overshot the frame's history and landed on the sentinel's
// predecessor (same document): step forward again.
window.addEventListener('popstate', e => {
  if (pending?.kind !== 'back' || e.state?.retroampWeb === TOKEN) return;
  history.forward();
  pending = null;
  clearTimeout(pendingTimer);
  idx = 0;
  stopLoading(cfg.msg.done());
  render();
});

// ---------------------------------------------------------------------------
// Commands

function canBack() {
  return showingAbout || idx > 0;
}
function canForward() {
  return !showingAbout && idx < entries.length - 1;
}

function back() {
  if (showingAbout) {
    showingAbout = false;
    return render();
  }
  if (!frame || idx <= 0 || pending) return;
  expect({ kind: 'back' }, 8000);
  startLoading(entries[idx - 1]);
  history.back();
}

function forward() {
  if (!frame || !canForward() || pending) return;
  expect({ kind: 'forward' }, 8000);
  startLoading(entries[idx + 1]);
  history.forward();
}

function reload() {
  showingAbout = false;
  const e = entries[idx];
  if (!frame || !e) return go(HOME);
  const entry = entryFor(e.url, { title: e.inPage ? 'Google' : e.title });
  expect({ kind: 'reload', entry }, 30000);
  startLoading(entry);
  // replace(): a refresh doesn't add a history entry
  frame.contentWindow.location.replace(entry.url);
  render();
}

function stop() {
  if (loading) stopLoading(cfg.msg.stop());
}

const home = () => go(HOME);

function focusUrl() {
  url.focus();
  url.select();
}

function toggleMax() {
  const on = win.classList.toggle('wb-max');
  maxBtn.setAttribute('aria-label', on ? 'Restore' : 'Maximize');
  wm.keepAllOnScreen();
}

function closeBrowser() {
  wm.hide(win);
  teardown();
}

function showAbout() {
  showingAbout = true;
  editing = false;
  render();
}

const ACTS = {
  back,
  forward,
  reload,
  stop,
  home,
  full: toggleMax,
  close: closeBrowser,
  more: () => {
    if (isMenuOpen()) return closeMenus();
    const r = more.getBoundingClientRect();
    openMenu(moreMenu(), r.right - 190, r.bottom);
  },
};
body.addEventListener('click', e => {
  const b = e.target.closest('[data-web]');
  if (b && !b.disabled) ACTS[b.dataset.web]?.();
});

maxBtn.addEventListener('click', toggleMax);
closeBtn.addEventListener('click', teardown); // wm hides the window first
titlebar.addEventListener('dblclick', e => {
  if (!e.target.closest('button') && !wm.isMobile()) toggleMax();
});

addr.addEventListener('submit', e => {
  e.preventDefault();
  const r = fromInput(url.value);
  if (!r) return;
  editing = false;
  url.blur();
  if (r.about) showAbout();
  else go(r.url, r.note);
});
url.addEventListener('focus', () => setTimeout(() => document.activeElement === url && url.select()));
url.addEventListener('input', () => {
  editing = true;
  syncLabels();
});
url.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  editing = false;
  render();
  url.select();
});
find.addEventListener('submit', e => {
  e.preventDefault();
  const q = findInput.value.trim();
  if (!q) return;
  findInput.blur();
  go(searchUrl(q));
});

// ---------------------------------------------------------------------------
// Menus

const MENU_LABELS = { file: 'File', view: 'View', go: 'Go', help: 'Help' };

const goItems = () => [
  { label: 'Back', key: 'Alt+←', disabled: !canBack(), act: back },
  { label: 'Forward', key: 'Alt+→', disabled: !canForward(), act: forward },
  { label: 'Home Page', key: 'Alt+Home', act: home },
];
const MENUS = {
  file: () => [
    { label: 'Open Location…', key: 'Ctrl+L', act: focusUrl },
    { sep: true },
    { label: 'Close', act: closeBrowser },
  ],
  view: () => [
    { label: 'Status Bar', checked: !win.classList.contains('wb-nostatus'), act: () => win.classList.toggle('wb-nostatus') },
    { sep: true },
    { label: 'Stop', key: 'Esc', disabled: !loading, act: stop },
    { label: cfg.reload, key: 'F5', act: reload },
    { sep: true },
    { label: 'Full Screen', checked: win.classList.contains('wb-max'), act: toggleMax },
  ],
  go: goItems,
  help: () => [{ label: 'About RetroAmp Web', act: showAbout }],
};
const moreMenu = () => [
  ...goItems(),
  { sep: true },
  { label: 'Full Screen', checked: win.classList.contains('wb-max'), act: toggleMax },
  { label: 'About RetroAmp Web', act: showAbout },
  { sep: true },
  { label: 'Close', act: closeBrowser },
];

let openBar = null;
function openMenuBar(b) {
  openBar?.classList.remove('open');
  openBar = b;
  b.classList.add('open');
  const r = b.getBoundingClientRect();
  openMenu(MENUS[b.dataset.wbmenu](), r.left, r.bottom, () => {
    b.classList.remove('open');
    if (openBar === b) openBar = null;
  });
}
for (const b of $$('[data-wbmenu]', menubar)) {
  b.addEventListener('click', () => (openBar === b ? closeMenus() : openMenuBar(b)));
  b.addEventListener('pointerenter', () => openBar && openBar !== b && openMenuBar(b));
}

// ---------------------------------------------------------------------------
// Loading: status messages, progress, throbber

function setStatus(text) {
  stText.textContent = text;
  status.classList.toggle('wb-empty', !text);
}

function setProgress(p, mode = '') {
  win.classList.toggle('wb-snap', mode === 'snap');
  win.classList.toggle('wb-creep', mode === 'creep');
  win.style.setProperty('--wb-p', p);
}

function startLoading(entry, isQuick = false) {
  clearTimers();
  loading = true;
  quick = isQuick;
  loadStart = Date.now();
  win.classList.add('wb-loading');
  setProgress(0, 'snap');
  if (entry && !editing && !isQuick) url.value = shown(entry.url);
  if (isQuick) {
    win.dataset.phase = 'load';
    setStatus(cfg.msg.xfer(HOST, entry ? shown(entry.url) : GOOGLE, entry?.title || 'Google'));
    later(20, () => setProgress(0.7));
  } else {
    win.dataset.phase = 'wait';
    setStatus(cfg.msg.find(HOST));
    later(cfg.steps[0], () => {
      setStatus(cfg.msg.connect(HOST));
      setProgress(0.08);
    });
    later(cfg.steps[1], () => {
      setStatus(cfg.msg.wait(HOST));
      setProgress(0.9, 'creep');
    });
    if (cfg.wipe && !calm.matches) wipe.className = 'wb-wipe on';
  }
  throbber(true);
}

// The frame loaded: play out "transferring", then "done". Older eras never
// look faster than their modems were (min), so their status lines get read.
function finish(note) {
  const e = entries[idx];
  const wait = quick ? 0 : Math.max(0, cfg.min - (Date.now() - loadStart));
  later(wait, () => {
    win.dataset.phase = 'load';
    if (!quick) setStatus(cfg.msg.xfer(HOST, e ? shown(e.url) : GOOGLE, e?.title || 'Google'));
    setProgress(1);
    later(cfg.xfer, () => stopLoading(note || cfg.msg.done(), true));
  });
}

function stopLoading(text, reveal = false) {
  clearTimers();
  loading = false;
  win.classList.remove('wb-loading');
  win.dataset.phase = '';
  if (text !== null) setStatus(text);
  throbber(false);
  if (wipe.classList.contains('on')) {
    wipe.className = reveal && !calm.matches ? 'wb-wipe reveal' : 'wb-wipe';
  }
  later(450, () => setProgress(0, 'snap'));
  render();
}
wipe.addEventListener('animationend', () => (wipe.className = 'wb-wipe'));

// Canvas throbbers, drawn at a few frames per second like the GIFs they echo.
let throbOn = false;
let raf = 0;
let lastFrame = -1;
let spinI = 0;

function throbber(on) {
  throbOn = on;
  cancelAnimationFrame(raf);
  raf = 0;
  lastFrame = -1;
  if (on && !calm.matches) raf = requestAnimationFrame(tick);
  else {
    drawThrob(0, false);
    stSpin.textContent = '';
  }
}

function tick(now) {
  raf = 0;
  if (!throbOn) return;
  const f = Math.floor(now / (cfg.fps || 80));
  if (f !== lastFrame && wm.isOpen(win)) {
    lastFrame = f;
    drawThrob(f * (cfg.fps || 80), true);
    if (cfg.throb === 'text') stSpin.textContent = '|/-\\'[spinI++ % 4];
  }
  raf = requestAnimationFrame(tick);
}

const DRAW = {
  // NCSA-style spinning globe
  globe(c, w, hh, t, on) {
    const r = Math.min(w, hh) * 0.36;
    const cx = w / 2;
    const cy = hh / 2;
    c.fillStyle = '#1f3fa0';
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
    const phase = on ? t / 700 : 0.4;
    c.strokeStyle = '#9fd0ff';
    c.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      const rx = Math.abs(Math.cos(phase + (k * Math.PI) / 3)) * r;
      c.beginPath();
      c.ellipse(cx, cy, Math.max(rx, 0.5), r, 0, 0, Math.PI * 2);
      c.stroke();
    }
    for (const dy of [-0.5, 0, 0.5]) {
      const half = Math.sqrt(1 - dy * dy) * r;
      c.beginPath();
      c.moveTo(cx - half, cy + dy * r);
      c.lineTo(cx + half, cy + dy * r);
      c.stroke();
    }
    c.strokeStyle = '#000';
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();
    if (on) {
      const a = t / 250;
      c.fillStyle = '#ffe14a';
      c.fillRect(Math.round(cx + Math.cos(a) * r * 1.25) - 1, Math.round(cy + Math.sin(a) * r * 0.45) - 1, 3, 3);
    }
  },
  // night sky, a planet, and shooting stars while loading
  comet(c, w, hh, t, on) {
    const sky = c.createLinearGradient(0, 0, 0, hh);
    sky.addColorStop(0, '#000018');
    sky.addColorStop(1, '#1b1b6e');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, hh);
    for (let i = 0; i < 14; i++) {
      const x = (i * 37 + 11) % w;
      const y = (i * 23 + 7) % (hh * 0.65);
      c.fillStyle = on && (i + Math.floor(t / 300)) % 5 === 0 ? '#ffffff' : '#8a8ad8';
      c.fillRect(x, y, 1, 1);
    }
    const pr = hh * 0.8;
    const planet = c.createRadialGradient(w * 0.35, hh * 0.85, 2, w / 2, hh + pr * 0.45, pr);
    planet.addColorStop(0, '#6fe0ff');
    planet.addColorStop(0.5, '#1d7fa8');
    planet.addColorStop(1, '#0a2f4a');
    c.fillStyle = planet;
    c.beginPath();
    c.arc(w / 2, hh + pr * 0.45, pr, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255, 210, 120, .8)';
    c.beginPath();
    c.ellipse(w / 2, hh * 0.86, w * 0.62, hh * 0.09, -0.12, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
    if (!on) return;
    for (let i = 0; i < 3; i++) {
      const p = (t / 1100 + i / 3) % 1;
      const x = w * 1.15 - p * w * 1.5;
      const y = -hh * 0.1 + i * hh * 0.14 + p * hh * 0.75;
      const tail = c.createLinearGradient(x, y, x + 14, y - 7);
      tail.addColorStop(0, '#ffffff');
      tail.addColorStop(1, 'rgba(255, 255, 255, 0)');
      c.strokeStyle = tail;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 14, y - 7);
      c.stroke();
      c.fillStyle = '#fff';
      c.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
  },
  // a globe with a ring and a satellite racing around it
  orbit(c, w, hh, t, on) {
    const r = Math.min(w, hh) * 0.27;
    const cx = w / 2;
    const cy = hh / 2;
    const tilt = -0.35;
    const ring = (from, to) => {
      c.strokeStyle = '#e6a300';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(cx, cy, r * 1.65, r * 0.5, tilt, from, to);
      c.stroke();
    };
    ring(Math.PI, Math.PI * 2);
    const g = c.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 1, cx, cy, r);
    g.addColorStop(0, '#bfe2ff');
    g.addColorStop(0.6, '#2f7fe0');
    g.addColorStop(1, '#0b3f9a');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3fbf4a';
    c.beginPath();
    c.ellipse(cx - r * 0.3, cy - r * 0.1, r * 0.35, r * 0.5, 0.4, 0, Math.PI * 2);
    c.ellipse(cx + r * 0.45, cy + r * 0.3, r * 0.25, r * 0.3, -0.3, 0, Math.PI * 2);
    c.fill();
    ring(0, Math.PI);
    const a = on ? t / 260 : 0.9;
    for (let i = on ? 5 : 0; i >= 0; i--) {
      const ai = a - i * 0.22;
      const x = cx + Math.cos(ai) * r * 1.65 * Math.cos(tilt) - Math.sin(ai) * r * 0.5 * Math.sin(tilt);
      const y = cy + Math.cos(ai) * r * 1.65 * Math.sin(tilt) + Math.sin(ai) * r * 0.5 * Math.cos(tilt);
      c.fillStyle = i ? `rgba(255, 240, 160, ${0.5 - i * 0.08})` : '#fff7c0';
      c.beginPath();
      c.arc(x, y, i ? 1.6 : 2.6, 0, Math.PI * 2);
      c.fill();
    }
  },
  // a glossy turning globe with a light sweep
  sweep(c, w, hh, t, on) {
    const r = Math.min(w, hh) * 0.4;
    const cx = w / 2;
    const cy = hh / 2;
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();
    const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 1, cx, cy, r * 1.1);
    g.addColorStop(0, '#d6eeff');
    g.addColorStop(0.55, '#3a8ee8');
    g.addColorStop(1, '#0a3d91');
    c.fillStyle = g;
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
    const shift = on ? ((t / 1600) % 1) * r * 2 : r * 0.6;
    c.fillStyle = '#46c04a';
    for (const k of [-2, 0, 2]) {
      const x = cx - r + shift + k * r;
      c.beginPath();
      c.ellipse(x, cy - r * 0.15, r * 0.32, r * 0.5, 0.5, 0, Math.PI * 2);
      c.ellipse(x + r * 0.75, cy + r * 0.35, r * 0.22, r * 0.28, -0.4, 0, Math.PI * 2);
      c.fill();
    }
    if (on) {
      const sx = (((t / 900) % 1.6) - 0.3) * r * 2 + cx - r;
      const s = c.createLinearGradient(sx - r * 0.4, 0, sx + r * 0.4, 0);
      s.addColorStop(0, 'rgba(255,255,255,0)');
      s.addColorStop(0.5, 'rgba(255,255,255,.6)');
      s.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = s;
      c.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    c.fillStyle = 'rgba(255,255,255,.45)';
    c.beginPath();
    c.ellipse(cx - r * 0.25, cy - r * 0.5, r * 0.55, r * 0.28, -0.3, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.strokeStyle = 'rgba(0, 40, 110, .8)';
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.stroke();
  },
};

function drawThrob(t, on) {
  const draw = DRAW[cfg.throb];
  const w = canvas.clientWidth;
  const hh = canvas.clientHeight;
  if (!draw || !w || !hh) return;
  const scale = cfg.pixel ? 1 : Math.min(2, devicePixelRatio || 1);
  const cw = Math.round(w * scale);
  const ch = Math.round(hh * scale);
  if (canvas.width !== cw || canvas.height !== ch) Object.assign(canvas, { width: cw, height: ch });
  const c = canvas.getContext('2d');
  c.setTransform(scale, 0, 0, scale, 0, 0);
  c.clearRect(0, 0, w, hh);
  draw(c, w, hh, t, on);
}
new ResizeObserver(() => !throbOn && drawThrob(0, false)).observe(canvas);

// ---------------------------------------------------------------------------
// Rendering

function render() {
  const e = entries[idx];
  for (const b of $$('[data-web=back]', body)) b.disabled = !canBack();
  for (const b of $$('[data-web=forward]', body)) b.disabled = !canForward();
  for (const b of $$('.wb-btn.wb-stop, .wb-ab.wb-stop', body)) b.disabled = !loading;
  if (!editing) url.value = showingAbout ? 'about:' : e ? shown(e.url) : '';
  syncLabels();

  const err = e?.blocked && !showingAbout ? cfg.err(e.blocked) : null;
  const title = showingAbout ? 'About RetroAmp Web' : err ? err.title : e?.title || 'Google';
  tbTitle.textContent = cfg.title(title);
  wm.setTitle(win, title === 'Google' ? 'Internet' : title);
  tabTitle.textContent = title;
  titleVal.textContent = title;
  if (showingAbout) page.replaceChildren(aboutPage());
  else if (err) page.replaceChildren(errorPage(err, e.blocked));
  page.hidden = !showingAbout && !err;
}

function syncLabels() {
  addrLbl.textContent = editing && cfg.editing ? cfg.editing : cfg.addr;
  url.placeholder = cfg.placeholder || '';
  findInput.placeholder = cfg.find || '';
  for (const b of $$('[data-web=reload]', body)) {
    b.title = cfg.reload;
    b.setAttribute('aria-label', cfg.reload);
    const lbl = $('.wb-lbl', b);
    if (lbl) lbl.textContent = cfg.reload;
  }
  for (const b of $$('[data-wbmenu]', menubar)) {
    const label = b.dataset.wbmenu === 'go' ? cfg.go : MENU_LABELS[b.dataset.wbmenu];
    b.replaceChildren(h('u', '', label[0]), label.slice(1));
  }
}

function pageButton(label, act) {
  const b = h('button', 'btn', label);
  b.type = 'button';
  b.addEventListener('click', act);
  return b;
}

function errorPage(err, host) {
  const box = h('div', 'wb-pg wb-err');
  const head = h('div', 'wb-pg-head');
  head.append(icon(era === 'chrome' || era === 'modern' ? 'wb-sad' : 'wb-page', 'wb-pg-ico'), h('h1', '', err.title));
  box.append(head);
  if (era === 'ie5' || era === 'ie6') box.append(h('hr'));
  for (const t of err.text) box.append(h('p', '', t));
  if (err.tips) {
    box.append(h('p', 'wb-pg-sub', 'Please try the following:'));
    const ul = h('ul');
    for (const t of err.tips) ul.append(h('li', '', t));
    box.append(ul);
  }
  if (err.code) box.append(h('p', 'wb-pg-code', err.code));
  const acts = h('div', 'wb-pg-acts');
  acts.append(pageButton('Back', back), pageButton(`Search Google for ${host}`, () => go(searchUrl(host))));
  box.append(acts);
  if (err.foot) box.append(h('hr'), h('p', 'wb-pg-foot', `${err.foot}\nRetroAmp Web`));
  return box;
}

function aboutPage() {
  const box = h('div', 'wb-pg wb-about');
  const head = h('div', 'wb-pg-head');
  const text = h('div');
  text.append(h('h1', '', 'RetroAmp Web'), h('p', 'wb-pg-sub', `Version ${cfg.ver} · styled after the browsers of ${cfg.year}`));
  head.append(icon('w-globe', 'wb-pg-logo'), text);
  const ul = h('ul');
  for (const t of [
    'Every page comes from www.google.com. Links to other sites stay closed.',
    'No history, no bookmarks, no downloads, no new windows.',
    'You browse signed out: Google’s cookies here are separate from your own browser’s and are not kept by RetroAmp.',
    'Searches go straight from your browser to Google, not through RetroAmp’s server. Google sees your IP address, as on any visit.',
    'Closing this window forgets everything.',
  ]) {
    ul.append(h('li', '', t));
  }
  const acts = h('div', 'wb-pg-acts');
  acts.append(pageButton('OK', () => back()));
  box.append(head, ul, acts);
  return box;
}

// ---------------------------------------------------------------------------
// Skin changes swap the browser generation

function applyEra() {
  const next = eraFor(document.documentElement.dataset.skin);
  if (next === era && win.dataset.era) return;
  era = next;
  cfg = ERAS[era];
  win.dataset.era = era;
  more.querySelector('.wb-lbl').textContent = era === 'tabs' ? 'Tools' : '';
  if (!loading) setStatus(entries.length ? cfg.msg.done() : '');
  render();
  requestAnimationFrame(() => drawThrob(0, throbOn));
}
new MutationObserver(applyEra).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
applyEra();

// ---------------------------------------------------------------------------
// Window behavior: open, focus, resize, keyboard

function openBrowser() {
  if (!frame) go(HOME);
  wm.show(win, { center: !placed });
  placed = true;
}

// Clicking into the page focuses the frame, not our window: raise it anyway.
window.addEventListener('blur', () =>
  setTimeout(() => {
    if (frame && document.activeElement === frame && !win.classList.contains('active')) wm.focus(win);
  }),
);

// Dragging or resizing over the page: keep the pointer out of the frame.
const busy = () => {
  win.classList.add('wb-drag');
  window.addEventListener('pointerup', () => win.classList.remove('wb-drag'), { once: true });
};
titlebar.addEventListener('pointerdown', busy);

grip.addEventListener('pointerdown', e => {
  if (e.button !== 0 || wm.isMobile() || win.classList.contains('wb-max')) return;
  e.preventDefault();
  grip.setPointerCapture(e.pointerId);
  busy();
  const desk = $('#desktop');
  const sx = e.clientX;
  const sy = e.clientY;
  const w0 = win.offsetWidth;
  const h0 = win.offsetHeight;
  const move = ev => {
    win.style.width = `${clamp(w0 + ev.clientX - sx, MIN_W, Math.max(MIN_W, desk.clientWidth - win.offsetLeft))}px`;
    win.style.height = `${clamp(h0 + ev.clientY - sy, MIN_H, Math.max(MIN_H, desk.clientHeight - win.offsetTop))}px`;
  };
  const up = () => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', up);
    grip.removeEventListener('pointercancel', up);
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', up);
  grip.addEventListener('pointercancel', up);
});

// Capture phase: browser keys win over the player's shortcuts while this
// window is focused. F5 / Ctrl+R refresh the page, not all of RetroAmp.
const LYNX_KEYS = { g: focusUrl, h: home, r: reload, b: back, f: forward, q: closeBrowser, arrowleft: back };
window.addEventListener(
  'keydown',
  e => {
    if (!wm.isOpen(win) || !win.classList.contains('active') || isMenuOpen()) return;
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    let act = null;
    if (k === 'f5' || (mod && k === 'r')) act = reload;
    else if ((e.altKey && k === 'arrowleft') || (e.metaKey && k === '[')) act = back;
    else if ((e.altKey && k === 'arrowright') || (e.metaKey && k === ']')) act = forward;
    else if (e.altKey && k === 'home') act = home;
    else if (k === 'f6' || (mod && k === 'l') || (e.altKey && k === 'd')) act = focusUrl;
    else if (k === 'escape' && loading && !typing) act = stop;
    else if (era === 'lynx' && !mod && !e.altKey && !typing) act = LYNX_KEYS[k];
    if (!act) return;
    e.preventDefault();
    e.stopPropagation();
    act();
  },
  true,
);

// ---------------------------------------------------------------------------
// Desktop icon + Start menu entry

const desk = h('button', 'dicon');
desk.dataset.open = 'web';
desk.append(icon('w-globe', ''), h('span', '', 'Internet'));
$('#icons')?.append(desk);
desk.addEventListener('click', e => {
  if (e.pointerType === 'touch' || e.detail === 0) openBrowser();
});
desk.addEventListener('dblclick', openBrowser);

const smItems = $('#start-menu .sm-items');
if (smItems) {
  const entry = h('button', 'wb-sm-entry');
  entry.append(icon('w-globe'), h('span', '', 'Internet'));
  entry.addEventListener('click', openBrowser);
  smItems.insertBefore(entry, smItems.querySelector('hr'));
}
