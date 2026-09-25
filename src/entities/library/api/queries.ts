import { queryOptions } from '@tanstack/react-query'
import { getLibrarySummary } from './requests'

export const libraryQueries = {
  summary: () =>
    queryOptions({
      queryKey: ['library', 'summary'],
      queryFn: getLibrarySummary,
      staleTime: 30 * 60_000,
    }),
}
