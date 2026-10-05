import { QueryClient } from '@tanstack/react-query'
import { isAuthError, isForbidden } from '@/shared/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (count, err) => !isAuthError(err) && !isForbidden(err) && count < 2,
    },
  },
})

/** Queries built from imported history carry `'local'` in their key. */
export const invalidateLocalQueries = () =>
  void queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes('local') })
