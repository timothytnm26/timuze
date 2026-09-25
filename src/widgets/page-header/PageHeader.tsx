import { useRef, type ReactNode } from 'react'
import { gsap, prefersReducedMotion, SplitText, useGSAP } from '@/shared/lib'
import { tune } from '@/shared/theme'

/** Big editorial page title – chars slide up with SplitText. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      const split = SplitText.create('[data-title]', { type: 'chars,words', mask: 'words' })
      gsap.from(split.chars, tune({ yPercent: 110, duration: 0.9, stagger: 0.018, ease: 'expo.out' }))
      gsap.from('[data-sub]', tune({ autoAlpha: 0, y: 12, duration: 0.8, delay: 0.25, stagger: 0.08 }))
      return () => split.revert()
    },
    { scope: ref, dependencies: [title] },
  )

  return (
    <header ref={ref} className="mb-8 flex flex-wrap items-end justify-between gap-6 sm:mb-10">
      <div className="min-w-0">
        {eyebrow && (
          <p data-sub className="mb-2 font-mono text-xs tracking-[0.2em] text-brand uppercase">
            {eyebrow}
          </p>
        )}
        {/* keyed so a new title (e.g. language switch) gets a fresh node for SplitText */}
        <h1 key={title} data-title className="font-display text-4xl font-bold tracking-tight text-balance sm:text-6xl pixel:leading-[1.2]">
          {title}
        </h1>
        {description && (
          <p data-sub className="mt-3 max-w-2xl text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div data-sub>{action}</div>}
    </header>
  )
}
