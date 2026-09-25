import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trackQueries } from '@/entities/track'
import { useTranslation } from '@/shared/i18n'
import { Card, CardHeader, ColumnChart, Skeleton } from '@/shared/ui'

/** When do you listen? – hour-of-day distribution of the last 50 plays. */
export function ListeningClock() {
  const { t } = useTranslation(['widgets/listening-clock', 'common'])
  const q = useQuery(trackQueries.recent())
  const data = useMemo(() => {
    const hours = Array<number>(24).fill(0)
    q.data?.forEach((p) => {
      const h = new Date(p.played_at).getHours()
      hours[h] = (hours[h] ?? 0) + 1
    })
    return hours.map((v, h) => ({ key: String(h), label: String(h), value: v, hint: t('common:calendar.hourRange', { from: h, to: h + 1 }) }))
  }, [q.data, t])

  const peak = data.reduce((best, d) => (d.value > best.value ? d : best), data[0] ?? { value: 0, hint: '' })

  return (
    <Card>
      <CardHeader
        title={t('title')}
        subtitle={q.data?.length ? t('subtitlePeak', { peak: peak.hint }) : t('subtitle')}
      />
      {q.isPending ? (
        <Skeleton className="h-48" />
      ) : (
        <ColumnChart
          data={data}
          labelEvery={3}
          ariaLabel={t('ariaLabel')}
          formatValue={(v) => t('common:units.plays', { count: v })}
        />
      )}
    </Card>
  )
}
