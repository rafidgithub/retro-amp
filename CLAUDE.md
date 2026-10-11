# RetroAmp — project rules

RetroAmp is a Windows 95–XP era music player for YouTube. Vanilla JS, no build step, deployed on Vercel (static files + `api/` functions). README.md has the feature tour and file map.

## Status

- **Phase 1** (player, skins, games): shipped.
- **Phase 2** (guest mode, sign-up, friends, messenger): **planned, not started.** Don't write Phase 2 code until the user says to start. When they do, follow the build order below one step at a time.

## Ground rules (all phases)

- Vanilla ES modules. No bundler, no framework, no build step. `./start.sh` runs it.
- No runtime npm dependencies. Third-party code is vendored as one pinned file in `js/vendor/` with its version and SHA-256 in a header comment. No script CDNs at runtime.
- Build DOM with `h()` / `textContent` from `js/core/util.js`. Never put user- or network-supplied text into `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`.
- Wrap every `localStorage` access in try/catch; the app keeps working without storage.
- `server.js` mirrors Vercel: every `api/*.js` function is mounted in `server.js` too, and security headers in `vercel.json` and `server.js` stay identical.
- Every new window goes through `js/core/wm.js` (`register`, `show`, `hide`) and is styled for every look in `js/core/skins.js`, plus the mobile layout (`wm.isMobile()`).
- Touch screens (`html.touch`, `wm.isTouch()`): nothing may need hover, right-click, double-click or a keyboard. Give each a tap / long-press path or hide it on touch, keep targets about 34px+, and phone CSS uses the same media query as `wm.isMobile()`.
- File layout: shared code in `js/core/`, player code in `js/player/`, `js/main.js` is the app entry. Each feature module is `js/<module>/index.js` + `css/<module>/index.css` (games, camera, browser…): it registers its own windows, desktop icon and Start-menu entry, and lazy-loads heavy code. Looks live in `css/looks/`, skin colors in `css/skins/`.
- YouTube embed rules in README still apply.
- Update README (features, file map, Privacy) in the same change as the feature.
- Example secrets in code, docs and commits use `[PLACEHOLDER]` format. No real keys, tokens, emails or passwords in the repo.

---

## Phase 2 — scope

**In**
1. **Guest mode** — today's app, no account, fully local.
2. **Sign-up / sign-in** — email + password + username.
3. **Friends** — Facebook-style mutual friend requests, block, report.
4. **Messenger** — MSN / Yahoo! Messenger style buddy list and 1:1 chat windows.

