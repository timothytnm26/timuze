import { queryOptions } from '@tanstack/react-query'
import { dataMode } from '@/shared/api'
import { localUser } from '@/entities/local-library'
import { getMe } from './requests'

export const userQueries = {
  me: () =>
    queryOptions({
      queryKey: ['me', dataMode()],
      queryFn: () => (dataMode() === 'local' ? localUser() : getMe()),
      staleTime: 30 * 60_000,
    }),
}
