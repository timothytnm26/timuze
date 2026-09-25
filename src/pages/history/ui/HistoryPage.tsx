import { useQuery } from '@tanstack/react-query'
import { streamHistoryQueries } from '@/entities/stream-history'
import { ImportHistory } from '@/features/import-history'
import { Skeleton } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'
import { PageHeader } from '@/widgets/page-header'
import { HistoryDashboard } from '@/widgets/history-dashboard'

export function HistoryPage() {
  const { t } = useTranslation('pages/history')
  const q = useQuery(streamHistoryQueries.all())
  return (
    <>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      {q.isPending ? (
        <Skeleton className="h-80 rounded-card" />
      ) : q.data ? (
        <HistoryDashboard history={q.data} />
      ) : (
        <ImportHistory />
      )}
    </>
  )
}
