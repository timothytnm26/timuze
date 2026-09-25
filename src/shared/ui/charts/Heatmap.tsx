import { useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'
import { tune } from '../../theme'
import { useTranslation } from '../../i18n'

const STEPS = ['bg-surface-2', 'bg-seq-1', 'bg-seq-2', 'bg-seq-3', 'bg-seq-4', 'bg-seq-5'] as const

/** 7 × 24 weekday/hour heatmap, single-hue sequential ramp. `grid[day][hour]` */
export function Heatmap({
  grid,
  formatValue,
  className,
}: {
  grid: number[][]
  formatValue: (v: number) => string
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
                  'aspect-square rounded-xs transition-[outline] outline-offset-1',
                  STEPS[step(v)],
                  hover?.d === d && hover.h === h && 'outline-2 outline-ink',
                )}
                aria-label={`${days[d]} ${h}h: ${formatValue(v)}`}
              />
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
            </>
          ) : (
            t('charts.heatmap.hint')
          )}
        </span>
        <span className="flex items-center gap-1">
          {t('charts.heatmap.less')}
          {STEPS.map((s) => (
            <span key={s} className={cn('size-2.5 rounded-xs', s)} />
          ))}
          {t('charts.heatmap.more')}
        </span>
      </div>
    </div>
  )
}
