// Installable app (PWA). js/start.js loads this right after consent, since the
// service worker and its cache count as saving something. It registers /sw.js,
// hands it the files this visit already loaded (so the first offline launch
// works), keeps the app's title-bar color in step with the skin, and offers
// Install RetroAmp in the Start menu: the browser's own prompt where there is
// one (Chrome, Edge), Add to Home Screen steps on iPhone and iPad.
import { $ } from './util.js';
import { showNotice } from './consent.js';

let worker = null;
export function appWorker() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  worker ||= navigator.serviceWorker
    .register('sw.js', { scope: './' })
    .then(async reg => {
      // an earlier build had a Notes-only worker in js/notes/; this one replaces it
      for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope.endsWith('/js/notes/')) r.unregister();
      await navigator.serviceWorker.ready;
      return reg;
    })
    .catch(() => null);
  return worker;
}
appWorker();

// Called by start.js once the app and its modules have loaded.
export async function cacheLoadedFiles() {
  const reg = await appWorker();
  const urls = [location.origin + location.pathname, ...performance.getEntriesByType('resource').map(e => e.name)];
  reg?.active?.postMessage({ type: 'retroamp-precache', urls: urls.filter(u => u.startsWith(location.origin)) });
}

// Title-bar color (installed app window, Android status bar) follows the skin.
const meta = $('meta[name=theme-color]');
function syncThemeColor() {
  const title = getComputedStyle(document.documentElement).getPropertyValue('--title');
  const color = title.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/i)?.[0];
  if (meta && color) meta.content = color;
}
new MutationObserver(syncThemeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
syncThemeColor();

// Install. boot.js catches Chrome's install offer before consent (it fires at load).
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = document.documentElement.classList.contains('ios');
const entry = $('#sm-install');
let offer = window.retroampInstall || null;
const sync = () => entry && (entry.hidden = installed() || !(offer || ios));
window.addEventListener('retroamp-install', () => {
  offer = window.retroampInstall;
  sync();
});
window.addEventListener('appinstalled', () => {
  offer = null;
  sync();
});
entry?.addEventListener('click', async () => {
  if (offer) {
    offer.prompt();
    await offer.userChoice.catch(() => {});
    offer = window.retroampInstall = null;
    sync();
  } else if (ios) {
    showNotice('Install RetroAmp', 'Add RetroAmp to your Home Screen', [
      'In Safari, tap the Share button (the square with an arrow), then Add to Home Screen, then Add.',
      'RetroAmp then opens from its own icon, full screen, without Safari around it. Reminders from Notes can show as notifications there.',
    ]);
  }
});
sync();
