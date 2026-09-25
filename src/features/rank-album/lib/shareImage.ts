import type { Album, AlbumTrack } from '@/entities/album'
import { loadCorsImage, type ShareTheme } from './palette'

/** Instagram story size */
export const SHARE_WIDTH = 1080
export const SHARE_HEIGHT = 1920
const PAD = 80
/** the top of the list gets the accent colour */
export const TOP_RANKS = 5
const TOP = TOP_RANKS
const MAX_W = 1.7

/** each rank keeps this share of the size above it (above the floor) */
const DECAY = 0.86

/**
 * Relative size of the row at `index`: 1.7 for number one, each rank a fixed step smaller,
 * levelling off towards `min`. The step doesn't depend on how many tracks are ranked, so a top 4
 * stays big instead of being squeezed down to the smallest size. Shared by the editor and the image.
 */
export const rowWeight = (index: number, min = 0.8) => min + (MAX_W - min) * DECAY ** index

export interface ShareImageLabels {
  /** top right, e.g. the date */
  eyebrow: string
  /** the big title beside the cover – the ranking's name */
  title: string
  /** small line at the bottom */
  footer: string
}

export interface ShareImageOptions {
  theme: ShareTheme
  /** an image the user picked – drawn cover-fit under a tint of the theme's canvas */
  background?: ImageBitmap | null
}

/**
 * The active skin's *style* – fonts, corner rounding and which decoration to draw. Colours come
 * from the share theme (the album cover / the user's pick), never from the skin.
 */
function readSkinStyle() {
  const root = document.documentElement
  const cs = getComputedStyle(root)
  const v = (name: string) => cs.getPropertyValue(name).trim()
  return {
    name: root.dataset.skin ?? 'minimal',
    display: v('--skin-font-display'),
    sans: v('--skin-font-sans'),
    mono: v('--skin-font-mono'),
    round: parseFloat(v('--skin-round')) || 0,
  }
}
type SkinStyle = ReturnType<typeof readSkinStyle>

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.max(0, r))
}

/** Cuts `text` with an ellipsis so it fits `max` px in the current font. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text
  let s = text
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1)
  return `${s.trimEnd()}…`
}

/** Greedy word wrap into lines of at most `max` px (a single over-long word stays on its own line). */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = []
  let line = ''
  for (const w of text.split(/\s+/)) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= max || !line) line = next
    else {
      out.push(line)
      line = w
    }
  }
  out.push(line)
  return out
}

/** The biggest title size (≤ `from`) whose wrap fits `maxLines` lines of `width`. */
function fitTitle(ctx: CanvasRenderingContext2D, text: string, font: string, width: number, maxLines: number, from = 84, to = 44) {
  for (let size = from; size >= to; size -= 4) {
    ctx.font = `800 ${size}px ${font}`
    const lines = wrap(ctx, text, width)
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= width)) return { size, lines }
  }
  ctx.font = `800 ${to}px ${font}`
  const lines = wrap(ctx, text, width)
  const kept = lines.slice(0, maxLines)
  if (lines.length > maxLines) kept[maxLines - 1] = fit(ctx, lines.slice(maxLines - 1).join(' '), width)
  return { size: to, lines: kept.map((l) => fit(ctx, l, width)) }
}

