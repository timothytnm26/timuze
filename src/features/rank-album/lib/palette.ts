/** Colour helpers for the share image: pull a palette out of the album cover and build a theme from it. */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Used when the cover can't be read (no CORS, no image). */
export const FALLBACK_PALETTE = ['#1ed760', '#ff5c8a', '#8fb4ff', '#f2a93b', '#b18cff', '#5bd6c9']

const covers = new Map<string, Promise<HTMLImageElement | null>>()

/** Loads (once) an image the canvas may read back – Spotify's CDN sends CORS headers. */
export function loadCorsImage(url: string) {
  let p = covers.get(url)
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    })
    covers.set(url, p)
  }
  return p
}

export const hexToRgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
const toHex = ({ r, g, b }: Rgb) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`

function rgbToHsl({ r, g, b }: Rgb) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: h * 60, s, l }
}

const hsl = (h: number, s: number, l: number, a = 1) =>
  `hsl(${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}% / ${a})`

/**
 * Up to 6 distinct colours from the image, most characteristic first: pixels are bucketed on a
 * coarse RGB grid, buckets scored by how much of the cover they cover and how vivid they are.
 * `dominant` is simply the most common colour – the backdrop is built from it.
 */
export function extractPalette(img: HTMLImageElement): { swatches: string[]; dominant: string } | null {
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, size, size)
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, size, size).data
  } catch {
    return null // tainted – no CORS
  }

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 }
    bucket.r += r
    bucket.g += g
    bucket.b += b
    bucket.n++
    buckets.set(key, bucket)
  }
  const colors = [...buckets.values()].map((k) => {
    const rgb = { r: k.r / k.n, g: k.g / k.n, b: k.b / k.n }
    const { s, l } = rgbToHsl(rgb)
    // near-black / near-white wash everything out as an accent
    const tone = l < 0.1 || l > 0.93 ? 0.25 : 1
    return { rgb, n: k.n, score: k.n * (0.35 + s) * tone }
  })
  if (!colors.length) return null

  const dominant = toHex(colors.reduce((a, b) => (b.n > a.n ? b : a)).rgb)
  // the accent gets lifted to a readable lightness, so two shades of one hue end up looking the
  // same – colourful picks must differ in hue, greys in lightness
  const picked: { rgb: Rgb; h: number; s: number; l: number }[] = []
  for (const col of colors.sort((a, b) => b.score - a.score)) {
    const c = { rgb: col.rgb, ...rgbToHsl(col.rgb) }
    const grey = c.s < 0.15
    const far = picked.every((p) => {
      if (grey !== p.s < 0.15) return true
      if (grey) return Math.abs(p.l - c.l) > 0.3
      const dh = Math.abs(p.h - c.h)
      return Math.min(dh, 360 - dh) > 24
    })
    if (far) picked.push(c)
    if (picked.length === 6) break
  }
  return { swatches: picked.map((p) => toHex(p.rgb)), dominant }
}

/** Colours the share image is drawn with – only the skin's *style* is used, never its colours. */
export interface ShareTheme {
  accent: string
  /** a second hue for washes (glass) */
  secondary: string
  canvas: string
  surface: string
  line: string
  ink: string
  inkMuted: string
  inkFaint: string
  /** the canvas colour at `alpha` – laid over an imported background image */
  canvasAt: (alpha: number) => string
}

/**
 * Dark backdrop from the cover's dominant hue, the picked colour as accent (lifted until it reads
 * on that backdrop), light text.
 */
export function themeFrom(accentHex: string, dominantHex: string, secondaryHex?: string): ShareTheme {
  const a = rgbToHsl(hexToRgb(accentHex))
  const base = rgbToHsl(hexToRgb(dominantHex))
  const chroma = a.s > 0.08
  const accent = hsl(a.h, chroma ? Math.max(a.s, 0.45) : 0, Math.min(Math.max(a.l, 0.58), 0.8))
  const sec = rgbToHsl(hexToRgb(secondaryHex ?? dominantHex))
  // grey covers get a neutral backdrop; coloured ones keep a hint of their hue
  const bs = base.s > 0.08 ? Math.min(base.s, 0.55) * 0.75 : 0
  return {
    accent,
    secondary: hsl(sec.h, Math.max(sec.s, 0.35), 0.55),
    canvas: hsl(base.h, bs, 0.075),
    surface: hsl(base.h, bs, 0.13, 0.82),
    line: 'rgb(255 255 255 / 0.14)',
    ink: '#ffffff',
    inkMuted: 'rgb(255 255 255 / 0.74)',
    inkFaint: 'rgb(255 255 255 / 0.46)',
    canvasAt: (alpha) => hsl(base.h, bs, 0.075, alpha),
  }
}

/** Saturated and mid-light enough to carry the image as its accent. */
export const isVivid = (hex: string) => {
  const { s, l } = rgbToHsl(hexToRgb(hex))
  return s > 0.25 && l > 0.25 && l < 0.85
}
