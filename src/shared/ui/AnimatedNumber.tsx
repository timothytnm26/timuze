import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { tune } from '../theme'
import { useFormatters } from '../i18n'

/** Counts up from 0 → value with GSAP whenever `value` changes. */
export function AnimatedNumber({
  value,
  format,
  duration = 1.4,
  className,
}: {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const f = useFormatters()
  const fmt = format ?? f.number

  useGSAP(
    () => {
      const obj = { n: 0 }
      gsap.to(
        obj,
        tune({
          n: value,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            if (ref.current) ref.current.textContent = fmt(obj.n)
          },
        }),
      )
    },
    { dependencies: [value, fmt] },
  )

  return (
    <span ref={ref} className={className}>
      {fmt(0)}
    </span>
  )
}
