import { useRef, useState, type DragEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Card } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { Trans, useTranslation } from '@/shared/i18n'
import { saveStreamHistory, streamHistoryQueries } from '@/entities/stream-history'
import { readStreamingFiles } from '../model/readFiles'

export function ImportHistory({ className }: { className?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const qc = useQueryClient()
  const { t } = useTranslation('features/import-history')

  const importMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const { streams, files: used } = await readStreamingFiles(files)
      const history = { importedAt: Date.now(), files: used, streams }
      await saveStreamHistory(history)
      return history
    },
    onSuccess: (h) => qc.setQueryData(streamHistoryQueries.all().queryKey, h),
  })

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    importMutation.mutate([...e.dataTransfer.files])
  }

  return (
    <Card className={cn('grain overflow-hidden', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors',
          dragging ? 'border-brand bg-brand-soft' : 'border-line',
        )}
      >
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-2xl text-brand">⇪</div>
        <div>
          <h3 className="font-display text-xl font-semibold">{t('title')}</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-muted">
            <Trans
              t={t}
              i18nKey="description"
              components={{
                b: <b className="text-ink" />,
                i: <i />,
                code: <code />,
                link: (
                  <a
                    className="text-brand underline-offset-2 hover:underline"
                    href="https://www.spotify.com/account/privacy/"
                    target="_blank"
                    rel="noreferrer"
                  />
                ),
              }}
            />
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => input.current?.click()} disabled={importMutation.isPending}>
            {importMutation.isPending ? t('processing') : t('chooseFiles')}
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          accept=".json,.zip,application/json,application/zip"
          multiple
          hidden
          onChange={(e) => e.target.files && importMutation.mutate([...e.target.files])}
        />
        {importMutation.isError && <p className="text-sm text-danger">{importMutation.error.message}</p>}
        {importMutation.isSuccess && (
          <p className="text-sm text-brand">{t('imported', { count: importMutation.data.streams.length })}</p>
        )}
      </div>
    </Card>
  )
}
