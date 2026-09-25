import { cn } from '../lib/cn'

/** A "t" drawn as a note: the stem is the note's stem, the crossbar a slanted beam, the curl its head. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('size-6 shrink-0 text-brand', className)} fill="currentColor" aria-hidden>
      <rect x="11" y="1.5" width="3" height="18" rx="1.5" />
      <path d="M5.2 9.6a1.3 1.3 0 0 1 1-1.5l11.6-2.6a1.3 1.3 0 0 1 .6 2.5L6.8 10.6a1.3 1.3 0 0 1-1.6-1Z" />
      <ellipse cx="8.9" cy="19.4" rx="4.7" ry="3.5" transform="rotate(-24 8.9 19.4)" />
    </svg>
  )
}
