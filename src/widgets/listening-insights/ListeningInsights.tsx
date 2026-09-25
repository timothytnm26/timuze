import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trackQueries } from '@/entities/track'
import { artistQueries } from '@/entities/artist'
import { releaseDecades } from '@/entities/album'
import type { TimeRange } from '@/shared/api'
import { useTranslation } from '@/shared/i18n'
import { AnimatedNumber, Card, CardHeader, ColumnChart, Reveal, Skeleton } from '@/shared/ui'
import { cn, formatDuration } from '@/shared/lib'

function Insight({
  title,
  value,
  suffix,
  note,
  tone = 'brand',
  format,
}: {
  title: string
  value: number
  suffix?: string
  note: string
  tone?: 'brand' | 'accent'
  format?: (n: number) => string
}) {
  return (
    <Card data-reveal className="relative overflow-hidden">
      <div
        data-decor
        className={cn(
          'pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-20 blur-2xl',
          tone === 'brand' ? 'bg-brand' : 'bg-accent',
        )}
        aria-hidden
      />
      <p className="text-sm text-ink-muted">{title}</p>
      <p className="mt-2 font-display text-4xl font-bold tracking-tight tabular-nums">
        <AnimatedNumber value={value} format={format} />
        {suffix && <span className="ml-1 text-lg text-ink-muted">{suffix}</span>}
      </p>
      <p className="mt-2 text-sm text-ink-muted">{note}</p>
    </Card>
  )
}

export function ListeningInsights({ range }: { range: TimeRange }) {
  const { t: m } = useTranslation(['widgets/listening-insights', 'common'])
  const tracks = useQuery(trackQueries.top(range, 50))
  const artists = useQuery(artistQueries.top(range, 50))
  const recent = useQuery(trackQueries.recent())

  const insights = useMemo(() => {
    if (!tracks.data || !artists.data) return null
    const t = tracks.data
    const top5 = new Set(artists.data.slice(0, 5).map((a) => a.id))
    const loyalty = t.filter((x) => x.artists.some((a) => top5.has(a.id))).length / Math.max(1, t.length)
    const distinctArtists = new Set(t.flatMap((x) => x.artists.map((a) => a.id))).size
    const years = t.map((x) => Number(x.album.release_date.slice(0, 4))).filter(Boolean)
    const avgYear = years.reduce((s, y) => s + y, 0) / Math.max(1, years.length)
    const avgLen = t.reduce((s, x) => s + x.duration_ms, 0) / Math.max(1, t.length)
    const night = recent.data
      ? recent.data.filter((p) => {
          const h = new Date(p.played_at).getHours()
          return h >= 22 || h < 4
        }).length / Math.max(1, recent.data.length)
      : 0
    const decades = releaseDecades(t).map(([k, v]) => ({ key: k, label: k, value: v, hint: m('decades.hint', { decade: k }) }))
    return { loyalty, distinctArtists, avgYear, avgLen, night, decades }
  }, [tracks.data, artists.data, recent.data, m])

  if (!insights)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-card" />
        ))}
      </div>
    )

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Reveal deps={[range]} scroll className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
        <Insight
          title={m('loyalty.title')}
          value={Math.round(insights.loyalty * 100)}
          suffix="%"
          note={m('loyalty.note')}
        />
        <Insight
          title={m('explorer.title')}
          value={insights.distinctArtists}
          suffix={m('common:units.artistSuffix')}
          note={m('explorer.note')}
          tone="accent"
        />
        <Insight
          title={m('era.title')}
          value={insights.avgYear}
          format={(n) => String(Math.round(n))}
          note={m('era.note')}
          tone="accent"
        />
        <Insight
          title={m('nightOwl.title')}
          value={Math.round(insights.night * 100)}
          suffix="%"
          note={m('nightOwl.note', { avgLength: formatDuration(insights.avgLen) })}
        />
      </Reveal>
      <Card>
        <CardHeader title={m('decades.title')} subtitle={m('decades.subtitle')} />
        <ColumnChart data={insights.decades} ariaLabel={m('decades.ariaLabel')} formatValue={(v) => m('common:units.tracks', { count: v })} height={210} />
      </Card>
    </div>
  )
}
