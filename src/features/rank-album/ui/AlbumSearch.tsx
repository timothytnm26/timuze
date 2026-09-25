import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { albumQueries, type SimplifiedAlbum } from '@/entities/album'
import { useTranslation } from '@/shared/i18n'
import { cn, useDebounced } from '@/shared/lib'
import { Cover } from '@/shared/ui'

/** Search-as-you-type over Spotify's albums; picking a result hands it up and clears the box. */
export function AlbumSearch({ onSelect, className }: { onSelect: (album: SimplifiedAlbum) => void; className?: string }) {
  const { t } = useTranslation('features/rank-album')
  const [text, setText] = useState('')
  const query = useDebounced(text.trim(), 300)
  const results = useQuery(albumQueries.search(query))
  const open = text.trim().length > 0

  return (
    <div className={className}>
      <label className="panel flex h-13 items-center gap-3 rounded-2xl border-line bg-surface px-4 focus-within:border-brand">
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-ink-faint" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <span className="sr-only">{t('search.label')}</span>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('search.placeholder')}
          enterKeyHint="search"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText('')}
            className="cursor-pointer rounded-full px-2 py-1 text-xs text-ink-muted hover:text-ink"
          >
            {t('search.clear')}
          </button>
        )}
      </label>

      {open && (
        <div className="mt-2" aria-live="polite">
          {results.isFetching && !results.data ? (
            <p className="px-2 py-3 text-sm text-ink-muted">{t('search.searching')}</p>
          ) : results.isError ? (
            <p className="px-2 py-3 text-sm text-danger">{results.error.message}</p>
          ) : results.data && results.data.length === 0 ? (
            <p className="px-2 py-3 text-sm text-ink-muted">{t('search.noResults', { query })}</p>
          ) : (
            <ul className={cn('flex flex-col gap-1 transition-opacity', results.isFetching && 'opacity-60')}>
              {results.data?.map((album) => (
                <li key={album.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(album)
                      setText('')
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface"
                  >
                    <Cover images={album.images} alt="" size={64} className="size-12 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{album.name}</span>
                      <span className="block truncate text-sm text-ink-muted">
                        {album.artists.map((a) => a.name).join(', ')} · {album.release_date.slice(0, 4)}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-ink-faint">{t('tracks', { count: album.total_tracks })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
