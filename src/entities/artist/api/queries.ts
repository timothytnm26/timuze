import { queryOptions } from '@tanstack/react-query'
import { dataMode, type TimeRange } from '@/shared/api'
import { localTopArtists } from '@/entities/local-library'
import { getArtistCountries, type ArtistCountries } from './countries'
import { getTopArtists } from './requests'

export const artistQueries = {
  top: (range: TimeRange, count = 50) =>
    queryOptions({
      queryKey: ['top', 'artists', range, count, dataMode()],
      queryFn: () => (dataMode() === 'local' ? localTopArtists(range, count) : getTopArtists(range, count)),
      staleTime: 10 * 60_000,
    }),
  /** Keyed by the (sorted) id set, so the same artists in another range hit the cache. */
  countries: (ids: string[]) =>
    queryOptions({
      queryKey: ['artist-countries', [...ids].sort(), dataMode()],
      // MusicBrainz is matched through Spotify ids, which imported history doesn't have
      queryFn: () => (dataMode() === 'local' ? Promise.resolve({} as ArtistCountries) : getArtistCountries(ids)),
      staleTime: Infinity,
      retry: 1,
    }),
}
