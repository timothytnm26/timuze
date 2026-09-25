import type { TimeRange } from '@/shared/api'
import { useTranslation } from '@/shared/i18n'

export const TIME_RANGES: readonly TimeRange[] = ['short_term', 'medium_term', 'long_term']

export const parseTimeRange = (v: unknown): TimeRange =>
  v === 'short_term' || v === 'long_term' || v === 'medium_term' ? v : 'medium_term'

/** Long form for sentences, e.g. "6 tháng qua" / "the last 6 months" / "過去6か月". */
export function useTimeRangeLabel() {
  const { t } = useTranslation()
  return (r: TimeRange) => t(`timeRange.${r}.long`)
}

/** TanStack Router `validateSearch` for any page that has a time range. */
export const validateTimeRangeSearch = (search: Record<string, unknown>): { range?: TimeRange } => ({
  range: search.range === undefined ? undefined : parseTimeRange(search.range),
})
