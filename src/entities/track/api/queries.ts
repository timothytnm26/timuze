import { queryOptions } from '@tanstack/react-query'
import type { TimeRange } from '@/shared/api'
import { getCurrentlyPlaying, getRecentlyPlayed, getTopTracks } from './requests'

export const trackQueries = {
  top: (range: TimeRange, count = 50) =>
    queryOptions({
      queryKey: ['top', 'tracks', range, count],
      queryFn: () => getTopTracks(range, count),
      staleTime: 10 * 60_000,
    }),
  /** Spotify only exposes the last 50 plays. */
  recent: () =>
    queryOptions({
      queryKey: ['recently-played'],
      queryFn: () => getRecentlyPlayed(50),
      select: (d) => d.items,
      staleTime: 60_000,
    }),
  nowPlaying: () =>
    queryOptions({
      queryKey: ['now-playing'],
      queryFn: getCurrentlyPlaying,
      refetchInterval: 20_000,
      staleTime: 10_000,
    }),
}
