// Skin catalog. A "look" decides layout and renderers (css/looks/: amp,
// classic, media + luna/modern/mac); a skin is a look plus a color scheme
// (css/skins/classic.css / media.css). Looks belong to a family: "classic"
// (Win9x chrome) or "media" (album-art player).

const smooth = (bar, gap, reflect = false) => ({ pixel: false, bar, gap, reflect });
const text = font => ({ seg: false, font, cssW: 120, cssH: 20 });

export const LOOKS = {
  amp: {
    family: 'classic',
    viz: { pixel: true, w: 76, h: 16, scale: 2, bar: 3, gap: 1, dots: true },
    lcd: { seg: true, w: 9, h: 14, t: 2, gap: 3, scale: 2 },
    clock: 'amp',
    numbered: true,
    idle: 'RetroAmp  ***  Press eject (or L) to add music from YouTube',
    idleTouch: 'RetroAmp  ***  Tap eject to add music from YouTube',
  },
  chicago: {
    family: 'classic',
    viz: { pixel: true, w: 105, h: 10, scale: 2, bar: 3, gap: 1 },
    lcd: { seg: true, w: 9, h: 16, t: 2, gap: 3, scale: 2 },
    clock: 'cd',
    idle: 'No track. Click eject to add music from YouTube.',
    idleTouch: 'No track. Tap eject to add music from YouTube.',
  },
  luna: {
    family: 'media',
    viz: smooth(7, 3, true),
    lcd: text('bold 15px Tahoma, Verdana, sans-serif'),
    clock: 'text',
    playToggles: true,
    idle: 'Ready. Use File › Add from YouTube to start.',
  },
  modern: {
    family: 'media',
    viz: smooth(6, 3),
    lcd: text('600 14px "Segoe UI", system-ui, sans-serif'),
    clock: 'text',
    playToggles: true,
    idle: 'Nothing playing. Add music from YouTube to start.',
  },
  mac: {
    family: 'media',
    viz: smooth(5, 2),
    lcd: text('bold 13px "Lucida Grande", Geneva, sans-serif'),
    clock: 'text',
    playToggles: true,
    idle: 'Choose File › Add from YouTube to start.',
  },
};

