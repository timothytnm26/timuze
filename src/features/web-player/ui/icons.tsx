import { cn } from '@/shared/lib'

export function PlayIcon({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
      {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M7 4.5v15l12-7.5z" />}
    </svg>
  )
}

export function SkipIcon({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-4', back && 'rotate-180')} fill="currentColor" aria-hidden>
      <path d="M5 5v14l10-7zM16 5h3v14h-3z" />
    </svg>
  )
}

export const iconButton =
  'grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40'
