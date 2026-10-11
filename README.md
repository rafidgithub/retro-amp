# RetroAmp

**New music, old pixels.** RetroAmp is a desktop-in-a-browser that plays YouTube and your own audio files through 37 years of music-player looks, from Windows 3.0 to 2026. It comes with classic games, a retro camera and a period web browser, all in plain HTML, CSS and JavaScript: no framework, no build step, no runtime dependencies.

Made by [Rafid Khan](https://rafidkhan.github.io/).

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Deploy to Vercel](#deploy-to-vercel)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Modules](#modules): [Games](#games) · [Camera](#camera) · [Internet](#internet)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [Extending RetroAmp](#extending-retroamp)
- [Known limitations](#known-limitations)
- [Security and privacy](#security-and-privacy)
- [Credits](#credits)

## Features

**Player**
- Search YouTube (with suggestions and recent searches), or paste a video or playlist link (first 100 tracks of a playlist).
- Play your own audio files (MP3, M4A, OGG, FLAC, WAV…): open them or drop them on the desktop. They play in the browser with a real spectrum analyzer.
- 10-band equalizer with preamp, presets, Auto headroom and a live response curve (press **G**). It shapes your own files; no web page can process YouTube's audio.
- Spectrum analyzer and oscilloscope, 7-segment clock (blinks when paused), scrolling title marquee.
- Drag to reorder the playlist; the mouse wheel over the player changes volume.
- Sleep timer (Play › Sleep timer): fades the music out over 30 seconds, then dims the desktop.

**Time machine**
- One skin per year from 1990 to 2026, plus 6 Macintosh skins, a Linux one and a couple of extras.
- Drag the year slider in the **Skins** window, press **K** to flip through them, or pick one from View › Skin. Skins cross-fade (instantly with reduced motion).
- Five layouts underneath: the 1998 metal player, Win9x windows, the XP-style media player, flat 2010s+ and Mac (menu bar on top, Dock at the bottom).

**Desktop**
- Draggable windows that snap and dock together; drag, shade or minimize the player and docked windows follow.
- Desktop icons, taskbar, Start menu, caption-zoom animation, retro tooltips and window shade (double-click a title bar).
- [Games](#games), a [retro camera with a photo gallery](#camera) and a [period web browser](#internet), each styled by the current skin.
- Easter eggs: try the Konami code.
- Playlist, skin, volume and window layout are saved in your browser. No API key, no sign-in.

### The timeline

| Years | Skins |
| --- | --- |
| 1990–1999 | Program Manager, Workbench, Hot Dog Stand, Black Cube, Text Mode, Chicago 95, Rainy Day, Desert, Amp, Orbital |
| 2000–2009 | Liquid Chrome, Luna Blue, Graphite, Brushed Metal, Royale, Noir, Mocha, Aero Glass, Stream, Seven |
| 2010–2019 | Metro, Pure, Tiles, Flat, Stream Dark, Ten, Material, Acrylic, Vaporwave, Lofi Room |
| 2020–2026 | Soft UI, Mica, Y2K Revival, Field Recorder, Dot Matrix, Expressive, Holo |
| Macintosh | System 7, Platinum, Aqua, Leopard, Big Sur, Liquid Glass |
| Linux | Penguin (XMMS-style, 1999) |
| Extras | Luna Olive, Luna Silver |

The skins are tributes drawn with CSS and inline SVG: no copied artwork, logos, sounds or system files.

## Quick start

Requires **Node.js 18+**.

```bash
./start.sh         # starts the server and opens http://localhost:3000
./start.sh 8080    # try another port first
npm start          # same server, no browser auto-open
npm run dev        # restarts the server when server code changes
```

`start.sh` checks your Node version, moves to the next port if 3000 is taken, and just opens the browser if RetroAmp is already running. Press Ctrl+C to stop.

Opening `index.html` straight from disk won't work: the YouTube player refuses `file://` pages, and `api/yt.js` needs a server.

## Deploy to Vercel

Works as-is: static files plus one serverless function (`api/yt.js`). `server.js`, `start.sh` and `CLAUDE.md` are local-only (`.vercelignore`).

```bash
npx vercel login   # once
npx vercel         # preview URL
npx vercel --prod  # production URL
```

Or push the repository to GitHub and import it at [vercel.com/new](https://vercel.com/new); there are no settings to change. Use the HTTPS preview URL to try the camera on a phone.

## Keyboard shortcuts

**Player** (anywhere, unless a game or text field has focus)

| Key | Action |
| --- | --- |
| X / Space | Play |
| C | Pause |
| V | Stop |
| Z / B | Previous / Next |
| L | Add from YouTube |
| O | Open local audio files |
| G | Equalizer |
| S / R | Shuffle / Repeat |
| K | Next skin |
| ← → | Seek 5 s |
| ↑ ↓ | Volume |
| Del | Remove selected tracks |
| ? | Shortcuts |

**Games:** F2 starts a new game; arrows and Space go to the focused game. **Camera:** Space takes a photo, ← → change the filter, Esc closes.

**Internet** (while its window is focused)

| Key | Action |
| --- | --- |
| F5 / Ctrl+R | Refresh the page (not RetroAmp) |
| Alt+← / Alt+→ | Back / Forward (⌘[ / ⌘] on a Mac) |
| Alt+Home | Home page |
| Ctrl+L / Alt+D / F6 | Go to the address bar |
| Esc | Stop |
| G H R B F Q | Go, Home, Reload, Back, Forward, Quit (text-mode skins only) |

## Modules

### Games

A **Games** folder sits on the desktop (also under Start › Games) with five classics. Each opens in its own window and picks up the current skin's window frame.

- *Minesweeper* (Windows 3.1): Beginner, Intermediate and Expert, ? marks, chording, best times.
- *Solitaire* (Windows 3.0): Klondike, Draw One or Draw Three, Windows scoring, undo, and the bouncing-cards finale.
- *Snake* (late-90s phone): nine speeds, walls on or off, bonus bugs.
- *Blocks* (Game Boy): falling blocks in four shades of green, ghost piece, hard drop.
- *Bricks* (1976 arcade): rainbow wall, mouse or keyboard paddle.

While a game window is focused, arrow keys and Space go to the game instead of the player, and the music keeps playing. Action games pause when their window loses focus. Best scores are saved in this browser. On touch screens the games show on-screen buttons.

Each game is `js/games/<id>.js` plus `css/games/<id>.css`, loaded the first time it opens. `js/games/index.js` holds the shared plumbing: the folder, menus, message box, keyboard routing and score storage.

### Camera

**Camera** and **Gallery** sit on the desktop and in the Start menu. On a PC the Camera uses your webcam; on a phone it starts with the front camera.

- **Checks first.** Opening the Camera looks for a camera before asking for permission. With none it says *No camera found* and tries again by itself when a webcam is plugged in. Blocked permission, a camera busy in another app, an unplugged camera and non-HTTPS pages each get their own message and a Retry button.
- **Front / back.** The Switch button appears only when the device has more than one camera. Phones flip between front and back; PCs with several webcams step through them. The last side you used is remembered.
- **Filters, live.** The preview runs through the filter, so the photo looks exactly like the viewfinder: Plain, Pocket Cam (4 greens, 1998), CGA (1981), 16 Colors (1987), 1-Bit (1984, Atkinson dither), Green Screen (1977 monitor), Camcorder (1989 tape, date stamp), Silent Film (1920s), Instant (1972, square with a white frame) and Disposable (1995, light leak and date stamp). Pixel-art filters save crisp PNGs scaled up from their native resolution; the others save full-size JPEGs.
- **Shutter:** the red button or Space. The speaker in the viewfinder turns the shutter sound off.
- **Gallery:** thumbnails, newest first. Double-click (tap on phones) to view; ← → step through photos, Del deletes (after a confirm), Esc goes back. **Save** downloads the photo on a PC and opens the share sheet on a phone.
- The camera only runs while the Camera window is open and the tab is visible. Closing or minimizing the window, or switching tabs, turns it off.

`js/camera/index.js` adds the icons and loads `app.js` (windows), `filters.js` and `store.js` the first time either window opens.

### Internet

**Internet** (desktop and Start menu) is a nostalgic web browser. It isn't a real browser: it shows google.com, and only google.com, inside the window. Everything around the page changes with the skin's year, including how loading looks and feels.

| Skins | Browser chrome |
| --- | --- |
| 1990–1993, System 7 | Text buttons, *Title* and *URL* fields, a spinning globe, a gray page that paints in from the top |
| Text Mode | All characters: `[Back] [Forward]`, *URL to open:*, a `\|/-\` spinner and a command line |
| 1995–1997, Vaporwave, Penguin | Big beveled buttons, *Location:* (turns into *Go to:* while you type), a night-sky throbber with shooting stars, a key icon and progress bar in the status bar |
| 1998–2000, Platinum, Y2K Revival, Field Recorder | Coolbar with grippers, gray icons that light up on hover, *Address … Go*, a globe with an orbiting satellite, segmented progress and an *Internet* zone |
| 2001–2006, Luna Olive, Luna Silver | Green round Back/Forward buttons, a small throbber by the menus, green block progress |
| 2007–2009 | Glass orbs, refresh/stop inside the address bar, a search box and a tab with a dotted spinner |
| Aqua, Leopard | Capsule Back/Forward and the blue progress fill inside the address bar |
| 2010–2019 | Tabs on top, round icon buttons, an omnibox with a padlock, a spinner that turns backwards while waiting, a status bubble |
| 2020–2026, Big Sur, Liquid Glass | Pill-shaped omnibox, rounded tab and a thin progress line |

- **Browse:** search from the address bar (or type a google.com address), use Google's own search box, click around Google. Back, Forward, Refresh, Stop and Home work like they used to; clicking the throbber goes home too. Maximize with the title-bar button or a double-click, and resize from the bottom-right grip.
- **Google only.** Links that leave google.com open an error page in the style of the year (*The page cannot be displayed*, *ERR_BLOCKED_BY_CSP*…) with Back and *Search Google for it* buttons. A non-Google address typed in the address bar becomes a Google search.
- **No history, no downloads.** Nothing you visit is stored, downloads and new windows are switched off, and closing the window forgets everything. `about:` (or Help › About) explains this inside the browser.

`js/browser/index.js` builds the window, the era table, the throbbers and the history handling; `css/browser/index.css` holds one block per era.

## Project structure

```
.
├── index.html              Desktop markup, window templates, icon sprite, CSP
├── api/
│   └── yt.js               Serverless function: YouTube search, playlist import, video lookup
├── assets/                 App icon and the self-hosted Silkscreen pixel font (OFL)
├── css/
│   ├── base.css            Structure shared by every look
│   ├── looks/              Window chrome per look: classic, amp, media, luna, modern, mac
│   ├── skins/              One block of color variables per skin (classic.css, media.css)
│   ├── games/              Games folder (index.css) and one stylesheet per game
│   ├── camera/             Camera and Gallery windows
│   └── browser/            Internet window, one block per browser era
├── js/
│   ├── boot.js             Applies the saved skin before first paint (classic script)
│   ├── main.js             App entry: player, playlist, desktop, menus, Skins window, keyboard
│   ├── core/               Shared building blocks
│   │   ├── util.js         DOM helpers, storage, YouTube URL parsing
│   │   ├── wm.js           Window manager: focus, drag, snap, dock, shade, taskbar
│   │   ├── menu.js         Cascading menus for menu bars, title-bar icons and right-click
│   │   ├── listview.js     Playlist and search-result list view
│   │   └── skins.js        Skin catalog: looks, skins, years, previews
│   ├── player/
│   │   ├── yt.js           Official YouTube IFrame player (youtube-nocookie.com host)
│   │   ├── local.js        Local files: Web Audio playback, preamp + 10-band EQ, analyser
│   │   └── viz.js          Visualizer, 7-segment clock, TV static
│   ├── games/              index.js (folder, menus, scores), common.js, one module per game
│   ├── camera/             index.js (icons, lazy loader), app.js, filters.js, store.js
│   └── browser/            index.js: the Internet window
├── server.js               Local dev server mirroring Vercel (static files + api/), zero dependencies
├── start.sh                Starts server.js and opens the browser
├── vercel.json             Security headers on Vercel (kept identical to server.js)
└── package.json            Scripts and Node version
```

## How it works

**Skins.** Three attributes on `<html>` drive every pixel: `data-family` (`classic` or `media`) picks the shared layout, `data-look` (`amp`, `chicago`, `luna`, `modern`, `mac`) picks the window chrome in `css/looks/`, and `data-skin` picks the colors in `css/skins/`. Looks expose CSS variables; skins only override variables. `js/boot.js` restores the saved skin before first paint so the page never flashes the default.

**Windows.** Every window is a `section.win` registered with `js/core/wm.js`, which handles focus, z-order, dragging with edge snapping and Winamp-style docking, minimize/restore with a caption-zoom animation, and the taskbar. On phones the windows stack in a scrolling column and dialogs fill the screen.

**Modules.** Games, Camera and Internet are self-contained: each `js/<module>/index.js` registers its windows with the window manager, adds its own desktop icon and Start-menu entry, and loads heavier code on first open. `index.html` includes one module script and one stylesheet per module.

**Storage.** Player state lives in `localStorage` under `retroamp:v1`, game scores under `retroamp:games`, camera settings under `retroamp:camera` and photos in the IndexedDB database `retroamp-camera`. Every storage access is wrapped so the app keeps working when storage is blocked.

**YouTube.** Playback uses the official IFrame player. Search and playlist import go through `api/yt.js`, which reads public YouTube pages server-side because browsers can't (CORS).

**The Internet window.** Google allows itself to be framed when the URL carries `igu=1`, so the page is `https://www.google.com/…?igu=1` in a sandboxed iframe. A page can't read a cross-origin frame's address or title, so the address bar shows the last address you entered. Back and Forward walk the tab's own history, which includes the frame's navigations; a sentinel history entry, pushed when the window first opens, turns any overshoot into a harmless same-page step. Links that leave Google are blocked by the CSP `frame-src`, and the resulting `securitypolicyviolation` event names the host for the error page.

## Extending RetroAmp

### Adding a skin

1. Add an entry to `SKINS` in `js/core/skins.js`: pick a `look` (`amp`, `chicago`, `luna`, `modern` or `mac`), give it a free `year` (or `mac: <year>` / `linux: <year>`), an `era` line and `preview` colors.
2. Add a `[data-skin=yourid] { … }` block to `css/skins/classic.css` or `css/skins/media.css` that overrides the look's variables (each look file lists them at the top).
3. Optionally map it to a browser era in `eraFor()` in `js/browser/index.js` (by default the year decides).

### Adding a module

1. Create `js/<name>/index.js` and `css/<name>/index.css`, and add them to `index.html` after the existing modules.
2. Build windows with `h()` from `js/core/util.js` (never `innerHTML` with user or network text), register them with `wm.register()`, and style them for every look and for phones.
3. Add your desktop icon and Start-menu entry from the module itself, the way `js/games/index.js` does.
4. If the module talks to a new origin, add it to the CSP in `index.html` and document it under [Security and privacy](#security-and-privacy).

## Known limitations

- **YouTube's audio is sealed off.** It plays inside YouTube's own iframe, which no web page can read or process. For YouTube tracks the visualizer is synthesized from playback time and a per-track tempo, and the EQ doesn't apply. Your own files get the real spectrum and the EQ.
- **Local files are session-only.** They play from memory and drop out of the playlist on reload; YouTube tracks are kept.
- **Some videos won't play.** Owners can block embedding (often official label videos). RetroAmp marks those tracks and skips to the next one. "Official Audio" or "Topic" uploads usually work.
- **Search scrapes YouTube's results page.** No key is needed, but if YouTube changes its page format or rate-limits the server, search can break until `api/yt.js` is updated. Pasting links keeps working.
- **The camera needs HTTPS.** Browsers only allow it on `https://` pages and `localhost`; a phone opening the dev server as `http://192.168.x.x:3000` sees *Camera needs HTTPS*.
- **The Internet window is Google-only by design.** Pages you reach by clicking inside Google keep the last address you entered in the address bar, Stop only stops the animation, there is one tab, and Google's page follows your system's dark mode, not the skin. If Google ever stops honoring `igu=1`, the window shows the browser's own refusal page.
- **YouTube's rules:** keep the video window at least 200×200 px when you can. Hiding the player entirely is against YouTube's embed policy.

## Security and privacy

- **No accounts, analytics or cookies of our own.** Playlist, settings, recent searches, game scores and photos live only in the visitor's browser.
- **Search terms** travel from the visitor to your server to YouTube. `api/yt.js` doesn't log or store them, but your host's request logs will briefly contain the search URL.
- **YouTube.** Videos, thumbnails and the player come from YouTube/Google, so they see the visitor's IP address. The `youtube-nocookie.com` player avoids cookies until a video plays.
- **Your own audio files** are played locally in the browser and never uploaded.
- **Camera photos never leave the device.** The camera is only requested when someone opens the Camera window, runs only while that window is open and the tab is visible, and records no sound. Photos are stored in IndexedDB (`retroamp-camera`); the filter and front/back choice are in `retroamp:camera`. Photos leave the browser only when the visitor presses Save. `Permissions-Policy` allows the camera for this site only, so the YouTube iframe can't use it.
- **The Internet window** loads nothing until it is opened. Then the visitor's browser talks to www.google.com directly, not through RetroAmp's server, so Google sees their IP address and searches as on any visit. The frame is sandboxed without downloads, pop-ups or top-level navigation, sends no referrer, and in Chromium browsers is `credentialless` (an empty, temporary cookie jar discarded when the page closes); Firefox and Safari partition or block third-party cookies. Either way the visitor browses Google signed out, and RetroAmp stores no history. Opening the window adds one entry to the tab's back history.
- **Content Security Policy** (in `index.html`) limits scripts to this site and YouTube's player API, and frames to YouTube and www.google.com. `vercel.json` and `server.js` send identical security headers.
- The pixel font is self-hosted (no Google Fonts request).

## Credits

- [Rafid Khan](https://rafidkhan.github.io/): creator.
- Silkscreen pixel font by Jason Kottke, under the SIL Open Font License (`assets/fonts/OFL.txt`).
