// Apply the saved skin before first paint so the page doesn't flash the default one.
try {
  const { skin, look } = JSON.parse(localStorage.getItem('retroamp:v1') || '{}');
  const family = { amp: 'classic', chicago: 'classic', luna: 'media', modern: 'media', mac: 'media' }[look];
  if (family && /^[a-z0-9]{2,16}$/.test(skin)) {
    Object.assign(document.documentElement.dataset, { family, look, skin });
  }
} catch {
  // storage blocked (private mode) — keep the default skin
}

// Finger-first screens get html.touch (bigger targets, touch wording, no
// mouse-only extras); iPhone/iPad also get html.ios (no page-set YouTube volume).
{
  const root = document.documentElement;
  const touch = matchMedia('(hover: none) and (pointer: coarse)');
  const sync = () => root.classList.toggle('touch', touch.matches);
  sync();
  touch.addEventListener?.('change', sync);
  if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) root.classList.add('ios');
}

// Chrome offers installing RetroAmp as an app as soon as the page loads, before
// consent; hold the offer for the Start menu's Install RetroAmp (core/pwa.js).
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window.retroampInstall = e;
  window.dispatchEvent(new Event('retroamp-install'));
});
