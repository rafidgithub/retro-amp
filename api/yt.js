// GET /api/yt?q=<search>  |  ?list=<playlist id>  |  ?v=<video id>
//
// Reads public YouTube pages server-side (browsers can't — CORS). No API key,
// no user cookies forwarded, nothing logged or stored. Works as a Vercel
// function and is mounted by server.js for local use.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const VIDEO_ID = /^[\w-]{11}$/;
const LIST_ID = /^[\w-]{10,64}$/;
const TIME = /^\d{1,2}(:\d{2}){1,2}$/;

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const q = (params.get('q') || '').trim();
  const list = params.get('list') || '';
  const v = params.get('v') || '';

  try {
    if (q) {
      if (q.length > 200) return send(res, 400, { error: 'That search is too long.' });
      // sp=EgIQAQ== limits results to videos (no channels, playlists or shorts shelves)
      const page = await youtube(`/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`);
      return send(res, 200, { results: tracks(initialData(page), 30) }, 3600);
    }
    if (list) {
      if (!LIST_ID.test(list)) return send(res, 400, { error: 'That playlist link looks wrong.' });
      const data = initialData(await youtube(`/playlist?list=${list}`));
      const results = tracks(data, 200);
      if (!results.length) return send(res, 404, { error: 'Playlist is empty or private.' });
      return send(res, 200, { title: data.metadata?.playlistMetadataRenderer?.title || '', results }, 3600);
    }
    if (v) {
      if (!VIDEO_ID.test(v)) return send(res, 400, { error: 'That video link looks wrong.' });
      const watch = encodeURIComponent(`https://www.youtube.com/watch?v=${v}`);
      const info = JSON.parse(await youtube(`/oembed?format=json&url=${watch}`));
      return send(res, 200, { results: [{ id: v, title: info.title || v, channel: info.author_name || '', seconds: 0 }] }, 86400);
    }
    return send(res, 400, { error: 'Pass q, list or v.' });
  } catch (err) {
    const s = err.status;
    if (s === 401 || s === 403) return send(res, 404, { error: 'That video can’t be played outside YouTube.' });
    if (s === 400 || s === 404) return send(res, 404, { error: 'Not found on YouTube.' });
    return send(res, 502, { error: 'YouTube didn’t answer. Try again in a moment.' });
  }
}

async function youtube(path) {
  const r = await fetch(`https://www.youtube.com${path}`, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Cookie: 'SOCS=CAI', // skips the EU cookie-consent interstitial
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw Object.assign(new Error(`YouTube ${r.status}`), { status: r.status });
  return r.text();
}

function initialData(html) {
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new Error('ytInitialData not found');
  return JSON.parse(m[1]);
}

// Walks YouTube's page JSON and pulls out playable videos. Handles both the
// older *Renderer shapes and the newer lockupViewModel shape.
function tracks(data, limit) {
  const out = [];
  const seen = new Set();
  const add = (id, title, channel, length) => {
    const seconds = typeof length === 'number' ? length : toSeconds(length);
    // no duration = live stream or premiere; skip those
    if (!VIDEO_ID.test(id || '') || !title || !seconds || seen.has(id) || out.length >= limit) return;
    seen.add(id);
    out.push({ id, title, channel: channel || '', seconds });
  };
  const walk = node => {
    if (!node || typeof node !== 'object' || out.length >= limit) return;
    if (Array.isArray(node)) return node.forEach(walk);
    const r = node.videoRenderer || node.playlistVideoRenderer;
    if (r) return add(r.videoId, text(r.title), text(r.ownerText || r.shortBylineText), Number(r.lengthSeconds) || text(r.lengthText));
    const l = node.lockupViewModel;
    if (l) {
      if (l.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
        const meta = l.metadata?.lockupMetadataViewModel;
        const channel = meta?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content;
        add(l.contentId, meta?.title?.content, channel, badgeTime(l.contentImage));
      }
      return;
    }
    for (const k in node) walk(node[k]);
  };
  walk(data);
  return out;
}

const text = t => t?.simpleText ?? t?.runs?.map(r => r.text).join('') ?? '';
const toSeconds = s => (TIME.test(s || '') ? s.split(':').reduce((a, n) => a * 60 + Number(n), 0) : 0);

// The duration ("3:55") sits in a thumbnail badge somewhere under contentImage.
function badgeTime(node) {
  if (!node || typeof node !== 'object') return '';
  if (typeof node.text === 'string' && TIME.test(node.text)) return node.text;
  for (const k in node) {
    const t = badgeTime(node[k]);
    if (t) return t;
  }
  return '';
}

function send(res, status, body, maxAge = 0) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', maxAge ? `public, max-age=300, s-maxage=${maxAge}, stale-while-revalidate=86400` : 'no-store');
  res.end(JSON.stringify(body));
}
