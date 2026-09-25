import type { TimeRange } from '@/shared/api'
import { TimeRangeSwitch, useTimeRangeLabel } from '@/features/time-range'
import { useTranslation } from '@/shared/i18n'
import { PageHeader } from '@/widgets/page-header'
import { TopAlbums } from '@/widgets/top-albums'

export function TopAlbumsPage({
  range,
  onRangeChange,
  genre,
  onGenreChange,
}: {
  range: TimeRange
  onRangeChange: (r: TimeRange) => void
  genre: string | null
  onGenreChange: (v: string | null) => void
}) {
  const { t } = useTranslation('pages/top-albums')
  const rangeLabel = useTimeRangeLabel()
  return (
    <>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description', { range: rangeLabel(range) })}
        action={<TimeRangeSwitch value={range} onChange={onRangeChange} />}
      />
      <TopAlbums range={range} genre={genre} onGenreChange={onGenreChange} limit={30} />
    </>
  )
}
