import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SpotifyImage, TimeRange } from '@/shared/api'
import { artistQueries } from '@/entities/artist'
import { aggregateTopAlbums } from '@/entities/album'
import { trackQueries } from '@/entities/track'
import { LEVELS, type Tier } from './tiers'

export type GameMode = 'albums' | 'artists'

const imagesOf = (images: SpotifyImage[] | undefined) => images ?? []

/** The user's top eleven albums (or artists) for the range – one per tile value – and the query behind them. */
export function useTiers(mode: GameMode, range: TimeRange) {
  const tracks = useQuery({ ...trackQueries.top(range, 99), enabled: mode === 'albums' })
  const artists = useQuery({ ...artistQueries.top(range, 50), enabled: mode === 'artists' })

  const tiers = useMemo<Tier[]>(() => {
    if (mode === 'albums')
      return aggregateTopAlbums(tracks.data ?? [])
        .slice(0, LEVELS)
        .map(({ album }, i) => ({ id: album.id, name: album.name, subtitle: album.artists[0]?.name, images: imagesOf(album.images), rank: i + 1 }))
    return (artists.data ?? []).slice(0, LEVELS).map((a, i) => ({ id: a.id, name: a.name, images: imagesOf(a.images), rank: i + 1 }))
  }, [mode, tracks.data, artists.data])

  return { tiers, query: mode === 'albums' ? tracks : artists }
}
