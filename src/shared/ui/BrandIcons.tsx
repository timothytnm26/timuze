import type { CSSProperties } from 'react'
import { cn } from '../lib/cn'
import { Icon } from './Icon'

/** Simplified brand marks for the services timuze can read from. */
type IconProps = { className?: string }

export const LastfmIcon = ({ className }: IconProps) => <Icon name="brands/lastfm" className={cn('size-8', className)} />
export const YoutubeMusicIcon = ({ className }: IconProps) => <Icon name="brands/youtube-music" className={cn('size-8', className)} />
export const AppleMusicIcon = ({ className }: IconProps) => <Icon name="brands/apple-music" className={cn('size-8', className)} />
export const SpotifyMark = ({ className }: IconProps) => <Icon name="brands/spotify" className={cn('size-8', className)} />

export type BrandKey = 'spotify' | 'youtube' | 'apple' | 'lastfm'

/**
 * Each service's colour (`ink` is readable text on it) and mark. Last.fm, YouTube Music and Apple Music
 * are all red in real life, so in charts they sit apart as crimson · orange-red · pink to stay tellable.
 */
export const BRANDS: Record<BrandKey, { color: string; ink: string; Icon: (p: IconProps) => React.JSX.Element }> = {
  spotify: { color: '#1db954', ink: '#000000', Icon: SpotifyMark },
  youtube: { color: '#ff6a3d', ink: '#ffffff', Icon: YoutubeMusicIcon },
  apple: { color: '#ff4f9a', ink: '#ffffff', Icon: AppleMusicIcon },
  lastfm: { color: '#d51007', ink: '#ffffff', Icon: LastfmIcon },
}

export function BrandIcon({ brand, className }: { brand: BrandKey; className?: string }) {
  const { Icon } = BRANDS[brand]
  return <Icon className={className} />
}

/** Sets `--src` / `--src-ink` so everything below can use `bg-(--src)`, `text-(--src)`… in that service's colour. */
export const brandStyle = (brand: BrandKey) => ({ '--src': BRANDS[brand].color, '--src-ink': BRANDS[brand].ink }) as CSSProperties

/** Solid fill for a chart segment or swatch. */
export const brandFill = (brand: BrandKey): CSSProperties => ({ backgroundColor: BRANDS[brand].color })
