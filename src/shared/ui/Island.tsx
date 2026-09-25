import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { gsap, prefersReducedMotion } from '../lib/gsap'
import { tune } from '../theme'

type Phase = 'closed' | 'open' | 'closing'

/**
 * "Floating island" popover (One UI 8.5 style): the trigger's pill stretches out into the
 * panel on a spring, then the content surfaces with a blur-in stagger. Closing plays the
 * same timeline backwards, so the panel shrinks back into the pill it came from.
 */
export function Island({
  label,
  trigger,
  children,
  align = 'end',
  placement = 'bottom',
  onOpen,
  className,
  triggerClassName,
  panelClassName,
}: {
  /** accessible name of the panel (and of the trigger when it shows no text) */
  label: string
  trigger: (open: boolean) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'start' | 'end'
  /** open below (top bars) or above (sidebar footer) the trigger */
  placement?: 'top' | 'bottom'
  onOpen?: () => void
  className?: string
  triggerClassName?: string
  panelClassName?: string
}) {
  const [phase, setPhase] = useState<Phase>('closed')
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const panelId = useId()
  const open = phase === 'open'

  const close = useCallback((refocus = true) => {
    setPhase((p) => (p === 'open' ? 'closing' : p))
    if (refocus) button.current?.focus()
  }, [])

  useLayoutEffect(() => {
    if (phase === 'open') {
      // re-opened mid-close: just play forward from where it is
      if (tl.current) {
        tl.current.eventCallback('onReverseComplete', null).timeScale(1).play()
        return
      }
      const el = panel.current
      if (!el) return
      if (button.current && !prefersReducedMotion()) tl.current = morph(el, button.current)
      focusFirst(el)
    } else if (phase === 'closing') {
      if (!tl.current) return setPhase('closed')
      tl.current.eventCallback('onReverseComplete', () => setPhase('closed')).timeScale(1.8).reverse()
    } else {
      tl.current?.kill()
      tl.current = null
    }
  }, [phase])

  useEffect(() => () => void tl.current?.kill(), [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  const onBlur = (e: FocusEvent) => {
    if (e.relatedTarget && !root.current?.contains(e.relatedTarget as Node)) close(false)
  }

  return (
    <div
      ref={root}
      className={cn('relative', className)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) close()
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={phase !== 'closed' ? panelId : undefined}
        onClick={() => {
          if (open) return close(false)
          onOpen?.()
          setPhase('open')
        }}
        className={cn(
          'panel flex h-9 cursor-pointer items-center gap-2 rounded-full border-line bg-surface text-sm font-medium text-ink-muted transition-colors hover:text-ink',
          open && 'text-ink',
          triggerClassName,
        )}
      >
        {trigger(open)}
      </button>

      {phase !== 'closed' && (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cn(
            'panel absolute z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-3xl border-line bg-surface-2 p-2 will-change-transform glass:bg-canvas/70',
            align === 'start' ? 'left-0' : 'right-0',
            placement === 'top'
              ? 'bottom-full mb-2'
              : // top bars on phones: span the screen instead of hanging off the trigger
                'top-full mt-2 max-sm:fixed max-sm:inset-x-3 max-sm:top-16 max-sm:w-auto',
            panelClassName,
          )}
        >
          <div data-island-content className="flex flex-col gap-2">
            {children(() => close(false))}
          </div>
        </div>
      )}
    </div>
  )
}

function focusFirst(panel: HTMLElement) {
  const el =
    panel.querySelector<HTMLElement>('[aria-checked="true"]') ??
    panel.querySelector<HTMLElement>('a[href], button:not([disabled])')
  el?.focus({ preventScroll: true })
}

/**
 * Starts the panel as a clipped box the size of the trigger, sitting right on top of it
 * (fully rounded like the pill), then springs position and clip out to the full panel.
 */
function morph(panel: HTMLElement, trigger: HTMLElement) {
  const p = panel.getBoundingClientRect()
  const b = trigger.getBoundingClientRect()
  const radius = parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0
  // where the pill-sized window sits inside the panel – as close to the trigger as it fits
  const left = gsap.utils.clamp(0, Math.max(0, p.width - b.width), b.left - p.left)
  const top = gsap.utils.clamp(0, Math.max(0, p.height - b.height), b.top - p.top)
  const right = Math.max(0, p.width - left - b.width)
  const bottom = Math.max(0, p.height - top - b.height)

  const tl = gsap.timeline()
  const spring = tune({ duration: 0.62, ease: 'back.out(1.15)' })
  const stretch = tune({ duration: 0.6, ease: 'power3.out' })

  // items rising into place overflow the panel for a few frames – keep the scrollbar out of it
  tl.set(panel, { overflowY: 'hidden' }, 0)
    .fromTo(
      panel,
      { x: b.left - p.left - left, y: b.top - p.top - top, scale: 0.98 },
      { x: 0, y: 0, scale: 1, duration: spring.duration, ease: spring.ease },
      0,
    )
    .fromTo(
      panel,
      { clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${b.height / 2}px)` },
      { clipPath: `inset(0px 0px 0px 0px round ${radius}px)`, duration: stretch.duration, ease: stretch.ease },
      0,
    )
    // the clip would also cut off the panel's shadow – drop it once fully open
    .set(panel, { clipPath: 'none' }, Math.max(spring.duration, stretch.duration))
    .from(
      panel.querySelectorAll(':scope > [data-island-content] > *'),
      tune({ opacity: 0, y: 10, filter: 'blur(6px)', stagger: 0.04, duration: 0.4, ease: 'power3.out' }),
      0.12,
    )
    .fromTo(trigger, { scale: 1 }, tune({ scale: 0.92, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }), 0)
    // settled: scroll again if the panel is taller than the viewport
    .set(panel, { overflowY: 'auto' })

  return tl
}
