# timuze — listening stats for music lovers

React 19 + TypeScript · **Feature-Sliced Design** · TanStack Router / Query / Table / Store · GSAP (ScrollTrigger, SplitText, Flip) · three.js · Tailwind CSS 4 + tailwind-merge.

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_SPOTIFY_CLIENT_ID
npm run dev            # http://127.0.0.1:5173
```

### Create a Spotify app

1. Go to <https://developer.spotify.com/dashboard> → **Create app**, tick **Web API** (and **Web Playback SDK** for the in-browser player).
2. Redirect URI: `http://127.0.0.1:5173/callback` (Spotify **no longer accepts `localhost`** – use `127.0.0.1`; in production use `https://…/callback`).
3. Copy the **Client ID** into `.env`. No Client Secret needed — the app uses **Authorization Code + PKCE**, front-end only.
4. Apps in *Development Mode* (since 02/2026): the app owner needs Spotify Premium and at most 5 users are allowed — add their emails under **User Management**.

### Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds and publishes the site on every push to `main`, at `https://<user>.github.io/<repo>/`. One-time setup:

1. Repo → **Settings → Pages** → Source: **GitHub Actions**.
2. Repo → **Settings → Secrets and variables → Actions → Variables** → add `VITE_SPOTIFY_CLIENT_ID` (a public value with PKCE) and, optionally, `VITE_LASTFM_API_KEY` (public too).
3. Spotify Dashboard → your app → add the Redirect URI `https://<user>.github.io/<repo>/callback` (keep the `127.0.0.1` one for local dev).

The workflow builds with `BASE_PATH=/<repo>/` and copies `index.html` to `404.html`, so deep links like `/callback` still load the app.

## Features

