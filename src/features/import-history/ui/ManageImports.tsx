import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card } from '@/shared/ui'
import { Trans, useFormatters, useTranslation } from '@/shared/i18n'
import { playStore, streamHistoryQueries, type StreamHistory } from '@/entities/stream-history'
import { ImportHistory } from './ImportHistory'

/** Lists past imports (delete one at a time) and lets the user add another export. */
export function ManageImports({ history }: { history: StreamHistory }) {
  const { t } = useTranslation(['features/import-history', 'common'])
  const f = useFormatters()
  const qc = useQueryClient()

  const remove = useMutation({
    mutationFn: (id: string) => playStore.deleteImport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: streamHistoryQueries.all().queryKey }),
  })

  const estimated = [...new Set(history.imports.filter((i) => i.source === 'youtube' || i.source === 'lastfm').map((i) => t(`sources.${i.source}.label`)))]

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium text-brand select-none">{t('manage.summary')}</summary>
      <div className="mt-4 flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h3 className="font-display text-base font-semibold">{t('manage.title')}</h3>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {history.imports.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <b>{t(`sources.${i.source}.label`)}</b>
                  <span className="text-ink-muted">
                    {' '}
                    · {t('common:units.plays', { count: i.count })} · {f.dateTime(i.importedAt)}
                  </span>
                </span>
                <Button variant="ghost" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(i.id)}>
                  {t('manage.remove')}
                </Button>
              </li>
            ))}
          </ul>
          {estimated.length > 0 && (
            <p className="text-xs text-ink-faint">
              <Trans t={t} i18nKey="manage.estimateNote" values={{ sources: estimated.join(', ') }} components={{ b: <b /> }} />
            </p>
          )}
          {history.duplicates > 0 && (
            <p className="text-xs text-ink-faint">{t('manage.duplicatesNote', { count: history.duplicates })}</p>
          )}
          <p className="text-xs text-ink-faint">{t('manage.storageNote')}</p>
        </Card>
        <ImportHistory />
      </div>
    </details>
  )
}
