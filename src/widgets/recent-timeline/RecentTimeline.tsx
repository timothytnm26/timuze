import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrackRow, trackQueries, type PlayHistory } from '@/entities/track'
import { ErrorState, Reveal, Skeleton } from '@/shared/ui'
import { useFormatters, useTranslation, type Formatters, type TFunction } from '@/shared/i18n'

const dayLabel = (d: Date, t: TFunction<'common'>, f: Formatters) => {
  const today = new Date()
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return t('calendar.today')
  if (d.toDateString() === y.toDateString()) return t('calendar.yesterday')
  return f.date(d, { weekday: 'long', day: 'numeric', month: 'long' })
}

export function RecentTimeline({ limit = 50 }: { limit?: number }) {
  const { t } = useTranslation('common')
  const { t: tw } = useTranslation('widgets/recent-timeline')
  const f = useFormatters()
  const q = useQuery(trackQueries.recent())
  const groups = useMemo(() => {
    const map = new Map<string, PlayHistory[]>()
    q.data?.slice(0, limit).forEach((p) => {
      const k = dayLabel(new Date(p.played_at), t, f)
      map.set(k, [...(map.get(k) ?? []), p])
    })
    return [...map.entries()]
  }, [q.data, limit, t, f])

  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  if (q.isPending)
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-15" />
        ))}
      </div>
    )

  return (
    <Reveal className="flex flex-col gap-8" stagger={0.02} y={10}>
      {groups.map(([day, plays]) => (
        <section key={day}>
          <h3 data-reveal className="sticky top-16 z-10 mb-2 bg-canvas/80 py-2 font-display text-sm font-semibold text-ink-muted capitalize backdrop-blur">
            {tw('groupTitle', { day, count: plays.length })}
          </h3>
          <div className="relative flex flex-col gap-0.5 border-l border-line pl-4">
            {plays.map((p) => (
              <div key={p.played_at} className="relative">
                <span className="absolute top-1/2 -left-[1.3rem] size-2 -translate-y-1/2 rounded-full bg-brand ring-4 ring-canvas" />
                <TrackRow track={p.track} meta={f.relative(p.played_at)} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </Reveal>
  )
}
