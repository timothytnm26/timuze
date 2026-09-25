import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { aggregateGenres, artistQueries } from '@/entities/artist'
import type { TimeRange } from '@/shared/api'
import { useTranslation } from '@/shared/i18n'
import { BarList, Card, CardHeader, EmptyState, Skeleton } from '@/shared/ui'

export function GenreBreakdown({ range }: { range: TimeRange }) {
  const { t } = useTranslation('widgets/genre-breakdown')
  const q = useQuery(artistQueries.top(range, 50))
  const genres = useMemo(() => (q.data ? aggregateGenres(q.data, 8) : []), [q.data])

  return (
    <Card>
      <CardHeader title={t('title')} subtitle={t('subtitle')} />
      {q.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : genres.length ? (
        <BarList
          items={genres.map((g) => ({
            key: g.genre,
            label: <span className="capitalize">{g.genre}</span>,
            value: g.share,
            display: `${Math.round(g.share * 100)}%`,
          }))}
        />
      ) : (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          className="py-6"
        />
      )}
    </Card>
  )
}
