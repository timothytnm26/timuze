import { useRef, useState, type DragEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BrandIcon, brandStyle, Button, Card, Icon } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { Trans, useTranslation } from '@/shared/i18n'
import { playStore, streamHistoryQueries, type StreamSource } from '@/entities/stream-history'
import { IMPORTERS, readImport } from '../model/importers'
import { LastfmForm } from './LastfmForm'

const SOURCES: StreamSource[] = ['spotify', 'youtube', 'apple', 'lastfm']
const STEPS = [1, 2, 3, 4, 5] as const
const WARNINGS = [1, 2, 3] as const

const LINKS: Record<StreamSource, string> = {
  spotify: 'https://www.spotify.com/account/privacy/',
  youtube: 'https://takeout.google.com/',
  apple: 'https://privacy.apple.com/',
  lastfm: 'https://www.last.fm/settings/privacy',
}

export function ImportHistory({
  className,
  initialSource = 'spotify',
  initialUsername,
}: {
  className?: string
  initialSource?: StreamSource
  initialUsername?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<StreamSource>(initialSource)
  const [dragging, setDragging] = useState(false)
  const qc = useQueryClient()
  const { t } = useTranslation('features/import-history')

  const importMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (source === 'lastfm') throw new Error('Last.fm is imported through its own form')
      const record = await readImport(source, files)
      await playStore.addImport(record)
      return record
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: streamHistoryQueries.all().queryKey }),
  })

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    importMutation.mutate([...e.dataTransfer.files])
  }

  const rich = {
    b: <b className="text-ink" />,
    i: <i />,
    code: <code />,
    ext2: <a className="text-(--src) underline-offset-2 hover:underline" href="https://www.last.fm/api/account/create" target="_blank" rel="noreferrer" />,
    ext: <a className="text-(--src) underline-offset-2 hover:underline" href={LINKS[source]} target="_blank" rel="noreferrer" />,
  }

  return (
    // every colour below comes from --src, the colour of the selected service
    <Card className={cn('grain flex flex-col gap-6 overflow-hidden', className)} style={brandStyle(source)}>
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-xl font-semibold">{t('title')}</h3>
        <p className="max-w-2xl text-sm text-ink-muted">{t('intro')}</p>
        <div role="tablist" aria-label={t('sourceLabel')} className="mt-2 flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === source}
              style={brandStyle(s)}
              onClick={() => {
                importMutation.reset()
                setSource(s)
              }}
              className={cn(
                'flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors',
                s === source ? 'border-(--src) bg-(--src)/15 text-ink' : 'border-line text-ink-muted hover:border-(--src)/60 hover:text-ink',
              )}
            >
              <BrandIcon brand={s} className="size-5" />
              {t(`sources.${s}.label`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section aria-label={t('stepsTitle')}>
          <h4 className="font-display text-sm font-semibold">{t('stepsTitle')}</h4>
          <p className="mt-1 text-xs text-ink-faint">{t(`sources.${source}.eta`)}</p>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink-muted marker:text-(--src)">
            {STEPS.map((n) => (
              <li key={`${source}${n}`}>
                <Trans t={t} i18nKey={`sources.${source}.step${n}`} components={rich} />
              </li>
            ))}
          </ol>
        </section>

        <section aria-label={t('warningsTitle')} className="rounded-2xl border border-(--src)/30 bg-(--src)/5 p-4">
          <h4 className="font-display text-sm font-semibold"><Icon name="warning" className="mr-1.5 inline-block size-4 -translate-y-px" />
            {t('warningsTitle')}</h4>
          <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-sm text-ink-muted">
            {WARNINGS.map((n) => (
              <li key={`${source}${n}`}>
                <Trans t={t} i18nKey={`sources.${source}.warn${n}`} components={rich} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      {source === 'lastfm' ? (
        <LastfmForm initialUsername={initialUsername} />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragging ? 'border-(--src) bg-(--src)/10' : 'border-(--src)/40',
          )}
        >
          <BrandIcon brand={source} className="size-14" />
          <p className="max-w-lg text-sm text-ink-muted">{t(`sources.${source}.drop`)}</p>
          <Button
            className="bg-(--src) text-(--src-ink) hover:bg-(--src)/85"
            onClick={() => input.current?.click()}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? t('processing') : t('chooseFiles')}
          </Button>
          <input
            key={source}
            ref={input}
            type="file"
            accept={IMPORTERS[source].accept}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) importMutation.mutate([...e.target.files])
              e.target.value = ''
            }}
          />
          {importMutation.isError && <p className="text-sm text-danger">{importMutation.error.message}</p>}
          {importMutation.isSuccess && (
            <p className="text-sm text-(--src)">{t('imported', { count: importMutation.data.streams.length })}</p>
          )}
        </div>
      )}

      <p className="text-xs text-ink-faint">{t('privacy')}</p>
    </Card>
  )
}
