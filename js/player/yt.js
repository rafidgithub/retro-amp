// Thin wrapper around the official YouTube IFrame Player API (no key needed).
// Uses the privacy-enhanced youtube-nocookie.com host unless the caller asks for
// youtube.com (sign-in mode, main.js).
let api;

function loadApi() {
  api ||= new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => reject(new Error('YouTube player failed to load'));
    document.head.append(s);
  });
  return api;
}

export const NOCOOKIE_HOST = 'https://www.youtube-nocookie.com';
export const SIGNED_IN_HOST = 'https://www.youtube.com';

export async function createPlayer(el, { onState, onError, host = NOCOOKIE_HOST }) {
  const YT = await loadApi();
  return new Promise(resolve => {
    const player = new YT.Player(el, {
      host,
      width: '100%',
      height: '100%',
      playerVars: { controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, rel: 0, playsinline: 1, origin: location.origin },
      events: {
        onReady: () => resolve(player),
        onStateChange: e => onState(e.data),
        onError: e => onError(e.data),
      },
    });
  });
}
