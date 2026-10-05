import { useRef, useState, type CSSProperties } from 'react'
import { cn } from '../../lib/cn'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'
import { tune } from '../../theme'
import { useTranslation } from '../../i18n'

const STEPS = ['bg-surface-2', 'bg-seq-1', 'bg-seq-2', 'bg-seq-3', 'bg-seq-4', 'bg-seq-5'] as const

/** 7 × 24 weekday/hour heatmap, single-hue sequential ramp. `grid[day][hour]` */
export interface HeatmapPart {
  key: string
  label: string
  /** solid fill for this service */
  fill: CSSProperties
  /** same shape as the main grid, this service's share of it */
  grid: number[][]
}

export function Heatmap({
  grid,
  formatValue,
  parts,
  color,
  className,
}: {
  grid: number[][]
  formatValue: (v: number) => string
  /** hovering a cell also lists each service's percentage of it */
  parts?: HeatmapPart[]
  /** one colour for the whole ramp (any CSS colour) instead of the skin's greens */
  color?: string
  className?: string
}) {
  const { t } = useTranslation()
  const days = t('calendar.weekdaysShort', { returnObjects: true })
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null)
  const max = Math.max(1, ...grid.flat())
  // show Monday first
  const order = [1, 2, 3, 4, 5, 6, 0]

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(
        '[data-cell]',
        tune({
          scale: 0.2,
          autoAlpha: 0,
          duration: 0.5,
          ease: 'back.out(2)',
          stagger: { each: 0.003, from: 'start', grid: [7, 24] },
          scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
        }),
      )
    },
    { scope: ref, dependencies: [grid], revertOnUpdate: true },
  )

  const step = (v: number) => (v === 0 ? 0 : Math.min(5, 1 + Math.floor((v / max) * 4.999)))
  /** how strongly a step is drawn when the cell is coloured by `color` or by its mix of services */
  const LEVEL = [0, 0.22, 0.4, 0.58, 0.78, 1]
  const level = (i: number) => LEVEL[i] ?? 0
  /**
   * A service with 1% of a cell would be a sub-pixel sliver – and vanish. Every service present gets at
   * least this much of the cell, the rest is scaled down to fit; the exact percentages are in the readout.
   */
  const MIN_SHARE = 0.16
  const slices = (d: number, h: number, v: number) => {
    const raw = (parts ?? []).map((p) => ({ p, share: (p.grid[d]?.[h] ?? 0) / v })).filter((x) => x.share > 0)
    const shown = raw.map((x) => Math.max(x.share, MIN_SHARE))
    const total = shown.reduce((s, x) => s + x, 0)
    return raw.map((x, i) => ({ part: x.p, height: (shown[i] ?? 0) / total }))
  }

  return (
    <div className={cn('relative', className)} onMouseLeave={() => setHover(null)}>
      <div ref={ref} className="grid grid-cols-[1.75rem_repeat(24,minmax(0,1fr))] gap-[3px]">
        {order.map((d) => (
          <div key={d} className="contents">
            <span className="self-center font-mono text-[10px] text-ink-faint">{days[d]}</span>
            {grid[d]?.map((v, h) => (
              <div
                key={h}
                data-cell
                onMouseEnter={() => setHover({ d, h })}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xs transition-[outline] outline-offset-1',
                  parts || color ? 'bg-surface-2' : STEPS[step(v)],
                  hover?.d === d && hover.h === h && 'outline-2 outline-ink',
                )}
                style={!parts && color && v > 0 ? { background: `color-mix(in oklab, ${color} ${level(step(v)) * 100}%, transparent)` } : undefined}
                aria-label={`${days[d]} ${h}h: ${formatValue(v)}`}
              >
                {/* the cell is split by each service's share, in its colour; how strongly it is drawn says how much was played */}
                {parts && v > 0 && (
                  <div className="absolute inset-0 flex flex-col-reverse" style={{ opacity: 0.3 + level(step(v)) * 0.7 }}>
                    {slices(d, h, v).map(({ part, height }) => (
                      <div key={part.key} style={{ height: `${height * 100}%`, ...part.fill }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center font-mono text-[9px] text-ink-faint">
            {h % 3 === 0 ? h : ''}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-xs text-ink-muted">
        <span>
          {hover ? (
            <>
              <b className="text-ink">
                {days[hover.d]} · {t('calendar.hourRange', { from: hover.h, to: hover.h + 1 })}
              </b>{' '}
              — {formatValue(grid[hover.d]?.[hover.h] ?? 0)}
              {parts && (grid[hover.d]?.[hover.h] ?? 0) > 0 && (
                <span className="ml-2 inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 align-middle">
                  {parts.map((p) => {
                    const v = p.grid[hover.d]?.[hover.h] ?? 0
                    const share = Math.round((v / (grid[hover.d]?.[hover.h] ?? 1)) * 100)
                    return share > 0 ? (
                      <span key={p.key} className="inline-flex items-center gap-1">
                        <span className="size-2 rounded-full" style={p.fill} />
                        {p.label} {share}%
                      </span>
                    ) : null
                  })}
                </span>
              )}
            </>
          ) : (
            t(parts ? 'charts.heatmap.hintParts' : 'charts.heatmap.hint')
          )}
        </span>
        <span className="flex items-center gap-1">
          {t('charts.heatmap.less')}
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn('size-2.5 rounded-xs', !(parts || color) && s, (parts || color) && 'bg-surface-2')}
              style={
                parts
                  ? { background: `color-mix(in oklab, var(--color-ink-muted) ${level(i) * 100}%, transparent)` }
                  : color && i > 0
                    ? { background: `color-mix(in oklab, ${color} ${level(i) * 100}%, transparent)` }
                    : undefined
              }
            />
          ))}
          {t('charts.heatmap.more')}
        </span>
      </div>
    </div>
  )
}
