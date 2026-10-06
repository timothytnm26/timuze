import type { Skin } from '../../theme/config'

/**
 * Every icon is a plain .svg file next to this one, so it can be opened, edited and previewed as is.
 * `currentColor` takes the text colour; stroke icons take weight, caps and joins from the skin
 * (`--icon-stroke`, `--icon-cap`, `--icon-join` in each skin's css).
 *
 * A skin can draw an icon its own way: put `skins/<skin>/<name>.svg` beside the default and it is used
 * whenever that skin is active (pixel does this for the logo and the small controls).
 */
const files = import.meta.glob('./**/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const registry = new Map<string, string>()
for (const [path, svg] of Object.entries(files)) registry.set(path.replace(/^\.\//, '').replace(/\.svg$/, ''), svg)

export const ICON_NAMES = [
  'albums',
  'artists',
  'brands/apple-music',
  'brands/lastfm',
  'brands/spotify',
  'brands/youtube-music',
  'check',
  'chevron-down',
  'close',
  'crown',
  'gamepad',
  'globe',
  'grip',
  'heatmap',
  'info',
  'instagram',
  'lock',
  'logo',
  'overview',
  'palette',
  'pause',
  'play',
  'plus',
  'rank',
  'recent',
  'search',
  'skip',
  'spotify-glyph',
  'streams',
  'tracks',
  'upload',
  'warning',
] as const
export type IconName = (typeof ICON_NAMES)[number]

if (import.meta.env.DEV) for (const n of ICON_NAMES) if (!registry.has(n)) console.warn(`[icons] missing assets/icons/${n}.svg`)

/** The skin's own version of the icon when it has one, else the default. */
export const iconSvg = (name: IconName, skin?: Skin): string => (skin && registry.get(`skins/${skin}/${name}`)) || registry.get(name) || ''
