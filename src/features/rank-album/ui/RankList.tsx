import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { AlbumTrack } from '@/entities/album'
import { useTranslation } from '@/shared/i18n'
import { cn, Flip, prefersReducedMotion } from '@/shared/lib'
import { tune } from '@/shared/theme'
import { rowWeight, TOP_RANKS } from '../lib/shareImage'

interface Drag {
  pointerId: number
  from: number
  to: number
  startY: number
  startScroll: number
  lastY: number
  rows: HTMLElement[]
  rects: DOMRect[]
  gap: number
  raf: number
}

/** keep clear of the sticky top bar and the phone's bottom nav while auto-scrolling */
const EDGE_TOP = 110
const EDGE_BOTTOM = 120

export function GripIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 20" className={cn('h-5 w-3', className)} fill="currentColor" aria-hidden>
      {[3, 10, 17].map((y) => (
        <g key={y}>
          <circle cx="3" cy={y} r="1.6" />
          <circle cx="9" cy={y} r="1.6" />
        </g>
      ))}
    </svg>
  )
}

/**
 * The ranked tracks as a drag-to-rank list, drawn like the share image's list (colours from the
 * `--rk-*` variables of the surrounding card, rows tapering rank by rank). Rows are grabbed by
 * their handle (so swiping the rest of a row still scrolls the page on a phone); the others slide
 * aside while you drag, and the page scrolls when you hold a row near the screen's edge. Arrow keys
 * on the handle move a row too; ✕ takes a track out of the ranking.
 */
