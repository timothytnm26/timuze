import { queryOptions } from '@tanstack/react-query'
import { idb } from '@/shared/lib'
import type { StreamHistory } from '../model/types'

const KEY = 'stream-history'

export const streamHistoryQueries = {
  all: () =>
    queryOptions({
      queryKey: ['stream-history'],
      queryFn: async () => (await idb.get<StreamHistory>(KEY)) ?? null,
      staleTime: Infinity,
    }),
}

export const saveStreamHistory = (h: StreamHistory) => idb.set(KEY, h)
export const clearStreamHistory = () => idb.del(KEY)
