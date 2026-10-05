import { queryOptions } from '@tanstack/react-query'
import { playStore } from './store'

export const streamHistoryQueries = {
  all: () =>
    queryOptions({
      queryKey: ['stream-history'],
      queryFn: () => playStore.getHistory(),
      staleTime: Infinity,
    }),
}
