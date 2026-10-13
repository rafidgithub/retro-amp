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
// inspo: what the skin is a tribute to, shown with its name so people can place it.
// os: key of OSES, for the Skins window filter.
// preview: colors for the little picture in the Skins window.
// viz / lcd: per-skin tweaks merged over the look's settings (viz.hidden: the layout has no visualizer).
export const SKINS = {
  // ---------- 1990s ----------
  progman: { name: 'Program Manager', look: 'chicago', inspo: 'Windows 3.0', os: 'windows', year: 1990, era: 'checkered desktop, navy title bars',
    preview: { desk: 'repeating-conic-gradient(#a9a9a9 0 25%, #b9b9b9 0 50%) 0 0 / 4px 4px', title: '#000080', face: '#c0c0c0', lcd: '#00ff00' } },
  workbench: { name: 'Workbench', look: 'chicago', inspo: 'Amiga Workbench', os: 'other', year: 1991, era: 'Amiga tracker days',
    preview: { desk: '#0055aa', title: '#ffffff', face: '#0055aa', lcd: '#ff8800' } },
  hotdog: { name: 'Hot Dog Stand', look: 'chicago', inspo: 'Windows 3.1 Hot Dog Stand', os: 'windows', year: 1992, era: 'the infamous color scheme',
    preview: { desk: '#ff0000', title: '#ff0000', face: '#ffff00', lcd: '#ff3b2f' } },
  next: { name: 'Black Cube', look: 'chicago', inspo: 'NeXTSTEP', os: 'other', year: 1993, era: 'the black workstation',
    preview: { desk: 'radial-gradient(#6a6a6a, #3c3c3c)', title: '#000', face: '#aaaaaa', lcd: '#ffffff' } },
  dos: { name: 'Text Mode', look: 'chicago', inspo: 'MS-DOS trackers', os: 'other', year: 1994, era: 'blue text-mode mod player',
    preview: { desk: '#000055', title: '#00aaaa', face: '#0000aa', lcd: '#55ff55' } },
  chicago: { name: 'Chicago 95', look: 'chicago', inspo: 'Windows 95', os: 'windows', year: 1995, era: 'the CD Player on a teal desktop',
    preview: { desk: '#008080', title: '#000080', face: '#c0c0c0', lcd: '#ffc21a' } },
  rainy: { name: 'Rainy Day', look: 'chicago', inspo: 'Windows 95 Plus!', os: 'windows', year: 1996, era: 'first MP3 players, rainy-day scheme',
    preview: { desk: 'linear-gradient(#3b4c60, #62788f)', title: 'linear-gradient(90deg, #3d4f63, #8aa1b9)', face: '#b6c0ca', lcd: '#7fe8ff' } },
  desert: { name: 'Desert', look: 'chicago', inspo: 'Windows 95 Desert scheme', os: 'windows', year: 1997, era: 'sandstone color scheme',
    preview: { desk: 'linear-gradient(#f6c77d, #db8f5c 60%, #b07f48 60%)', title: 'linear-gradient(90deg, #8a5a2b, #d6a66a)', face: '#d5ccbb', lcd: '#a6ff5c' } },
  amp: { name: 'Amp', look: 'amp', inspo: 'Winamp 2', os: 'windows', year: 1998, era: 'the classic MP3 player',
    preview: { desk: '#008080', title: 'repeating-linear-gradient(180deg, #d9c47d 0 1px, #3a3a52 1px 2px)', face: 'linear-gradient(#46465f, #26263a)', lcd: '#00e000' } },
  orbital: { name: 'Orbital', look: 'amp', inspo: 'Sonique', os: 'windows', year: 1999, era: 'organic, Y2K-ready player',
    preview: { desk: 'radial-gradient(circle at 30% 30%, #1f6f8b, #041219)', title: 'linear-gradient(#bff6ff, #3d8fa8)', face: 'radial-gradient(ellipse at 30% 0%, #9fd9e6, #155a70)', lcd: '#9ff3ff', 'lcd-bg': '#03161d', radius: '14px' } },

  // ---------- 2000s ----------
  chrome: { name: 'Liquid Chrome', look: 'amp', inspo: 'Winamp skins', os: 'windows', year: 2000, era: 'the custom-skin craze',
    preview: { desk: 'linear-gradient(135deg, #2a0f6b, #0d6fb8 60%, #7be0ff)', title: 'linear-gradient(#ffffff, #9ff9ff)', face: 'linear-gradient(160deg, #b9b4ff, #3a2a96 50%, #a59cf0)', lcd: '#5ff7ff', 'lcd-bg': '#05031a', radius: '8px' } },
  luna: { name: 'Luna Blue', look: 'luna', inspo: 'Windows XP', os: 'windows', year: 2001, era: 'blue taskbar, green Start button',
    preview: { desk: 'linear-gradient(#4d95ea 62%, #57a832 62%)', title: 'linear-gradient(#0997ff, #0053ee)', face: '#ece9d8', lcd: '#36a2ff', 'lcd-bg': '#0e1629', radius: '4px 4px 0 0' } },
  graphite: { name: 'Graphite', look: 'amp', inspo: 'Winamp 3', os: 'windows', year: 2002, era: 'the v3 player',
    preview: { desk: 'linear-gradient(135deg, #1b2027, #2c3440)', title: 'repeating-linear-gradient(180deg, #5d9de0 0 1px, #1e2b3a 1px 2px)', face: 'linear-gradient(#4a525e, #262c34)', lcd: '#7fc4ff', 'lcd-bg': '#070b10', radius: '5px' } },
  brushed: { name: 'Brushed Metal', look: 'amp', inspo: 'iTunes 4 for Windows', os: 'windows', year: 2003, era: 'the jukebox comes to Windows',
    preview: { desk: 'radial-gradient(#6a8fc8, #2f4f86)', title: 'linear-gradient(#e8e8e8, #b0b0b0)', face: 'linear-gradient(#dcdcdc, #a6a6a6)', lcd: '#263016', 'lcd-bg': '#dfe5c4', radius: '6px' } },
  royale: { name: 'Royale', look: 'luna', inspo: 'Windows XP Media Center', os: 'windows', year: 2004, era: 'the living-room PC',
    preview: { desk: 'linear-gradient(#0b1a3a, #123f8a)', title: 'linear-gradient(#6f9ae8, #0a2f96)', face: '#ece9d8', lcd: '#36a2ff', 'lcd-bg': '#0e1629', radius: '4px 4px 0 0' } },
  noir: { name: 'Noir', look: 'luna', inspo: 'Royale Noir theme', os: 'windows', year: 2005, era: 'media-center black',
    preview: { desk: 'radial-gradient(ellipse at 50% 85%, #6a3a12, #0a0a0a 60%)', title: 'linear-gradient(#5a5a5a, #000)', face: '#2b2b2b', lcd: '#ff9a2e', 'lcd-bg': '#050302', radius: '4px 4px 0 0' } },
  mocha: { name: 'Mocha', look: 'luna', inspo: 'Zune', os: 'windows', year: 2006, era: 'the brown portable',
    preview: { desk: 'linear-gradient(160deg, #3a2619, #5e4433)', title: 'linear-gradient(#a07e64, #3a2619)', face: '#f3ede6', lcd: '#4fd8d2', 'lcd-bg': '#20140c', radius: '4px 4px 0 0' } },
  aero: { name: 'Aero Glass', look: 'luna', inspo: 'Windows Vista', os: 'windows', year: 2007, era: 'glass and glow',
    preview: { desk: 'linear-gradient(#021226, #0a3b6e)', title: 'linear-gradient(rgba(255,255,255,.6), rgba(150,190,230,.5))', face: 'rgba(150,190,230,.55)', lcd: '#3fa8ff', 'lcd-bg': '#000', radius: '4px 4px 0 0' } },
  stream: { name: 'Stream', look: 'luna', inspo: 'Spotify', os: 'windows', year: 2008, era: 'the first streaming app',
    preview: { desk: 'radial-gradient(#5a5a5a, #161616)', title: 'linear-gradient(#a6a6a6, #4a4a4a)', face: '#efefef', lcd: '#9fd42a', 'lcd-bg': '#2a2a2a', radius: '4px 4px 0 0' } },
  seven: { name: 'Seven', look: 'luna', inspo: 'Windows 7', os: 'windows', year: 2009, era: 'the superbar',
    preview: { desk: 'linear-gradient(160deg, #06306e, #1667cf)', title: 'linear-gradient(rgba(255,255,255,.6), rgba(140,190,240,.5))', face: 'rgba(140,190,240,.6)', lcd: '#3fa8ff', 'lcd-bg': '#000', radius: '4px 4px 0 0' } },

  // ---------- 2010s ----------
  metro: { name: 'Metro', look: 'modern', inspo: 'Zune & Windows Phone 7', os: 'windows', year: 2010, era: 'big lowercase type',
    lcd: text('300 18px "Segoe UI Light", "Segoe UI", system-ui, sans-serif'),
    preview: { desk: '#0d0d0d', title: '#111', face: '#111', lcd: '#e6007e', 'lcd-bg': '#000' } },
  pure: { name: 'Pure', look: 'modern', inspo: 'Rdio', os: 'web', year: 2011, era: 'clean white web player',
    preview: { desk: 'linear-gradient(#e3eaf0, #cfd8e0)', title: '#fff', face: '#fff', lcd: '#008fd5', 'lcd-bg': '#eef2f5', radius: '2px' } },
  tiles: { name: 'Tiles', look: 'modern', inspo: 'Windows 8', os: 'windows', year: 2012, era: 'live tiles',
    viz: smooth(10, 4),
    preview: { desk: '#3a0b5e', title: '#00a3a3', face: '#fff', lcd: '#fff', 'lcd-bg': '#00a3a3' } },
  flat: { name: 'Flat', look: 'modern', inspo: 'iOS 7', os: 'ios', year: 2013, era: 'everything goes flat',
    lcd: text('300 15px "Helvetica Neue", -apple-system, system-ui, sans-serif'),
    preview: { desk: 'linear-gradient(160deg, #ff9a8b, #ff99ac)', title: '#fff', face: '#fafafa', lcd: '#ff2d55', 'lcd-bg': '#f2f2f7', radius: '6px' } },
  sdark: { name: 'Stream Dark', look: 'modern', inspo: 'Spotify', os: 'web', year: 2014, era: 'dark mode + green',
    preview: { desk: '#121212', title: '#000', face: '#181818', lcd: '#1db954', 'lcd-bg': '#000' } },
  ten: { name: 'Ten', look: 'modern', inspo: 'Windows 10', os: 'windows', year: 2015, era: 'dark mode, accent frames',
    preview: { desk: 'linear-gradient(#001a33, #003a70)', title: '#1f1f1f', face: '#2b2b2b', lcd: '#0078d7', 'lcd-bg': '#141414' } },
  material: { name: 'Material', look: 'modern', inspo: 'Android Material Design', os: 'android', year: 2016, era: 'paper and ink',
    lcd: text('500 14px Roboto, "Segoe UI", system-ui, sans-serif'),
    preview: { desk: 'linear-gradient(#ef6c00 40%, #eeeeee 40%)', title: '#ef6c00', face: '#fff', lcd: '#fff', 'lcd-bg': '#ef6c00', radius: '2px' } },
  acrylic: { name: 'Acrylic', look: 'modern', inspo: 'Windows 10 Fluent Design', os: 'windows', year: 2017, era: 'frosted acrylic blur',
    preview: { desk: 'linear-gradient(135deg, #2b1055, #7597de)', title: 'rgba(242,242,242,.6)', face: 'rgba(242,242,242,.6)', lcd: '#5fb0ff', 'lcd-bg': 'rgba(0,0,0,.4)' } },
  vapor: { name: 'Vaporwave', look: 'chicago', inspo: 'Windows 95 vaporwave art', os: 'windows', year: 2018, era: 'ａｅｓｔｈｅｔｉｃ',
    preview: { desk: 'linear-gradient(#1c0638, #ff6ec7 60%, #2a0846 60%)', title: 'linear-gradient(90deg, #ff71ce, #01cdfe)', face: '#e9cfff', lcd: '#01cdfe' } },
  lofi: { name: 'Lofi Room', look: 'modern', inspo: 'lofi hip hop radio', os: 'web', year: 2019, era: 'beats to study to',
    preview: { desk: 'linear-gradient(#1d1b3a, #6b3f6b 70%, #c7746b)', title: '#241e38', face: '#2a2340', lcd: '#ffb26b', 'lcd-bg': '#120f22', radius: '6px' } },

  // ---------- 2020s ----------
  soft: { name: 'Soft UI', look: 'modern', inspo: 'neumorphism', os: 'other', year: 2020, era: 'extruded soft shadows',
    preview: { desk: '#e0e5ec', title: '#e0e5ec', face: '#e0e5ec', lcd: '#6c63ff', 'lcd-bg': '#d4dae3', radius: '10px' } },
  mica: { name: 'Mica', look: 'modern', inspo: 'Windows 11', os: 'windows', year: 2021, era: 'rounded corners, centered taskbar',
    preview: { desk: 'radial-gradient(#2f7bea, #9cbfe9 70%)', title: 'rgba(243,243,243,.9)', face: 'rgba(243,243,243,.9)', lcd: '#5fb0ff', 'lcd-bg': '#1f1f1f', radius: '6px' } },
  y2k: { name: 'Y2K Revival', look: 'amp', inspo: 'early-2000s chrome', os: 'other', year: 2022, era: 'chrome is back',
    preview: { desk: 'linear-gradient(135deg, #ff9ad5, #c5a3ff, #8fd8ff)', title: 'linear-gradient(#fff, #ff6fd8)', face: 'linear-gradient(160deg, #fff, #e9b8ff, #c9e8ff)', lcd: '#ff4fd8', 'lcd-bg': '#0b020b', radius: '10px' } },
  field: { name: 'Field Recorder', look: 'amp', inspo: 'Teenage Engineering OP-1', os: 'other', year: 2023, era: 'pocket synth gear',
    preview: { desk: '#cfcbc2', title: '#e8e6e1', face: '#e8e6e1', lcd: '#ff5a1f', 'lcd-bg': '#0d0d0d', radius: '6px' } },
  dots: { name: 'Dot Matrix', look: 'modern', inspo: 'Nothing Phone', os: 'android', year: 2024, era: 'glyph-light minimalism',
    viz: smooth(4, 4),
    lcd: text('15px "Courier New", Menlo, monospace'),
    preview: { desk: 'radial-gradient(circle, rgba(255,255,255,.25) 1px, transparent 1.5px) 0 0 / 6px 6px, #000', title: '#0b0b0b', face: '#0b0b0b', lcd: '#ffffff', 'lcd-bg': '#000', radius: '8px' } },
  expressive: { name: 'Expressive', look: 'modern', inspo: 'Material 3 Expressive', os: 'android', year: 2025, era: 'bold shapes, pastel color',
    viz: smooth(8, 4),
    preview: { desk: '#fef7ff', title: '#f3edf7', face: '#eaddff', lcd: '#d0bcff', 'lcd-bg': '#21005d', radius: '14px' } },
  holo: { name: 'Holo', look: 'modern', inspo: 'holographic concept UIs', os: 'other', year: 2026, era: 'iridescent glass',
    preview: { desk: 'linear-gradient(135deg, #0b0620, #1b1040, #061a2e)', title: 'linear-gradient(90deg, #ff8ce6, #7df9ff)', face: 'rgba(255,255,255,.15)', lcd: '#7df9ff', 'lcd-bg': 'rgba(0,0,0,.4)', radius: '12px' } },

  // ---------- Apple (mac: year) ----------
  system7: { name: 'System 7', look: 'mac', inspo: 'Mac System 7', os: 'mac', mac: 1991, era: '1-bit Macintosh',
    viz: smooth(4, 2),
    lcd: text('bold 13px Chicago, Charcoal, Geneva, sans-serif'),
    preview: { desk: 'repeating-conic-gradient(#000 0 25%, #fff 0 50%) 0 0 / 2px 2px', title: 'repeating-linear-gradient(#000 0 1px, #fff 1px 2px)', face: '#fff', lcd: '#000', 'lcd-bg': '#fff' } },
  platinum: { name: 'Platinum', look: 'mac', inspo: 'Mac OS 9', os: 'mac', mac: 1999, era: 'Platinum gray bevels',
    preview: { desk: 'linear-gradient(#5c6bb3, #3d4a8f)', title: 'repeating-linear-gradient(#fff 0 1px, #b4b4b4 1px 2px)', face: '#dddddd', lcd: '#9cff6a', 'lcd-bg': '#142214' } },
  aqua: { name: 'Aqua', look: 'mac', inspo: 'Mac OS X 10.0', os: 'mac', mac: 2001, era: 'pinstripes and gel buttons',
    preview: { desk: 'radial-gradient(#6fb3ef, #123d82)', title: 'linear-gradient(#f2f2f2, #d4d4d4)', face: 'repeating-linear-gradient(#ececec 0 2px, #f7f7f7 2px 4px)', lcd: '#4a5a2a', 'lcd-bg': '#e9eed6', radius: '6px 6px 3px 3px' } },
  pod: { name: 'Scroll Wheel', look: 'mac', inspo: 'iPod (2001)', os: 'other', mac: 2001, era: 'white plastic, gray LCD, a wheel to spin',
    viz: { hidden: true },
    lcd: { ...text('bold 12px Chicago, Charcoal, Geneva, sans-serif'), glow: false },
    preview: { desk: 'radial-gradient(#fff, #d9d9d9)', title: '#fdfdfd', face: 'linear-gradient(#fff, #e9e9e9)', lcd: '#2b2b2b', 'lcd-bg': '#cfd0ca', radius: '10px' } },
  leopard: { name: 'Leopard', look: 'mac', inspo: 'Mac OS X Leopard', os: 'mac', mac: 2007, era: 'unified gray, glass Dock',
    preview: { desk: 'linear-gradient(#0b0a24, #2a1a5a)', title: 'linear-gradient(#e2e2e2, #b4b4b4)', face: '#e8e8e8', lcd: '#4a6a9a', 'lcd-bg': '#e6eef7', radius: '5px 5px 0 0' } },
  library: { name: 'Library', look: 'mac', inspo: 'iTunes 8', os: 'mac', mac: 2008, era: 'gray chrome, LCD up top',
    preview: { desk: 'linear-gradient(#000 58%, #262626 58%, #000)', title: 'linear-gradient(#e6e6e6, #bcbcbc)', face: 'linear-gradient(#cdcdcd, #a2a2a2)', lcd: '#3a3a3a', 'lcd-bg': '#eef0e6', radius: '5px 5px 0 0' } },
  slate: { name: 'Slate', look: 'mac', inspo: 'iPad iPod app', os: 'ios', mac: 2010, era: 'glossy tablet music app',
    viz: { hidden: true },
    lcd: text('bold 14px "Helvetica Neue", Helvetica, Arial, sans-serif'),
    preview: { desk: 'repeating-linear-gradient(90deg, rgba(0,0,0,.12) 0 1px, transparent 1px 3px), #5b5f66', title: 'linear-gradient(#b0bccd, #6d84a2)', face: 'linear-gradient(#eef0f2, #b4b9bf)', lcd: '#9ccbff', 'lcd-bg': '#000', radius: '6px' } },
  bigsur: { name: 'Big Sur', look: 'mac', inspo: 'macOS Big Sur', os: 'mac', mac: 2020, era: 'translucent and rounded',
    lcd: text('600 14px -apple-system, system-ui, sans-serif'),
    preview: { desk: 'linear-gradient(#f4a77a, #8a6fc4, #3a6fb0)', title: 'rgba(246,246,246,.9)', face: 'rgba(246,246,246,.9)', lcd: '#fa2d48', 'lcd-bg': '#1c1c1e', radius: '8px' } },
  glass: { name: 'Liquid Glass', look: 'mac', inspo: 'Apple Liquid Glass', os: 'mac', mac: 2025, era: 'everything is a lens',
    lcd: text('600 14px -apple-system, system-ui, sans-serif'),
    preview: { desk: 'linear-gradient(135deg, #ff6b9d, #5b8cff, #34d3a6)', title: 'rgba(255,255,255,.25)', face: 'rgba(255,255,255,.2)', lcd: '#fff', 'lcd-bg': 'rgba(0,0,0,.3)', radius: '14px' } },

  // ---------- classic hardware (hw: year) ----------
  turntable: { name: 'Turntable', look: 'modern', inspo: 'Technics SL-1200 (1972)', os: 'other', hw: 1972, era: 'vinyl, a tonearm and 33⅓ rpm',
    viz: { hidden: true },
    lcd: { ...text('bold 12px "Helvetica Neue", Arial, sans-serif'), cssW: 54, cssH: 18, glow: false },
    preview: { desk: 'repeating-linear-gradient(90deg, #5a3a22 0 6px, #6b4529 6px 9px)', title: '#2a2a2a', face: 'radial-gradient(circle at 40% 55%, #111 0 30%, #c9c9c9 31%)', lcd: '#1b1b1b', 'lcd-bg': '#bdbdbd', radius: '4px' } },
  walkman: { name: 'Personal Stereo', look: 'modern', inspo: 'Sony Walkman (1979)', os: 'other', hw: 1979, era: 'a cassette on your belt, two headphone jacks',
    viz: { hidden: true },
    lcd: { ...text('bold 13px "Courier New", Courier, monospace'), cssW: 58, cssH: 18, glow: false },
    preview: { desk: 'radial-gradient(circle, #ff6ec7 0 3px, transparent 4px) 0 0 / 18px 18px, #fbe3c4', title: 'repeating-linear-gradient(180deg, #e6e6e6 0 1px, #bdbdbd 1px 2px)', face: 'linear-gradient(#cfd4da 45%, #2c5aa0 45%)', lcd: '#3b2a1e', 'lcd-bg': '#f3ead2', radius: '8px' } },
  boombox: { name: 'Boombox', look: 'modern', inspo: '1980s boombox (JVC RC-M90)', os: 'other', hw: 1981, era: 'two speakers, a tape deck and a handle',
    viz: { pixel: false, bar: 5, gap: 2, reflect: false },
    lcd: { ...text('bold 13px "Courier New", Courier, monospace'), cssW: 58, cssH: 18 },
    preview: { desk: 'linear-gradient(0deg, #6e2c1f 2px, transparent 2px) 0 0 / 30px 12px, #9b4a35', title: 'linear-gradient(#e8e8e8, #8f8f8f)', face: 'radial-gradient(circle at 18% 55%, #222 0 22%, transparent 23%), radial-gradient(circle at 82% 55%, #222 0 22%, transparent 23%), linear-gradient(#d9d9d9, #9a9a9a)', lcd: '#ff3b2f', 'lcd-bg': '#0b0b0b', radius: '6px' } },
  discman: { name: 'Anti-Skip', look: 'modern', inspo: 'Sony Discman (1984)', os: 'other', hw: 1984, era: 'a spinning CD and a 7-segment LCD',
    viz: { hidden: true },
    lcd: { seg: true, w: 7, h: 13, t: 2, gap: 2, scale: 2 },
    preview: { desk: 'linear-gradient(135deg, #2bc4c4, #6a3fb5)', title: '#3a3d42', face: 'radial-gradient(circle at 50% 45%, #fff 0 8%, #c9d7ff 9%, #ffd1f0 20%, #c8fff3 30%, #9aa3ad 31% 36%, #5d636b 37%)', lcd: '#1c2a1c', 'lcd-bg': '#a9b89a', radius: '18px' } },

  // ---------- Linux ----------
  xmms: { name: 'Penguin', look: 'amp', inspo: 'XMMS', os: 'linux', linux: 1999, era: 'the 1999 Linux MP3 player',
    preview: { desk: 'radial-gradient(#262626, #0b0b0b)', title: 'linear-gradient(#5c5f5c, #3c3f3c)', face: 'linear-gradient(#5c5f5c, #353835)', lcd: '#3cf03c' } },

  // ---------- extras ----------
  olive: { name: 'Luna Olive', look: 'luna', inspo: 'Windows XP Olive Green', os: 'windows', era: 'the olive green scheme',
    preview: { desk: 'linear-gradient(#4d95ea 62%, #57a832 62%)', title: 'linear-gradient(#d6e2b2, #8fa65e)', face: '#ece9d8', lcd: '#b8e05a', 'lcd-bg': '#1d2414', radius: '4px 4px 0 0' } },
  silver: { name: 'Luna Silver', look: 'luna', inspo: 'Windows XP Silver', os: 'windows', era: 'the silver scheme',
    preview: { desk: 'linear-gradient(#4d95ea 62%, #57a832 62%)', title: 'linear-gradient(#ffffff, #bfc0ce)', face: '#ece9d8', lcd: '#dfe6ff', 'lcd-bg': '#20222a', radius: '4px 4px 0 0' } },
  waveform: { name: 'Waveform', look: 'modern', inspo: 'SoundCloud', os: 'web', era: 'orange waveforms on the web',
    viz: { ...smooth(1, 0), wave: true },
    lcd: { ...text('bold 11px "Lucida Grande", "Helvetica Neue", Helvetica, Arial, sans-serif'), cssW: 44, cssH: 16, glow: false },
    preview: { desk: '#e5e5e5', title: 'linear-gradient(#ff7700, #ff3a00)', face: '#fff', lcd: '#ff5500', 'lcd-bg': '#fff', radius: '3px' } },
  mce: { name: 'Ten Foot', look: 'luna', inspo: 'Windows 7 Media Center', os: 'windows', era: 'big type and blue glow, made for the couch',
    lcd: { ...text('15px "Segoe UI", Tahoma, sans-serif'), glow: false },
    preview: { desk: 'linear-gradient(165deg, #0b3a7e 40%, #2a6fc0 48%, #072a62 56%, #031634)', title: 'linear-gradient(#2a5aa0, #0d3a7a)', face: 'linear-gradient(#0d3f86, #04193e)', lcd: '#9fdcff', 'lcd-bg': '#06224f', radius: '4px 4px 0 0' } },
  moviemaker: { name: 'Storyboard', look: 'luna', inspo: 'Windows Movie Maker 2', os: 'windows', era: 'task pane, preview monitor, timeline',
    preview: { desk: 'linear-gradient(#4d95ea 62%, #57a832 62%)', title: 'linear-gradient(#0997ff, #0053ee)', face: 'linear-gradient(90deg, #6f8fe0 0 30%, #ece9d8 30%)', lcd: '#36a2ff', 'lcd-bg': '#000', radius: '4px 4px 0 0' } },
  phosphor: { name: 'Phosphor', look: 'chicago', inspo: 'green-screen terminals', os: 'other', secret: true, era: 'unlocked: ↑↑↓↓←→←→BA',
    preview: { desk: 'radial-gradient(#002a08, #000)', title: '#33ff66', face: '#001a00', lcd: '#33ff66' } },
};

