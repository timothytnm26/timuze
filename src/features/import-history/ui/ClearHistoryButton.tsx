import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui'
import { useTranslation } from '@/shared/i18n'
import { playStore, streamHistoryQueries } from '@/entities/stream-history'

export function ClearHistoryButton() {
  const qc = useQueryClient()
  const { t } = useTranslation('features/import-history')
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!window.confirm(t('confirmClear'))) return
        await playStore.clear()
        qc.setQueryData(streamHistoryQueries.all().queryKey, null)
      }}
    >
      {t('clear')}
    </Button>
  )
}
