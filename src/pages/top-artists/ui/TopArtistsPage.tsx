import type { TimeRange } from '@/shared/api'
import { TimeRangeSwitch, useTimeRangeLabel } from '@/features/time-range'
import { useTranslation } from '@/shared/i18n'
import { PageHeader } from '@/widgets/page-header'
import { TopArtists } from '@/widgets/top-artists'

export function TopArtistsPage({
  range,
  onRangeChange,
  country,
  onCountryChange,
}: {
  range: TimeRange
  onRangeChange: (r: TimeRange) => void
  country: string | null
  onCountryChange: (v: string | null) => void
}) {
  const { t } = useTranslation('pages/top-artists')
  const rangeLabel = useTimeRangeLabel()
  return (
    <>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description', { range: rangeLabel(range) })}
        action={<TimeRangeSwitch value={range} onChange={onRangeChange} />}
      />
      <TopArtists range={range} country={country} onCountryChange={onCountryChange} limit={99} />
    </>
  )
}