// year: timeline slot (one skin per year, 1990–2026). era: subtitle.
// preview: colors for the little picture in the Skins window.
// viz / lcd: per-skin tweaks merged over the look's settings.
export const SKINS = {
  // ---------- 1990s ----------
  progman: { name: 'Program Manager', look: 'chicago', year: 1990, era: 'Windows 3.0',
    preview: { desk: 'repeating-conic-gradient(#a9a9a9 0 25%, #b9b9b9 0 50%) 0 0 / 4px 4px', title: '#000080', face: '#c0c0c0', lcd: '#00ff00' } },
  workbench: { name: 'Workbench', look: 'chicago', year: 1991, era: 'Amiga tracker days',
    preview: { desk: '#0055aa', title: '#ffffff', face: '#0055aa', lcd: '#ff8800' } },
  hotdog: { name: 'Hot Dog Stand', look: 'chicago', year: 1992, era: 'Windows 3.1, the infamous one',
    preview: { desk: '#ff0000', title: '#ff0000', face: '#ffff00', lcd: '#ff3b2f' } },
  next: { name: 'Black Cube', look: 'chicago', year: 1993, era: 'NeXTSTEP workstation',
    preview: { desk: 'radial-gradient(#6a6a6a, #3c3c3c)', title: '#000', face: '#aaaaaa', lcd: '#ffffff' } },
  dos: { name: 'Text Mode', look: 'chicago', year: 1994, era: 'DOS mod player',
    preview: { desk: '#000055', title: '#00aaaa', face: '#0000aa', lcd: '#55ff55' } },
  chicago: { name: 'Chicago 95', look: 'chicago', year: 1995, era: 'Windows 95 CD Player',
    preview: { desk: '#008080', title: '#000080', face: '#c0c0c0', lcd: '#ffc21a' } },
  rainy: { name: 'Rainy Day', look: 'chicago', year: 1996, era: 'first MP3 players, Plus! schemes',
    preview: { desk: 'linear-gradient(#3b4c60, #62788f)', title: 'linear-gradient(90deg, #3d4f63, #8aa1b9)', face: '#b6c0ca', lcd: '#7fe8ff' } },
  desert: { name: 'Desert', look: 'chicago', year: 1997, era: 'sandstone color scheme',
    preview: { desk: 'linear-gradient(#f6c77d, #db8f5c 60%, #b07f48 60%)', title: 'linear-gradient(90deg, #8a5a2b, #d6a66a)', face: '#d5ccbb', lcd: '#a6ff5c' } },
  amp: { name: 'Amp', look: 'amp', year: 1998, era: 'the classic MP3 player',
    preview: { desk: '#008080', title: 'repeating-linear-gradient(180deg, #d9c47d 0 1px, #3a3a52 1px 2px)', face: 'linear-gradient(#46465f, #26263a)', lcd: '#00e000' } },
  orbital: { name: 'Orbital', look: 'amp', year: 1999, era: 'organic, Y2K-ready player',
    preview: { desk: 'radial-gradient(circle at 30% 30%, #1f6f8b, #041219)', title: 'linear-gradient(#bff6ff, #3d8fa8)', face: 'radial-gradient(ellipse at 30% 0%, #9fd9e6, #155a70)', lcd: '#9ff3ff', 'lcd-bg': '#03161d', radius: '14px' } },

  // ---------- 2000s ----------
  chrome: { name: 'Liquid Chrome', look: 'amp', year: 2000, era: 'the custom-skin craze',
    preview: { desk: 'linear-gradient(135deg, #2a0f6b, #0d6fb8 60%, #7be0ff)', title: 'linear-gradient(#ffffff, #9ff9ff)', face: 'linear-gradient(160deg, #b9b4ff, #3a2a96 50%, #a59cf0)', lcd: '#5ff7ff', 'lcd-bg': '#05031a', radius: '8px' } },
  luna: { name: 'Luna Blue', look: 'luna', year: 2001, era: 'Windows XP',
    preview: { desk: 'linear-gradient(#4d95ea 62%, #57a832 62%)', title: 'linear-gradient(#0997ff, #0053ee)', face: '#ece9d8', lcd: '#36a2ff', 'lcd-bg': '#0e1629', radius: '4px 4px 0 0' } },
  graphite: { name: 'Graphite', look: 'amp', year: 2002, era: 'the v3 player',
    preview: { desk: 'linear-gradient(135deg, #1b2027, #2c3440)', title: 'repeating-linear-gradient(180deg, #5d9de0 0 1px, #1e2b3a 1px 2px)', face: 'linear-gradient(#4a525e, #262c34)', lcd: '#7fc4ff', 'lcd-bg': '#070b10', radius: '5px' } },
  brushed: { name: 'Brushed Metal', look: 'amp', year: 2003, era: 'the jukebox comes to Windows',
    preview: { desk: 'radial-gradient(#6a8fc8, #2f4f86)', title: 'linear-gradient(#e8e8e8, #b0b0b0)', face: 'linear-gradient(#dcdcdc, #a6a6a6)', lcd: '#263016', 'lcd-bg': '#dfe5c4', radius: '6px' } },
  royale: { name: 'Royale', look: 'luna', year: 2004, era: 'Media Center',
    preview: { desk: 'linear-gradient(#0b1a3a, #123f8a)', title: 'linear-gradient(#6f9ae8, #0a2f96)', face: '#ece9d8', lcd: '#36a2ff', 'lcd-bg': '#0e1629', radius: '4px 4px 0 0' } },
  noir: { name: 'Noir', look: 'luna', year: 2005, era: 'media-center black',
    preview: { desk: 'radial-gradient(ellipse at 50% 85%, #6a3a12, #0a0a0a 60%)', title: 'linear-gradient(#5a5a5a, #000)', face: '#2b2b2b', lcd: '#ff9a2e', 'lcd-bg': '#050302', radius: '4px 4px 0 0' } },
  mocha: { name: 'Mocha', look: 'luna', year: 2006, era: 'the brown portable',
    preview: { desk: 'linear-gradient(160deg, #3a2619, #5e4433)', title: 'linear-gradient(#a07e64, #3a2619)', face: '#f3ede6', lcd: '#4fd8d2', 'lcd-bg': '#20140c', radius: '4px 4px 0 0' } },
  aero: { name: 'Aero Glass', look: 'luna', year: 2007, era: 'Windows Vista',
    preview: { desk: 'linear-gradient(#021226, #0a3b6e)', title: 'linear-gradient(rgba(255,255,255,.6), rgba(150,190,230,.5))', face: 'rgba(150,190,230,.55)', lcd: '#3fa8ff', 'lcd-bg': '#000', radius: '4px 4px 0 0' } },
  stream: { name: 'Stream', look: 'luna', year: 2008, era: 'the first streaming app',
    preview: { desk: 'radial-gradient(#5a5a5a, #161616)', title: 'linear-gradient(#a6a6a6, #4a4a4a)', face: '#efefef', lcd: '#9fd42a', 'lcd-bg': '#2a2a2a', radius: '4px 4px 0 0' } },
  seven: { name: 'Seven', look: 'luna', year: 2009, era: 'Windows 7 superbar',
    preview: { desk: 'linear-gradient(160deg, #06306e, #1667cf)', title: 'linear-gradient(rgba(255,255,255,.6), rgba(140,190,240,.5))', face: 'rgba(140,190,240,.6)', lcd: '#3fa8ff', 'lcd-bg': '#000', radius: '4px 4px 0 0' } },

  // ---------- 2010s ----------
  metro: { name: 'Metro', look: 'modern', year: 2010, era: 'big lowercase type',
    lcd: text('300 18px "Segoe UI Light", "Segoe UI", system-ui, sans-serif'),
    preview: { desk: '#0d0d0d', title: '#111', face: '#111', lcd: '#e6007e', 'lcd-bg': '#000' } },
  pure: { name: 'Pure', look: 'modern', year: 2011, era: 'clean white web player',
    preview: { desk: 'linear-gradient(#e3eaf0, #cfd8e0)', title: '#fff', face: '#fff', lcd: '#008fd5', 'lcd-bg': '#eef2f5', radius: '2px' } },
  tiles: { name: 'Tiles', look: 'modern', year: 2012, era: 'Windows 8 live tiles',
    viz: smooth(10, 4),
    preview: { desk: '#3a0b5e', title: '#00a3a3', face: '#fff', lcd: '#fff', 'lcd-bg': '#00a3a3' } },
  flat: { name: 'Flat', look: 'modern', year: 2013, era: 'everything goes flat',
    lcd: text('300 15px "Helvetica Neue", -apple-system, system-ui, sans-serif'),
    preview: { desk: 'linear-gradient(160deg, #ff9a8b, #ff99ac)', title: '#fff', face: '#fafafa', lcd: '#ff2d55', 'lcd-bg': '#f2f2f7', radius: '6px' } },
  sdark: { name: 'Stream Dark', look: 'modern', year: 2014, era: 'dark mode + green',
    preview: { desk: '#121212', title: '#000', face: '#181818', lcd: '#1db954', 'lcd-bg': '#000' } },
  ten: { name: 'Ten', look: 'modern', year: 2015, era: 'Windows 10 dark',
    preview: { desk: 'linear-gradient(#001a33, #003a70)', title: '#1f1f1f', face: '#2b2b2b', lcd: '#0078d7', 'lcd-bg': '#141414' } },
  material: { name: 'Material', look: 'modern', year: 2016, era: 'paper and ink',
    lcd: text('500 14px Roboto, "Segoe UI", system-ui, sans-serif'),
    preview: { desk: 'linear-gradient(#ef6c00 40%, #eeeeee 40%)', title: '#ef6c00', face: '#fff', lcd: '#fff', 'lcd-bg': '#ef6c00', radius: '2px' } },
  acrylic: { name: 'Acrylic', look: 'modern', year: 2017, era: 'Fluent Design blur',
    preview: { desk: 'linear-gradient(135deg, #2b1055, #7597de)', title: 'rgba(242,242,242,.6)', face: 'rgba(242,242,242,.6)', lcd: '#5fb0ff', 'lcd-bg': 'rgba(0,0,0,.4)' } },
  vapor: { name: 'Vaporwave', look: 'chicago', year: 2018, era: 'ａｅｓｔｈｅｔｉｃ',
    preview: { desk: 'linear-gradient(#1c0638, #ff6ec7 60%, #2a0846 60%)', title: 'linear-gradient(90deg, #ff71ce, #01cdfe)', face: '#e9cfff', lcd: '#01cdfe' } },
  lofi: { name: 'Lofi Room', look: 'modern', year: 2019, era: 'beats to study to',
    preview: { desk: 'linear-gradient(#1d1b3a, #6b3f6b 70%, #c7746b)', title: '#241e38', face: '#2a2340', lcd: '#ffb26b', 'lcd-bg': '#120f22', radius: '6px' } },

  // ---------- 2020s ----------
  soft: { name: 'Soft UI', look: 'modern', year: 2020, era: 'neumorphism',
    preview: { desk: '#e0e5ec', title: '#e0e5ec', face: '#e0e5ec', lcd: '#6c63ff', 'lcd-bg': '#d4dae3', radius: '10px' } },
  mica: { name: 'Mica', look: 'modern', year: 2021, era: 'Windows 11',
    preview: { desk: 'radial-gradient(#2f7bea, #9cbfe9 70%)', title: 'rgba(243,243,243,.9)', face: 'rgba(243,243,243,.9)', lcd: '#5fb0ff', 'lcd-bg': '#1f1f1f', radius: '6px' } },
  y2k: { name: 'Y2K Revival', look: 'amp', year: 2022, era: 'chrome is back',
    preview: { desk: 'linear-gradient(135deg, #ff9ad5, #c5a3ff, #8fd8ff)', title: 'linear-gradient(#fff, #ff6fd8)', face: 'linear-gradient(160deg, #fff, #e9b8ff, #c9e8ff)', lcd: '#ff4fd8', 'lcd-bg': '#0b020b', radius: '10px' } },
  field: { name: 'Field Recorder', look: 'amp', year: 2023, era: 'pocket synth gear',
    preview: { desk: '#cfcbc2', title: '#e8e6e1', face: '#e8e6e1', lcd: '#ff5a1f', 'lcd-bg': '#0d0d0d', radius: '6px' } },
  dots: { name: 'Dot Matrix', look: 'modern', year: 2024, era: 'glyph-light minimalism',
    viz: smooth(4, 4),
    lcd: text('15px "Courier New", Menlo, monospace'),
    preview: { desk: 'radial-gradient(circle, rgba(255,255,255,.25) 1px, transparent 1.5px) 0 0 / 6px 6px, #000', title: '#0b0b0b', face: '#0b0b0b', lcd: '#ffffff', 'lcd-bg': '#000', radius: '8px' } },
  expressive: { name: 'Expressive', look: 'modern', year: 2025, era: 'bold shapes, pastel color',
    viz: smooth(8, 4),
    preview: { desk: '#fef7ff', title: '#f3edf7', face: '#eaddff', lcd: '#d0bcff', 'lcd-bg': '#21005d', radius: '14px' } },
  holo: { name: 'Holo', look: 'modern', year: 2026, era: 'iridescent glass',
    preview: { desk: 'linear-gradient(135deg, #0b0620, #1b1040, #061a2e)', title: 'linear-gradient(90deg, #ff8ce6, #7df9ff)', face: 'rgba(255,255,255,.15)', lcd: '#7df9ff', 'lcd-bg': 'rgba(0,0,0,.4)', radius: '12px' } },

  // ---------- Macintosh ----------
  system7: { name: 'System 7', look: 'mac', mac: 1991, era: '1-bit Macintosh',
    viz: smooth(4, 2),
    lcd: text('bold 13px Chicago, Charcoal, Geneva, sans-serif'),
    preview: { desk: 'repeating-conic-gradient(#000 0 25%, #fff 0 50%) 0 0 / 2px 2px', title: 'repeating-linear-gradient(#000 0 1px, #fff 1px 2px)', face: '#fff', lcd: '#000', 'lcd-bg': '#fff' } },
  platinum: { name: 'Platinum', look: 'mac', mac: 1999, era: 'Mac OS 9',
    preview: { desk: 'linear-gradient(#5c6bb3, #3d4a8f)', title: 'repeating-linear-gradient(#fff 0 1px, #b4b4b4 1px 2px)', face: '#dddddd', lcd: '#9cff6a', 'lcd-bg': '#142214' } },
  aqua: { name: 'Aqua', look: 'mac', mac: 2001, era: 'Mac OS X pinstripes',
    preview: { desk: 'radial-gradient(#6fb3ef, #123d82)', title: 'linear-gradient(#f2f2f2, #d4d4d4)', face: 'repeating-linear-gradient(#ececec 0 2px, #f7f7f7 2px 4px)', lcd: '#4a5a2a', 'lcd-bg': '#e9eed6', radius: '6px 6px 3px 3px' } },
  leopard: { name: 'Leopard', look: 'mac', mac: 2007, era: 'unified gray, glass Dock',
    preview: { desk: 'linear-gradient(#0b0a24, #2a1a5a)', title: 'linear-gradient(#e2e2e2, #b4b4b4)', face: '#e8e8e8', lcd: '#4a6a9a', 'lcd-bg': '#e6eef7', radius: '5px 5px 0 0' } },
  bigsur: { name: 'Big Sur', look: 'mac', mac: 2020, era: 'translucent and rounded',
    lcd: text('600 14px -apple-system, system-ui, sans-serif'),
    preview: { desk: 'linear-gradient(#f4a77a, #8a6fc4, #3a6fb0)', title: 'rgba(246,246,246,.9)', face: 'rgba(246,246,246,.9)', lcd: '#fa2d48', 'lcd-bg': '#1c1c1e', radius: '8px' } },
  glass: { name: 'Liquid Glass', look: 'mac', mac: 2025, era: 'everything is a lens',
    lcd: text('600 14px -apple-system, system-ui, sans-serif'),
    preview: { desk: 'linear-gradient(135deg, #ff6b9d, #5b8cff, #34d3a6)', title: 'rgba(255,255,255,.25)', face: 'rgba(255,255,255,.2)', lcd: '#fff', 'lcd-bg': 'rgba(0,0,0,.3)', radius: '14px' } },

  // ---------- Linux ----------
  xmms: { name: 'Penguin', look: 'amp', linux: 1999, era: 'XMMS-style Linux player',
    preview: { desk: 'radial-gradient(#262626, #0b0b0b)', title: 'linear-gradient(#5c5f5c, #3c3f3c)', face: 'linear-gradient(#5c5f5c, #353835)', lcd: '#3cf03c' } },

  // ---------- extras ----------
  olive: { name: 'Luna Olive', look: 'luna', era: 'XP olive green scheme',
    preview: { desk: 'linear-gradient(#4d95ea 62%, #57a832 62%)', title: 'linear-gradient(#d6e2b2, #8fa65e)', face: '#ece9d8', lcd: '#b8e05a', 'lcd-bg': '#1d2414', radius: '4px 4px 0 0' } },
  silver: { name: 'Luna Silver', look: 'luna', era: 'XP silver scheme',
    preview: { desk: 'linear-gradient(#4d95ea 62%, #57a832 62%)', title: 'linear-gradient(#ffffff, #bfc0ce)', face: '#ece9d8', lcd: '#dfe6ff', 'lcd-bg': '#20222a', radius: '4px 4px 0 0' } },
  phosphor: { name: 'Phosphor', look: 'chicago', secret: true, era: 'unlocked: ↑↑↓↓←→←→BA',
    preview: { desk: 'radial-gradient(#002a08, #000)', title: '#33ff66', face: '#001a00', lcd: '#33ff66' } },
};

