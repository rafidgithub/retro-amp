// Boot loader. The welcome and privacy consent come first (core/consent.js); only
// after someone accepts does the app (main.js) load, then each module in turn.
// Until then nothing loads from YouTube and nothing is saved. New modules go in
// MODULES, not in index.html.
import { requireConsent } from './core/consent.js';

const MODULES = ['./games/index.js', './camera/index.js', './browser/index.js'];

await requireConsent();
await import('./main.js');
for (const mod of MODULES) {
  try {
    await import(mod);
  } catch (err) {
    console.error(`RetroAmp: ${mod} failed to load`, err); // one broken module shouldn't take the rest down
  }
}
