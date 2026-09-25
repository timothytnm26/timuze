# timuze — Spotify stats cho người mê nhạc

React 19 + TypeScript · **Feature-Sliced Design** · TanStack Router / Query / Table / Store · GSAP (ScrollTrigger, SplitText) · Tailwind CSS 4 + tailwind-merge.

## Chạy thử

```bash
npm install
cp .env.example .env   # điền VITE_SPOTIFY_CLIENT_ID
npm run dev            # http://127.0.0.1:5173
```

### Tạo app Spotify
1. Vào <https://developer.spotify.com/dashboard> → **Create app**, tick **Web API**.
2. Redirect URI: `http://127.0.0.1:5173/callback` (Spotify **không còn chấp nhận `localhost`** – phải dùng `127.0.0.1`; khi deploy dùng `https://…/callback`).
3. Copy **Client ID** vào `.env`. Không cần Client Secret — app dùng **Authorization Code + PKCE** thuần front-end.
4. App ở *Development Mode* (từ 02/2026): chủ app cần Spotify Premium, tối đa 5 user — thêm email người dùng ở tab **User Management**.

## Tính năng

| Trang | Nguồn dữ liệu |
|---|---|
| Tổng quan – hero, KPI, top 9 nghệ sĩ (bục vinh danh), góc nhìn (độ chung thuỷ, gu thập niên, cú đêm), top bài, top album, thể loại, đồng hồ nghe | `/me`, `/me/top/*`, `/me/player/recently-played`, `/me/tracks`, `/me/albums`, `/me/following` |
| Nghệ sĩ / Bài hát – tới 99 mục, 3 khoảng thời gian (4 tuần · 6 tháng · 1 năm) | `/me/top/{artists,tracks}` (2 trang: offset 0 + 49) |
| Album – **tự tính** vì Spotify không có endpoint top album | 99 top tracks, chấm điểm theo thứ hạng |
| Gần đây – timeline theo ngày | `/me/player/recently-played` (tối đa 50) |
| **Lượt stream** – số lượt stream thật, phút nghe, Wrapped theo năm, biểu đồ tháng, heatmap thứ×giờ, thiết bị, bảng xếp hạng sort/search/phân trang (TanStack Table v9) | File *Extended streaming history* từ spotify.com/account/privacy (.zip hoặc .json), xử lý 100% trong trình duyệt, lưu IndexedDB |

> Spotify Web API **không** trả về số lượt stream/play count. Vì vậy “lượt stream” lấy từ file xuất dữ liệu cá nhân; ngưỡng tính 1 stream là ≥ 30 giây.
> Từ 02/2026 các trường `popularity`, `followers`, `email`, `country`… bị bỏ với app Dev Mode — code không phụ thuộc vào chúng.

## Cấu trúc FSD

```
src/
├─ app/          # entry, providers (QueryClient, Router), styles (Tailwind @theme), routes/ (file-based TanStack Router)
├─ pages/        # landing, callback, dashboard, top-artists, top-tracks, top-albums, recent, history, not-found
├─ widgets/      # app-shell, profile-hero, top-artists, top-tracks, top-albums, listening-insights,
│                # genre-breakdown, listening-clock, recent-timeline, history-dashboard, now-playing, page-header
├─ features/     # auth (PKCE login/logout), time-range, import-history, switch-locale
├─ entities/     # user, artist, track, album, library (types + requests), stream-history (parse + aggregate)
└─ shared/       # api (client, session, paging), i18n, config, lib (cn, gsap, pkce, idb, format), ui (Button, Card, charts…)
```

Quy tắc import: chỉ import từ layer thấp hơn (`app → pages → widgets → features → entities → shared`), qua `index.ts` public API của mỗi slice.

- Router: `src/app/routes` → sinh `src/app/routeTree.gen.ts`; `_app.tsx` là layout guard, `?range=` được validate bằng `validateSearch`, loader prefetch qua TanStack Query.
- Style: utility inline, gộp bằng `cn()` = `clsx` + `tailwind-merge`; design token trong `@theme` ở `app/styles/index.css`.
- Animation: `useGSAP` (tự cleanup), SplitText cho tiêu đề, ScrollTrigger cho reveal/biểu đồ, tôn trọng `prefers-reduced-motion`.

## Đa ngôn ngữ (i18next)

Hỗ trợ **Tiếng Việt · English · 日本語** bằng `i18next` + `react-i18next`. Ngôn ngữ lấy theo lựa chọn đã lưu → ngôn ngữ trình duyệt → English, đổi bằng nút VI · EN · JA.

```
src/shared/i18n/locales/<vi|en|ja>/
├─ common.json              # text dùng lại ở nhiều nơi: nút (back, login, logout, retry…), lỗi, đơn vị, lịch, khoảng thời gian, nhãn chung
├─ pages/<page>.json        # text riêng của từng page   → useTranslation('pages/landing')
├─ widgets/<widget>.json    # text riêng của từng widget → useTranslation('widgets/history-dashboard')
└─ features/<feature>.json  # text riêng của feature     → useTranslation('features/import-history')
```

- Mỗi namespace trùng tên slice FSD. Text chỉ dùng ở một chỗ thì để trong namespace của slice đó; dùng từ 2 slice trở lên thì chuyển vào `common`.
- Cần cả `common`: `useTranslation(['widgets/app-shell', 'common'])` rồi `t('common:actions.retry')`.
- Số nhiều: `key_one` / `key_other` + `{ count }` (vi, ja chỉ cần `_other`). Rich text: `<Trans components={{ link: <a … /> }} />` với thẻ `<link>…</link>` trong JSON.
- `vi` là nguồn chuẩn: key được type-check (`i18next.d.ts`), và `en`/`ja` thiếu key sẽ làm `tsc` báo lỗi (`satisfies Resources` trong `locales/<lng>/index.ts`). Thêm namespace mới → thêm file JSON cho cả 3 ngôn ngữ và khai báo trong 3 file `index.ts`.
- Số, ngày, "3 giờ 25 phút": dùng `useFormatters()`.

## Scripts
`npm run dev` · `npm run build` (tsc -b + vite build) · `npm run typecheck` · `npm run preview`