| Page | Data source |
| --- | --- |
| Overview – hero, KPIs, top 9 artists (podium), insights (loyalty, decade taste, night owl), top tracks, top albums, genres, listening clock | `/me`, `/me/top/*`, `/me/player/recently-played`, `/me/tracks`, `/me/albums`, `/me/following` |
| Artists / Tracks – up to 99 items, 3 time ranges (4 weeks · 6 months · 1 year) | `/me/top/{artists,tracks}` (2 pages: offset 0 + 49) |
| Albums – **derived**, since Spotify has no top-albums endpoint | 99 top tracks, scored by rank |
| Recent – day-by-day timeline | `/me/player/recently-played` (max 50) |
| **Streams** – real stream counts, minutes listened, yearly Wrapped, monthly chart, weekday×hour heatmap, devices, sortable/searchable/paginated table (TanStack Table v9) | Data exports from **Spotify** (*Extended streaming history*), **YouTube Music** (Google Takeout, JSON), **Apple Music** (privacy.apple.com) or your **Last.fm** scrobbles — see [Importing listening history](#importing-listening-history). Processed 100% in the browser, stored in IndexedDB |
| **Ranking** – pick an album (search or recently played), drag its tracks into your order, leave some out, rename the ranking, then export a 1080×1920 story image (colours detected from the cover, optional background photo) and share it | `/search`, `/albums/{id}`, `/me/player/recently-played` |

- **Now playing & turntable** – the sidebar card and the landing-page turntable mirror whatever you're playing on Spotify. An app or device that's already playing keeps priority (controlled via the Web API); only when nothing is playing does timuze start its own in-browser player (Web Playback SDK, Premium only).
- **Skins** – Minimal, Retro, Pixel and Glass: colours, fonts, corners, panels and motion style (calm · lively · stepped) all switch together.

> The Spotify Web API does **not** return stream / play counts, so “streams” come from your personal data export; a stream counts from ≥ 30 seconds.
> Since 02/2026 fields like `popularity`, `followers`, `email`, `country`… are dropped for Dev Mode apps, and search returns at most 10 results per page — the code doesn't rely on them.
> There is no server: tokens, imported history and rankings live in your browser only. Rankings aren't saved — export the image to keep one.

## Importing listening history

The **Streams** page merges plays from several sources. Each import is stored separately (and can be deleted on its own); the page shows them merged. Step-by-step instructions, wait times and warnings are shown in the app (vi / en / ja).

| Source | How | Notes |
| --- | --- | --- |
| Spotify | `.zip` / `Streaming_History_Audio_*.json` from *Extended streaming history* | Real play length. Up to 30 days to arrive. |
| YouTube Music | Google Takeout → YouTube and YouTube Music → history, **JSON** | No play length: each entry counts as 3 min (estimate). Only the `YouTube Music` header is kept. |
| Apple Music | `.zip` from privacy.apple.com (nested zips are opened) or the *Play Activity* CSV | Columns are matched by name, so a new Apple layout may not be recognised. |
| Last.fm | Username of a **public** profile, fetched with `user.getrecenttracks` | No play length (3 min estimate). Apple Music / YouTube Music only appear if a scrobbler is installed. |

- Only title, artist, album, time and play length are kept; IP addresses, devices and the rest of each file are discarded. Nothing is uploaded.
- A play seen by two sources (e.g. Spotify export + Last.fm) is merged at read time when track, artist and start time (±90 s) match; the record with the real play length wins. Tune `WINDOW_MS` in `entities/stream-history/model/dedupe.ts`. Deleting an import brings the merged plays back.
- Storage goes through the `PlayStore` interface (`entities/stream-history/api/store.ts`): IndexedDB today, swappable for a backend later without touching the UI.
- Last.fm needs an API key. Set `VITE_LASTFM_API_KEY` (a public value – never the shared secret) or leave it empty and users paste their own key, which stays in their browser. Create one at <https://www.last.fm/api/account/create>.

## Using timuze without Spotify

`/login` is the entry point: Last.fm username, history files (Spotify, YouTube Music, Apple Music) or Spotify login. Without a Spotify login every page is rebuilt from the imported history, in the same shapes the Spotify queries return (`entities/local-library`), so the widgets are shared:

- Top artists / tracks / albums use the same three ranges (4 weeks · 6 months · 1 year), counted back from the latest play.
- Cover art, genre, release date and album tracklists (for ranking) come from the public iTunes Search API. Lookups are queued (about one per 1.2 s, backing off when rate limited) and cached, so covers fill in progressively. Last.fm covers are saved at import time. Artists have no photo source, so they borrow the cover of their most played track.
- The artist country filter, now-playing and the web player stay Spotify-only.
- A Spotify login can be **timuze buddy** (timuze's own app, limited to the accounts added in the Spotify dashboard) or **your own app** (paste a Client ID, optionally name it – the name shows after "timuze"). Logged in, the pages use Spotify data; imported history still feeds **Streams**.
- The header shows the highest-priority source: Spotify login → Last.fm → Spotify export account → YouTube Music / Apple Music; a **+** lists every source.
- On **Streams** you can look at one source or all of them; in the all-sources view the monthly chart is stacked by source and each heatmap cell is split by share (with a minimum slice so a 1% source stays visible).

## FSD structure

```text
src/
├─ app/          # entry, providers (QueryClient, Router), styles (Tailwind @theme + skins), routes/ (file-based TanStack Router)
├─ pages/        # landing, callback, dashboard, top-artists, top-tracks, top-albums, recent, history, rank, not-found
├─ widgets/      # app-shell, profile-hero, top-artists, top-tracks, top-albums, listening-insights, genre-breakdown,
│                # listening-clock, recent-timeline, history-dashboard, now-playing, hero-turntable, page-header
├─ features/     # auth (PKCE login/logout), time-range, top-filter, import-history, switch-locale, switch-skin,
│                # web-player (SDK + Spotify Connect remote), rank-album (search, drag-to-rank, share image)
├─ entities/     # user, artist, track, album, library (types + requests), stream-history (parse, aggregate, dedupe, PlayStore), local-library (history → Spotify-shaped data, iTunes lookups)
└─ shared/       # api (client, session, paging), i18n, theme (skins, motion), config, lib (cn, gsap, pkce, idb, format), ui (Button, Island, charts…)
```

Import rule: only import from lower layers (`app → pages → widgets → features → entities → shared`), through each slice's public API (`index.ts`).

- Router: `src/app/routes` → generates `src/app/routeTree.gen.ts`; `_app.tsx` is the auth-guarded layout, search params (`?range=`, `?album=`) are validated with `validateSearch`, loaders prefetch through TanStack Query.
- Styling: inline utilities, merged with `cn()` = `clsx` + `tailwind-merge`; design tokens in `@theme` in `app/styles/index.css`, each skin in `app/styles/skins/*.css` sets the raw `--skin-*` variables.
- Animation: `useGSAP` (auto cleanup), SplitText for headings, ScrollTrigger for reveals/charts, Flip for layout changes, every tween tuned to the skin's motion style via `tune()`; `prefers-reduced-motion` is respected.

## Internationalisation (i18next)

Supports **Tiếng Việt · English · 日本語** with `i18next` + `react-i18next`. The language comes from the saved choice → the browser language → English, and is switched from the language menu.

```text
src/shared/i18n/locales/<vi|en|ja>/
├─ common.json              # text shared across screens: buttons (back, login, logout, retry…), errors, units, calendar, time ranges, common labels
├─ pages/<page>.json        # text for one page      → useTranslation('pages/landing')
├─ widgets/<widget>.json    # text for one widget    → useTranslation('widgets/history-dashboard')
└─ features/<feature>.json  # text for one feature   → useTranslation('features/import-history')
```

- Each namespace matches an FSD slice. Text used in one place stays in that slice's namespace; once 2+ slices use it, move it to `common`.
- Need `common` too: `useTranslation(['widgets/app-shell', 'common'])`, then `t('common:actions.retry')`.
- Plurals: `key_one` / `key_other` + `{ count }` (vi and ja only need `_other`). Rich text: `<Trans components={{ link: <a … /> }} />` with a `<link>…</link>` tag in the JSON.
- `vi` is the source of truth: keys are type-checked (`i18next.d.ts`), and a key missing from `en`/`ja` fails `tsc` (`satisfies Resources` in `locales/<lng>/index.ts`). New namespace → add the JSON file for all 3 languages and register it in the 3 `index.ts` files.
- Numbers, dates, "3 hr 25 min": use `useFormatters()`.

## Scripts

`npm run dev` · `npm run build` (tsc -b + vite build) · `npm run typecheck` · `npm run preview`
