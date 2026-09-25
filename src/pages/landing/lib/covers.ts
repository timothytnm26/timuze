import type { SpotifyImage } from '@/shared/api'

/** Invented titles – the covers are decoration, not anyone's real releases. */
const WORDS = ['Mưa', 'Neon', 'Tháng Tư', 'Blue', 'Hoàng Hôn'] as const

/** Generated SVG gradient artwork, stable per seed. */
const coverArt = (seed: number, label: string): SpotifyImage[] => {
  const h1 = (seed * 47) % 360
  const h2 = (h1 + 60 + (seed % 90)) % 360
  const shape = seed % 3
  const deco =
    shape === 0
      ? `<circle cx="220" cy="80" r="90" fill="hsl(${h2} 90% 70% / .55)"/>`
      : shape === 1
        ? `<rect x="-40" y="170" width="380" height="60" transform="rotate(-18 150 150)" fill="hsl(${h2} 90% 72% / .5)"/>`
        : `<path d="M0 300 Q150 120 300 300Z" fill="hsl(${h2} 85% 65% / .55)"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 70% 45%)"/><stop offset="1" stop-color="hsl(${h2} 60% 18%)"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/>${deco}<text x="24" y="272" font-family="Inter,sans-serif" font-weight="700" font-size="34" fill="white" fill-opacity=".85">${label}</text></svg>`
  return [{ url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, width: 300, height: 300 }]
}

/** Decorative album art for the no-WebGL hero stack. */
export const decorCovers = WORDS.map((word, i) => ({ id: `cover${i}`, images: coverArt(i * 13 + 5, word) }))
