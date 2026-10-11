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
