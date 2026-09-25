import { useTranslation } from '@/shared/i18n'
import { PageHeader } from '@/widgets/page-header'
import { RecentTimeline } from '@/widgets/recent-timeline'
import { ListeningClock } from '@/widgets/listening-clock'

export function RecentPage() {
  const { t } = useTranslation('pages/recent')
  return (
    <>
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <RecentTimeline />
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ListeningClock />
        </aside>
      </div>
    </>
  )
}
