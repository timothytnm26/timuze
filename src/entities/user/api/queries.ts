import { queryOptions } from '@tanstack/react-query'
import { getMe } from './requests'

export const userQueries = {
  me: () =>
    queryOptions({
      queryKey: ['me'],
      queryFn: getMe,
      staleTime: 30 * 60_000,
    }),
}
