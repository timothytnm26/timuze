import { Cover } from '@/shared/ui'
import { cn } from '@/shared/lib'
import { useTranslation } from '@/shared/i18n'
import type { Artist } from '../model/types'

export function ArtistCard({ artist, rank, className }: { artist: Artist; rank: number; className?: string }) {
  const { t } = useTranslation()
  return (
    <a
      href={artist.external_urls.spotify}
      target="_blank"
      rel="noreferrer"
      data-reveal
      className={cn('group flex flex-col gap-3 rounded-2xl p-3 transition-colors hover:bg-surface-2', className)}
    >
      <div className="relative">
        <Cover
          images={artist.images}
          alt={artist.name}
          rounded="full"
          className="w-full shadow-[0_20px_40px_-20px_rgba(0,0,0,.8)] transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute -bottom-1 left-1 grid size-9 place-items-center rounded-full border-4 border-surface bg-brand font-display text-sm font-bold text-canvas group-hover:border-surface-2">
          {rank}
        </span>
      </div>
      <div className="min-w-0 px-1">
        <p className="truncate font-semibold">{artist.name}</p>
        <p className="truncate text-xs text-ink-muted">{artist.genres?.slice(0, 2).join(' · ') || t('labels.artist')}</p>
      </div>
    </a>
  )
}