const ids = Object.keys(SKINS);
const timeline = ids.filter(id => SKINS[id].year).sort((a, b) => SKINS[a].year - SKINS[b].year);
const decade = d => timeline.filter(id => Math.floor(SKINS[id].year / 10) * 10 === d);

export const TIMELINE = Object.fromEntries(timeline.map(id => [SKINS[id].year, id]));
export const YEARS = [SKINS[timeline[0]].year, SKINS[timeline.at(-1)].year];

export function skinGroups(unlocked) {
  return [
    ['1990s', decade(1990)],
    ['2000s', decade(2000)],
    ['2010s', decade(2010)],
    ['2020s', decade(2020)],
    ['Macintosh', ids.filter(id => SKINS[id].mac).sort((a, b) => SKINS[a].mac - SKINS[b].mac)],
    ['Linux', ids.filter(id => SKINS[id].linux)],
    ['Extras', ids.filter(id => !SKINS[id].year && !SKINS[id].mac && !SKINS[id].linux && (!SKINS[id].secret || unlocked))],
  ];
}

export const skinOrder = unlocked => skinGroups(unlocked).flatMap(([, list]) => list);

// The look's settings with the skin's own tweaks on top.
export function skinConfig(id) {
  const skin = SKINS[id];
  const look = LOOKS[skin.look];
  return { ...look, viz: { ...look.viz, ...skin.viz }, lcd: { ...look.lcd, ...skin.lcd } };
}
