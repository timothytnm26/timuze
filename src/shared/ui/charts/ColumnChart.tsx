import { useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'
import { tune } from '../../theme'

export interface ColumnDatum {
  key: string
  label: string
  value: number
  /** optional long label for the tooltip */
  hint?: string
}

/**
 * Single-series vertical column chart (HTML/CSS, no chart lib).
 * Columns grow from the baseline with a GSAP stagger; hover shows a tooltip.
 */
export function ColumnChart({
  data,
  formatValue = (v) => String(Math.round(v)),
  height = 180,
  highlightMax = true,
  labelEvery = 1,
  className,
  ariaLabel,
}: {
  data: ColumnDatum[]
  formatValue?: (v: number) => string
  height?: number
  highlightMax?: boolean
  labelEvery?: number
  className?: string
  ariaLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const maxIdx = data.findIndex((d) => d.value === max)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(
        '[data-col]',
        tune({
          scaleY: 0,
          transformOrigin: 'bottom',
          duration: 0.9,
          stagger: 0.02,
          ease: 'expo.out',
          scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
        }),
      )
    },
    { scope: ref, dependencies: [data], revertOnUpdate: true },
  )

  const hovered = hover !== null ? data[hover] : undefined

  return (
    <figure className={cn('relative', className)} aria-label={ariaLabel}>
      <div ref={ref} className="relative flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setHover(null)}>
        {/* recessive gridlines */}
        {[0.5, 1].map((g) => (
          <div
            key={g}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/60"
            style={{ bottom: `${g * 100}%` }}
            aria-hidden
          />
        ))}
        {data.map((d, i) => {
          const pct = (d.value / max) * 100
          const active = hover === i || (hover === null && highlightMax && i === maxIdx)
          return (
            <div
              key={d.key}
              className="relative flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              tabIndex={0}
              aria-label={`${d.hint ?? d.label}: ${formatValue(d.value)}`}
            >
              <div
                data-col
                className={cn(
                  'w-full rounded-t-sm transition-colors duration-200',
                  active ? 'bg-brand' : 'bg-seq-3/70',
                  d.value === 0 && 'bg-surface-3',
                )}
                style={{ height: `${Math.max(pct, d.value > 0 ? 2 : 1)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-[2px] font-mono text-[10px] text-ink-faint">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 truncate text-center">
            {i % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-20 -translate-x-1/2 -translate-y-full panel rounded-lg border-line bg-surface-2 px-2.5 py-1.5 text-xs whitespace-nowrap glass:bg-canvas/70"
          style={{ left: `${((hover + 0.5) / data.length) * 100}%` }}
        >
          <div className="text-ink-muted">{hovered.hint ?? hovered.label}</div>
          <div className="font-semibold text-ink">{formatValue(hovered.value)}</div>
        </div>
      )}
    </figure>
  )
}
