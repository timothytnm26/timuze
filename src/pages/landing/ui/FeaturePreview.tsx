import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/shared/lib'
import { LogoMark } from '@/shared/ui'

/**
 * Miniature dashboard screens for the feature cards. Drawn with the skin's own tokens, so they
 * re-skin with the page, and every piece of copy is a run of random symbols – they show the
 * layout of a page, not anyone's data.
 */

const GLYPHS = '#%&@§¶*+=~^$!?/<>{}[]'

/** Deterministic "text": the same seed always scrambles to the same symbols. */
const scramble = (seed: number, length: number) => {
  let s = seed * 9301 + 49297
  let out = ''
  for (let i = 0; i < length; i++) {
    s = (s * 9301 + 49297) % 233280
    // every 4–7 glyphs a space, so it wraps and reads like words
    out += i > 0 && s % 5 === 0 ? ' ' : GLYPHS[s % GLYPHS.length]
  }
  return out
}

/** 0..1, stable per seed */
const noise = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function Glyphs({ seed, length, className }: { seed: number; length: number; className?: string }) {
  return <span className={cn('block truncate font-mono tracking-tight', className)}>{scramble(seed, length)}</span>
}

/** Gradient "artwork" in the skin's brand → accent, hue-shifted per seed. */
function Art({ seed, className }: { seed: number; className?: string }) {
  const style = { filter: `hue-rotate(${Math.round(noise(seed) * 300)}deg)` } satisfies CSSProperties
  return (
    <span
      style={style}
      className={cn('block shrink-0 bg-[linear-gradient(135deg,var(--skin-brand),var(--skin-accent))]', className)}
    />
  )
}

function Tile({ seed, value }: { seed: number; value: string }) {
  return (
    <div className="panel rounded-xl border-line bg-surface p-2.5">
      <Glyphs seed={seed} length={7} className="text-[9px] text-ink-faint" />
      <p className="mt-1 font-display text-lg leading-none font-bold text-ink">{value}</p>
    </div>
  )
}

const PAGES: ((seed: number) => ReactNode)[] = [
  // 0 · top artists: podium + list
  (seed) => (
    <>
      <div className="flex items-end justify-center gap-4 pt-2 pb-1">
        {[1, 0, 2].map((rank) => (
          <div key={rank} className="flex flex-col items-center gap-1.5">
            <div className="relative">
              <Art seed={seed + rank} className={cn('rounded-full', rank === 0 ? 'size-20' : 'size-14')} />
              <span
                className={cn(
                  'absolute -bottom-1.5 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full font-mono text-[9px] font-bold ring-2 ring-canvas',
                  rank === 0 ? 'bg-brand text-canvas' : 'bg-ink text-canvas',
                )}
              >
                {rank + 1}
              </span>
            </div>
            <Glyphs seed={seed + rank * 7} length={8} className="mt-1 text-[10px] text-ink" />
          </div>
        ))}
      </div>
      <Rows seed={seed + 20} count={4} round />
    </>
  ),
  // 1 · top tracks: ranked rows with play bars
  (seed) => <Rows seed={seed} count={7} bars />,
  // 2 · top albums: cover grid
  (seed) => (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={cn(i >= 6 && 'max-sm:hidden')}>
          <Art seed={seed + i} className="aspect-square w-full rounded-lg" />
          <Glyphs seed={seed + i * 3} length={9} className="mt-1 text-[9px] text-ink" />
          <Glyphs seed={seed + i * 5} length={6} className="text-[8px] text-ink-faint" />
        </div>
      ))}
    </div>
  ),
  // 3 · real stream counts: stat tiles + a year of columns
  (seed) => (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Tile seed={seed} value="#,##§" />
        <Tile seed={seed + 1} value="%@&" />
        <Tile seed={seed + 2} value="*§=" />
      </div>
      <div className="panel mt-2.5 rounded-xl border-line bg-surface p-3">
        <Glyphs seed={seed + 3} length={12} className="text-[10px] text-ink-muted" />
        <div className="mt-2 flex h-24 items-end gap-1">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              style={{ height: `${25 + noise(seed + i) * 75}%` }}
              className={cn('flex-1 rounded-t-sm', i === 7 ? 'bg-brand' : 'bg-seq-3')}
            />
          ))}
        </div>
      </div>
    </>
  ),
  // 4 · heatmap: weekday × hour
  (seed) => (
    <div className="panel rounded-xl border-line bg-surface p-3">
      <Glyphs seed={seed} length={14} className="mb-2 text-[10px] text-ink-muted" />
      <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-[3px]">
        {Array.from({ length: 7 * 24 }, (_, i) => {
          const hour = i % 24
          // evenings & late nights run hot, early mornings cold
          const bias = hour >= 19 || hour <= 1 ? 0.45 : hour >= 7 && hour <= 9 ? 0.2 : hour < 7 ? -0.5 : 0
          const level = Math.max(0, Math.min(5, Math.round((noise(seed + i) * 0.8 + bias) * 5)))
          return (
            <span
              key={i}
              className={cn(
                'aspect-square rounded-[2px]',
                ['bg-surface-2', 'bg-seq-1', 'bg-seq-2', 'bg-seq-3', 'bg-seq-4', 'bg-seq-5'][level],
              )}
            />
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tile seed={seed + 1} value="§§:@" />
        <Tile seed={seed + 2} value="&%" />
        <Tile seed={seed + 3} value="*=%" />
      </div>
    </div>
  ),
  // 5 · private: the overview – profile hero, stats, all behind a local-only lock
  (seed) => (
    <>
      <div className="panel flex items-center gap-3 rounded-xl border-line bg-surface p-3">
        <Art seed={seed} className="size-12 rounded-full" />
        <div className="min-w-0 flex-1">
          <Glyphs seed={seed + 1} length={8} className="text-[9px] text-brand" />
          <Glyphs seed={seed + 2} length={11} className="font-display text-lg font-bold text-ink" />
        </div>
        <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-brand">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {['#,§@&', '%@', '&*', '§=%'].map((v, i) => (
          <Tile key={i} seed={seed + 3 + i} value={v} />
        ))}
      </div>
      <Rows seed={seed + 10} count={3} />
    </>
  ),
]