// The Skins window's OS filter, in menu order.
export const OSES = { windows: 'Windows', mac: 'Mac', ios: 'iOS', android: 'Android', linux: 'Linux', web: 'Web', other: 'Other' };

// The year on a skin's card: its timeline slot, or its Apple / Linux / hardware year.
export const skinYear = id => SKINS[id].year || SKINS[id].mac || SKINS[id].linux || SKINS[id].hw || '';

// Everything the Skins window search box looks through.
export function skinSearchText(id) {
  const s = SKINS[id];
  return [s.name, s.inspo, s.era, OSES[s.os], skinYear(id)].join(' ').toLowerCase();
}

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
    ['Apple', ids.filter(id => SKINS[id].mac).sort((a, b) => SKINS[a].mac - SKINS[b].mac)],
    ['Players', ids.filter(id => SKINS[id].hw).sort((a, b) => SKINS[a].hw - SKINS[b].hw)],
    ['Linux', ids.filter(id => SKINS[id].linux)],
    ['Extras', ids.filter(id => !skinYear(id) && (!SKINS[id].secret || unlocked))],
  ];
}

export const skinOrder = unlocked => skinGroups(unlocked).flatMap(([, list]) => list);

// The look's settings with the skin's own tweaks on top.
export function skinConfig(id) {
  const skin = SKINS[id];
  const look = LOOKS[skin.look];
  return { ...look, viz: { ...look.viz, ...skin.viz }, lcd: { ...look.lcd, ...skin.lcd } };
}