**Out** (don't build in Phase 2): group chats (schema leaves room), file/image transfer, voice/video/webcam, end-to-end encryption, playlist sync to the server, public profiles, feed/wall/posts, push or email notifications, payments of any kind.

## Stack

**Supabase** — Postgres + Auth + Realtime, with row-level security (RLS) as the access-control layer.

Why: Vercel functions can't hold WebSocket connections, and auth must not be hand-rolled (password hashing, email verification, session refresh, rate limits). Supabase covers all of it from the browser with no build step.

- Client: vendored UMD build at `js/vendor/supabase.js` (exact pinned 2.x version), lazy-loaded the way `js/player/yt.js` loads the YouTube API — only when someone opens sign-in or the messenger. Guests never download it.
- One client instance, created in `js/social/supa.js`. Nothing else calls `createClient`.
- Config in `js/social/config.js`:
  ```js
  export const SUPABASE_URL = 'https://[PROJECT_REF].supabase.co';
  export const SUPABASE_ANON_KEY = '[SUPABASE_ANON_KEY]';
  ```
  The anon (publishable) key is public by design and is only safe because RLS is on for every table.
- The **service-role key** never goes in the repo, the browser or `js/`. It lives only in Vercel env and a gitignored `.env.local` (`SUPABASE_SERVICE_ROLE_KEY=[PLACEHOLDER]`), and only `api/account.js` uses it.
- Schema, RLS policies, functions and triggers live in `supabase/migrations/*.sql`. No schema changes by clicking in the dashboard.
- Region: Singapore (`ap-southeast-1`), nearest to Bangladesh.
- Production email needs custom SMTP. Supabase's built-in mailer is for testing and heavily rate-limited.
- Add `supabase/`, `.env*` and `CLAUDE.md` to `.vercelignore`; add `.env*` to `.gitignore`.

## Files to add

| File | Job |
| --- | --- |
| `js/social/config.js` | Supabase URL + anon key |
| `js/social/supa.js` | Lazy-loads the vendored client, single instance, session events |
| `js/social/auth.js` | Guest / sign-up / sign-in / reset / sign-out / delete-account windows |
| `js/social/friends.js` | Find by username, requests, friend list, unfriend, block, report |
| `js/social/im.js` | Buddy list, presence, chat windows, nudge, typing, unread |
| `css/social/index.css` | Auth + messenger window structure; per-look colors go in the skin files |
| `api/account.js` | `DELETE` own account: verifies the user's JWT, then admin-deletes |
| `assets/avatars/` | Built-in pixel avatars |
| `supabase/migrations/` | Tables, RLS, RPC functions, triggers |
| `supabase/tests/` | pgTAP tests for every policy and function |

## Accounts

**Guest**
- The default. Exactly today's app: player, skins, games, local playlist.
- Zero requests to Supabase. No cookies, nothing new stored.
- Can't search users, add friends or chat. Social windows say "Sign up to add friends and chat."

**Sign-up** (one screen)
- Fields: email, password, username, display name, "I'm 13 or older" checkbox.
- Password: min 8 chars, no composition rules. Turn on Supabase leaked-password protection if the plan allows.
- Email must be confirmed before any social feature works — enforced in RLS/functions, not only the UI.
- Username: `^[a-z0-9_]{3,20}$`, stored lowercase, unique, can't be changed in Phase 2. Reserved: `admin`, `support`, `system`, `root`, `help`, `mod`, `moderator`, `official`, anything starting with `retroamp`.
- Display name: 1–40 chars, no control characters. Always shown next to `@username` so impersonation is visible.
- Collect nothing else: no phone, birthday, real name, gender or location.
- CAPTCHA (Cloudflare Turnstile through Supabase Auth) on sign-up and password reset before public launch.

**Sign-in / session**
- Email + password, and "Forgot password" by email link. No custom password hashing, JWT parsing or token storage — Supabase Auth does it.
- Auth redirect allowlist: the production domain and `http://localhost:3000` only.
- supabase-js keeps the session under its own key. Never copy tokens into the `retroamp:v1` state.
- Sign out clears the session and all in-memory social state; local playlist and skin stay. Offer "Sign out everywhere".
- Guest → account keeps the local playlist (it stays local).

**Delete account**
- In-app, one confirmation, calls `api/account.js`. Removes the auth user, profile, friendships, requests, blocks, memberships and every message they sent.
- Reports they filed or that target them keep a text snapshot and are deleted after 90 days.

## Friends (Facebook-style, mutual)

- Find people by **exact username only**. No browse-all, no fuzzy search, no "people you may know" — stops scraping and enumeration.
- Request, then accept or decline. The requester isn't told about a decline.
- Unfriend any time, silently.
- **Block**: removes the friendship, cancels requests both ways, hides both users from each other's search, presence and messages. The blocked user sees a generic "Can't send" — never "you are blocked".
- **Report** a user or message: reason + optional note. The UI says the reported message is shared with the operator.
- Friend lists are private. Nobody sees another user's friends or friend count.
- Limits: 20 requests/day per user, 1000 friends max.
- Avatars: choose from `assets/avatars/`. No uploads in Phase 2 (no storage, no image moderation).

## Messenger (MSN / Yahoo! Messenger feel)

**Buddy list window**
- Groups "Online (n)" and "Offline (n)": status icon, display name, personal message.
- Status: Online, Away, Busy, Appear Offline. Auto-Away after 10 minutes idle.
- Personal message ≤ 120 chars.
- "Now playing" line (♫ Artist – Title) from the current track. **Off by default**, opt-in toggle — listening history is personal data.
- Pending requests at the top with Accept / Decline.
- "<name> has signed in" toast, bottom-right, friends only, can be turned off.

**Chat windows**
- 1:1 only, **friends only** (enforced server-side). Each conversation is its own `wm.js` window; its taskbar button flashes on a new message when unfocused.
- History loads in pages of 50, newest first, and survives reload.
- Text only, 1–2000 chars, control characters stripped except `\n`. Auto-link `http(s)` URLs only, with `rel="noopener noreferrer"` and `target="_blank"`. No link previews.
- Emoticons: text codes (`:)` `:(` `:D` `;)` `:P` `(Y)`) swapped for our own pixel sprites as DOM nodes, never HTML strings.
- **Nudge**: shakes the recipient's chat window and plays a sound. Max 1 per 15 s per conversation.
- "<name> is typing…": ephemeral broadcast, max 1 event per 3 s, never stored.
- **Share track**: send the current track as a card; the recipient can Play or Add to playlist. Validate the ID with `VIDEO_ID` on send and on receive.
- Unread counts from `conversation_members.last_read_at`. No read receipts in Phase 2.
- Delete own message: hard delete for both sides.
- Sounds: original, short, with their own mute toggle.
- Limit: 30 messages/min per user.

**Branding**: inspired by MSN Messenger and Yahoo! Messenger, not a copy. No Microsoft or Yahoo names, logos, icons, sounds or emoticon art (no butterfly, no yellow smiley). Draw and record our own. Working name: "RetroAmp Messenger".

## Data model (starting point)

```sql
profiles             (id uuid pk references auth.users on delete cascade,
                      username citext unique, display_name, avatar,
                      personal_message, status, last_seen_at,
                      share_now_playing bool default false, now_playing jsonb,
                      created_at)
                      -- no email column: email stays in auth.users and is never exposed
friend_requests      (id, from_id, to_id, created_at, unique (from_id, to_id))
friendships          (user_low, user_high, created_at,
                      primary key (user_low, user_high), check (user_low < user_high))
blocks               (blocker_id, blocked_id, created_at, primary key (blocker_id, blocked_id))
reports              (id, reporter_id, target_id, message_id, reason, note, snapshot, created_at)
conversations        (id, kind text default 'direct', created_at)  -- 'group' later
conversation_members (conversation_id, user_id, last_read_at, primary key (conversation_id, user_id))
messages             (id, conversation_id, sender_id, kind text,  -- 'text' | 'nudge' | 'track'
                      body, track jsonb, created_at)
```

**Realtime design**
- Each signed-in user subscribes to one private inbox channel, `user:<uuid>`, which only that user may join.
- DB triggers broadcast new messages, friend requests and friend status changes into the recipients' inbox channels.
- Typing goes over a private `dm:<conversation_id>` channel, members only.
- Online/offline: the client updates `last_seen_at` every 60 s while the tab is open. A friend counts as offline after 2 minutes without one. Clients refetch friends' presence every 60 s and on reconnect.

## Security rules (non-negotiable)

- RLS on every table in `public`, default deny. A table without RLS is a bug.
- Clients **read** through RLS-checked selects and **write only through Postgres functions (RPC)**. Revoke direct insert/update/delete on tables from `anon` and `authenticated`.
- Every RPC is `security definer` with `set search_path = ''`. It takes the caller from `auth.uid()` (never from an argument), checks email confirmed, checks friendship and blocks, validates lengths, applies its rate limit and returns generic errors.
- Realtime uses **private channels only** (Realtime Authorization). Messages, typing and presence reach only conversation members or accepted friends. Client-side filtering is never the only check.
- Presence, personal message and now playing are visible only to accepted friends, and Appear Offline hides presence completely — enforced server-side.
- Never log message bodies, passwords, tokens or emails — not in the console, `api/`, or DB functions.
- Users see generic error messages. Details go to the console only in local dev.
- Tighten CSP in both `vercel.json` and `server.js`. Starting point — verify every skin, the games and YouTube playback with the console open before shipping:
  ```
  default-src 'self'; script-src 'self' https://www.youtube.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com; img-src 'self' data: blob: https://i.ytimg.com; connect-src 'self' https://[PROJECT_REF].supabase.co wss://[PROJECT_REF].supabase.co; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'
  ```
  Add `https://challenges.cloudflare.com` to `script-src` and `frame-src` when Turnstile goes in.
  Keep `blob:` in `img-src` (Gallery thumbnails), `https://www.google.com` in `frame-src` (Internet window) and `camera=(self)` in `Permissions-Policy` (Camera window).

## Privacy

Phase 2 ends README's "no accounts" promise. Rewrite the README intro and Privacy section and the `package.json` description before release.
- State exactly what is stored (email, username, display name, avatar choice, personal message, friend list, messages, now playing if turned on), where (Supabase, Singapore), who can see it, how long it's kept, and how to delete it.
- Messages are **not end-to-end encrypted**; the operator can technically read them. Say so plainly in README and on the sign-up screen. Only look at messages that were reported.
- Before public launch, check the current Bangladesh personal-data protection rules (consent, cross-border transfer or localization, breach notification). Storing Bangladeshi users' data in Singapore may need explicit consent or a different setup.
- Age 13+ only.
- Guest mode stays fully private: no Supabase, no cookies, nothing new.

## Reliability

- The player never depends on Supabase. If Supabase is down or blocked, music, skins and games still work; social windows show "Can't reach the messenger. Retrying…" and back off.
- After a Realtime disconnect: reconnect with backoff, then fetch everything since the last message seen so nothing is missed.
- The Supabase free plan pauses idle projects; note it in README for anyone self-hosting.

## Build order

Do one step, verify it, then stop and show the user before starting the next.

1. **Foundation** — Supabase project, migrations (all tables, RLS, RPCs, triggers), pgTAP tests, `js/social/config.js`, `js/social/supa.js`, vendored client. *Done when* `supabase test db` passes and a guest session makes zero Supabase requests.
2. **Accounts** — guest default, sign-up, email confirm, sign-in, reset, sign-out, delete account (`api/account.js`, mounted in `server.js`). *Done when* an account can be created, confirmed, used and fully deleted.
3. **Friends** — find by username, requests, accept/decline, unfriend, block, report, avatars. *Done when* two accounts become friends and block works both ways.
4. **Buddy list** — presence, status, personal message, now-playing opt-in, sign-in toasts. *Done when* a friend sees a status change within seconds and a stranger sees nothing.
5. **Chat** — windows, history, realtime delivery, typing, unread, nudge, share track, emoticons, sounds. *Done when* two browsers chat in real time and history survives reload.
6. **Hardening** — rate limits verified, CSP tightened, Turnstile, custom SMTP, README/privacy rewrite, pass over every look and mobile.

## Testing

- pgTAP tests for every policy and RPC with five actors: owner, friend, stranger, blocked user, anon. A stranger must never read another user's messages, friends, presence or now playing, or anyone's email.
- Manual: two browsers (normal + private window), two accounts, full flow: sign up → friend → chat → nudge → block → delete account.
- Guest regression: as a guest, DevTools Network shows zero requests to `supabase.co`; with that domain blocked, the player still works.
- Every look in `js/core/skins.js` renders the auth, buddy list and chat windows correctly, on desktop and mobile.

## Open decisions (defaults apply until the user says otherwise)

- Backend: Supabase. Alternative: own Node + WebSocket server on a VPS (more control, more ops).
- Guests can't chat.
- Messages are friends-only.
- Messages are kept until the sender deletes them or deletes their account. Alternative: auto-delete after N days.
- Working name "RetroAmp Messenger".