function drawBackdrop(ctx: CanvasRenderingContext2D, s: SkinStyle, t: ShareTheme, background?: ImageBitmap | null) {
  ctx.fillStyle = t.canvas
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)

  if (background) {
    // cover-fit, then tint so the text stays readable – darker towards the list
    const scale = Math.max(SHARE_WIDTH / background.width, SHARE_HEIGHT / background.height)
    const w = background.width * scale
    const h = background.height * scale
    ctx.drawImage(background, (SHARE_WIDTH - w) / 2, (SHARE_HEIGHT - h) / 2, w, h)
    const g = ctx.createLinearGradient(0, 0, 0, SHARE_HEIGHT)
    g.addColorStop(0, t.canvasAt(0.45))
    g.addColorStop(0.35, t.canvasAt(0.62))
    g.addColorStop(1, t.canvasAt(0.88))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)
  }

  const wash = (x: number, y: number, r: number, color: string, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'transparent')
    ctx.globalAlpha = alpha
    ctx.fillStyle = g
    ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)
    ctx.globalAlpha = 1
  }
  const soft = background ? 0.55 : 1

  if (s.name === 'glass') {
    wash(60, 0, 900, t.accent, 0.38 * soft)
    wash(SHARE_WIDTH, 520, 820, t.secondary, 0.34 * soft)
    wash(SHARE_WIDTH / 2, SHARE_HEIGHT + 120, 1000, t.accent, 0.22 * soft)
  } else if (s.name === 'retro') {
    wash(SHARE_WIDTH / 2, -200, 1300, t.accent, 0.2 * soft)
    const grain = ctx.createImageData(SHARE_WIDTH, SHARE_HEIGHT)
    for (let i = 0; i < grain.data.length; i += 4) {
      grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = Math.random() * 255
      grain.data[i + 3] = 14
    }
    const layer = document.createElement('canvas')
    layer.width = SHARE_WIDTH
    layer.height = SHARE_HEIGHT
    layer.getContext('2d')!.putImageData(grain, 0, 0)
    ctx.globalCompositeOperation = 'overlay'
    ctx.drawImage(layer, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = t.line
    ctx.lineWidth = 4
    roundRect(ctx, 34, 34, SHARE_WIDTH - 68, SHARE_HEIGHT - 68, 28)
    ctx.stroke()
  } else if (s.name === 'pixel') {
    ctx.fillStyle = 'rgb(255 255 255 / 0.07)'
    for (let y = 12; y < SHARE_HEIGHT; y += 24) for (let x = 12; x < SHARE_WIDTH; x += 24) ctx.fillRect(x, y, 3, 3)
  }
}

/** The "t" note mark from the logo, at `size` px. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(11, 1.5, 3, 18, 1.5)
  ctx.fill()
  ctx.fill(new Path2D('M5.2 9.6a1.3 1.3 0 0 1 1-1.5l11.6-2.6a1.3 1.3 0 0 1 .6 2.5L6.8 10.6a1.3 1.3 0 0 1-1.6-1Z'))
  ctx.beginPath()
  ctx.ellipse(8.9, 19.4, 4.7, 3.5, (-24 * Math.PI) / 180, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

async function drawCover(ctx: CanvasRenderingContext2D, s: SkinStyle, t: ShareTheme, album: Album, x: number, y: number, size: number) {
  const radius = 22 * s.round
  const largest = [...album.images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]
  const img = largest ? await loadCorsImage(largest.url) : null
  ctx.save()
  ctx.shadowColor = 'rgb(0 0 0 / 0.55)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 28
  ctx.fillStyle = t.surface
  roundRect(ctx, x, y, size, size, radius)
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundRect(ctx, x, y, size, size, radius)
  ctx.clip()
  if (img) {
    if (s.name === 'pixel') {
      // sprite-style: shrink, then blow back up without smoothing
      const tiny = document.createElement('canvas')
      tiny.width = tiny.height = 56
      tiny.getContext('2d')!.drawImage(img, 0, 0, 56, 56)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tiny, x, y, size, size)
      ctx.imageSmoothingEnabled = true
    } else ctx.drawImage(img, x, y, size, size)
  } else {
    const g = ctx.createLinearGradient(x, y, x + size, y + size)
    g.addColorStop(0, t.accent)
    g.addColorStop(1, t.secondary)
    ctx.fillStyle = g
    ctx.fillRect(x, y, size, size)
  }
  ctx.restore()
  if (s.name === 'pixel' || s.name === 'minimal') {
    ctx.strokeStyle = t.line
    ctx.lineWidth = s.name === 'pixel' ? 6 : 2
    ctx.strokeRect(x, y, size, size)
  }
}

/**
 * The ranking as a 1080×1920 PNG: header, a small cover beside a big album title, then every
 * ranked track with its artists – rows shrink rank by rank (long albums end in two columns).
 * Styled like the active skin, coloured by `options.theme`.
 */
