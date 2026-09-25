import type { ReactNode } from 'react'
import { Cover } from '@/shared/ui'
import { cn, formatDuration } from '@/shared/lib'
import type { Track } from '../model/types'

export function TrackRow({
  track,
  rank,
  meta,
  className,
}: {
  track: Track
  rank?: number
  meta?: ReactNode
  className?: string
}) {
  return (
    <a
      href={track.external_urls.spotify}
      target="_blank"
      rel="noreferrer"
      data-reveal
      className={cn(
        'group grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2 sm:gap-4',
        className,
      )}
    >
      <span className="w-6 text-right font-mono text-sm text-ink-faint tabular-nums group-hover:text-brand">
        {rank ?? ''}
      </span>
      <Cover images={track.album.images} alt={track.album.name} size={64} className="size-11" />
      <div className="min-w-0">
        <p className="truncate font-medium">
          {track.name}
          {track.explicit && (
            <span className="ml-2 rounded-sm bg-surface-3 px-1 align-middle text-[10px] font-bold text-ink-muted">E</span>
          )}
        </p>
        <p className="truncate text-sm text-ink-muted">
          {track.artists.map((a) => a.name).join(', ')}
          <span className="hidden md:inline"> · {track.album.name}</span>
        </p>
      </div>
      <span className="font-mono text-xs text-ink-faint tabular-nums">{meta ?? formatDuration(track.duration_ms)}</span>
    </a>
  )
}
