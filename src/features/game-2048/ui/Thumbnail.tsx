import { cn } from '@/shared/lib'
import { Cover } from '@/shared/ui'
import { levelOf, tierFor, type Tier } from '../model/tiers'

/** A made-up mid-game board for the gallery: 0 is an empty cell. */
const LAYOUT = [2, 4, 0, 8, 0, 16, 2, 0, 4, 0, 32, 64, 2, 0, 0, 128]

/** A miniature of the game wearing the user's own top albums (or artists) – the gallery card's picture. */
export function Game2048Thumbnail({ tiers, className }: { tiers: Tier[]; className?: string }) {
  return (
    <div className={cn('grid aspect-square grid-cols-4 gap-[3%] rounded-[8%] bg-surface p-[3%] shadow-lg', className)} aria-hidden>
      {LAYOUT.map((value, i) => {
        if (!value) return <span key={i} className="rounded-[10%] bg-surface-2/80" />
        const tier = tierFor(value, tiers)
        const hasImage = !!tier?.images.length
        return (
          <span
            key={i}
            className="relative block overflow-hidden rounded-[10%]"
            style={{
              containerType: 'size',
              ...(!hasImage && { background: `color-mix(in oklab, var(--skin-brand) ${Math.min(100, levelOf(value) * 9)}%, var(--skin-surface-3))` }),
            }}
          >
            {hasImage && <Cover images={tier.images} alt="" rounded="lg" className="size-full rounded-none" />}
            <span
              className="absolute top-[6%] left-[6%] rounded-[22%] bg-black/65 px-[9%] font-display leading-tight font-extrabold text-white tabular-nums"
              style={{ fontSize: '24cqw' }}
            >
              {value}
            </span>
          </span>
        )
      })}
    </div>
  )
}