export function RankList({
  tracks,
  onReorder,
  onRemove,
}: {
  tracks: AlbumTrack[]
  onReorder: (next: AlbumTrack[]) => void
  onRemove: (track: AlbumTrack) => void
}) {
  const { t } = useTranslation('features/rank-album')
  const list = useRef<HTMLOListElement>(null)
  const drag = useRef<Drag | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const flipState = useRef<Flip.FlipState | null>(null)
  const focusId = useRef<string | null>(null)
  const hintId = useId()

  const move = (from: number, to: number) => {
    if (to < 0 || to >= tracks.length || to === from) return
    const next = [...tracks]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item!)
    onReorder(next)
    setAnnouncement(t('moved', { track: item!.name, rank: to + 1 }))
  }

  // after a commit: rows are in their new DOM order, so the drag offsets can go (with no transition)
  useLayoutEffect(() => {
    const rows = list.current ? [...list.current.children] as HTMLElement[] : []
    const id = requestAnimationFrame(() => rows.forEach((r) => (r.style.transition = '')))
    if (flipState.current) {
      const { duration, ease } = tune({ duration: 0.35, ease: 'power3.out' })
      Flip.from(flipState.current, { duration, ease, simple: true })
      flipState.current = null
    }
    if (focusId.current) {
      list.current?.querySelector<HTMLButtonElement>(`[data-handle="${focusId.current}"]`)?.focus()
      focusId.current = null
    }
    return () => cancelAnimationFrame(id)
  }, [tracks])

  const layout = (d: Drag) => {
    const dy = d.lastY - d.startY + (window.scrollY - d.startScroll)
    const self = d.rects[d.from]!
    d.rows[d.from]!.style.transform = `translateY(${dy}px)`
    // which slot the dragged row's centre is over
    const centre = self.top + self.height / 2 + dy
    let to = d.from
    for (let i = d.from + 1; i < d.rects.length; i++) if (centre > d.rects[i]!.top + d.rects[i]!.height / 2) to = i
    for (let i = d.from - 1; i >= 0; i--) if (centre < d.rects[i]!.top + d.rects[i]!.height / 2) to = i
    const shift = self.height + d.gap
    d.rows.forEach((row, i) => {
      if (i === d.from) return
      const s = d.from < to && i > d.from && i <= to ? -shift : to < d.from && i >= to && i < d.from ? shift : 0
      row.style.transform = s ? `translateY(${s}px)` : ''
    })
    d.to = to
  }

  const autoScroll = () => {
    const d = drag.current
    if (!d) return
    const y = d.lastY
    const speed = y < EDGE_TOP ? -(EDGE_TOP - y) / 5 : y > window.innerHeight - EDGE_BOTTOM ? (y - window.innerHeight + EDGE_BOTTOM) / 5 : 0
    if (speed) {
      window.scrollBy(0, speed)
      layout(d)
    }
    d.raf = requestAnimationFrame(autoScroll)
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    if (e.button !== 0 || !list.current) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rows = [...list.current.children] as HTMLElement[]
    const rects = rows.map((r) => r.getBoundingClientRect())
    drag.current = {
      pointerId: e.pointerId,
      from: index,
      to: index,
      startY: e.clientY,
      startScroll: window.scrollY,
      lastY: e.clientY,
      rows,
      rects,
      gap: rects.length > 1 ? rects[1]!.top - rects[0]!.bottom : 0,
      raf: 0,
    }
    drag.current.raf = requestAnimationFrame(autoScroll)
    setDragging(index)
    navigator.vibrate?.(8)
  }

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    d.lastY = e.clientY
    layout(d)
  }

  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    cancelAnimationFrame(d.raf)
    drag.current = null
    setDragging(null)
    // drop the offsets in the same frame React reorders the rows, so nothing jumps
    d.rows.forEach((r) => {
      r.style.transition = 'none'
      r.style.transform = ''
    })
    move(d.from, d.to)
  }

  const onHandleKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const to = { ArrowUp: index - 1, ArrowDown: index + 1, Home: 0, End: tracks.length - 1 }[e.key]
    if (to === undefined) return
    e.preventDefault()
    if (to < 0 || to >= tracks.length || to === index) return
    if (list.current && !prefersReducedMotion()) flipState.current = Flip.getState(list.current.children)
    focusId.current = tracks[index]!.id
    move(index, to)
  }

  return (
    <>
      <p id={hintId} className="sr-only">
        {t('dragHint')}
      </p>
      <ol ref={list} className="flex flex-col">
        {tracks.map((track, i) => {
          const rank = i + 1
          const top = rank <= TOP_RANKS
          // 0 (last rank) … 1 (number one) – the same taper as the image
          const s = (rowWeight(i) - 0.8) / 0.9
          const isDragged = dragging === i
          return (
            <li
              key={track.id}
              data-flip-id={track.id}
              style={{ paddingBlock: 4 + 7 * s }}
              className={cn(
                'relative flex items-center gap-1.5 rounded-xl pr-0.5 select-none sm:gap-3',
                dragging !== null && !isDragged && 'transition-transform duration-200 ease-out',
                isDragged && 'z-10 bg-(--rk-canvas) shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)] ring-2 ring-(--rk-accent)',
              )}
            >
              <span
                style={{ fontSize: `calc(${18 + 16 * s}px * var(--rk-scale, 1))` }}
                className={cn(
                  'w-11 shrink-0 text-right font-display leading-none font-bold tabular-nums sm:w-13',
                  top ? 'text-(--rk-accent)' : 'text-(--rk-faint)',
                )}
              >
                {rank}
              </span>
              <div className="min-w-0 flex-1 pl-1">
                {/* the image has room for one line; a phone gets a second before anything is cut */}
                <p
                  style={{ fontSize: `calc(${14 + 6 * s}px * var(--rk-scale, 1))` }}
                  className={cn('line-clamp-2 leading-tight text-(--rk-ink)', top ? 'font-bold' : 'font-medium')}
                >
                  {track.name}
                  {track.explicit && (
                    <span className="ml-1.5 inline-grid size-4 -translate-y-px place-items-center rounded-xs bg-(--rk-faint) align-middle text-[9px] font-bold text-(--rk-canvas)">
                      E
                    </span>
                  )}
                </p>
                <p style={{ fontSize: `calc(${11.5 + 2 * s}px * var(--rk-scale, 1))` }} className="mt-0.5 flex min-w-0 gap-1.5 text-(--rk-muted)">
                  <span className="truncate">{track.artists.map((a) => a.name).join(', ')}</span>
                  {/* the album position, kept whole so it's always readable */}
                  <span className="shrink-0 font-mono text-(--rk-faint)">{t('trackNo', { n: track.track_number })}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(track)}
                aria-label={t('remove', { track: track.name })}
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-(--rk-faint) transition-colors hover:bg-(--rk-line) hover:text-(--rk-ink)"
              >
                <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
              <button
                type="button"
                data-handle={track.id}
                aria-label={t('handle', { track: track.name, rank })}
                aria-describedby={hintId}
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={(e) => onHandleKey(e, i)}
                className={cn(
                  'grid h-11 w-8 shrink-0 touch-none place-items-center rounded-xl text-(--rk-faint) sm:w-10 transition-colors hover:bg-(--rk-line) hover:text-(--rk-ink)',
                  isDragged ? 'cursor-grabbing text-(--rk-accent)' : 'cursor-grab',
                )}
              >
                <GripIcon />
              </button>
            </li>
          )
        })}
      </ol>
      <p aria-live="assertive" className="sr-only">
        {announcement}
      </p>
    </>
  )
}
