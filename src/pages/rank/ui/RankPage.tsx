import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { albumQueries, type SimplifiedAlbum } from '@/entities/album'
import { trackQueries } from '@/entities/track'
import { AlbumRanking, AlbumSearch } from '@/features/rank-album'
import { useTranslation } from '@/shared/i18n'
import { Cover, ErrorState, Skeleton } from '@/shared/ui'
import { PageHeader } from '@/widgets/page-header'

/** Albums from the last 50 plays, most recent first, each once. */
function RecentAlbums({ onSelect }: { onSelect: (album: SimplifiedAlbum) => void }) {
  const { t } = useTranslation('pages/rank')
  const recent = useQuery(trackQueries.recent())
  const albums = useMemo(() => {
    const seen = new Set<string>()
    return (recent.data ?? []).flatMap(({ track }) => {
      // singles are albums too, but a one-track "ranking" is no fun
      if (seen.has(track.album.id) || track.album.total_tracks < 2) return []
      seen.add(track.album.id)
      return [track.album]
    })
  }, [recent.data])

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-semibold">{t('recent')}</h2>
      {recent.isPending ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-square w-28 shrink-0 rounded-xl sm:w-36" />
          ))}
        </div>
      ) : recent.isError ? (
        <ErrorState error={recent.error} onRetry={() => void recent.refetch()} />
      ) : albums.length === 0 ? (
        <p className="text-sm text-ink-muted">{t('recentEmpty')}</p>
      ) : (
        // phones: a swipeable row; wider screens: a grid
        <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {albums.map((album) => (
            <li key={album.id} className="w-28 shrink-0 snap-start sm:w-auto">
              <button type="button" onClick={() => onSelect(album)} className="group w-full cursor-pointer text-left">
                <Cover
                  images={album.images}
                  alt=""
                  size={300}
                  rounded="xl"
                  className="w-full ring-brand transition-[box-shadow,transform] duration-300 group-hover:ring-2 group-active:scale-[.97]"
                />
                <span className="mt-2 block truncate text-sm font-semibold">{album.name}</span>
                <span className="block truncate text-xs text-ink-muted">{album.artists.map((a) => a.name).join(', ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SelectedAlbum({ id, onChange }: { id: string; onChange: () => void }) {
  const { t } = useTranslation('pages/rank')
  const album = useQuery(albumQueries.detail(id))
  if (album.isError) return <ErrorState error={album.error} onRetry={() => void album.refetch()} />
  if (album.isPending)
    return (
      <div className="flex flex-col gap-2" aria-label={t('loadingAlbum')}>
        <Skeleton className="mb-3 h-28 w-full rounded-2xl" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    )
  return <AlbumRanking key={album.data.id} album={album.data} onChangeAlbum={onChange} />
}

/** Pick an album (search or a recent one), then rank its tracks; `albumId` lives in the URL. */
export function RankPage({ albumId, onAlbumChange }: { albumId?: string; onAlbumChange: (id: string | undefined) => void }) {
  const { t } = useTranslation('pages/rank')
  const select = (album: SimplifiedAlbum) => {
    onAlbumChange(album.id)
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <p role="note" className="mb-6 flex gap-2.5 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
        <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
        {t('notice')}
      </p>
      <div className="mx-auto max-w-3xl">
        {albumId ? (
          <SelectedAlbum id={albumId} onChange={() => onAlbumChange(undefined)} />
        ) : (
          <>
            <AlbumSearch onSelect={select} />
            <RecentAlbums onSelect={select} />
          </>
        )}
      </div>
    </>
  )
}
