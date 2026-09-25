import { useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { gsap, prefersReducedMotion, useGSAP } from '../../lib/gsap'
import { tune } from '../../theme'

export interface BarListItem {
  key: string
  label: ReactNode
  value: number
  display?: string
  leading?: ReactNode
}

/** Ranked horizontal bars – for "top N by count" style data. */
export function BarList({ items, className }: { items: BarListItem[]; className?: string }) {
  const ref = useRef<HTMLUListElement>(null)
  const max = Math.max(1, ...items.map((i) => i.value))

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(
        '[data-bar]',
        tune({
          scaleX: 0,
          transformOrigin: 'left',
          duration: 1,
          stagger: 0.05,
          ease: 'expo.out',
          scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
        }),
      )
    },
    { scope: ref, dependencies: [items], revertOnUpdate: true },
  )

  return (
    <ul ref={ref} className={cn('flex flex-col gap-1.5', className)}>
      {items.map((item) => (
        <li key={item.key} className="group relative flex h-9 items-center gap-3 rounded-md px-2">
          <div
            data-bar
            className="absolute inset-y-0 left-0 rounded-r-sm rounded-l-md bg-brand-soft transition-colors group-hover:bg-brand/25"
            style={{ width: `${(item.value / max) * 100}%` }}
            aria-hidden
          />
          {item.leading && <span className="relative shrink-0">{item.leading}</span>}
          <span className="relative min-w-0 flex-1 truncate text-sm">{item.label}</span>
          <span className="relative font-mono text-xs text-ink-muted tabular-nums">
            {item.display ?? item.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
