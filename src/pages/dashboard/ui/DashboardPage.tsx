import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { TimeRange } from '@/shared/api'
import { TimeRangeSwitch, useTimeRangeLabel } from '@/features/time-range'
import { Trans, useTranslation } from '@/shared/i18n'
import { ProfileHero } from '@/widgets/profile-hero'
import { TopArtists } from '@/widgets/top-artists'
import { TopTracks } from '@/widgets/top-tracks'
import { TopAlbums } from '@/widgets/top-albums'
import { GenreBreakdown } from '@/widgets/genre-breakdown'
import { ListeningClock } from '@/widgets/listening-clock'
import { ListeningInsights } from '@/widgets/listening-insights'

function Section({ title, to, range, children }: { title: string; to?: string; range: TimeRange; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className="mb-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {to && (
          <Link to={to} search={{ range }} className="text-sm font-medium text-ink-muted hover:text-brand">
            {t('actions.seeAll')}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

export function DashboardPage({ range, onRangeChange }: { range: TimeRange; onRangeChange: (r: TimeRange) => void }) {
  const { t } = useTranslation('pages/dashboard')
  const rangeLabel = useTimeRangeLabel()
  return (
    <>
      <ProfileHero />
      <div className="sticky top-16 z-20 -mx-4 mb-10 flex flex-wrap items-center justify-between gap-3 bg-canvas/80 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8 glass:bg-canvas/30">
        <p className="text-sm text-ink-muted">
          <Trans t={t} i18nKey="statsIn" values={{ range: rangeLabel(range) }} components={{ b: <b className="text-ink" /> }} />
        </p>
        <TimeRangeSwitch value={range} onChange={onRangeChange} />
      </div>

      <Section title={t('sections.favoriteArtists')} to="/artists" range={range}>
        <TopArtists range={range} limit={9} />
      </Section>

      <Section title={t('sections.insights')} range={range}>
        <ListeningInsights range={range} />
      </Section>

      <Section title={t('sections.topTracks')} to="/tracks" range={range}>
        <TopTracks range={range} limit={10} columns={2} />
      </Section>

      <Section title={t('sections.topAlbums')} to="/albums" range={range}>
        <TopAlbums range={range} limit={5} />
      </Section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <GenreBreakdown range={range} />
        <ListeningClock />
      </section>
    </>
  )
}
