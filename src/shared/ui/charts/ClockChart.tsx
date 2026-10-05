import { useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'
import { tune } from '../../theme'

export interface ClockDatum {
  /** 0–23 */
  hour: number
  value: number
  /** split of `value` by segment (same unit), stacked outwards in segment order */
  parts?: { key: string; value: number }[]
}

export interface ClockSegment {
  key: string
  label: string
  /** any CSS colour */
  color: string
}

const VIEW = 260
const C = VIEW / 2
/** outer edge of the bars / inner hole / room kept for the hour labels */
const R_OUT = 106
const R_IN = 50
const GAP_DEG = 1.4
/** thinnest a stacked service is drawn, so a small one doesn't vanish */
const MIN_RING = 2.5

const point = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const
}

/** Annular sector between two radii; 0° is straight up, angles grow clockwise. */
const sector = (a0: number, a1: number, r1: number, r2: number) => {
  const [x0, y0] = point(a0, r2)
  const [x1, y1] = point(a1, r2)
  const [x2, y2] = point(a1, r1)
  const [x3, y3] = point(a0, r1)
  return `M${x0} ${y0} A${r2} ${r2} 0 0 1 ${x1} ${y1} L${x2} ${y2} A${r1} ${r1} 0 0 0 ${x3} ${y3}Z`
}

/**
 * 24-hour "clock": one wedge per hour, midnight at the top, going clockwise; a wedge reaches further out
 * the more is played in that hour. With `segments` each wedge is stacked by service; otherwise one colour.
 */
export function ClockChart({
  data,
  segments,
  color,
  formatValue,
  hourLabel,
  peakLabel,
  ariaLabel,
  className,
}: {
  data: ClockDatum[]
  segments?: ClockSegment[]
  /** one colour for every wedge (any CSS colour) instead of the skin's brand tint */
  color?: string
  formatValue: (v: number) => string
  /** "16:00 – 17:00" */
  hourLabel: (hour: number) => string
  /** caption above the peak hour shown at rest, e.g. "Peak hour" */
  peakLabel: string
  ariaLabel: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0] ?? { hour: 0, value: 0 })

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(
        '[data-wedge]',
        tune({
          autoAlpha: 0,
          duration: 0.6,
          stagger: 0.03,
          ease: 'power2.out',
          scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
        }),
      )
    },
    { scope: ref, dependencies: [data], revertOnUpdate: true },
  )

  const shown = hover !== null ? data[hover] : peak.value > 0 ? peak : undefined
  const solid = color ?? 'var(--skin-brand)'

  return (
    <figure ref={ref} className={cn('mx-auto w-full max-w-72', className)} aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
      <div className="relative aspect-square">
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="size-full" role="img" aria-hidden>
          {/* faint reference rings */}
          {[0.5, 1].map((g) => (
            <circle key={g} cx={C} cy={C} r={R_IN + g * (R_OUT - R_IN)} fill="none" stroke="currentColor" strokeDasharray="2 4" className="text-line/60" />
          ))}
          {data.map((d) => {
            const a0 = d.hour * 15 + GAP_DEG
            const a1 = (d.hour + 1) * 15 - GAP_DEG
            const len = (d.value / max) * (R_OUT - R_IN)
            const active = hover === d.hour || (hover === null && d.hour === peak.hour && peak.value > 0)
            let from = R_IN
            return (
              <g key={d.hour} data-wedge onMouseEnter={() => setHover(d.hour)}>
                <path d={sector(a0, a1, R_IN, R_OUT)} className="fill-surface-3/50" />
                {d.value > 0 &&
                  (segments && d.parts ? (
                    segments.map((s) => {
                      const v = d.parts?.find((p) => p.key === s.key)?.value ?? 0
                      if (v <= 0) return null
                      const thick = Math.max((v / d.value) * len, MIN_RING)
                      const path = sector(a0, a1, from, Math.min(R_OUT, from + thick))
                      from += thick
                      return <path key={s.key} d={path} fill={s.color} opacity={active ? 1 : 0.72} className="transition-opacity duration-200" />
                    })
                  ) : (
                    <path d={sector(a0, a1, R_IN, R_IN + Math.max(len, MIN_RING))} fill={solid} opacity={active ? 1 : 0.62} className="transition-opacity duration-200" />
                  ))}
                {/* generous hit area, also for empty hours */}
                <path d={sector(a0, a1, R_IN, R_OUT)} fill="transparent" tabIndex={0} onFocus={() => setHover(d.hour)} aria-label={`${hourLabel(d.hour)}: ${formatValue(d.value)}`} />
              </g>
            )
          })}
          {[0, 6, 12, 18].map((h) => {
            const [x, y] = point(h * 15, R_OUT + 12)
            return (
              <text key={h} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-ink-faint font-mono text-[10px]">
                {h}
              </text>
            )
          })}
        </svg>

        {/* readout in the hole */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="max-w-[9rem] text-center leading-tight">
            {shown ? (
              <>
                <p className="text-[10px] tracking-wide text-ink-faint uppercase">{hover === null ? peakLabel : ' '}</p>
                <p className="font-display text-sm font-bold text-ink">{hourLabel(shown.hour)}</p>
                <p className="text-xs text-ink-muted">{formatValue(shown.value)}</p>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {/* each service's share of the hovered hour – under the clock, where it has room */}
      {segments && (
        <figcaption className="mt-3 flex min-h-5 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          {hover !== null &&
            shown &&
            shown.parts &&
            shown.value > 0 &&
            segments.map((s) => {
              const v = shown.parts?.find((p) => p.key === s.key)?.value ?? 0
              return v > 0 ? (
                <span key={s.key} className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.label} {Math.round((v / shown.value) * 100)}%
                </span>
              ) : null
            })}
        </figcaption>
      )}
    </figure>
  )
}
