import { useEffect, useRef, type PointerEvent } from 'react'
import { cn } from '@/shared/lib'
import { useSkin } from '@/shared/theme'
import { Cover, Icon } from '@/shared/ui'
import { SIZE, type Direction, type GameState, type Tile } from '../model/engine'
import { LEVELS, levelOf, tierFor, type Tier } from '../model/tiers'

/** gap between cells, as a share of the board's width */
const GAP = 2.5
const CELL = (100 - GAP * (SIZE + 1)) / SIZE
/** moving one cell = a tile's own width plus a gap, in % of the tile's width (what `translate` measures) */
const STEP = ((CELL + GAP) / CELL) * 100

const GOLD = '#f5c542'

const KEYS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
}

/** A tile: the picture of the item it stands for with its score written on it – or, with no picture yet, a plain coloured tile. */
function TileView({ tile, tier, ghost }: { tile: Tile; tier?: Tier; ghost?: boolean }) {
  const level = levelOf(tile.value)
  const hasImage = !!tier?.images.length
  // past 2048 there are no more pictures: the number one's stays, in a golden frame that gets grander with every merge
  const legend = Math.max(0, level - LEVELS)
  return (
    <div
      className="absolute"
      style={{
        left: `${GAP}%`,
        top: `${GAP}%`,
        width: `${CELL}%`,
        height: `${CELL}%`,
        transform: `translate(${tile.col * STEP}%, ${tile.row * STEP}%)`,
        transition: 'transform 140ms cubic-bezier(.2,.7,.3,1)',
        zIndex: ghost ? 1 : 2,
        ...(ghost && { animation: 'tile-ghost 140ms ease-out forwards' }),
      }}
    >
      <div
        className="panel relative size-full overflow-hidden rounded-[10%] border-line"
        style={{
          containerType: 'size',
          // the higher the tile, the more it glows
          ...(legend > 0 && { borderColor: GOLD, borderWidth: 2, boxShadow: `0 0 ${8 + legend * 6}px ${legend * 2}px color-mix(in oklab, ${GOLD} 75%, transparent)` }),
          ...(legend === 0 && level >= 7 && {
            boxShadow: `0 0 calc(${level - 6} * var(--glow-blur, 0px)) calc(${level - 6} * var(--glow-spread, 0px)) color-mix(in oklab, var(--skin-brand) 70%, transparent)`,
          }),
          ...(tile.fresh && { animation: 'tile-pop 160ms ease-out' }),
          ...(tile.merged && { animation: 'tile-bump 200ms ease-out' }),
          ...(!hasImage && { background: `color-mix(in oklab, var(--skin-brand) ${Math.min(100, level * 9)}%, var(--skin-surface-3))` }),
        }}
      >
        {hasImage && <Cover images={tier.images} alt={tier.name} rounded="lg" className="size-full rounded-none" />}
        {hasImage ? (
          // the picture is the star: the score is only a small tag in the corner (the legend maps score to picture)
          <span
            className={cn(
              'absolute top-[5%] left-[5%] rounded-[22%] bg-black/65 px-[7%] py-[1%] font-display leading-tight font-extrabold tabular-nums backdrop-blur-sm',
              legend > 0 ? 'text-[#f5c542]' : 'text-white',
            )}
            style={{ fontSize: '17cqw' }}
          >
            {tile.value}
          </span>
        ) : (
          // no picture yet: the score fills the tile instead
          <span
            className="absolute inset-0 grid place-items-center font-display leading-none font-extrabold text-canvas tabular-nums"
            style={{ fontSize: `${Math.min(70, 84 / (0.62 * String(tile.value).length))}cqw` }}
          >
            {tile.value}
          </span>
        )}
        {legend > 0 && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(115deg, transparent 35%, rgb(255 255 255 / 0.55) 50%, transparent 65%)', backgroundSize: '250% 100%', animation: 'tile-shimmer 2.4s linear infinite' }}
            />
            <span aria-hidden className="absolute right-[5%] bottom-[5%] flex -space-x-[4cqw] text-[#f5c542] drop-shadow-[0_1px_2px_rgb(0_0_0/0.8)]">
              {Array.from({ length: Math.min(legend, 3) }, (_, i) => (
                <Icon key={i} name="crown" className="size-[20cqw]" />
              ))}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * The 4×4 board. Arrow keys / WASD or a swipe move the tiles; every tile wears the picture of the
 * top item its value stands for (`tiers`).
 */
export function Board({
  state,
  tiers,
  onMove,
  ariaLabel,
  children,
}: {
  state: GameState
  tiers: Tier[]
  onMove: (dir: Direction) => void
  ariaLabel: string
  /** overlays (won / game over) */
  children?: React.ReactNode
}) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const skin = useSkin()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!dir || e.metaKey || e.ctrlKey || e.altKey) return
      // don't hijack typing in a field
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
      e.preventDefault()
      onMove(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onMove])

  const onPointerDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent) => {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    onMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  return (
    <div
      role="application"
      aria-label={ariaLabel}
      // vertical swipes would scroll the page – on the board they move tiles
      className="panel relative isolate mx-auto aspect-square w-full max-w-md touch-none rounded-card border-line bg-surface select-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
    >
      {/* a merge flares the board in the skin's own way (every score change re-keys these):
          glass – a soft glow behind it · pixel – a hard blinking outline · the others – a crisp ring */}
      <div
        key={`glow-${state.score}`}
        aria-hidden
        className="pointer-events-none absolute -inset-5 -z-10 hidden rounded-[2.5rem] opacity-30 blur-2xl glass:block"
        style={{ background: 'radial-gradient(closest-side, var(--skin-brand), var(--skin-accent) 70%, transparent)', animation: 'board-glow 700ms ease-out' }}
      />
      <div
        key={`ring-${state.score}`}
        aria-hidden
        className="pointer-events-none absolute -inset-1 -z-10 rounded-[inherit] border-2 border-brand opacity-0 glass:hidden pixel:rounded-none"
        style={{ animation: `board-ring 600ms ${skin === 'pixel' ? 'steps(4, end)' : 'ease-out'}` }}
      />
      {Array.from({ length: SIZE * SIZE }, (_, i) => (
        <div
          key={i}
          className="absolute rounded-[10%] bg-surface-2/70"
          style={{
            left: `${GAP + (i % SIZE) * (CELL + GAP)}%`,
            top: `${GAP + Math.floor(i / SIZE) * (CELL + GAP)}%`,
            width: `${CELL}%`,
            height: `${CELL}%`,
          }}
        />
      ))}
      {state.ghosts.map((t) => (
        <TileView key={t.id} tile={t} tier={tierFor(t.value, tiers)} ghost />
      ))}
      {state.tiles.map((t) => (
        <TileView key={t.id} tile={t} tier={tierFor(t.value, tiers)} />
      ))}
      {children}
    </div>
  )
}
