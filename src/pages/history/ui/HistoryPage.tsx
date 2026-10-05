import { useQuery } from '@tanstack/react-query'
import { streamHistoryQueries, type StreamSource } from '@/entities/stream-history'
import { ImportHistory, ManageImports } from '@/features/import-history'
import { Skeleton } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'
import { PageHeader } from '@/widgets/page-header'
import { HistoryDashboard } from '@/widgets/history-dashboard'

export function HistoryPage({ initialSource, initialUsername }: { initialSource?: StreamSource; initialUsername?: string }) {
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
        <>
          <div className="mb-6">
            <ManageImports history={q.data} initialSource={initialSource} initialUsername={initialUsername} />
          </div>
          <HistoryDashboard history={q.data} />
        </>
      ) : (
        <ImportHistory initialSource={initialSource} initialUsername={initialUsername} />
      )}
    </>
  )
}
