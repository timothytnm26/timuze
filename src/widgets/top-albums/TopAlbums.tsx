import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trackQueries } from '@/entities/track'
import { genresOf } from '@/entities/artist'
import { AlbumCard, aggregateTopAlbums } from '@/entities/album'
import { countValues, FilterEmpty, GenreFilter, useGenreIndex } from '@/features/top-filter'
import type { TimeRange } from '@/shared/api'
import { useTranslation } from '@/shared/i18n'
import { ErrorState, Reveal, Skeleton } from '@/shared/ui'

export function TopAlbums({
  range,
  limit = 20,
  genre = null,
  onGenreChange,
}: {
  range: TimeRange
  limit?: number
  /** Genre filter – only shown when `onGenreChange` is given. */
  genre?: string | null
  onGenreChange?: (g: string | null) => void
}) {
  const { t } = useTranslation('widgets/top-albums')
  // 99 top tracks gives a much steadier album ranking than 50
  const q = useQuery(trackQueries.top(range, 99))
  const filterable = !!onGenreChange
  const genres = useGenreIndex(range, filterable)

  const tagged = useMemo(
    () =>
      (q.data ? aggregateTopAlbums(q.data).slice(0, limit) : []).map((a) => ({
        album: a,
        // album artists plus everyone featured on its top tracks
        genres: genresOf([...a.album.artists, ...a.tracks.flatMap((tr) => tr.artists)], genres.index),
      })),
    [q.data, limit, genres.index],
  )
  const options = useMemo(() => countValues(tagged.map((x) => x.genres)), [tagged])
  const visible = genre && filterable ? tagged.filter((x) => x.genres.has(genre)) : tagged

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  if (q.isPending)
    return (
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-square" />
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
        <Reveal deps={[range, genre]} stagger={0.04} className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {visible.map(({ album: a }, i) => (
            <AlbumCard
              key={a.album.id}
              album={a.album}
              rank={i + 1}
              caption={t('caption', { count: a.tracks.length })}
            />
          ))}
        </Reveal>
      )}
    </div>
  )
}
