import { useRef, type ElementType, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap'
import { tune } from '../theme'

/**
 * Staggers every `[data-reveal]` descendant into view.
 * `scroll` → driven by ScrollTrigger, otherwise plays on mount / when `deps` change.
 */
export function Reveal({
  children,
  className,
  as: Tag = 'div',
  scroll = false,
  stagger = 0.06,
  y = 24,
  deps = [],
}: {
  children: ReactNode
  className?: string
  as?: ElementType
  scroll?: boolean
  stagger?: number
  y?: number
  deps?: unknown[]
}) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]', ref.current)
      if (!targets.length) return
      gsap.fromTo(
        targets,
        tune({ autoAlpha: 0, y }),
        tune({
          autoAlpha: 1,
          y: 0,
          stagger,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: scroll ? { trigger: ref.current, start: 'top 85%', once: true } : undefined,
        }),
      )
    },
    { scope: ref, dependencies: deps, revertOnUpdate: true },
  )

  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  )
}