export async function renderShareImage(album: Album, ranked: AlbumTrack[], labels: ShareImageLabels, options: ShareImageOptions) {
  const s = readSkinStyle()
  const t = options.theme
  // canvas text only uses fonts that are already loaded
  const sample = `${labels.title} ${ranked.map((r) => r.name).join(' ')}`.slice(0, 400)
  await Promise.all(
    [`800 64px ${s.display}`, `700 64px ${s.display}`, `400 34px ${s.sans}`, `600 34px ${s.sans}`, `400 26px ${s.mono}`].map((f) =>
      document.fonts.load(f, sample).catch(() => []),
    ),
  )

  const canvas = document.createElement('canvas')
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  const ctx = canvas.getContext('2d')!
  drawBackdrop(ctx, s, t, options.background)

  // header: mark + wordmark, eyebrow on the right
  drawMark(ctx, PAD, PAD - 6, 52, t.accent)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = t.ink
  ctx.font = `700 44px ${s.display}`
  ctx.fillText('timuze', PAD + 58, PAD + 20)
  ctx.font = `600 26px ${s.mono}`
  ctx.fillStyle = t.accent
  ctx.textAlign = 'right'
  ctx.fillText(fit(ctx, labels.eyebrow.toUpperCase(), SHARE_WIDTH - PAD * 2 - 260), SHARE_WIDTH - PAD, PAD + 20)
  ctx.textAlign = 'left'

  // hero: small cover, big title beside it – the list is what matters
  const n = ranked.length
  const cover = n <= 5 ? 400 : n <= 10 ? 340 : n <= 18 ? 300 : 250
  const heroTop = PAD + 110
  const textX = PAD + cover + 44
  const textW = SHARE_WIDTH - PAD - textX
  const title = fitTitle(ctx, labels.title, s.display, textW, 4, 80, 40)
  const lineH = title.size * 1.04
  const artistSize = 36
  const textH = title.lines.length * lineH + 22 + artistSize
  const heroH = Math.max(cover, textH)
  // the list: every track, each rank a little smaller than the one above it
  const panelX = PAD - 24
  const panelW = SHARE_WIDTH - panelX * 2
  const panelTop = heroTop + heroH + 56
  const panelMax = SHARE_HEIGHT - PAD - 64 - panelTop
  const inset = 28
  // long albums: the head in one column, the tail in two columns of small rows
  const twoCols = n > 20
  const head = twoCols ? 8 : n
  const tailRows = Math.ceil((n - head) / 2)
  const TAIL_W = 0.8
  const weights = Array.from({ length: head }, (_, i) => rowWeight(i, twoCols ? 1.05 : 0.8))
  const total = weights.reduce((a, w) => a + w, 0) + tailRows * TAIL_W
  // unit row height: short lists grow to fill the panel, up to a size that still looks like a list
  const unit = Math.min(100, (panelMax - inset * 2) / total)
  const panelH = inset * 2 + total * unit

  // a short list leaves room over: centre hero + list between the header and the footer
  const shift = Math.max(0, (panelMax - panelH) / 2)
  ctx.save()
  ctx.translate(0, shift)

  await drawCover(ctx, s, t, album, PAD, heroTop + (heroH - cover) / 2, cover)

  let ty = heroTop + (heroH - textH) / 2
  ctx.textBaseline = 'top'
  ctx.fillStyle = t.ink
  ctx.font = `800 ${title.size}px ${s.display}`
  for (const line of title.lines) {
    ctx.fillText(line, textX, ty)
    ty += lineH
  }
  ty += 22
  ctx.font = `600 ${artistSize}px ${s.sans}`
  ctx.fillStyle = t.accent
  ctx.fillText(fit(ctx, album.artists.map((a) => a.name).join(', '), textW), textX, ty)

  ctx.fillStyle = t.surface
  roundRect(ctx, panelX, panelTop, panelW, panelH, 28 * s.round)
  ctx.fill()
  ctx.strokeStyle = t.line
  ctx.lineWidth = s.name === 'pixel' ? 4 : 2
  ctx.stroke()

  // one number column per block, sized by its biggest row, so the titles line up
  const column = (h: number) => ({ rank: Math.max(52, Math.min(h * 0.95, 112)), gap: Math.max(20, Math.min(h * 0.28, 36)) })
  const headColumn = column(weights[0]! * unit)
  const tailColumn = column(TAIL_W * unit)
  const drawRow = (track: AlbumTrack, rank: number, x: number, w: number, top: number, h: number, col: { rank: number; gap: number }) => {
    const cy = top + h / 2
    const rw = col.rank
    const top5 = rank <= TOP
    ctx.textBaseline = 'middle'
    // the whole top 5 carries the accent, the rest stays faint
    ctx.font = `700 ${Math.round(Math.min(h * 0.56, 96))}px ${s.display}`
    ctx.fillStyle = top5 ? t.accent : t.inkFaint
    ctx.textAlign = 'right'
    ctx.fillText(String(rank), x + rw, cy)
    ctx.textAlign = 'left'

    const tx = x + rw + col.gap
    const tw = x + w - tx
    const nameSize = Math.round(Math.min(64, h * 0.36))
    const artistSize = Math.round(Math.min(h * 0.23, 38))
    const artists = track.artists.map((a) => a.name).join(', ')
    const nameFont = `${top5 ? 700 : 500} ${nameSize}px ${s.sans}`
    if (artistSize >= 17) {
      // tall enough: artists on their own line under the title
      const gap = h * 0.06
      const blockH = nameSize + gap + artistSize
      ctx.textBaseline = 'top'
      ctx.font = nameFont
      ctx.fillStyle = t.ink
      ctx.fillText(fit(ctx, track.name, tw), tx, cy - blockH / 2)
      ctx.font = `400 ${artistSize}px ${s.sans}`
      ctx.fillStyle = t.inkMuted
      ctx.fillText(fit(ctx, artists, tw), tx, cy - blockH / 2 + nameSize + gap)
    } else {
      // small rows: "title · artists" on one line
      ctx.font = nameFont
      const name = fit(ctx, track.name, tw * 0.7)
      ctx.fillStyle = t.ink
      ctx.fillText(name, tx, cy)
      const used = ctx.measureText(`${name} `).width
      ctx.font = `400 ${Math.round(nameSize * 0.82)}px ${s.sans}`
      ctx.fillStyle = t.inkMuted
      if (tw - used > 40) ctx.fillText(fit(ctx, `· ${artists}`, tw - used), tx + used, cy)
    }
  }

  const innerX = panelX + inset
  const innerW = panelW - inset * 2
  let y = panelTop + inset
  ranked.slice(0, head).forEach((track, i) => {
    const h = weights[i]! * unit
    drawRow(track, i + 1, innerX, innerW, y, h, headColumn)
    y += h
  })
  if (twoCols) {
    const gap = 32
    const colW = (innerW - gap) / 2
    const h = TAIL_W * unit
    ranked.slice(head).forEach((track, i) => {
      const col = Math.floor(i / tailRows)
      drawRow(track, head + i + 1, innerX + col * (colW + gap), colW, y + (i % tailRows) * h, h, tailColumn)
    })
  }

  ctx.restore()

  // footer
  ctx.textBaseline = 'alphabetic'
  ctx.font = `400 26px ${s.mono}`
  ctx.fillStyle = t.inkFaint
  if (s.name === 'minimal') {
    ctx.fillStyle = t.accent
    ctx.fillRect(PAD, SHARE_HEIGHT - PAD - 10, 120, 6)
    ctx.fillStyle = t.inkFaint
    ctx.textAlign = 'right'
    ctx.fillText(labels.footer, SHARE_WIDTH - PAD, SHARE_HEIGHT - PAD)
  } else {
    ctx.textAlign = 'center'
    ctx.fillText(labels.footer, SHARE_WIDTH / 2, SHARE_HEIGHT - PAD)
  }
  ctx.textAlign = 'left'

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'),
  )
}
