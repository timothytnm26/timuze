# timuze — Spotify stats for music lovers

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

## Features

| Page | Data source |
| --- | --- |
| Overview – hero, KPIs, top 9 artists (podium), insights (loyalty, decade taste, night owl), top tracks, top albums, genres, listening clock | `/me`, `/me/top/*`, `/me/player/recently-played`, `/me/tracks`, `/me/albums`, `/me/following` |
| Artists / Tracks – up to 99 items, 3 time ranges (4 weeks · 6 months · 1 year) | `/me/top/{artists,tracks}` (2 pages: offset 0 + 49) |
| Albums – **derived**, since Spotify has no top-albums endpoint | 99 top tracks, scored by rank |
| Recent – day-by-day timeline | `/me/player/recently-played` (max 50) |
| **Streams** – real stream counts, minutes listened, yearly Wrapped, monthly chart, weekday×hour heatmap, devices, sortable/searchable/paginated table (TanStack Table v9) | *Extended streaming history* export from spotify.com/account/privacy (.zip or .json), processed 100% in the browser, stored in IndexedDB |
| **Ranking** – pick an album (search or recently played), drag its tracks into your order, leave some out, rename the ranking, then export a 1080×1920 story image (colours detected from the cover, optional background photo) and share it | `/search`, `/albums/{id}`, `/me/player/recently-played` |

- **Now playing & turntable** – the sidebar card and the landing-page turntable mirror whatever you're playing on Spotify. An app or device that's already playing keeps priority (controlled via the Web API); only when nothing is playing does timuze start its own in-browser player (Web Playback SDK, Premium only).
- **Skins** – Minimal, Retro, Pixel and Glass: colours, fonts, corners, panels and motion style (calm · lively · stepped) all switch together.

> The Spotify Web API does **not** return stream / play counts, so “streams” come from your personal data export; a stream counts from ≥ 30 seconds.
> Since 02/2026 fields like `popularity`, `followers`, `email`, `country`… are dropped for Dev Mode apps, and search returns at most 10 results per page — the code doesn't rely on them.
> There is no server: tokens, imported history and rankings live in your browser only. Rankings aren't saved — export the image to keep one.

## FSD structure

```text
src/
├─ app/          # entry, providers (QueryClient, Router), styles (Tailwind @theme + skins), routes/ (file-based TanStack Router)
├─ pages/        # landing, callback, dashboard, top-artists, top-tracks, top-albums, recent, history, rank, not-found
├─ widgets/      # app-shell, profile-hero, top-artists, top-tracks, top-albums, listening-insights, genre-breakdown,
│                # listening-clock, recent-timeline, history-dashboard, now-playing, hero-turntable, page-header
├─ features/     # auth (PKCE login/logout), time-range, top-filter, import-history, switch-locale, switch-skin,
│                # web-player (SDK + Spotify Connect remote), rank-album (search, drag-to-rank, share image)
├─ entities/     # user, artist, track, album, library (types + requests), stream-history (parse + aggregate)
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