function Rows({ seed, count, round, bars }: { seed: number; count: number; round?: boolean; bars?: boolean }) {
  return (
    <div className="mt-2 flex flex-col">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-2.5 border-b border-line/50 py-1.5 last:border-0">
          <span className="w-4 text-right font-mono text-[9px] text-ink-faint">{i + (round ? 4 : 1)}</span>
          <Art seed={seed + i} className={cn('size-7', round ? 'rounded-full' : 'rounded-md')} />
          <div className="min-w-0 flex-1">
            <Glyphs seed={seed + i * 11} length={10 + (i % 3) * 3} className="text-[10px] text-ink" />
            <Glyphs seed={seed + i * 13} length={7} className="text-[8px] text-ink-faint" />
          </div>
          {bars && (
            <span className="h-1 w-16 overflow-hidden rounded-full bg-surface-3 max-sm:hidden">
              <span className="block h-full rounded-full bg-brand" style={{ width: `${90 - i * 11}%` }} />
            </span>
          )}
          <span className="font-mono text-[9px] text-ink-faint">{scramble(seed + i, 4)}</span>
        </div>
      ))}
    </div>
  )
}

/** which sidebar entry each feature's screen lives under */
const NAV_FOR_FEATURE = [1, 2, 3, 5, 5, 0]

/** A miniature app window – sidebar, top bar, and the screen for feature `index`. */
export function FeaturePreview({ index, className }: { index: number; className?: string }) {
  const seed = (index + 1) * 101
  const page = PAGES[index] ?? PAGES[0]!
  return (
    <div
      aria-hidden
      className={cn(
        'skin-backdrop panel grid overflow-hidden rounded-2xl border-line select-none sm:grid-cols-[7.5rem_minmax(0,1fr)]',
        className,
      )}
    >
      <aside className="flex flex-col gap-1 border-r border-line/60 p-2.5 max-sm:hidden">
        <span className="mb-2 flex items-center gap-1 px-1">
          <LogoMark className="size-4" />
          <Glyphs seed={seed} length={5} className="text-[10px] font-bold text-ink" />
        </span>
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            data-preview-item
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-1.5 py-1',
              i === NAV_FOR_FEATURE[index] ? 'bg-surface text-brand' : 'text-ink-faint',
            )}
          >
            <span className="size-1.5 shrink-0 rounded-full bg-current" />
            <Glyphs seed={seed + i * 17} length={5 + (i % 3)} className="text-[9px]" />
          </span>
        ))}
      </aside>
      <div className="min-w-0 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-line/60 pb-2.5">
          <Glyphs seed={seed + 1} length={9} className="font-display text-sm font-bold text-ink" />
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn('h-4 rounded-full', i === 1 ? 'w-10 bg-surface-3' : 'w-7 bg-surface-2')} />
            ))}
          </span>
        </div>
        <div data-preview-item>{page(seed)}</div>
      </div>
    </div>
  )
}
