import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from '@/shared/i18n'
import { cn, Flip, gsap, prefersReducedMotion, ScrollTrigger, useMediaQuery } from '@/shared/lib'
import { tune } from '@/shared/theme'
import { FeaturePreview } from './FeaturePreview'

const FEATURE_ICONS = ['✦', '♪', '◫', '▤', '▦', '◎']

/**
 * Feature cards. Opening one reveals a preview of its dashboard screen; every layout change is
 * Flip-animated. From `sm` up the opened card also moves to the top of the grid at full width
 * (the others flow on below); on a phone's single column it just opens in place.
 */
export function Features() {
  const { t } = useTranslation('pages/landing')
  const [open, setOpen] = useState<number | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const flipState = useRef<Flip.FlipState | null>(null)
  const baseId = useId()
  const multiColumn = useMediaQuery('(min-width: 40rem)')

  const toggle = (i: number) => {
    if (grid.current && !prefersReducedMotion()) flipState.current = Flip.getState(grid.current.children)
    setOpen((o) => (o === i ? null : i))
  }

  useLayoutEffect(() => {
    const state = flipState.current
    flipState.current = null
    const card = open === null ? null : grid.current?.querySelector(`[data-flip-id="feature-${open}"]`)
    // measure before Flip.from – it parks the cards back at their old spots with transforms
    const cardTop = card?.getBoundingClientRect().top
    if (state) {
      const { duration, ease } = tune({ duration: 0.7, ease: 'expo.inOut' })
      Flip.from(state, {
        duration,
        ease,
        // cards change size too – animate the box, don't squash the text
        scale: false,
        simple: true,
        onComplete: () => ScrollTrigger.refresh(),
      })
      if (card) {
        gsap.from(
          card.querySelectorAll('[data-preview-item], [data-preview-caption]'),
          tune({ opacity: 0, y: 24, filter: 'blur(8px)', stagger: 0.08, duration: 0.6, delay: 0.25, ease: 'power3.out' }),
        )
      }
    }
    // multi-column: the opened card jumped to the top of the grid – follow it when that's off
    // screen (by the measured spot: scrollIntoView would aim at the Flip-transformed one).
    // A phone's card opens in place, so the page stays put.
    if (multiColumn && cardTop !== undefined && (cardTop < 64 || cardTop > window.innerHeight * 0.6))
      window.scrollTo({ top: window.scrollY + cardTop - 96, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    // only a toggle should scroll – not a resize across the breakpoint
  }, [open])

  const features = t('features', { returnObjects: true })
  const indices = features.map((_, i) => i)
  // multi-column: opened card first, the rest keep their order
  const order = open === null || !multiColumn ? indices : [open, ...indices.filter((i) => i !== open)]

  // no scroll anchoring: reordering the cards would shift the page under the Flip
  return (
    <div ref={grid} className="mt-14 grid gap-4 [overflow-anchor:none] sm:grid-cols-2 lg:grid-cols-3">
      {order.map((i) => {
        const feature = features[i]!
        const expanded = open === i
        const panelId = `${baseId}-${i}`
        return (
          <article
            key={i}
            data-feature
            data-flip-id={`feature-${i}`}
            className={cn(
              'panel group relative overflow-hidden rounded-card border-line/70 bg-surface transition-colors',
              expanded ? 'border-brand/40 sm:col-span-full lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-2' : 'hover:border-brand/40',
            )}
          >
            <div
              data-decor
              className={cn(
                'pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-brand blur-3xl transition-opacity duration-500',
                expanded ? 'opacity-20' : 'opacity-0 group-hover:opacity-20',
              )}
            />
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? panelId : undefined}
              onClick={() => toggle(i)}
              className={cn(
                'relative flex w-full cursor-pointer flex-col items-start p-7 text-left -outline-offset-4',
                // equal-height cards in a row; an opened card only splits into columns from lg
                expanded ? 'lg:h-full' : 'h-full',
              )}
            >
              <span className="flex w-full items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-lg text-brand">{FEATURE_ICONS[i]}</span>
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-full border border-line text-ink-muted transition-[transform,color,border-color] duration-300 group-hover:border-brand/50 group-hover:text-brand',
                    expanded && 'rotate-45 border-brand/50 text-brand',
                  )}
                  aria-hidden
                >
                  <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M6 1v10M1 6h10" />
                  </svg>
                </span>
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
              <span className="mt-auto pt-5 text-xs font-medium text-ink-faint transition-colors group-hover:text-brand">
                {expanded ? t('collapse') : t('previewHint')}
              </span>
            </button>
            {expanded && (
              <div id={panelId} role="region" aria-label={feature.title} className="relative min-w-0 px-4 pb-4 sm:px-7 sm:pb-7 lg:py-7 lg:pl-0">
                <FeaturePreview index={i} />
                <p data-preview-caption className="mt-2.5 text-center text-[11px] text-ink-faint">
                  {t('previewCaption')}
                </p>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
