// Boot loader. The welcome and privacy consent come first (core/consent.js); only
// after someone accepts does the app (main.js) load, then each module in turn.
// Until then nothing loads from YouTube and nothing is saved. New modules go in
// MODULES, not in index.html.
import { requireConsent } from './core/consent.js';

// The Internet window ('./browser/index.js') is switched off for now: its code
// stays in js/browser/, but nothing loads it, so it has no icon, menu or window.
// The Recycle Bin goes last: every kind of thing it holds has registered by then.
const MODULES = ['./games/index.js', './camera/index.js', './notes/index.js', './snap/index.js', './trash/index.js'];

await requireConsent();
const pwa = await import('./core/pwa.js'); // installable app + offline copy
await import('./main.js');
for (const mod of MODULES) {
  try {
    await import(mod);
  } catch (err) {
    console.error(`RetroAmp: ${mod} failed to load`, err); // one broken module shouldn't take the rest down
  }
}
pwa.cacheLoadedFiles();
