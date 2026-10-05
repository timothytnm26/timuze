import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BrandIcon, Button, Card } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { Trans, useFormatters, useTranslation } from '@/shared/i18n'
import { playStore, streamHistoryQueries, type StreamHistory, type StreamSource } from '@/entities/stream-history'
import { ImportHistory } from './ImportHistory'

/** Lists past imports (delete one at a time) and lets the user add another export. */
export function ManageImports({
  history,
  initialSource,
  initialUsername,
}: {
  history: StreamHistory
  initialSource?: StreamSource
  initialUsername?: string
}) {
  const { t } = useTranslation(['features/import-history', 'common'])
  const f = useFormatters()
  const qc = useQueryClient()

  const remove = useMutation({
    mutationFn: (id: string) => playStore.deleteImport(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: streamHistoryQueries.all().queryKey }),
  })

  const used = [...new Set(history.imports.map((i) => t(`sources.${i.source}.label`)))]
  const estimated = [...new Set(history.imports.filter((i) => i.source === 'youtube' || i.source === 'lastfm').map((i) => t(`sources.${i.source}.label`)))]

  return (
    <details className="group panel rounded-card border-line bg-surface" open={initialSource ? true : undefined}>
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-4 select-none [&::-webkit-details-marker]:hidden',
          'transition-colors hover:bg-surface-2/60',
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-lg text-brand">⇪</span>
          <span className="min-w-0">
            <span className="block font-display text-base font-semibold">{t('manage.summary')}</span>
            <span className="block truncate text-xs text-ink-muted">{t('manage.using', { sources: used.join(', ') })}</span>
          </span>
        </span>
        <svg viewBox="0 0 10 6" className="size-3 shrink-0 text-ink-muted transition-transform group-open:rotate-180" aria-hidden>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </summary>
      <div className="flex flex-col gap-4 border-t border-line/60 p-5">
        <Card className="flex flex-col gap-3">
          <h3 className="font-display text-base font-semibold">{t('manage.title')}</h3>
          <ul className="flex flex-col divide-y divide-line text-sm">
            {history.imports.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2">
                  <BrandIcon brand={i.source} className="size-5" />
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
        <ImportHistory initialSource={initialSource} initialUsername={initialUsername} />
      </div>
    </details>
  )
}
