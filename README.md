# RetroAmp

New music, old pixels. A desktop-in-a-browser that plays YouTube through 37 years of music-player looks, from Windows 3.0 to 2026.

Made by [Rafid Khan](https://rafidkhan.github.io/).

- **Time machine:** one skin per year from 1990 to 2026, plus 6 Macintosh skins and a couple of extras. Drag the year slider in the **Skins** window, press **K** to flip through them, or pick one from View › Skin. Skins cross-fade into each other (instant with reduced motion). The palette button lives on the player, in the taskbar tray and on the desktop.
- Five layouts underneath: the 1998 metal player, Win9x windows, XP-style media player, flat 2010s+ and Mac (menu bar on top, Dock at the bottom)
- Spectrum analyzer / oscilloscope, 7-segment clock (blinks when paused), scrolling title marquee
- Draggable windows that snap and dock together; drag, shade or minimize the player and docked windows follow
- Desktop icons, taskbar, Start menu, caption-zoom animation, retro tooltips, window shade (double-click the title bar)
- Search YouTube (with suggestions and recent searches), or paste a video or playlist link (first 100 tracks of a playlist)
- Drag to reorder the playlist; mouse wheel over the player changes volume
- Sleep timer (Play › Sleep timer): fades the music out over 30 seconds, then dims the desktop
- Easter eggs: try the Konami code
- Playlist, skin, volume and window layout are saved in your browser (localStorage)
- No API key, no sign-in, no dependencies, no build step

### The timeline

| Years | Skins |
| --- | --- |
| 1990–1999 | Program Manager, Workbench, Hot Dog Stand, Black Cube, Text Mode, Chicago 95, Rainy Day, Desert, Amp, Orbital |
| 2000–2009 | Liquid Chrome, Luna Blue, Graphite, Brushed Metal, Royale, Noir, Mocha, Aero Glass, Stream, Seven |
| 2010–2019 | Metro, Pure, Tiles, Flat, Stream Dark, Ten, Material, Acrylic, Vaporwave, Lofi Room |
| 2020–2026 | Soft UI, Mica, Y2K Revival, Field Recorder, Dot Matrix, Expressive, Holo |
| Macintosh | System 7, Platinum, Aqua, Leopard, Big Sur, Liquid Glass |
| Extras | Luna Olive, Luna Silver |

The skins are tributes drawn with CSS: no copied artwork, logos or system files.

## Run it

```bash
./start.sh         # starts the server and opens http://localhost:3000
./start.sh 8080    # try another port first
npm start          # same server, no browser auto-open
```

`start.sh` checks your Node version, skips to the next port if 3000 is taken, and just opens the browser if RetroAmp is already running. Press Ctrl+C to stop.

Needs Node 18+. Opening `index.html` straight from disk won't work — the YouTube player refuses `file://` pages.

## Deploy to Vercel

Works as-is: static files plus one serverless function (`api/yt.js`). `server.js` and `start.sh` are local-only (`.vercelignore`).

```bash
npx vercel login   # once
npx vercel         # preview URL
npx vercel --prod  # production URL
```

Or push the folder to GitHub and import it at vercel.com/new (no settings to change).

## Keyboard

| Key | Action |
| --- | --- |
| X / Space | Play |
| C | Pause |
| V | Stop |
| Z / B | Previous / Next |
| L | Add from YouTube |
| S / R | Shuffle / Repeat |
| K | Next skin |
| ← → | Seek 5 s |
| ↑ ↓ | Volume |
| Del | Remove selected tracks |
| ? | Shortcuts |

## Games

A **Games** folder sits on the desktop (also under Start › Games) with five classics. Each opens in its own window and picks up the current skin's window frame:

- *Minesweeper* (Windows 3.1): Beginner, Intermediate and Expert, ? marks, chording, best times
- *Solitaire* (Windows 3.0): Klondike, Draw One or Draw Three, Windows scoring, undo, and the bouncing-cards finale
- *Snake* (late-90s phone): nine speeds, walls on or off, bonus bugs
- *Blocks* (Game Boy): falling blocks in four shades of green, ghost piece, hard drop
- *Bricks* (1976 arcade): rainbow wall, mouse or keyboard paddle

F2 starts a new game. While a game window is focused, arrow keys and Space go to the game instead of the player, and the music keeps playing. Action games pause when their window loses focus. Best scores are saved in this browser (`retroamp:games` in localStorage). On touch screens the games show on-screen buttons.

Each game is `js/games/<id>.js` plus `css/games/<id>.css`, loaded the first time it opens. `js/games.js` holds the shared plumbing: the folder, menus, message box, keyboard routing and score storage.

## How it works

| File | Job |
| --- | --- |
| `api/yt.js` | Search, playlist import and video lookup. Reads public YouTube pages server-side, because browsers can't (CORS). |
| `js/yt.js` | Official YouTube IFrame player, privacy-enhanced `youtube-nocookie.com` host |
| `js/skins.js` | Skin catalog: looks, skins, years, previews |
| `js/viz.js` | Visualizer, 7-segment clock, TV static |
| `js/wm.js` | Window manager: focus, drag, snap, dock, shade, taskbar |
| `js/main.js` | Player state, playlist, menus, skin picker, sleep timer, keyboard |
| `css/base.css` | Structure shared by everything |
| `css/classic.css`, `css/amp.css` | The Win9x family: Chicago windows and the metal Amp player |
| `css/media.css`, `css/luna.css`, `css/modern.css`, `css/mac.css` | The album-art family: shared player layout, then XP, flat and Mac chrome |
| `css/skins-classic.css`, `css/skins-media.css` | One block of color variables per skin |

On `<html>`, `data-family` (`classic` or `media`) picks the shared layout, `data-look` picks the chrome, and `data-skin` picks the colors.

### Adding a skin

1. Add an entry to `SKINS` in `js/skins.js`: pick a `look` (`amp`, `chicago`, `luna`, `modern` or `mac`), give it a free `year` (or `mac: <year>`), an `era` line and `preview` colors.
2. Add a `[data-skin=yourid] { … }` block to `css/skins-classic.css` or `css/skins-media.css` that overrides the look's variables (each look file lists them at the top).

## Things to know

- **The visualizer is synthesized.** YouTube's player never exposes its audio, so the bars are generated from playback time and a per-track tempo. They move with the music, not to it.
- **Some videos won't play.** Owners can block embedding (often official label videos). RetroAmp marks those tracks and skips to the next one. "Official Audio" or "Topic" uploads usually work.
- **Search scrapes YouTube's results page.** No key needed, but if YouTube changes its page format or rate-limits the server, search can break until `api/yt.js` is updated. Pasting links keeps working.
- **YouTube's rules:** keep the video window at least 200×200 px when you can. Hiding the player entirely is against YouTube's embed policy.

## Privacy

- No accounts, analytics or cookies of our own. Playlist, settings, recent searches and game scores live only in the visitor's browser.
- Search terms travel from the visitor to your server to YouTube. `api/yt.js` doesn't log or store them, but your host's request logs will briefly contain the search URL.
- Videos, thumbnails and the player come from YouTube/Google, so they see the visitor's IP address. The `youtube-nocookie.com` player avoids cookies until a video plays.
- The pixel font is self-hosted (no Google Fonts request).

## Contributors

- [Rafid Khan](https://rafidkhan.github.io/) — creator
