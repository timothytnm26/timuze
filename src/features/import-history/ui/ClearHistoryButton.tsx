import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'
import { clearStreamHistory, streamHistoryQueries } from '@/entities/stream-history'

export function ClearHistoryButton() {
  const qc = useQueryClient()
  const { t } = useTranslation('features/import-history')
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await clearStreamHistory()
        qc.setQueryData(streamHistoryQueries.all().queryKey, null)
      }}
    >
      {t('clear')}
    </Button>
  )
}
