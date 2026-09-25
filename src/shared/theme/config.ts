/** Mirrors the `[data-skin]` blocks in `app/styles/skins/*.css` and the boot script in index.html. */
export const SKINS = ['minimal', 'retro', 'pixel', 'glass'] as const
export type Skin = (typeof SKINS)[number]
export const DEFAULT_SKIN: Skin = 'minimal'

/**
 * - `calm`    – short, close-range entrances; no loops, parallax or scrubbed flourishes
 * - `lively`  – the full choreography as authored
 * - `stepped` – same choreography, played frame-by-frame like a sprite
 */
export type MotionStyle = 'calm' | 'lively' | 'stepped'

export interface SkinManifest {
  motion: MotionStyle
  /** `<meta name="theme-color">` – the skin's canvas */
  themeColor: string
  /** Google Fonts css2 `family=` params, loaded on demand (minimal's fonts ship in index.html) */
  fonts?: string
}

export const SKIN_MANIFEST: Record<Skin, SkinManifest> = {
  minimal: { motion: 'calm', themeColor: '#000000' },
  retro: {
    motion: 'lively',
    themeColor: '#1c1410',
    fonts: 'family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..900,0..100,0..1&family=Space+Mono:wght@400;700',
  },
  pixel: { motion: 'stepped', themeColor: '#10121f', fonts: 'family=VT323&family=DotGothic16' },
  glass: { motion: 'lively', themeColor: '#070a12', fonts: 'family=Geist:wght@400..800' },
}

export const isSkin = (v: unknown): v is Skin => SKINS.includes(v as Skin)
