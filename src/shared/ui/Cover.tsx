import type { SpotifyImage } from '../api/types';
import { cn } from '../lib/cn';
import { useSkin } from '../theme';

/**
 * Picks the smallest image >= `size`px, falls back to a gradient tile.
 * The pixel skin always takes the smallest one and upscales it with `image-rendering: pixelated`.
 */
export function Cover({ images, alt, size = 300, rounded = 'lg', className }: { images?: SpotifyImage[] | null; alt: string; size?: number; rounded?: 'lg' | 'full' | 'xl'; className?: string }) {
  const pixel = useSkin() === 'pixel';
  const sorted = [...(images ?? [])].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  const img = pixel ? sorted[0] : (sorted.find((i) => (i.width ?? size) >= size) ?? sorted.at(-1));
  const radius = { lg: 'rounded-lg', xl: 'rounded-2xl', full: 'rounded-full' }[rounded];

  if (!img)
    return (
      <div className={cn('grid aspect-square place-items-center bg-gradient-to-br from-surface-3 to-surface-2 text-ink-faint', radius, className)} aria-label={alt}>
        ♪
      </div>
    );

  return <img src={img.url} alt={alt} loading="lazy" decoding="async" className={cn('aspect-square bg-surface-1 object-cover', radius, className)} />;
}
