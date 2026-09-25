import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrackRow, trackQueries } from '@/entities/track'
import { genresOf } from '@/entities/artist'
import { countValues, FilterEmpty, GenreFilter, useGenreIndex } from '@/features/top-filter'
import type { TimeRange } from '@/shared/api'
import { ErrorState, Reveal, Skeleton } from '@/shared/ui'
import { cn } from '@/shared/lib'

export function TopTracks({
  range,
  limit = 50,
  columns = 1,
  genre = null,
  onGenreChange,
}: {
  range: TimeRange
  limit?: number
  columns?: 1 | 2
  /** Genre filter – only shown when `onGenreChange` is given. */
  genre?: string | null
  onGenreChange?: (g: string | null) => void
}) {
  const q = useQuery(trackQueries.top(range, Math.max(limit, 50)))
  const filterable = !!onGenreChange
  const genres = useGenreIndex(range, filterable)

  const tagged = useMemo(
    () => (q.data ?? []).slice(0, limit).map((track) => ({ track, genres: genresOf(track.artists, genres.index) })),
    [q.data, limit, genres.index],
  )
  const options = useMemo(() => countValues(tagged.map((x) => x.genres)), [tagged])
  const visible = genre && filterable ? tagged.filter((x) => x.genres.has(genre)) : tagged

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  if (q.isPending)
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-15" />
        ))}
      </div>
    )

  return (
    <div className="flex flex-col gap-6">
      {filterable && (options.length > 0 || genre) && (
        <GenreFilter options={options} value={genre} onChange={onGenreChange} />
      )}
      {visible.length === 0 && genre ? (
        <FilterEmpty onClear={() => onGenreChange?.(null)} />
      ) : (
        <Reveal
          deps={[range, genre]}
          stagger={0.025}
          y={14}
          className={cn('flex flex-col gap-0.5', columns === 2 && 'lg:block lg:columns-2 lg:gap-x-8')}
        >
          {visible.map(({ track }, i) => (
            <TrackRow key={track.id} track={track} rank={i + 1} className="break-inside-avoid" />
          ))}
        </Reveal>
      )}
    </div>
  )
}
