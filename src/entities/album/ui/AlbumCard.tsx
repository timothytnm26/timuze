import { Cover } from '@/shared/ui'
import { cn } from '@/shared/lib'
import type { SimplifiedAlbum } from '../model/types'

export function AlbumCard({
  album,
  rank,
  caption,
  className,
}: {
  album: SimplifiedAlbum
  rank?: number
  caption?: string
  className?: string
}) {
  return (
    <a
      href={album.external_urls.spotify}
      target="_blank"
      rel="noreferrer"
      data-reveal
      className={cn('group flex flex-col gap-3', className)}
    >
      <div className="relative overflow-hidden rounded-xl">
        <Cover
          images={album.images}
          alt={album.name}
          rounded="xl"
          className="w-full transition-transform duration-700 group-hover:scale-105"
        />
        {rank !== undefined && (
          <span className="absolute top-2 left-2 rounded-full bg-canvas/70 px-2.5 py-0.5 font-display text-sm font-bold backdrop-blur">
            #{rank}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{album.name}</p>
        <p className="truncate text-sm text-ink-muted">
          {album.artists.map((a) => a.name).join(', ')}
          {caption && <> · {caption}</>}
        </p>
      </div>
    </a>
  )
}
