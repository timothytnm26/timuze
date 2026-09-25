import { queryOptions } from '@tanstack/react-query'
import type { TimeRange } from '@/shared/api'
import { getArtistCountries } from './countries'
import { getTopArtists } from './requests'

export const artistQueries = {
  top: (range: TimeRange, count = 50) =>
    queryOptions({
      queryKey: ['top', 'artists', range, count],
      queryFn: () => getTopArtists(range, count),
      staleTime: 10 * 60_000,
    }),
  /** Keyed by the (sorted) id set, so the same artists in another range hit the cache. */
  countries: (ids: string[]) =>
    queryOptions({
      queryKey: ['artist-countries', [...ids].sort()],
      queryFn: () => getArtistCountries(ids),
      staleTime: Infinity,
      retry: 1,
    }),
}
