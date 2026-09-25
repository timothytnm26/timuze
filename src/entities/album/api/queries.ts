import { queryOptions } from '@tanstack/react-query'
import { getAlbum, searchAlbums } from './requests'

export const albumQueries = {
  search: (query: string) =>
    queryOptions({
      queryKey: ['albums', 'search', query],
      queryFn: () => searchAlbums(query),
      enabled: query.length > 0,
      staleTime: 5 * 60_000,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['albums', id],
      queryFn: () => getAlbum(id),
      staleTime: 60 * 60_000,
    }),
}
