import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui'
import { env } from '@/shared/config'
import { safeStorage } from '@/shared/lib'
import { useTranslation } from '@/shared/i18n'
import { playStore, streamHistoryQueries } from '@/entities/stream-history'
import { fetchLastfmHistory, LastfmError } from '../model/importers/lastfm'

const USER_KEY = 'lastfm-username'
const API_KEY = 'lastfm-api-key'

const field =
  'w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-(--src) focus:outline-none'

export function LastfmForm({ initialUsername }: { initialUsername?: string }) {
  const { t } = useTranslation('features/import-history')
  const qc = useQueryClient()
  const [username, setUsername] = useState(() => initialUsername ?? safeStorage.get<string>(USER_KEY) ?? '')
  const [apiKey, setApiKey] = useState(() => safeStorage.get<string>(API_KEY) ?? '')
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const needsKey = !env.lastfmApiKey

  const run = useMutation({
    mutationFn: async () => {
      const user = username.trim()
      const key = (env.lastfmApiKey || apiKey).trim()
      safeStorage.set(USER_KEY, user)
      if (needsKey) safeStorage.set(API_KEY, key)
      setProgress(null)
      const record = await fetchLastfmHistory({
        username: user,
        apiKey: key,
        onProgress: (done, total) => setProgress([done, total]),
      })
      if (!record.streams.length) throw new LastfmError('privateProfile')
      await playStore.addImport(record)
      return record
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: streamHistoryQueries.all().queryKey }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    run.mutate()
  }

  const error = run.error instanceof LastfmError ? t(`errors.lastfm.${run.error.code}`) : run.error?.message

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-(--src)/40 px-6 py-8">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t('lastfm.username')}</span>
        <input className={field} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" spellCheck={false} required />
      </label>
      {needsKey && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('lastfm.apiKey')}</span>
          <input className={field} value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" spellCheck={false} required />
          <span className="text-xs text-ink-faint">{t('lastfm.apiKeyHint')}</span>
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="bg-(--src) text-(--src-ink) hover:bg-(--src)/85" disabled={run.isPending}>
          {run.isPending ? t('processing') : t('lastfm.start')}
        </Button>
        {run.isPending && progress && (
          <span className="text-sm text-ink-muted">{t('lastfm.progress', { done: progress[0], total: progress[1] })}</span>
        )}
      </div>
      {run.isError && <p className="text-sm text-danger">{error}</p>}
      {run.isSuccess && <p className="text-sm text-(--src)">{t('imported', { count: run.data.streams.length })}</p>}
    </form>
  )
}
