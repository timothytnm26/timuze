import { queryOptions } from '@tanstack/react-query'
import { dataMode } from '@/shared/api'
import { getLocalAlbum, searchLocalAlbums } from '@/entities/local-library'
import { getAlbum, searchAlbums } from './requests'

export const albumQueries = {
  search: (query: string) =>
    queryOptions({
      queryKey: ['albums', 'search', query, dataMode()],
      queryFn: () => (dataMode() === 'local' ? searchLocalAlbums(query) : searchAlbums(query)),
      enabled: query.length > 0,
      staleTime: 5 * 60_000,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['albums', id, dataMode()],
      queryFn: () => (dataMode() === 'local' ? getLocalAlbum(id) : getAlbum(id)),
      staleTime: 60 * 60_000,
    }),
}
