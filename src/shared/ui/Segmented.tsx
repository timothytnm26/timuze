import { useLayoutEffect, useRef } from 'react'
import { cn } from '../lib/cn'
import { gsap } from '../lib/gsap'
import { tune } from '../theme'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

/** Pill switcher with a GSAP-animated sliding thumb. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
  label: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLSpanElement>(null)
  // labels change width when the language switches – re-measure the thumb
  const labelsKey = options.map((o) => o.label).join('|')

  useLayoutEffect(() => {
    const el = root.current?.querySelector<HTMLButtonElement>(`[data-value="${value}"]`)
    if (!el || !thumb.current) return
    // only duration/ease are tuned – `x` is a measured position, not a travel distance
    const { duration, ease } = tune({ duration: 0.45, ease: 'expo.out' })
    gsap.to(thumb.current, { x: el.offsetLeft, width: el.offsetWidth, duration, ease })
  }, [value, labelsKey])

  return (
    <div
      ref={root}
      role="radiogroup"
      aria-label={label}
      className={cn('panel relative inline-flex rounded-full border-line bg-surface p-1', className)}
    >
      <span ref={thumb} className="absolute inset-y-1 left-0 rounded-full bg-surface-3" aria-hidden />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          data-value={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative z-10 cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
            o.value === value ? 'text-ink' : 'text-ink-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
