import { Segmented } from '@/shared/ui'
import type { TimeRange } from '@/shared/api'
import { useTranslation } from '@/shared/i18n'
import { TIME_RANGES } from '../model/timeRange'

export function TimeRangeSwitch({ value, onChange }: { value: TimeRange; onChange: (r: TimeRange) => void }) {
  const { t } = useTranslation()
  return (
    <Segmented
      label={t('timeRange.label')}
      options={TIME_RANGES.map((r) => ({ value: r, label: t(`timeRange.${r}.label`) }))}
      value={value}
      onChange={onChange}
    />
  )
}
