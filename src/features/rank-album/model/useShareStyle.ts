import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Album } from '@/entities/album'
import { extractPalette, FALLBACK_PALETTE, isVivid, loadCorsImage, themeFrom, type ShareTheme } from '../lib/palette'

export interface Palette {
  swatches: string[]
  dominant: string
  /** false → the cover couldn't be read, these are the stock colours */
  detected: boolean
}

export interface ShareBackground {
  /** for the canvas */
  bitmap: ImageBitmap
  /** for the on-page preview */
  url: string
}

/**
 * Colours and backdrop for the ranking: the cover's palette, the accent picked for the image (the
 * most characteristic cover colour by default) and an optional photo from the device. The editor
 * previews with the detected colour; the share sheet applies the picks.
 */
export function useShareStyle(album: Album) {
  const [palette, setPalette] = useState<Palette | null>(null)
  const [accent, setAccent] = useState<string | null>(null)
  const [background, setBackground] = useState<ShareBackground | null>(null)

  useEffect(() => {
    let alive = true
    const url = [...album.images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url
    void (url ? loadCorsImage(url) : Promise.resolve(null)).then((img) => {
      if (!alive) return
      const found = img ? extractPalette(img) : null
      setPalette(
        found?.swatches.length
          ? { ...found, detected: true }
          : { swatches: FALLBACK_PALETTE, dominant: '#101418', detected: false },
      )
    })
    return () => {
      alive = false
    }
  }, [album])

  // free the old photo once it's replaced or the editor goes away
  useEffect(
    () => () => {
      if (!background) return
      background.bitmap.close()
      URL.revokeObjectURL(background.url)
    },
    [background],
  )

  const detected = palette ? (palette.swatches.find(isVivid) ?? palette.swatches[0]!) : null
  const chosen = accent ?? detected
  const build = (c: string | null) =>
    palette && c ? themeFrom(c, palette.dominant, palette.swatches.find((x) => x !== c && isVivid(x))) : null
  // the image: the picked accent · the editor: always the colour detected on the cover
  const theme = useMemo(() => build(chosen), [palette, chosen])
  const defaultTheme = useMemo(() => build(detected), [palette, detected])

  const setBackgroundFile = async (file: File | null) => {
    if (!file) return setBackground(null)
    const bitmap = await createImageBitmap(file)
    setBackground({ bitmap, url: URL.createObjectURL(file) })
  }

  return { palette, chosen, setAccent, theme, defaultTheme, background, setBackgroundFile }
}

/** The theme as CSS variables, for on-page parts drawn like the image (`text-(--rk-accent)` …). */
export function themeVars(theme: ShareTheme, background?: ShareBackground | null): CSSProperties {
  return {
    '--rk-accent': theme.accent,
    '--rk-secondary': theme.secondary,
    '--rk-canvas': theme.canvas,
    '--rk-surface': theme.surface,
    '--rk-line': theme.line,
    '--rk-ink': theme.ink,
    '--rk-muted': theme.inkMuted,
    '--rk-faint': theme.inkFaint,
    // same tint as the canvas lays over a photo
    '--rk-photo': background
      ? `linear-gradient(${theme.canvasAt(0.45)}, ${theme.canvasAt(0.62)} 35%, ${theme.canvasAt(0.88)}), url("${background.url}") center / cover`
      : 'none',
  } as CSSProperties
}
