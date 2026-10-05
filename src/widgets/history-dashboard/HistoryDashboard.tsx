import { useMemo, useState } from 'react'
import { availableYears, computeHistoryStats, PLATFORM_IDS, type StreamHistory, type StreamSource } from '@/entities/stream-history'
import { ClearHistoryButton } from '@/features/import-history'
import { AnimatedNumber, BarList, BRANDS, BrandIcon, brandFill, brandStyle, Card, CardHeader, ColumnChart, Heatmap, Reveal, Segmented } from '@/shared/ui'
import { cn, msToHours } from '@/shared/lib'
import { useFormatters, useTranslation } from '@/shared/i18n'
import { RankingTable } from './RankingTable'

type Tab = 'tracks' | 'artists' | 'albums'
type SourceChoice = 'all' | StreamSource

const SOURCE_ORDER: StreamSource[] = ['spotify', 'youtube', 'apple', 'lastfm']

function Stat({ label, value, suffix, format }: { label: string; value: number; suffix?: string; format?: (n: number) => string }) {
  return (
    <Card data-reveal className="p-5">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums">
        <AnimatedNumber value={value} format={format} />
        {suffix && <span className="ml-1 text-base text-ink-muted">{suffix}</span>}
      </p>
    </Card>
  )
}

export function HistoryDashboard({ history }: { history: StreamHistory }) {
  const { t } = useTranslation(['widgets/history-dashboard', 'common'])
  const f = useFormatters()
  const months = t('common:calendar.monthsShort', { returnObjects: true })
  // which service's plays to look at – or all of them together (already merged across services)
  const present = useMemo(() => SOURCE_ORDER.filter((s) => history.bySource[s]?.length), [history])
  const [sourceChoice, setSourceChoice] = useState<SourceChoice>('all')
  const source = sourceChoice === 'all' || present.includes(sourceChoice) ? sourceChoice : 'all'
  const streams = source === 'all' ? history.streams : (history.bySource[source] ?? [])

  const years = useMemo(() => availableYears(streams), [streams])
  const [yearChoice, setYearChoice] = useState<string>(() => String(availableYears(history.streams)[0] ?? 'all'))
  // a service may not have the selected year
  const year = yearChoice === 'all' || years.includes(Number(yearChoice)) ? yearChoice : String(years[0] ?? 'all')
  const [tab, setTab] = useState<Tab>('tracks')
  const [metric, setMetric] = useState<'streams' | 'hours'>('streams')

  const stats = useMemo(
    () => computeHistoryStats(streams, year === 'all' ? undefined : Number(year), 500),
    [streams, year],
  )

  // in the all-sources view the charts keep their totals but show each service's share of them
  const split = source === 'all' && present.length > 1
  const segments = useMemo(() => present.map((s) => ({ key: s, label: t(`sources.${s}`), fill: brandFill(s) })), [present, t])
  // looking at one service: its colour replaces the skin's green
  const tint = source === 'all' ? undefined : 'var(--src)'

  const monthly = useMemo(() => {
    const partsOf = (m: (typeof stats.byMonth)[number] | undefined) =>
      split && m
        ? present.map((s) => ({ key: s, value: metric === 'streams' ? (m.bySource[s]?.streams ?? 0) : msToHours(m.bySource[s]?.ms ?? 0) }))
        : undefined
    if (year === 'all')
      return stats.byMonth.map((m) => ({
        key: m.key,
        label: m.month === 0 ? String(m.year).slice(2) : '',
        value: metric === 'streams' ? m.streams : msToHours(m.ms),
        hint: `${months[m.month]} ${m.year}`,
        parts: partsOf(m),
      }))
    return months.map((label, i) => {
      const m = stats.byMonth.find((x) => x.month === i)
      return {
        key: label,
        label,
        value: m ? (metric === 'streams' ? m.streams : msToHours(m.ms)) : 0,
        hint: `${label} ${year}`,
        parts: partsOf(m),
      }
    })
  }, [stats, year, metric, months, split, present])

  const rows = useMemo(() => {
    const src = tab === 'tracks' ? stats.topTracks : tab === 'artists' ? stats.topArtists : stats.topAlbums
    return src.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [stats, tab])

  const platformLabel = (p: string) => {
    const id = PLATFORM_IDS[p]
    return id ? t(`platforms.${id}`) : p
  }

  const top = stats.topArtists[0]
  const topTrack = stats.topTracks[0]

  return (
    <div className="flex flex-col gap-6" style={source === 'all' ? undefined : brandStyle(source)}>
      {present.length > 1 && (
        <div role="radiogroup" aria-label={t('sourceFilter.label')} className="flex flex-wrap gap-2">
          {(['all', ...present] as SourceChoice[]).map((s) => {
            const on = s === source
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                style={s === 'all' ? undefined : brandStyle(s)}
                onClick={() => setSourceChoice(s)}
                className={cn(
                  'flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                  s === 'all'
                    ? on
                      ? 'border-brand bg-brand-soft text-ink'
                      : 'border-line text-ink-muted hover:border-ink-faint hover:text-ink'
                    : on
                      ? 'border-(--src) bg-(--src)/15 text-ink'
                      : 'border-line text-ink-muted hover:border-(--src)/60 hover:text-ink',
                )}
              >
                {s !== 'all' && <BrandIcon brand={s} className="size-5" />}
                {s === 'all' ? t('sourceFilter.all') : t(`sources.${s}`)}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="scrollbar-none max-w-full overflow-x-auto">
          <Segmented
            label={t('year')}
            value={year}
            onChange={setYearChoice}
            options={[...years.map((y) => ({ value: String(y), label: String(y) })), { value: 'all', label: t('all') }]}
          />
        </div>
        <ClearHistoryButton />
      </div>

      {/* Wrapped-style hero */}
      <Reveal deps={[year]} className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card
          data-reveal
          className="grain relative overflow-hidden bg-gradient-to-br from-seq-2 via-surface to-surface p-8"
          style={tint ? { backgroundImage: 'linear-gradient(135deg, color-mix(in oklab, var(--src) 28%, transparent), transparent 70%)' } : undefined}
        >
          <p className={cn('font-mono text-xs tracking-[0.2em] uppercase', tint ? 'text-(--src)' : 'text-brand')}>
            {year === 'all' ? t('allTime') : t('yourYear', { year })}
          </p>
          <p className="mt-4 font-display text-6xl font-extrabold tracking-tight tabular-nums sm:text-7xl">
            <AnimatedNumber value={Math.round(stats.totalMs / 60000)} />
          </p>
          <p className="text-lg text-ink-muted">{t('minutesListened')} · {f.listeningTime(stats.totalMs)}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {top && (
              <div>
                <p className="text-xs text-ink-muted">{t('topArtist')}</p>
                <p className="truncate font-display text-2xl font-bold">{top.name}</p>
                <p className="text-sm text-ink-muted">{t('common:units.streams', { count: top.streams })}</p>
              </div>
            )}
            {topTrack && (
              <div>
                <p className="text-xs text-ink-muted">{t('topTrack')}</p>
                <p className="truncate font-display text-2xl font-bold">{topTrack.name}</p>
                <p className="text-sm text-ink-muted">{t('common:units.streams', { count: topTrack.streams })}</p>
              </div>
            )}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <Stat label={t('stats.streams')} value={stats.totalStreams} />
          <Stat label={t('stats.uniqueTracks')} value={stats.uniqueTracks} />
          <Stat label={t('stats.uniqueArtists')} value={stats.uniqueArtists} />
          <Stat label={t('stats.longestStreak')} value={stats.longestStreakDays} suffix={t('common:units.daySuffix')} />
          <Stat label={t('stats.skipRate')} value={Math.round(stats.skipRate * 100)} suffix="%" />
          <Stat
            label={stats.topDay ? `${t('stats.topDay')} · ${f.date(stats.topDay.date)}` : t('stats.topDay')}
            value={stats.topDay ? Math.round(stats.topDay.ms / 60000) : 0}
            suffix={t('common:units.minuteSuffix')}
          />
        </div>
      </Reveal>

      <Card>
        <CardHeader
          title={year === 'all' ? t('monthly.all') : t('monthly.year', { year })}
          subtitle={metric === 'streams' ? t('monthly.streamsSubtitle') : t('monthly.hoursSubtitle')}
          action={
            <Segmented
              label={t('monthly.metric')}
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'streams', label: t('common:labels.streams') },
                { value: 'hours', label: t('common:labels.listeningHours') },
              ]}
            />
          }
        />
        <ColumnChart
          data={monthly}
          height={220}
          ariaLabel={t('monthly.ariaLabel')}
          segments={split ? segments : undefined}
          color={tint}
          formatValue={(v) => (metric === 'streams' ? t('common:units.plays', { count: v }) : t('common:units.hoursValue', { value: f.decimal(v) }))}
        />
        {split && (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-muted">
            {stats.bySource.map((s) => (
              <li key={s.source} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={brandFill(s.source)} />
                {t(`sources.${s.source}`)} · {Math.round((s.ms / Math.max(1, stats.totalMs)) * 100)}%
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title={t('heatmap.title')} subtitle={t('heatmap.subtitle')} />
          <Heatmap
            grid={stats.heat}
            formatValue={f.listeningTime}
            parts={split ? segments.map((s) => ({ ...s, grid: stats.heatBySource[s.key] ?? stats.heat.map((r) => r.map(() => 0)) })) : undefined}
            color={tint}
          />
        </Card>
        <Card>
          <CardHeader title={t('devices.title')} subtitle={t('devices.subtitle')} />
          {stats.byPlatform.length ? (
            <BarList
              items={stats.byPlatform.map((p) => ({
                key: p.platform,
                label: platformLabel(p.platform),
                value: p.ms,
                display: `${Math.round((p.ms / stats.totalMs) * 100)}%`,
              }))}
            />
          ) : (
            <p className="text-sm text-ink-muted">{t('devices.empty')}</p>
          )}
        </Card>
      </div>

      {source === 'all' && stats.bySource.length > 1 && (
        <Card>
          <CardHeader title={t('sources.title')} subtitle={t('sources.subtitle')} />
          <BarList
            items={stats.bySource.map((s) => ({
              key: s.source,
              leading: <BrandIcon brand={s.source} className="size-5" />,
              color: BRANDS[s.source].color,
              label: t(`sources.${s.source}`),
              value: s.ms,
              display: `${Math.round((s.ms / stats.totalMs) * 100)}% · ${t('common:units.plays', { count: s.streams })}`,
            }))}
          />
        </Card>
      )}

      <Card>
        <CardHeader
          title={t('ranking.title')}
          subtitle={t('ranking.subtitle')}
          action={
            <Segmented
              label={t('ranking.type')}
              value={tab}
              onChange={setTab}
              options={[
                { value: 'tracks', label: t('common:labels.tracks') },
                { value: 'artists', label: t('common:labels.artists') },
                ...(stats.topAlbums.length ? [{ value: 'albums' as const, label: t('common:labels.albums') }] : []),
              ]}
            />
          }
        />
        <RankingTable key={`${tab}-${year}`} rows={rows} showArtist={tab !== 'artists'} />
      </Card>

      <p className={cn('text-center text-xs text-ink-faint')}>
        {t('footer', {
          plays: t('common:units.plays', { count: streams.length }),
          files: t('common:units.files', { count: history.files.length }),
          date: f.dateTime(history.importedAt),
        })}
      </p>
    </div>
  )
}
