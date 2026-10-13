# RetroAmp

**New music, old pixels.** RetroAmp is a desktop-in-a-browser that plays YouTube and your own audio files through 37 years of music-player looks, from Windows 3.0 to 2026. It comes with classic games, a retro camera and a period web browser, all in plain HTML, CSS and JavaScript: no framework, no build step, no runtime dependencies.

Made by [Rafid Khan](https://rafidkhan.github.io/).

## Contents

- [Features](#features)
- [Quick start](#quick-start)
- [Deploy to Vercel](#deploy-to-vercel)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Phones and tablets](#phones-and-tablets)
- [Modules](#modules): [Games](#games) · [Camera](#camera) · [Notes](#notes) · [Recycle Bin](#recycle-bin) · [Screenshot](#screenshot) · [Internet](#internet)
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
- Spectrum analyzer and oscilloscope, 7-segment clock (blinks when paused), scrolling title marquee. The Waveform skin draws the whole track as a waveform that fills in orange as it plays; click it to jump there.
- Drag to reorder the playlist (long-press a track on touch screens); the mouse wheel over the player changes volume.
- Sleep timer (Play › Sleep timer): fades the music out over 30 seconds, then dims the desktop.
- Full-screen video: the full-screen button in the Video window's title bar, or View › Full-screen video. Esc or ✕ leaves it.
- Pop-out mini player: the tray button next to the speaker, Start › Mini Player or View › Mini player opens a small floating player drawn in the current skin (Picture-in-Picture). It stays on top of other tabs and apps and has play/pause, previous and next. Chrome, Edge and Android Chrome; hidden where the browser can't do it.

**Time machine**
- One skin per year from 1990 to 2026, plus 11 Apple skins (6 Mac desktops, iTunes, the iPod in three colors and the iPad), 4 classic players (turntable, Walkman, boombox, Discman), a Linux one and a few extras.
- Some skins rebuild their original player, not just its colors: Scroll Wheel is the iPod in light grey, baby pink or light blue (screen plus wheel: menu adds music, ⏮ ⏭, ▶❚❚ and the center button play and pause; spin the wheel with the mouse or a finger for volume, clockwise is louder, and hold ⏮ or ⏭ to rewind or fast-forward), Slate is the iPad music app's top bar with a segmented toolbar, Waveform is the classic SoundCloud track with the waveform as the scrubber, Ten Foot is Windows 7 Media Center's Now Playing screen (the green button adds music, the visualizer glows behind the page) and Storyboard is Windows Movie Maker 2: task pane, preview monitor and a timeline whose playhead scrubs the track.
- The **Players** group turns the player into a classic machine, not software: a turntable whose record spins and whose tonearm walks in as the song plays, a Walkman whose tape winds from reel to reel (EJECT loads music, PLAY stays latched down), a boombox whose speakers thump, with an LED equalizer and an FM dial to scrub, and a Discman whose CD spins with the cover as its label.
- Every skin says what inspired it (Winamp 2, Windows XP, iTunes 8, SoundCloud…), on its card, in the time machine and in View › Skin.
- Drag the year slider in the **Skins** window, press **K** to flip through them, or pick one from View › Skin. Skins cross-fade (instantly with reduced motion).
- The **Skins** window has a search box (name, year, inspiration, era) and a system filter: Windows, Mac, iOS, Android, Linux, Web or Other. Esc clears the search.
- Five layouts underneath: the 1998 metal player, Win9x windows, the XP-style media player, flat 2010s+ and Mac (menu bar on top, Dock at the bottom).

**Desktop**
- Draggable windows that snap and dock together; drag, shade or minimize the player and docked windows follow.
- Desktop icons, taskbar, Start menu, caption-zoom animation, retro tooltips and window shade (double-click a title bar).
- Window buttons do what they say. Minimize drops a window into the taskbar (or Dock). Close closes it: it leaves the taskbar and comes back from the Start menu, a desktop icon or View. Closing the player pauses the music. Click a window's title-bar icon for its window menu; double-click the icon to close.
- [Games](#games), a [retro camera with a photo gallery](#camera) and [notes with reminders](#notes), each styled by the current skin. (The [period web browser](#internet) is switched off for now.)
- Easter eggs: try the Konami code.
- Playlist, skin, volume and window layout are saved in your browser. No API key, no sign-in.
- **Welcome and consent.** The first visit opens a Windows Setup-style screen: what RetroAmp is, why it was made and the privacy policy. RetroAmp starts only if you accept; declining shows *It's now safe to close this tab* and nothing loads or is saved. Read it again from Help › Privacy.
- **Recycle Bin.** Deleting a song, note or photo asks first and moves it to the [Recycle Bin](#recycle-bin) (*Trash* on the Mac skins), where it can be restored for 7 days before it's deleted for good.
- **Screenshot to share** (tray camera button, Start › Screenshot, or **P**): a picture of what you're doing, to share, copy or save. See [Screenshot](#screenshot).
- **Install it as an app.** RetroAmp is a Progressive Web App: Start › Install RetroAmp… (or the install icon in Chrome and Edge's address bar) gives it its own window and icon, with no browser around it; on iPhone and iPad the same entry shows the Add to Home Screen steps. The installed app opens offline (YouTube still needs the network; your own files, games, notes and camera don't), and its title-bar color follows the skin.
- **Clear All Data** (Start menu, Help menu or the About window) erases everything RetroAmp saved in this browser, after a confirm, and starts over from the welcome screen.

### The timeline

| Years | Skins (inspired by) |
| --- | --- |
| 1990–1999 | Program Manager (Windows 3.0), Workbench (Amiga Workbench), Hot Dog Stand (Windows 3.1 Hot Dog Stand), Black Cube (NeXTSTEP), Text Mode (MS-DOS trackers), Chicago 95 (Windows 95), Rainy Day (Windows 95 Plus!), Desert (Windows 95 Desert scheme), Amp (Winamp 2), Orbital (Sonique) |
| 2000–2009 | Liquid Chrome (Winamp skins), Luna Blue (Windows XP), Graphite (Winamp 3), Brushed Metal (iTunes 4 for Windows), Royale (Windows XP Media Center), Noir (Royale Noir theme), Mocha (Zune), Aero Glass (Windows Vista), Stream (Spotify), Seven (Windows 7) |
| 2010–2019 | Metro (Zune & Windows Phone 7), Pure (Rdio), Tiles (Windows 8), Flat (iOS 7), Stream Dark (Spotify), Ten (Windows 10), Material (Android Material Design), Acrylic (Windows 10 Fluent Design), Vaporwave (Windows 95 vaporwave art), Lofi Room (lofi hip hop radio) |
| 2020–2026 | Soft UI (neumorphism), Mica (Windows 11), Y2K Revival (early-2000s chrome), Field Recorder (Teenage Engineering OP-1), Dot Matrix (Nothing Phone), Expressive (Material 3 Expressive), Holo (holographic concept UIs) |
| Apple | System 7 (Mac System 7), Platinum (Mac OS 9), Aqua (Mac OS X 10.0), Scroll Wheel Grey, Scroll Wheel Pink, Scroll Wheel Blue (iPod (2001)), Leopard (Mac OS X Leopard), Library (iTunes 8), Slate (iPad iPod app), Big Sur (macOS Big Sur), Liquid Glass (Apple Liquid Glass) |
| Players | Turntable (Technics SL-1200, 1972), Personal Stereo (Sony Walkman, 1979), Boombox (1980s boombox), Anti-Skip (Sony Discman, 1984) |
| Linux | Penguin (XMMS) |
| Extras | Luna Olive (Windows XP Olive Green), Luna Silver (Windows XP Silver), Waveform (SoundCloud), Ten Foot (Windows 7 Media Center), Storyboard (Windows Movie Maker 2) |

The skins are tributes drawn with CSS and inline SVG: no copied artwork, logos, sounds or system files. The products named as inspirations are trademarks of their owners; RetroAmp isn't affiliated with or endorsed by any of them.

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

## Phones and tablets

RetroAmp runs in the browser on Android and iOS (iPhone and iPad).

- **Layout.** On phones (screens up to 720 px wide, or a phone held sideways) the windows stack in a scrolling column: the player, playlist, equalizer and video fill the width, and dialogs fill the screen. Every look gives the player finger-sized button rows. Tablets keep the desktop with draggable windows.
- **Touch.** Tap selects; double-tap a track or search result to play it; long-press a track for Play, Move up, Move down and Remove. Menus, list rows and buttons are taller, small title-bar buttons get a bigger invisible hit area, and text fields use 16 px text so iOS doesn't zoom in.
- **Hidden on touch screens:** keyboard shortcuts (the About window shows touch tips instead), shortcut keys in menus, tooltips, drag-to-reorder and drag-and-drop of files (use **Files…**). Phones also drop the desktop icons (everything is in the Start menu) and window shade.
- **Floating mini player.** On Android, the pop-out mini player floats over the home screen and other apps. Phones still pause YouTube when the browser goes to the background, so music keeps playing there only for your own files. iPhones may not offer it.
- **Lock screen.** Your own files show their title and play/pause/next/previous on the lock screen and in the notification shade (Media Session API). YouTube videos bring their own.
- **iPhone and iPad.** iOS lets only the hardware buttons set a video's volume, so the volume slider hides while a YouTube track is loaded. Mute still works, and your own files keep the slider.
- **Full-screen video.** Android phones and iPads use the browser's real full screen (Android phones also turn sideways). iPhones have no full screen for page elements, so there the Video window stretches over the whole screen; tap ✕ to leave.
- **Camera.** Starts with the front camera, shows Back / Front when there's more than one, and puts the shutter beside the viewfinder in landscape. **Save** opens the share sheet. Needs HTTPS (see below).
- **Games** show on-screen buttons; Minesweeper flags with a long press.

`js/boot.js` sets `html.touch` (no hover, coarse pointer) and `html.ios` before first paint. Each stylesheet's phone block uses the same media query as `wm.isMobile()`: `(max-width: 720px), (pointer: coarse) and (max-height: 520px)`.

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

### Notes

**Notes** (desktop and Start menu) is a note taker that borrows the era's name: *Notepad* on the Windows 9x skins, *Sticky Notes* on XP and later, *Stickies* on the Mac.

- **Write:** a list of notes and an editor, saved as you type. Each note gets a color tag (the editor is tinted like a sticky), can be pinned to the top, and the search box filters titles and text. Delete asks for a second click.
- **Remind me:** pick a date and time on a note. When it comes due, a small window in the current skin pops up above the taskbar with **Open**, **Snooze 10 min** and **Done**. If RetroAmp isn't the window in front and you've allowed notifications (asked the first time you set a reminder, never at launch), a system notification appears too, with the same buttons. Its icon, and on Windows, Android and ChromeOS its large picture, are drawn in the current skin.
- **No server, so RetroAmp has to be open.** Reminders go off while RetroAmp is open in any tab, even minimized or behind other windows. One that came due while it was closed goes off at the next launch, marked *Missed*. Going off with the tab closed would need Web Push, which needs a server to send it.
- **iPhone and iPad** only allow web notifications for apps added to the Home Screen: install RetroAmp (Start › Install RetroAmp…) to get them; in Safari, reminders show inside RetroAmp only.

`js/notes/index.js` adds the icon and menu entry and starts the reminder clock (`remind.js`); the window (`app.js`) loads on first open. Notes live in `retroamp:notes` (`store.js`). System notifications go through the app's service worker (`sw.js`), which shows them and passes clicks back to an open RetroAmp window.

### Recycle Bin

**Recycle Bin** (*Trash* on the Mac skins; desktop and Start menu) holds what you delete, so nothing is gone by accident.

- **What goes in:** songs removed from the playlist (Rem, Del, Clear, long-press Remove), notes and camera photos. Each delete asks first, in a dialog drawn in the current skin.
- **Restore:** select items (or Select all) and press Restore, or double-click one. Songs go back to their old place in the playlist, notes into Notes and photos into the Gallery. Restoring asks first too.
- **Gone for good:** after 7 days, checked at launch, every hour and whenever RetroAmp comes back to the front. Delete forever and Empty do it sooner; both ask, and their dialogs start on Cancel.
- **Your own audio files** live only in memory, so a deleted one can be restored until RetroAmp closes.
- The desktop icon shows when the bin has something in it.

`js/core/trash.js` is the bin (contents, the 7-day rule, the questions, asked through `js/core/confirm.js`); each kind registers how to put an item back and how to really delete it (songs in `main.js`, notes in `js/notes/index.js`, photos in `js/camera/index.js`). `js/trash/index.js` is the window and icon.

### Screenshot

Take a picture of RetroAmp to show friends what you're listening to: the camera button in the tray, Start › Screenshot, or **P** (games keep P for pause while they're in front).

- **On computers** (Chrome, Edge, Firefox, Safari) it's a real capture of the RetroAmp tab, YouTube video included. Nothing is closed, minimized or paused; the browser asks for permission each time, takes one frame and stops.
- **On phones and tablets**, which can't capture the screen from a web page, it draws a **Now Playing card** instead: a 1080×1350 picture of the current skin's player with the song, artist, cover and skin name, on the skin's desktop.
- The preview window offers **Share** (the device's share sheet, where available), **Copy** (paste into a chat), **Save** and **Take another**.

`js/snap/index.js` does both; the card reuses the mini player's skin-drawn renderer (`js/player/pip.js`).

### Internet

> **Switched off for now.** The code is still in `js/browser/` and `css/browser/`, but `js/start.js` doesn't load it, so there's no icon, menu entry or window. To bring it back, add `'./browser/index.js'` to `MODULES` in `js/start.js`.

**Internet** (desktop and Start menu) is a nostalgic web browser. It opens any secure (`https://`) page inside the window, with Google as its home page and search engine. Everything around the page changes with the skin's year, including how loading looks and feels.

| Skins | Browser chrome |
| --- | --- |
| 1990–1993, System 7 | Text buttons, *Title* and *URL* fields, a spinning globe, a gray page that paints in from the top |
| Text Mode | All characters: `[Back] [Forward]`, *URL to open:*, a `\|/-\` spinner and a command line |
| 1995–1997, Vaporwave, Penguin | Big beveled buttons, *Location:* (turns into *Go to:* while you type), a night-sky throbber with shooting stars, a key icon and progress bar in the status bar |
| 1998–2000, Platinum, Y2K Revival, Field Recorder | Coolbar with grippers, gray icons that light up on hover, *Address … Go*, a globe with an orbiting satellite, segmented progress and an *Internet* zone |
| 2001–2006, Luna Olive, Luna Silver | Green round Back/Forward buttons, a small throbber by the menus, green block progress |
| 2007–2009, Ten Foot | Glass orbs, refresh/stop inside the address bar, a search box and a tab with a dotted spinner |
| Aqua, Scroll Wheel (all three colors), Leopard, Library, Slate | Capsule Back/Forward and the blue progress fill inside the address bar |
| 2010–2019, Waveform | Tabs on top, round icon buttons, an omnibox with a padlock, a spinner that turns backwards while waiting, a status bubble |
| 2020–2026, Big Sur, Liquid Glass | Pill-shaped omnibox, rounded tab and a thin progress line |

- **Browse:** type an address to open it, or words to search Google; use Google's own search box and follow links to other sites. Back, Forward, Refresh, Stop and Home work like they used to; clicking the throbber goes home too. Maximize with the title-bar button or a double-click, and resize from the bottom-right grip.
- **Secure pages only.** Typed `http://` addresses are upgraded to `https://`. A link to a plain `http://` page opens an error page in the style of the year (*The page cannot be displayed*, *ERR_BLOCKED_BY_CSP*…) with Back and *Search Google for it* buttons.
- **Sites that refuse frames.** Many big sites (GitHub, Facebook, YouTube's own site…) won't load inside another page, and the browser shows its own refusal. **Open in New Window** (File menu, or the menu button in later eras) opens the address in a real browser tab.
- **The address bar goes blank after a link.** A page can't read the address of a page from another site, so after you click a link inside the page RetroAmp Web shows no address rather than one that may be wrong. Refresh and Open in New Window need a known address, so they switch off until you type one or go Back.
- **No history, no downloads.** Nothing you visit is stored, downloads are switched off, links that open a new window get a sandboxed one, and closing the window forgets everything. `about:` (or Help › About) explains this inside the browser.

`js/browser/index.js` builds the window, the era table, the throbbers and the history handling; `css/browser/index.css` holds one block per era.

## Project structure

```
.
├── index.html              Desktop markup, window templates, icon sprite, CSP
├── api/
│   └── yt.js               Serverless function: YouTube search, playlist import, video lookup
├── assets/                 App icon (icons/: PNGs for installing) and the self-hosted Silkscreen pixel font (OFL)
├── css/
│   ├── base.css            Structure shared by every look
│   ├── consent.css         Welcome, privacy and Clear All Data screens (their own Setup look)
│   ├── looks/              Window chrome per look: classic, amp, media, luna, modern, mac
│   ├── skins/              One block of color variables per skin (classic.css, media.css)
│   ├── games/              Games folder (index.css) and one stylesheet per game
│   ├── camera/             Camera and Gallery windows
│   ├── notes/              Notes window and reminder popups
│   ├── trash/              Recycle Bin window
│   ├── snap/               Screenshot preview window
│   └── browser/            Internet window, one block per browser era
├── js/
│   ├── boot.js             Before first paint: the saved skin, html.touch and html.ios (classic script)
│   ├── start.js            Boot loader: consent first, then main.js and each module
│   ├── main.js             App entry: player, playlist, desktop, menus, Skins window, keyboard
│   ├── core/               Shared building blocks
│   │   ├── util.js         DOM helpers, storage, YouTube URL parsing
│   │   ├── consent.js      Welcome + privacy consent, Privacy page, Clear All Data
│   │   ├── wm.js           Window manager: focus, drag, snap, dock, shade, taskbar
│   │   ├── menu.js         Cascading menus for menu bars, title-bar icons and right-click
│   │   ├── listview.js     Playlist and search-result list view
│   │   ├── paint.js        CSS backgrounds on a canvas, for skin-drawn pictures (mini player, reminders)
│   │   ├── pwa.js          Installable app: service worker, offline copy, title-bar color, Install entry
│   │   ├── trash.js        Recycle Bin: contents, restore, delete forever, the 7-day rule
│   │   ├── confirm.js      "Are you sure?" dialogs in the current skin
│   │   └── skins.js        Skin catalog: looks, skins, years, previews
│   ├── player/
│   │   ├── yt.js           Official YouTube IFrame player (youtube-nocookie.com host; youtube.com in sign-in mode)
│   │   ├── local.js        Local files: Web Audio playback, preamp + 10-band EQ, analyser
│   │   ├── viz.js          Visualizer, 7-segment clock, TV static
│   │   └── pip.js          Pop-out mini player: the skin drawn on a canvas, floated with Picture-in-Picture
│   ├── games/              index.js (folder, menus, scores), common.js, one module per game
│   ├── camera/             index.js (icons, lazy loader), app.js, filters.js, store.js
│   ├── notes/              index.js (icon, reminder clock), app.js, store.js, remind.js, art.js
│   ├── trash/              index.js: the Recycle Bin window, desktop icon and 7-day sweep
│   ├── snap/               index.js: tab capture, Now Playing card, share / copy / save
│   └── browser/            index.js: the Internet window
├── manifest.webmanifest    App name, icons and window mode for installing (PWA)
├── sw.js                   Service worker: offline copy of the app's own files, reminder notifications
├── server.js               Local dev server mirroring Vercel (static files + api/), zero dependencies
├── start.sh                Starts server.js and opens the browser
├── vercel.json             Security headers on Vercel (kept identical to server.js)
└── package.json            Scripts and Node version
```

## How it works

**Skins.** Three attributes on `<html>` drive every pixel: `data-family` (`classic` or `media`) picks the shared layout, `data-look` (`amp`, `chicago`, `luna`, `modern`, `mac`) picks the window chrome in `css/looks/`, and `data-skin` picks the colors in `css/skins/`. Looks expose CSS variables; skins only override variables. `js/boot.js` restores the saved skin before first paint so the page never flashes the default.

**Windows.** Every window is a `section.win` registered with `js/core/wm.js`, which handles focus, z-order, dragging with edge snapping and Winamp-style docking, minimize/restore with a caption-zoom animation, and the taskbar. On phones the windows stack in a scrolling column and dialogs fill the screen.

**Modules.** Games, Camera and Internet are self-contained: each `js/<module>/index.js` registers its windows with the window manager, adds its own desktop icon and Start-menu entry, and loads heavier code on first open. `index.html` includes one stylesheet per module; `js/start.js` imports the scripts in order once the visitor has accepted the welcome screen.

**Storage.** Player state lives in `localStorage` under `retroamp:v1`, game scores under `retroamp:games`, notes and reminders under `retroamp:notes`, the Recycle Bin under `retroamp:trash` (a photo in the bin stays in IndexedDB, marked trashed), camera settings under `retroamp:camera` and photos in the IndexedDB database `retroamp-camera`, and the privacy consent under `retroamp:consent`. Clear All Data erases all of them. Every storage access is wrapped so the app keeps working when storage is blocked.

**YouTube.** Playback uses the official IFrame player. Search and playlist import go through `api/yt.js`, which reads public YouTube pages server-side because browsers can't (CORS).

**The Internet window.** Pages load in a sandboxed iframe. Google allows itself to be framed when the URL carries `igu=1`, so Google pages are `https://www.google.com/…?igu=1`; other sites load as typed, if they allow framing (sites that send `X-Frame-Options` or `frame-ancestors` get the browser's own refusal page, which a parent page can't detect). A page can't read a cross-origin frame's address or title, so the address bar shows the address you entered and goes blank after a navigation inside the frame. Back and Forward walk the tab's own history, which includes the frame's navigations; a sentinel history entry, pushed when the window first opens, turns any overshoot into a harmless same-page step. The CSP `frame-src` is `https:`, so `http://` links are blocked, and the resulting `securitypolicyviolation` event names the host for the error page. Typed addresses with credentials (`user@host`) or pointing at RetroAmp itself become searches: a same-origin page with `allow-scripts allow-same-origin` could lift its own sandbox.

## Extending RetroAmp

### Adding a skin

1. Add an entry to `SKINS` in `js/core/skins.js`: pick a `look` (`amp`, `chicago`, `luna`, `modern` or `mac`), say what inspired it (`inspo`) and which system it belongs to (`os`, a key of `OSES`), give it a free `year` (or `mac: <year>` / `linux: <year>`), an `era` line and `preview` colors.
2. Add a `[data-skin=yourid] { … }` block to `css/skins/classic.css` or `css/skins/media.css` that overrides the look's variables (each look file lists them at the top).
3. Optionally map it to a browser era in `eraFor()` in `js/browser/index.js` (by default the year decides).

### Adding a module

1. Create `js/<name>/index.js` and `css/<name>/index.css`. Add the stylesheet to `index.html` and the script to `MODULES` in `js/start.js` (it loads modules only after consent).
2. Build windows with `h()` from `js/core/util.js` (never `innerHTML` with user or network text), register them with `wm.register()`, and style them for every look and for phones.
3. Add your desktop icon and Start-menu entry from the module itself, the way `js/games/index.js` does.
4. If the module talks to a new origin, add it to the CSP in `index.html` and document it under [Security and privacy](#security-and-privacy).

## Known limitations

- **YouTube's audio is sealed off.** It plays inside YouTube's own iframe, which no web page can read or process. For YouTube tracks the visualizer is synthesized from playback time and a per-track tempo, and the EQ doesn't apply. Your own files get the real spectrum and the EQ.
- **Local files are session-only.** They play from memory and drop out of the playlist on reload; YouTube tracks are kept.
- **Some videos won't play.** Owners can block embedding (often official label videos). RetroAmp marks those tracks and skips to the next one. "Official Audio" or "Topic" uploads usually work.
- **Search scrapes YouTube's results page.** No key is needed, but if YouTube changes its page format or rate-limits the server, search can break until `api/yt.js` is updated. Pasting links keeps working.
- **"An error occurred. Please try again later".** If YouTube plays in a normal tab but not in RetroAmp, Google has probably flagged your network for unusual traffic (shared office networks and VPNs get this). Turn on Play › Use my YouTube sign-in; RetroAmp suggests it when several videos fail in a row.
- **Phones may not autoplay YouTube.** Mobile browsers, iOS especially, can refuse to start a video that wasn't tapped directly. If a track hasn't started after a few seconds, RetroAmp stops showing *Buffering*, opens the Video window and asks you to tap the video.
- **No background playback on phones.** Mobile browsers pause web video when the screen locks or the browser goes to the background, so YouTube tracks stop there. Your own files may stop too (iOS suspends Web Audio in the background).
- **Reminders need RetroAmp open.** Without a server there's no way to wake a closed tab, so Notes reminders go off only while RetroAmp is open somewhere (missed ones show at the next launch). Background tabs can make them up to a minute late. macOS doesn't show a notification's large picture, only its icon.
- **The camera needs HTTPS.** Browsers only allow it on `https://` pages and `localhost`; a phone opening the dev server as `http://192.168.x.x:3000` sees *Camera needs HTTPS*.
- **The Internet window isn't a full browser.** Many sites refuse to load in a frame (use Open in New Window), the address bar can't follow links you click, sign-ins don't last past a reload, nothing downloads, Stop only stops the animation, there is one tab, and pages follow your system's dark mode, not the skin. If Google ever stops honoring `igu=1`, Home and search show the browser's own refusal page.
- **YouTube's rules:** keep the video window at least 200×200 px when you can. Hiding the player entirely is against YouTube's embed policy.

## Security and privacy

- **Consent first.** Nothing loads from YouTube and nothing is saved until the visitor accepts the welcome screen. The answer is kept in `retroamp:consent` (with a version, so changing the policy asks again). Clear All Data removes every `retroamp*` key and the photo database; YouTube's own cookies from sign-in mode belong to YouTube and are cleared in the browser's settings.
- **No accounts, analytics or cookies of our own.** Playlist, settings, recent searches, game scores and photos live only in the visitor's browser.
- **Search terms** travel from the visitor to your server to YouTube. `api/yt.js` doesn't log or store them, but your host's request logs will briefly contain the search URL.
- **YouTube.** Videos, thumbnails and the player come from YouTube/Google, so they see the visitor's IP address. The `youtube-nocookie.com` player avoids cookies until a video plays.
- **YouTube sign-in mode** (Play › Use my YouTube sign-in, off by default) plays through `youtube.com` instead of `youtube-nocookie.com`, so the visitor's own YouTube cookies and sign-in travel with the player. Use it when YouTube shows *An error occurred. Please try again later* in RetroAmp but works in a normal tab: Google sometimes blocks a whole network for "unusual traffic", and only a signed-in player gets past. RetroAmp never sees the cookies or the account; YouTube can set cookies and knows who is watching. The choice is saved in `retroamp:v1`.
- **Your own audio files** are played locally in the browser and never uploaded.
- **The pop-out mini player** is drawn in the page and shown by the browser's own Picture-in-Picture window. Nothing is recorded or sent anywhere; the album art comes from the same YouTube thumbnail server as the player.
- **Screenshots stay on the device.** The tab is captured only when someone asks, the browser confirms each capture, and the picture leaves the browser only through Share, Copy or Save.
- **Deleting asks, and keeps a copy for 7 days.** Songs, notes and photos go to the Recycle Bin, in this browser only, and are erased for good after 7 days (sooner with Delete forever or Empty). Clear All Data empties it too.
- **Notes stay on the device.** They're in `localStorage` (`retroamp:notes`) and never sent anywhere. Notification permission is asked only when someone sets a reminder.
- **The service worker** (`sw.js`, registered only after consent) keeps a copy of RetroAmp's own files in Cache Storage (`retroamp-shell-*`) so the app opens offline. It goes to the network first and stores nothing else: never the search API, never anything from YouTube or other sites, never personal data. Clear All Data removes it and its cache.
- **Camera photos never leave the device.** The camera is only requested when someone opens the Camera window, runs only while that window is open and the tab is visible, and records no sound. Photos are stored in IndexedDB (`retroamp-camera`); the filter and front/back choice are in `retroamp:camera`. Photos leave the browser only when the visitor presses Save. `Permissions-Policy` allows the camera for this site only, so the YouTube iframe can't use it.
- **The Internet window** (switched off for now) loads nothing until it is opened. Then the visitor's browser talks to Google and every site they open directly, not through RetroAmp's server, so those sites see their IP address and what they do there, as on any visit, including any trackers the sites load. The frame is sandboxed without downloads, top-level navigation or modal dialogs; pop-ups are allowed but stay sandboxed, so no page can navigate RetroAmp away. It sends no referrer, and in Chromium browsers is `credentialless` (an empty, temporary cookie jar discarded when the page closes); Firefox and Safari partition or block third-party cookies. Either way the visitor browses signed out, and RetroAmp stores no history. Because the address bar can't follow links clicked inside a page, it goes blank instead of showing a stale address, so a phishing page can't pass itself off under the last address typed. Opening the window adds one entry to the tab's back history.
- **Content Security Policy** (in `index.html`) limits scripts to this site and YouTube's player API, and frames to `https:` pages (YouTube's player and the Internet window). `vercel.json` and `server.js` send identical security headers.
- The pixel font is self-hosted (no Google Fonts request).

## Credits

- [Rafid Khan](https://rafidkhan.github.io/): creator.
- Silkscreen pixel font by Jason Kottke, under the SIL Open Font License (`assets/fonts/OFL.txt`).
